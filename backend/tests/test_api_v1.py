"""
backend/tests/test_api_v1.py

Comprehensive integration and API contract test suite for Milestone 5.2.2:
  - Document Upload & Validation (RULE-F05)
  - Document Field Extraction & Automated Cross-Document Reconciliation
  - Operational Exception Queue, Filtering & Resolution
  - Human-in-the-Loop Approval Queue & Decision Gates
  - Immutable Audit Log Queries
  - Outbound Stakeholder Notifications
"""

import io
import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Notification,
    Shipment,
    ShipmentDocument,
    ShipmentException,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ShipmentStatus,
    ToolName,
    TransportMode,
)
from backend.app.services.shipment_service import (
    DEFAULT_TENANT_ID,
    ShipmentService,
    get_shipment_service,
)


def create_mock_shipment(
    tracking_number: str = "SHP-MOCK-101",
    status: str = ShipmentStatus.BOOKED.value,
    priority: str = BusinessPriority.HIGH.value,
) -> Shipment:
    """Helper to generate an in-memory Shipment entity."""
    s = Shipment(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        tracking_number=tracking_number,
        status=status,
        origin="Shanghai, CN",
        destination="Los Angeles, US",
        mode=TransportMode.SEA.value,
        carrier_id="MAERSK_01",
        promised_delivery_date=date.today() + timedelta(days=10),
        business_priority=priority,
        risk_score=20,
        risk_level=RiskLevel.MEDIUM.value,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    s.milestones = []
    s.documents = []
    s.events = []
    s.exceptions = []
    s.notifications = []
    return s


# ---------------------------------------------------------------------------
# Document API Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_upload_document_success(tmp_path):
    """Verify POST /api/v1/documents/upload accepts valid PDF and returns HTTP 201."""
    shipment = create_mock_shipment()
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = shipment

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        pdf_bytes = b"%PDF-1.4 sample content for commercial invoice testing"
        files = {
            "file": ("commercial_invoice.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        data = {
            "shipment_id": str(shipment.id),
            "document_type": "COMMERCIAL_INVOICE",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/documents/upload", data=data, files=files)

        assert response.status_code == 201
        res_json = response.json()
        assert res_json["document_type"] == "COMMERCIAL_INVOICE"
        assert res_json["validation_status"] == DocumentValidationStatus.PENDING.value
        assert mock_db.add.called
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_upload_document_rejects_executable():
    """Verify POST /api/v1/documents/upload rejects executable .exe per RULE-F05."""
    shipment = create_mock_shipment()
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = shipment

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        exe_bytes = b"MZ executable binary payload"
        files = {
            "file": ("malicious_script.exe", io.BytesIO(exe_bytes), "application/octet-stream")
        }
        data = {
            "shipment_id": str(shipment.id),
            "document_type": "BILL_OF_LADING",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/documents/upload", data=data, files=files)

        assert response.status_code == 400
        assert "forbidden" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_upload_document_rejects_disallowed_mime():
    """Verify POST /api/v1/documents/upload rejects unsupported MIME types."""
    shipment = create_mock_shipment()
    mock_service = AsyncMock()
    mock_service.get_shipment_by_id.return_value = shipment

    app.dependency_overrides[get_shipment_service] = lambda: mock_service
    try:
        text_bytes = b"plain text data"
        files = {
            "file": ("document.txt", io.BytesIO(text_bytes), "text/plain")
        }
        data = {
            "shipment_id": str(shipment.id),
            "document_type": "PACKING_LIST",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/documents/upload", data=data, files=files)

        assert response.status_code == 400
        assert "not supported" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_extract_document_and_cross_reconciliation():
    """Verify POST /api/v1/documents/{id}/extract parses fields and flags weight mismatch."""
    shipment = create_mock_shipment()
    now = datetime.now(timezone.utc)

    # Pre-existing Commercial Invoice declaring 250 kg
    inv_doc = ShipmentDocument(
        id=uuid.uuid4(),
        shipment_id=shipment.id,
        document_type=DocumentType.COMMERCIAL_INVOICE.value,
        file_ref="path/to/invoice.pdf",
        extracted_fields={"total_weight_kg": 250.0, "invoice_number": "INV-2026-001"},
        confidence=0.95,
        validation_status=DocumentValidationStatus.VALIDATED.value,
        created_at=now,
        updated_at=now,
    )

    # Newly uploaded Packing List declaring 310 kg (discrepancy = 60 kg > 0.5 kg tolerance)
    pk_doc = ShipmentDocument(
        id=uuid.uuid4(),
        shipment_id=shipment.id,
        document_type=DocumentType.PACKING_LIST.value,
        file_ref="path/to/packing_list.pdf",
        extracted_fields=None,
        confidence=0.0,
        validation_status=DocumentValidationStatus.PENDING.value,
        created_at=now,
        updated_at=now,
    )
    shipment.documents = [inv_doc, pk_doc]

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # Query 1: select ShipmentDocument for pk_doc
    res_doc = MagicMock()
    res_doc.scalars.return_value.first.return_value = pk_doc

    # Query 2: select Shipment with documents
    res_shipment = MagicMock()
    res_shipment.scalars.return_value.first.return_value = shipment

    mock_db.execute.side_effect = [res_doc, res_shipment]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "raw_text": "PACKING LIST\nTotal Weight: 310.0 KG\nConsignee: Global Importers Inc"
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(f"/api/v1/documents/{pk_doc.id}/extract", json=payload)

        assert response.status_code == 200
        res_json = response.json()
        assert res_json["extracted_fields"]["total_weight_kg"] == 310.0
        # Should be FLAGGED due to cross-document discrepancy
        assert res_json["validation_status"] == DocumentValidationStatus.FLAGGED.value
        # An exception must have been added to the session
        assert mock_db.add.called
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_document_by_id():
    """Verify GET /api/v1/documents/{id} returns metadata or 404."""
    doc = ShipmentDocument(
        id=uuid.uuid4(),
        shipment_id=uuid.uuid4(),
        document_type=DocumentType.BILL_OF_LADING.value,
        file_ref="storage/bol.pdf",
        confidence=0.9,
        validation_status=DocumentValidationStatus.VALIDATED.value,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()
    res_mock = MagicMock()
    res_mock.scalars.return_value.first.return_value = doc
    mock_db.execute.return_value = res_mock

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(f"/api/v1/documents/{doc.id}")

        assert resp.status_code == 200
        assert resp.json()["id"] == str(doc.id)

        # 404 test
        res_mock.scalars.return_value.first.return_value = None
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp404 = await ac.get(f"/api/v1/documents/{uuid.uuid4()}")
        assert resp404.status_code == 404
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Exceptions API Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_exceptions():
    """Verify GET /api/v1/exceptions returns list with X-Total-Count."""
    exc = ShipmentException(
        id=uuid.uuid4(),
        shipment_id=uuid.uuid4(),
        exception_type=ExceptionType.MILESTONE_OVERDUE.value,
        risk_level=RiskLevel.HIGH.value,
        status=ExceptionStatus.OPEN.value,
        description="Warehouse dispatch delayed by 4.5 hours",
        evidence=["Overdue cutoff: 14:00"],
        detected_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()
    mock_count = MagicMock()
    mock_count.scalar.return_value = 1
    mock_items = MagicMock()
    mock_items.scalars.return_value.all.return_value = [exc]
    mock_db.execute.side_effect = [mock_count, mock_items]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/api/v1/exceptions?status=OPEN&risk_level=HIGH")

        assert resp.status_code == 200
        assert resp.headers.get("x-total-count") == "1"
        data = resp.json()
        assert len(data) == 1
        assert data[0]["exception_type"] == ExceptionType.MILESTONE_OVERDUE.value
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_patch_exception_status():
    """Verify PATCH /api/v1/exceptions/{id} updates status to RESOLVED and sets timestamp."""
    shipment = create_mock_shipment()
    exc = ShipmentException(
        id=uuid.uuid4(),
        shipment_id=shipment.id,
        exception_type=ExceptionType.MISSING_DOCUMENT.value,
        risk_level=RiskLevel.MEDIUM.value,
        status=ExceptionStatus.OPEN.value,
        description="Missing Commercial Invoice",
        evidence=[],
        detected_at=datetime.now(timezone.utc),
    )
    shipment.exceptions = [exc]

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # Query 1: select ShipmentException
    res_exc = MagicMock()
    res_exc.scalars.return_value.first.return_value = exc

    # Query 2: select Shipment
    res_shipment = MagicMock()
    res_shipment.scalars.return_value.first.return_value = shipment

    mock_db.execute.side_effect = [res_exc, res_shipment]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "status": "RESOLVED",
            "root_cause": "Supplier provided invoice via email",
            "resolved_by": str(uuid.uuid4()),
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.patch(f"/api/v1/exceptions/{exc.id}", json=payload)

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == ExceptionStatus.RESOLVED.value
        assert data["root_cause"] == "Supplier provided invoice via email"
        assert exc.resolved_at is not None
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Approvals API Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_approvals():
    """Verify GET /api/v1/approvals returns pending approval queue."""
    approval = Approval(
        id=uuid.uuid4(),
        action_id=uuid.uuid4(),
        decision=ApprovalDecision.PENDING.value,
        requested_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()
    mock_count = MagicMock()
    mock_count.scalar.return_value = 1
    mock_items = MagicMock()
    mock_items.scalars.return_value.all.return_value = [approval]
    mock_db.execute.side_effect = [mock_count, mock_items]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/api/v1/approvals?decision=PENDING")

        assert resp.status_code == 200
        assert resp.headers.get("x-total-count") == "1"
        data = resp.json()
        assert len(data) == 1
        assert data[0]["decision"] == ApprovalDecision.PENDING.value
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_decide_approval_approved():
    """Verify POST /api/v1/approvals/{id}/decide marks action COMPLETED and exception RESOLVED."""
    exc = ShipmentException(
        id=uuid.uuid4(),
        shipment_id=uuid.uuid4(),
        exception_type=ExceptionType.MILESTONE_OVERDUE.value,
        status=ExceptionStatus.OPEN.value,
        description="Warehouse dispatch delay",
        detected_at=datetime.now(timezone.utc),
    )
    action = CorrectiveAction(
        id=uuid.uuid4(),
        exception_id=exc.id,
        action_type=ActionType.RESCHEDULE_MILESTONE.value,
        status=ActionStatus.WAITING_APPROVAL.value,
        tool_used=ToolName.RESCHEDULE_MILESTONE.value,
        input_data={"new_expected_at": "2026-10-18T12:00:00Z"},
        idempotency_key="IDEMP-ACT-001",
    )
    action.exception = exc

    approval = Approval(
        id=uuid.uuid4(),
        action_id=action.id,
        decision=ApprovalDecision.PENDING.value,
        requested_at=datetime.now(timezone.utc),
    )
    approval.action = action

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    res_app = MagicMock()
    res_app.scalars.return_value.first.return_value = approval
    mock_db.execute.return_value = res_app

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "decision": "APPROVED",
            "reviewer_id": str(uuid.uuid4()),
            "reason": "Carrier confirmed truck arrival for morning slot.",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post(f"/api/v1/approvals/{approval.id}/decide", json=payload)

        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] == ApprovalDecision.APPROVED.value
        assert approval.reviewed_at is not None
        # Action must be marked COMPLETED and Exception marked RESOLVED
        assert action.status == ActionStatus.COMPLETED.value
        assert exc.status == ExceptionStatus.RESOLVED.value
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_decide_approval_already_decided_error():
    """Verify deciding an already resolved approval returns HTTP 400."""
    approval = Approval(
        id=uuid.uuid4(),
        action_id=uuid.uuid4(),
        decision=ApprovalDecision.APPROVED.value,  # Already decided!
        requested_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()
    res_app = MagicMock()
    res_app.scalars.return_value.first.return_value = approval
    mock_db.execute.return_value = res_app

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "decision": "REJECTED",
            "reviewer_id": str(uuid.uuid4()),
            "reason": "Attempting to change decision",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post(f"/api/v1/approvals/{approval.id}/decide", json=payload)

        assert resp.status_code == 400
        assert "already been decided" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Audit Logs & Notifications API Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_list_audit_logs():
    """Verify GET /api/v1/audit returns audit records with X-Total-Count."""
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        entity_type="shipment",
        entity_id=uuid.uuid4(),
        action="SHIPMENT_CREATED",
        actor_type="API",
        actor_id="OPERATOR",
        details={"mode": "SEA"},
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock()
    mock_count = MagicMock()
    mock_count.scalar.return_value = 1
    mock_items = MagicMock()
    mock_items.scalars.return_value.all.return_value = [audit_entry]
    mock_db.execute.side_effect = [mock_count, mock_items]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/api/v1/audit?entity_type=shipment")

        assert resp.status_code == 200
        assert resp.headers.get("x-total-count") == "1"
        data = resp.json()
        assert len(data) == 1
        assert data[0]["action"] == "SHIPMENT_CREATED"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_notifications():
    """Verify GET /api/v1/notifications returns outbound notifications."""
    notif = Notification(
        id=uuid.uuid4(),
        shipment_id=uuid.uuid4(),
        recipient="dispatcher@logistics.com",
        channel=NotificationChannel.EMAIL.value,
        template_id="DELAY_ADVISORY",
        content="Milestone delayed by 4.5h",
        status=NotificationStatus.SENT.value,
        idempotency_key="NOTIF-001-KEY",
    )

    mock_db = AsyncMock()
    mock_count = MagicMock()
    mock_count.scalar.return_value = 1
    mock_items = MagicMock()
    mock_items.scalars.return_value.all.return_value = [notif]
    mock_db.execute.side_effect = [mock_count, mock_items]

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get("/api/v1/notifications?status=SENT")

        assert resp.status_code == 200
        assert resp.headers.get("x-total-count") == "1"
        data = resp.json()
        assert len(data) == 1
        assert data[0]["template_id"] == "DELAY_ADVISORY"
    finally:
        app.dependency_overrides.clear()
