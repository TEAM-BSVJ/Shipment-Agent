"""
backend/tests/test_api_shipments.py

Integration and unit tests for the Shipment & Telemetry REST API layer (TASK-013, TASK-014).
Validates:
  - GET /api/v1/shipments with filtering, search, and pagination
  - GET /api/v1/shipments/{id} with relational loading and 404 handling
  - POST /api/v1/shipments registration with initial milestones and 409 duplicate handling
  - POST /api/v1/shipments/{id}/events with idempotency and milestone auto-advancement
  - GET /api/v1/shipments/{id}/events chronological telemetry listing
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.api.v1.events import EventIngestPayload
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.models.entities import (
    Shipment,
    ShipmentEvent,
    ShipmentMilestone,
)
from backend.app.schemas.domain import (
    EventIngest,
    MilestoneCreate,
    ShipmentCreate,
)
from backend.app.schemas.enums import (
    BusinessPriority,
    MilestoneName,
    RiskLevel,
    ShipmentStatus,
    TransportMode,
)
from backend.app.services.shipment_service import (
    DEFAULT_TENANT_ID,
    ShipmentDuplicateError,
    ShipmentService,
    get_shipment_service,
)


def create_sample_shipment(
    tracking_number: str = "SHP-TEST-001",
    mode: str = TransportMode.ROAD.value,
    status: str = ShipmentStatus.BOOKED.value,
    risk_level: str = RiskLevel.LOW.value,
    business_priority: str = BusinessPriority.MEDIUM.value,
) -> Shipment:
    """Helper to create an in-memory Shipment entity populated with milestones."""
    shipment_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    delivery_date = (now + timedelta(days=5)).date()

    milestone_1 = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
        expected_at=now,
        completed_at=now,
        is_completed=True,
        source="INTERNAL_TMS",
        created_at=now,
    )
    milestone_2 = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.WAREHOUSE_DISPATCH.value,
        expected_at=now + timedelta(hours=12),
        completed_at=None,
        is_completed=False,
        source="WMS_MOCK",
        created_at=now,
    )

    shipment = Shipment(
        id=shipment_id,
        tenant_id=DEFAULT_TENANT_ID,
        tracking_number=tracking_number,
        status=status,
        origin="Chicago, IL",
        destination="Dallas, TX",
        mode=mode,
        carrier_id="CARRIER_TEST",
        promised_delivery_date=delivery_date,
        business_priority=business_priority,
        risk_score=15,
        risk_level=risk_level,
        created_at=now,
        updated_at=now,
    )
    shipment.milestones = [milestone_1, milestone_2]
    shipment.documents = []
    shipment.events = []
    shipment.exceptions = []
    shipment.notifications = []
    return shipment


# ---------------------------------------------------------------------------
# Service Layer Unit Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_shipment_service_list_shipments():
    """Verify list_shipments constructs correct queries and returns items with count."""
    mock_db = AsyncMock()
    mock_shipment = create_sample_shipment()

    # Mock count query result
    mock_count_res = MagicMock()
    mock_count_res.scalar.return_value = 1

    # Mock items query result
    mock_items_res = MagicMock()
    mock_items_res.scalars.return_value.all.return_value = [mock_shipment]

    mock_db.execute.side_effect = [mock_count_res, mock_items_res]

    shipments, total = await ShipmentService.list_shipments(
        db=mock_db,
        tenant_id=DEFAULT_TENANT_ID,
        status="BOOKED",
        limit=10,
    )

    assert total == 1
    assert len(shipments) == 1
    assert shipments[0].tracking_number == "SHP-TEST-001"
    assert mock_db.execute.call_count == 2


@pytest.mark.asyncio
async def test_shipment_service_get_by_id_and_tracking():
    """Verify get_shipment_by_id and get_shipment_by_tracking execute filtered queries."""
    mock_db = AsyncMock()
    mock_shipment = create_sample_shipment()

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = mock_shipment
    mock_db.execute.return_value = mock_res

    res1 = await ShipmentService.get_shipment_by_id(mock_db, mock_shipment.id)
    assert res1 is not None
    assert res1.id == mock_shipment.id

    res2 = await ShipmentService.get_shipment_by_tracking(mock_db, mock_shipment.tracking_number)
    assert res2 is not None
    assert res2.tracking_number == mock_shipment.tracking_number


@pytest.mark.asyncio
async def test_shipment_service_create_duplicate_raises_error():
    """Verify create_shipment raises ValueError on duplicate tracking number."""
    mock_db = AsyncMock()
    existing_shipment = create_sample_shipment("SHP-EXISTING")

    # Mock get_shipment_by_tracking finding existing
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = existing_shipment
    mock_db.execute.return_value = mock_res

    payload = ShipmentCreate(
        tracking_number="SHP-EXISTING",
        origin="NYC",
        destination="BOS",
        promised_delivery_date=date.today(),
    )

    with pytest.raises(ShipmentDuplicateError) as exc:
        await ShipmentService.create_shipment(mock_db, payload)

    assert "already exists" in str(exc.value)


@pytest.mark.asyncio
async def test_shipment_service_ingest_event_idempotency():
    """Verify ingest_event returns existing event without re-insertion on duplicate key."""
    mock_db = AsyncMock()
    existing_event = ShipmentEvent(
        id=uuid.uuid4(),
        shipment_id=uuid.uuid4(),
        event_type="GPS_PING",
        event_data={"lat": 40.71, "lon": -74.00},
        source="MOCK_GPS",
        event_at=datetime.now(timezone.utc),
        idempotency_key="IDEMP-DUP-KEY-12345",
    )

    # First query finds existing event
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = existing_event
    mock_db.execute.return_value = mock_res

    event_in = EventIngest(
        shipment_id=existing_event.shipment_id,
        event_type="GPS_PING",
        idempotency_key="IDEMP-DUP-KEY-12345",
    )

    event, created = await ShipmentService.ingest_event(mock_db, existing_event.shipment_id, event_in)

    assert created is False
    assert event.id == existing_event.id
    # Ensure no insertion occurred
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_shipment_service_ingest_event_advances_milestone():
    """Verify that an event matching an uncompleted milestone marks it completed."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    shipment = create_sample_shipment()
    uncompleted_m = shipment.milestones[1]
    assert uncompleted_m.is_completed is False

    # First query: idempotency check returns None (new event)
    mock_idemp_res = MagicMock()
    mock_idemp_res.scalars.return_value.first.return_value = None

    # Second query: get_shipment_by_id returns shipment
    mock_ship_res = MagicMock()
    mock_ship_res.scalars.return_value.first.return_value = shipment

    mock_db.execute.side_effect = [mock_idemp_res, mock_ship_res]

    event_in = EventIngest(
        shipment_id=shipment.id,
        event_type=uncompleted_m.milestone_name,  # WAREHOUSE_DISPATCH
        event_data={"dock_number": 4},
        idempotency_key="IDEMP-NEW-KEY-99999",
        source="WMS_SCANNER",
    )

    event, created = await ShipmentService.ingest_event(mock_db, shipment.id, event_in)

    assert created is True
    assert event.event_type == uncompleted_m.milestone_name
    # Milestone must now be marked completed!
    assert uncompleted_m.is_completed is True
    assert uncompleted_m.completed_at is not None
    assert mock_db.commit.called


# ---------------------------------------------------------------------------
# API Endpoints Integration Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_api_get_shipments_success():
    """Verify GET /api/v1/shipments returns list and X-Total-Count header."""
    mock_shipment = create_sample_shipment()
    mock_service = AsyncMock()
    mock_service.list_shipments.return_value = ([mock_shipment], 1)

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/v1/shipments?status=BOOKED&limit=10")

        assert response.status_code == 200
        assert response.headers.get("x-total-count") == "1"
        data = response.json()
        assert len(data) == 1
        assert data[0]["tracking_number"] == mock_shipment.tracking_number
        assert len(data[0]["milestones"]) == 2
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_get_shipment_by_id_success():
    """Verify GET /api/v1/shipments/{id} returns detailed shipment object."""
    mock_shipment = create_sample_shipment()
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = mock_shipment

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/v1/shipments/{mock_shipment.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(mock_shipment.id)
        assert data["tracking_number"] == mock_shipment.tracking_number
        assert data["status"] == mock_shipment.status
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_get_shipment_by_id_not_found():
    """Verify GET /api/v1/shipments/{id} returns 404 when ID does not exist."""
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = None

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        random_id = uuid.uuid4()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/v1/shipments/{random_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_create_shipment_success():
    """Verify POST /api/v1/shipments creates shipment and returns HTTP 201."""
    mock_shipment = create_sample_shipment("SHP-CREATED-01")
    mock_service = AsyncMock()
    mock_service.create_shipment.return_value = mock_shipment

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        payload = {
            "tracking_number": "SHP-CREATED-01",
            "origin": "Atlanta, GA",
            "destination": "Miami, FL",
            "mode": "ROAD",
            "promised_delivery_date": str(date.today() + timedelta(days=3)),
            "business_priority": "HIGH",
            "initial_milestones": [
                {
                    "milestone_name": "BOOKING_CONFIRMED",
                    "expected_at": datetime.now(timezone.utc).isoformat(),
                    "source": "INTERNAL_TMS",
                }
            ],
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/shipments", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["tracking_number"] == "SHP-CREATED-01"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_create_shipment_duplicate_conflict():
    """Verify POST /api/v1/shipments returns HTTP 409 on duplicate tracking number."""
    mock_service = AsyncMock()
    mock_service.create_shipment.side_effect = ShipmentDuplicateError("Shipment already exists.")

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        payload = {
            "tracking_number": "SHP-CONFLICT",
            "origin": "Atlanta, GA",
            "destination": "Miami, FL",
            "promised_delivery_date": str(date.today()),
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/shipments", json=payload)

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_ingest_event_created_and_idempotent():
    """Verify POST /api/v1/shipments/{id}/events returns 201 on creation and 200 on duplicate."""
    shipment_id = uuid.uuid4()
    mock_event = ShipmentEvent(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        event_type="WAREHOUSE_DISPATCH",
        event_data={"bay": 3},
        source="WMS_TEST",
        event_at=datetime.now(timezone.utc),
        idempotency_key="IDEMP-API-TEST-001",
    )

    mock_service = AsyncMock()
    # First call creates event (created=True), second call returns existing (created=False)
    mock_service.ingest_event.side_effect = [
        (mock_event, True),
        (mock_event, False),
    ]

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        payload = {
            "event_type": "WAREHOUSE_DISPATCH",
            "event_data": {"bay": 3},
            "source": "WMS_TEST",
            "idempotency_key": "IDEMP-API-TEST-001",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Fresh event -> 201 Created
            resp1 = await ac.post(f"/api/v1/shipments/{shipment_id}/events", json=payload)
            assert resp1.status_code == 201
            assert resp1.json()["idempotency_key"] == "IDEMP-API-TEST-001"

            # 2. Duplicate submission -> 200 OK
            resp2 = await ac.post(f"/api/v1/shipments/{shipment_id}/events", json=payload)
            assert resp2.status_code == 200
            assert resp2.json()["idempotency_key"] == "IDEMP-API-TEST-001"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_ingest_event_unknown_shipment_404():
    """Verify POST /api/v1/shipments/{id}/events returns 404 if shipment is missing."""
    mock_service = AsyncMock()
    mock_service.ingest_event.side_effect = KeyError("Shipment not found.")

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        random_id = uuid.uuid4()
        payload = {
            "event_type": "GPS_PING",
            "idempotency_key": "IDEMP-NOT-FOUND-KEY",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(f"/api/v1/shipments/{random_id}/events", json=payload)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_list_shipment_events_success():
    """Verify GET /api/v1/shipments/{id}/events lists events or 404 if shipment missing."""
    mock_shipment = create_sample_shipment()
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = mock_shipment

    mock_db = AsyncMock()
    mock_event = ShipmentEvent(
        id=uuid.uuid4(),
        shipment_id=mock_shipment.id,
        event_type="PICKUP_COMPLETED",
        event_data={},
        source="CARRIER",
        event_at=datetime.now(timezone.utc),
        idempotency_key="IDEMP-LIST-TEST",
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_event]
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/v1/shipments/{mock_shipment.id}/events")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["event_type"] == "PICKUP_COMPLETED"
    finally:
        app.dependency_overrides.clear()
