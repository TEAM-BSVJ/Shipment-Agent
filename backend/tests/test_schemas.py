"""
backend/tests/test_schemas.py

Comprehensive unit tests verifying Pydantic v2 domain schemas,
validation boundaries, enum conversions, and JSON serialization.
"""

from datetime import date, datetime
from uuid import uuid4
import pytest
from pydantic import ValidationError

from backend.app.schemas import (
    AgentDiagnosticOutput,
    ApprovalDecision,
    ApprovalDecisionRequest,
    ApprovalResponse,
    BusinessPriority,
    DocumentExtractedFields,
    DocumentResponse,
    DocumentType,
    ExceptionCreate,
    ExceptionResponse,
    ExceptionType,
    MilestoneCreate,
    MilestoneName,
    MilestoneResponse,
    RiskLevel,
    ShipmentCreate,
    ShipmentResponse,
    ShipmentStatus,
    ToolName,
    TransportMode,
)


def test_shipment_create_and_response():
    """Verify ShipmentCreate validates properly and converts to ShipmentResponse."""
    payload = {
        "tracking_number": "SHP-SEA-101",
        "origin": "Port of Shanghai",
        "destination": "Port of Rotterdam",
        "mode": "SEA",
        "carrier_id": "MAERSK_01",
        "promised_delivery_date": date(2026, 11, 15),
        "business_priority": "HIGH",
    }
    shipment_create = ShipmentCreate.model_validate(payload)
    assert shipment_create.tracking_number == "SHP-SEA-101"
    assert shipment_create.mode == TransportMode.SEA
    assert shipment_create.business_priority == BusinessPriority.HIGH

    # Verify Response schema defaults
    response = ShipmentResponse.model_validate(shipment_create.model_dump())
    assert response.status == ShipmentStatus.BOOKED
    assert response.risk_score == 0
    assert response.risk_level == RiskLevel.LOW
    assert isinstance(response.created_at, datetime)


def test_shipment_invalid_tracking():
    """Verify validation error when tracking number is too short."""
    with pytest.raises(ValidationError):
        ShipmentCreate(
            tracking_number="A",  # Min length 3
            origin="Shanghai",
            destination="Rotterdam",
            promised_delivery_date=date(2026, 11, 15),
        )


def test_milestone_schemas():
    """Verify milestone schema creation and validation."""
    shipment_id = uuid4()
    expected_time = datetime(2026, 10, 20, 14, 0)

    milestone_in = MilestoneCreate(
        milestone_name=MilestoneName.WAREHOUSE_DISPATCH,
        expected_at=expected_time,
        source="WMS_BERLIN",
    )
    assert milestone_in.milestone_name == MilestoneName.WAREHOUSE_DISPATCH

    milestone_res = MilestoneResponse(
        shipment_id=shipment_id,
        milestone_name=milestone_in.milestone_name,
        expected_at=milestone_in.expected_at,
        source=milestone_in.source,
    )
    assert milestone_res.is_completed is False
    assert milestone_res.completed_at is None
    assert milestone_res.shipment_id == shipment_id


def test_document_extraction_bounds():
    """Verify extracted fields validate boundaries for weight and confidence."""
    # Valid document fields
    doc_fields = DocumentExtractedFields(
        invoice_number="INV-2026-001",
        issuer="Acme Freight Ltd",
        consignee="Global Retail Corp",
        total_weight_kg=250.5,
        declared_value=15000.0,
        currency="USD",
        issue_date=date(2026, 10, 12),
    )
    assert doc_fields.total_weight_kg == 250.5
    assert doc_fields.currency == "USD"

    # Negative weight should fail
    with pytest.raises(ValidationError):
        DocumentExtractedFields(total_weight_kg=-10.0)

    # Document response confidence boundary (0.0 to 1.0)
    with pytest.raises(ValidationError):
        DocumentResponse(
            shipment_id=uuid4(),
            document_type=DocumentType.COMMERCIAL_INVOICE,
            file_ref="/docs/inv.pdf",
            confidence=1.5,  # Exceeds max 1.0
        )


def test_exception_schemas():
    """Verify exception creation and response contracts."""
    shipment_id = uuid4()
    exc = ExceptionCreate(
        shipment_id=shipment_id,
        exception_type=ExceptionType.WEIGHT_MISMATCH,
        risk_level=RiskLevel.HIGH,
        description="Invoice weight (250kg) differs from Packing List (310kg)",
        evidence=["Invoice #INV-101: 250kg", "Packing List #PL-101: 310kg"],
        root_cause="Supplier packed extra demo units without amending commercial invoice",
    )
    assert exc.exception_type == ExceptionType.WEIGHT_MISMATCH
    assert len(exc.evidence) == 2

    res = ExceptionResponse.model_validate(exc.model_dump())
    assert res.status.value == "OPEN"
    assert res.risk_level == RiskLevel.HIGH


def test_agent_diagnostic_output_parsing():
    """Verify parsing structured output JSON from Evolus Gemma 4 31B-it."""
    llm_json = """{
        "issue_type": "WEIGHT_MISMATCH",
        "root_cause": "Packing list indicates 310kg while commercial invoice lists 250kg",
        "evidence": ["Doc delta: 60kg", "Risk of customs seizure"],
        "recommended_action": "Request revised commercial invoice from supplier",
        "tool_name": "create_correction_task",
        "tool_input": {"task_type": "REVISE_INVOICE", "target_weight_kg": 310},
        "risk_level": "HIGH",
        "confidence": 0.98
    }"""
    diagnosis = AgentDiagnosticOutput.model_validate_json(llm_json)
    assert diagnosis.issue_type == "WEIGHT_MISMATCH"
    assert diagnosis.tool_name == ToolName.CREATE_CORRECTION_TASK
    assert diagnosis.risk_level == RiskLevel.HIGH
    assert diagnosis.confidence == 0.98
    assert diagnosis.tool_input["target_weight_kg"] == 310


def test_approval_decision_validation():
    """Verify approval request requires meaningful reason and valid reviewer ID."""
    reviewer = uuid4()
    decision = ApprovalDecisionRequest(
        decision=ApprovalDecision.APPROVED,
        reviewer_id=reviewer,
        reason="Verified supplier email and adjusted milestone dispatch date.",
    )
    assert decision.decision == ApprovalDecision.APPROVED
    assert decision.reviewer_id == reviewer

    # Short reason under 3 characters should fail validation
    with pytest.raises(ValidationError):
        ApprovalDecisionRequest(
            decision=ApprovalDecision.REJECTED,
            reviewer_id=reviewer,
            reason="ok",  # Min length is 3
        )
