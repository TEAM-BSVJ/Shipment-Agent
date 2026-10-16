"""
backend/tests/test_seed_db.py

Comprehensive unit tests verifying deterministic database seeding (TASK-009).
Validates all 5 benchmark freight scenarios, entity counts, relationship graphs,
and reset lifecycle behaviors.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

from scripts.seed_db import (
    DEFAULT_TENANT_ID,
    build_seed_entities,
    seed_database,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    MilestoneName,
    RiskLevel,
    ShipmentStatus,
    ToolName,
    TransportMode,
)


def test_build_seed_entities_scenarios():
    """Verify that build_seed_entities generates all 5 canonical freight scenarios with correct attributes."""
    fixed_time = datetime(2026, 10, 16, 12, 0, 0, tzinfo=timezone.utc)
    data = build_seed_entities(tenant_id=DEFAULT_TENANT_ID, base_time=fixed_time)

    # 1. Shipments count and tracking numbers
    shipments = data["shipments"]
    assert len(shipments) == 5
    tracking_numbers = [s.tracking_number for s in shipments]
    assert tracking_numbers == ["SHP-101", "SHP-102", "SHP-103", "SHP-104", "SHP-105"]

    # All shipments have the default tenant_id
    for s in shipments:
        assert s.tenant_id == DEFAULT_TENANT_ID

    # 2. Scenario 1 (SHP-101): Missing Commercial Invoice
    shp_101 = next(s for s in shipments if s.tracking_number == "SHP-101")
    assert shp_101.status == ShipmentStatus.CUSTOMS_HOLD.value
    assert shp_101.mode == TransportMode.SEA.value
    assert shp_101.risk_level == RiskLevel.HIGH.value

    shp_101_docs = [d for d in data["documents"] if d.shipment_id == shp_101.id]
    assert len(shp_101_docs) == 1
    assert shp_101_docs[0].document_type == DocumentType.PACKING_LIST.value
    # Commercial Invoice is missing!
    assert not any(d.document_type == DocumentType.COMMERCIAL_INVOICE.value for d in shp_101_docs)

    shp_101_excs = [e for e in data["exceptions"] if e.shipment_id == shp_101.id]
    assert len(shp_101_excs) == 1
    assert shp_101_excs[0].exception_type == ExceptionType.MISSING_DOCUMENT.value
    assert shp_101_excs[0].status == ExceptionStatus.OPEN.value

    # 3. Scenario 2 (SHP-102): Overdue Warehouse Dispatch
    shp_102 = next(s for s in shipments if s.tracking_number == "SHP-102")
    assert shp_102.status == ShipmentStatus.EXCEPTION.value
    shp_102_milestones = [m for m in data["milestones"] if m.shipment_id == shp_102.id]
    dispatch_m = next(m for m in shp_102_milestones if m.milestone_name == MilestoneName.WAREHOUSE_DISPATCH.value)
    assert dispatch_m.is_completed is False
    assert dispatch_m.expected_at < fixed_time  # in the past

    shp_102_excs = [e for e in data["exceptions"] if e.shipment_id == shp_102.id]
    assert len(shp_102_excs) == 1
    assert shp_102_excs[0].exception_type == ExceptionType.MILESTONE_OVERDUE.value

    shp_102_actions = [ca for ca in data["corrective_actions"] if ca.exception_id == shp_102_excs[0].id]
    assert len(shp_102_actions) == 1
    assert shp_102_actions[0].action_type == ActionType.RESCHEDULE_MILESTONE.value
    assert shp_102_actions[0].tool_used == ToolName.RESCHEDULE_MILESTONE.value
    assert shp_102_actions[0].status == ActionStatus.WAITING_APPROVAL.value

    shp_102_approvals = [a for a in data["approvals"] if a.action_id == shp_102_actions[0].id]
    assert len(shp_102_approvals) == 1
    assert shp_102_approvals[0].decision == ApprovalDecision.PENDING.value

    # 4. Scenario 3 (SHP-103): Weight Discrepancy
    shp_103 = next(s for s in shipments if s.tracking_number == "SHP-103")
    shp_103_docs = [d for d in data["documents"] if d.shipment_id == shp_103.id]
    assert len(shp_103_docs) == 2
    inv_doc = next(d for d in shp_103_docs if d.document_type == DocumentType.COMMERCIAL_INVOICE.value)
    pl_doc = next(d for d in shp_103_docs if d.document_type == DocumentType.PACKING_LIST.value)
    assert inv_doc.extracted_fields["weight_kg"] == 250.0
    assert pl_doc.extracted_fields["weight_kg"] == 310.0
    assert inv_doc.validation_status == DocumentValidationStatus.REJECTED.value

    shp_103_excs = [e for e in data["exceptions"] if e.shipment_id == shp_103.id]
    assert len(shp_103_excs) == 1
    assert shp_103_excs[0].exception_type == ExceptionType.WEIGHT_MISMATCH.value

    # 5. Scenario 4 (SHP-104): Healthy Baseline
    shp_104 = next(s for s in shipments if s.tracking_number == "SHP-104")
    assert shp_104.status == ShipmentStatus.IN_TRANSIT.value
    assert shp_104.risk_score == 0
    assert shp_104.risk_level == RiskLevel.LOW.value
    shp_104_excs = [e for e in data["exceptions"] if e.shipment_id == shp_104.id]
    assert len(shp_104_excs) == 0

    # 6. Scenario 5 (SHP-105): Customs Hold & Resolved Escalation
    shp_105 = next(s for s in shipments if s.tracking_number == "SHP-105")
    assert shp_105.risk_level == RiskLevel.CRITICAL.value
    shp_105_excs = [e for e in data["exceptions"] if e.shipment_id == shp_105.id]
    assert len(shp_105_excs) == 1
    assert shp_105_excs[0].exception_type == ExceptionType.CUSTOMS_REJECTION.value
    assert shp_105_excs[0].status == ExceptionStatus.RESOLVED.value

    shp_105_actions = [ca for ca in data["corrective_actions"] if ca.exception_id == shp_105_excs[0].id]
    assert len(shp_105_actions) == 1
    assert shp_105_actions[0].action_type == ActionType.ESCALATE_TO_HUMAN.value
    assert shp_105_actions[0].status == ActionStatus.COMPLETED.value

    shp_105_approvals = [a for a in data["approvals"] if a.action_id == shp_105_actions[0].id]
    assert len(shp_105_approvals) == 1
    assert shp_105_approvals[0].decision == ApprovalDecision.APPROVED.value


@pytest.mark.asyncio
async def test_seed_database_execution_mock():
    """Verify that seed_database executes flush/commit and inserts all entity collections."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.delete = MagicMock()
    
    # Mock query returning empty list for reset phase
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_result

    counts = await seed_database(session=mock_session, reset=True)

    # Check returned entity counts
    assert counts["shipments"] == 5
    assert counts["milestones"] == 25
    assert counts["documents"] == 6
    assert counts["exceptions"] == 4
    assert counts["corrective_actions"] == 4
    assert counts["approvals"] == 3
    assert counts["notifications"] == 1
    assert counts["audit_logs"] == 5

    # Verify session methods were called
    assert mock_session.add.call_count == (
        5 + 25 + 6 + 4 + 4 + 3 + 1 + 5
    )
    assert mock_session.commit.call_count == 1
    assert mock_session.flush.call_count >= 3


@pytest.mark.asyncio
async def test_seed_database_execution_no_reset():
    """Verify that when reset=False, deletion queries are bypassed."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.delete = MagicMock()

    counts = await seed_database(session=mock_session, reset=False)

    assert counts["shipments"] == 5
    assert mock_session.delete.call_count == 0
    assert mock_session.commit.call_count == 1
