"""
backend/tests/test_integrations_webhook.py

Unit and integration tests for the Unified Evolus Webhook Gateway:
  POST /api/v1/integrations/evolus/webhook
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Shipment,
    ShipmentDocument,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.schemas.enums import (
    ApprovalDecision,
    DocumentValidationStatus,
    ExceptionStatus,
)


@pytest.mark.asyncio
async def test_webhook_document_verified():
    """Verify DOCUMENT_VERIFIED event updates document validation status and confidence."""
    doc_id = uuid.uuid4()
    mock_doc = ShipmentDocument(
        id=doc_id,
        shipment_id=uuid.uuid4(),
        document_type="COMMERCIAL_INVOICE",
        file_ref="/path/doc.pdf",
        validation_status="PENDING",
        confidence=0.0,
    )

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_doc
    mock_db.execute.return_value = MagicMock(scalars=MagicMock(return_value=mock_scalars))
    mock_db.add = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "DOCUMENT_VERIFIED",
            "shipment_id": str(mock_doc.shipment_id),
            "document_id": str(doc_id),
            "status": "VALID",
            "confidence": 0.98,
        }
        headers = {
            "X-Workflow-Execution-Id": "exec-12345",
            "X-Workflow-Audit-Id": "audit-67890",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload, headers=headers)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["event_type"] == "DOCUMENT_VERIFIED"
        assert mock_doc.validation_status == DocumentValidationStatus.VALIDATED.value
        assert mock_doc.confidence == 0.98
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_customs_discrepancy():
    """Verify CUSTOMS_DISCREPANCY event creates exception, corrective action, and human approval record."""
    shipment_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "CUSTOMS_DISCREPANCY",
            "shipment_id": str(shipment_id),
            "document_id": str(uuid.uuid4()),
            "root_cause": "Gross weight mismatch: CI=250kg, PL=310kg",
            "discrepancies": ["Gross weight delta 60kg exceeds 0.5kg threshold"],
            "recommended_action": "Request amended Commercial Invoice from shipper",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["event_type"] == "CUSTOMS_DISCREPANCY"
        assert "approval_id" in res_data
        assert mock_db.add.called
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_correction_task_created():
    """Verify CORRECTION_TASK_CREATED event logs missing document task and corrective action."""
    shipment_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "CORRECTION_TASK_CREATED",
            "shipment_id": str(shipment_id),
            "title": "Missing Commercial Document Upload",
            "assigned_role": "SHIPPER",
            "priority": "HIGH",
            "instructions": "Please upload Commercial Invoice within 24 hours.",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["event_type"] == "CORRECTION_TASK_CREATED"
        assert "action_id" in res_data
        assert mock_db.add.called
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_approval_required():
    """Verify APPROVAL_REQUIRED event creates human sign-off request with proposed reschedule."""
    shipment_id = uuid.uuid4()
    milestone_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "APPROVAL_REQUIRED",
            "shipment_id": str(shipment_id),
            "milestone_id": str(milestone_id),
            "action_type": "RESCHEDULE_MILESTONE",
            "urgency": "HIGH",
            "reason": "Warehouse dispatch delay exceeded 2-hour SLA buffer",
            "recommended_action": "Reschedule warehouse dispatch by +4 hours",
            "new_expected_at": "2026-10-20T14:00:00Z",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["event_type"] == "APPROVAL_REQUIRED"
        assert "approval_id" in res_data
        assert mock_db.add.called
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_milestone_rescheduled():
    """Verify MILESTONE_RESCHEDULED event directly updates milestone expected_at timestamp."""
    milestone_id = uuid.uuid4()
    mock_milestone = ShipmentMilestone(
        id=milestone_id,
        shipment_id=uuid.uuid4(),
        milestone_name="WAREHOUSE_DISPATCH",
        expected_at=datetime(2026, 10, 18, 10, 0, 0, tzinfo=timezone.utc),
        is_completed=False,
    )

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_milestone
    mock_db.execute.return_value = MagicMock(scalars=MagicMock(return_value=mock_scalars))
    mock_db.add = MagicMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "MILESTONE_RESCHEDULED",
            "shipment_id": str(mock_milestone.shipment_id),
            "milestone_id": str(milestone_id),
            "reason": "Minor 30-minute carrier delay within buffer",
            "new_expected_at": "2026-10-18T10:30:00Z",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "SUCCESS"
        assert res_data["event_type"] == "MILESTONE_RESCHEDULED"
        assert mock_milestone.expected_at == datetime(2026, 10, 18, 10, 30, 0, tzinfo=timezone.utc)
        assert mock_db.commit.called
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_placeholder_safety():
    """Verify webhook gracefully handles un-interpolated template placeholders without crashing."""
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        payload = {
            "event_type": "DOCUMENT_VERIFIED",
            "shipment_id": "{{trigger.shipment_id}}",
            "document_id": "{{trigger.document_id}}",
            "status": "VALID",
            "confidence": "{{ask_an_agent.output.confidence}}",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/integrations/evolus/webhook", json=payload)

        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "ACKNOWLEDGED"
    finally:
        app.dependency_overrides.clear()
