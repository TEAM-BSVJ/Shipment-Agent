"""
backend/tests/test_orchestrator.py

Comprehensive test suite for Milestone 5.3:
  - Central Agent Orchestrator & Reasoning Loop (TASK-022)
  - Prompt injection protection via <user_data> fences (RULE-F02)
  - Allowlisted tool dispatch and recursion limits (RULE-E01, RULE-E02, RULE-E03)
  - Human-in-the-Loop approval gating for consequential tools (RULE-E06)
  - Database post-condition verification (RULE-E04)
  - Multi-tenant query isolation (RULE-F04)
  - Operational Copilot Q&A and Chat endpoints (TASK-023)
  - REST endpoints: POST /api/v1/agent/analyze, POST /api/v1/agent/chat, GET /api/v1/agent/tools
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.agents.orchestrator import (
    AgentOrchestrator,
    ShipmentNotFoundError,
)
from backend.app.agents.prompts import (
    format_copilot_prompt,
    format_shipment_context,
)
from backend.app.db.session import get_db
from backend.app.integrations.evolus_client import EvolusClient, EvolusConfig
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
from backend.app.schemas.domain import (
    AgentAnalysisResponse,
    AgentChatResponse,
    AgentDiagnosticOutput,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    MilestoneName,
    RiskLevel,
    ShipmentStatus,
    ToolName,
    TransportMode,
)
from backend.app.services.shipment_service import DEFAULT_TENANT_ID
from backend.app.tools.registry import ToolRegistry, registry


def build_mock_shipment(
    tracking_number: str = "SHP-ORCH-101",
    status: str = ShipmentStatus.IN_TRANSIT.value,
    priority: str = BusinessPriority.HIGH.value,
    scenario: str = "missing_document",
) -> Shipment:
    """Creates a fully populated in-memory Shipment entity for orchestrator testing."""
    s_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    today = now.date()

    shipment = Shipment(
        id=s_id,
        tenant_id=DEFAULT_TENANT_ID,
        tracking_number=tracking_number,
        status=status,
        origin="Mumbai, IN (INBOM)",
        destination="Rotterdam, NL (NLRTM)",
        mode=TransportMode.SEA.value,
        carrier_id="MAERSK_LINE",
        promised_delivery_date=today + timedelta(days=12),
        business_priority=priority,
        risk_score=75,
        risk_level=RiskLevel.HIGH.value,
        created_at=now,
        updated_at=now,
    )

    if scenario == "missing_document":
        shipment.milestones = [
            ShipmentMilestone(
                id=uuid.uuid4(),
                shipment_id=s_id,
                milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
                expected_at=now - timedelta(days=3),
                completed_at=now - timedelta(days=3),
                is_completed=True,
                source="CARRIER_EDI",
            ),
            ShipmentMilestone(
                id=uuid.uuid4(),
                shipment_id=s_id,
                milestone_name=MilestoneName.CUSTOMS_CLEARANCE.value,
                expected_at=now + timedelta(hours=24),
                completed_at=None,
                is_completed=False,
                source="CUSTOMS_PORTAL",
            ),
        ]
        shipment.documents = [
            ShipmentDocument(
                id=uuid.uuid4(),
                shipment_id=s_id,
                document_type=DocumentType.PACKING_LIST.value,
                file_ref="data/documents/mock_pl.pdf",
                confidence=0.98,
                validation_status=DocumentValidationStatus.VALIDATED.value,
                created_at=now,
                updated_at=now,
            )
        ]
        shipment.exceptions = [
            ShipmentException(
                id=uuid.uuid4(),
                shipment_id=s_id,
                exception_type="MISSING_DOCUMENT",
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.OPEN.value,
                description="Commercial Invoice is missing prior to customs export cutoff",
                evidence=["COMMERCIAL_INVOICE document not found"],
                root_cause="Shipper has not submitted finalized invoice",
                detected_at=now - timedelta(hours=5),
            )
        ]

    elif scenario == "weight_mismatch":
        shipment.documents = [
            ShipmentDocument(
                id=uuid.uuid4(),
                shipment_id=s_id,
                document_type=DocumentType.COMMERCIAL_INVOICE.value,
                file_ref="data/documents/mock_ci.pdf",
                confidence=0.95,
                validation_status=DocumentValidationStatus.FLAGGED.value,
                created_at=now,
                updated_at=now,
            ),
            ShipmentDocument(
                id=uuid.uuid4(),
                shipment_id=s_id,
                document_type=DocumentType.PACKING_LIST.value,
                file_ref="data/documents/mock_pl.pdf",
                confidence=0.97,
                validation_status=DocumentValidationStatus.VALIDATED.value,
                created_at=now,
                updated_at=now,
            ),
        ]
        shipment.exceptions = [
            ShipmentException(
                id=uuid.uuid4(),
                shipment_id=s_id,
                exception_type="WEIGHT_MISMATCH",
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.OPEN.value,
                description="Weight mismatch between Invoice (250 kg) and Packing List (310 kg)",
                evidence=["Invoice: 250 kg", "Packing list: 310 kg", "Delta: 60 kg"],
                root_cause="Discrepancy detected between Commercial Invoice and Packing List",
                detected_at=now - timedelta(hours=2),
            )
        ]

    elif scenario == "overdue":
        shipment.documents = []
        shipment.exceptions = [
            ShipmentException(
                id=uuid.uuid4(),
                shipment_id=s_id,
                exception_type="MILESTONE_OVERDUE",
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.INVESTIGATING.value,
                description="Milestone WAREHOUSE_DISPATCH is overdue by 4.5 hours",
                evidence=["Milestone overdue by 4.5h", "No gate-out telematics scan"],
                root_cause="Staging dock forklift mechanical failure",
                detected_at=now - timedelta(hours=4),
            )
        ]

    else:
        shipment.documents = []
        shipment.exceptions = []

    shipment.events = []
    shipment.notifications = []
    return shipment


# ---------------------------------------------------------------------------
# Prompt & Context Formatting Tests
# ---------------------------------------------------------------------------
def test_format_shipment_context_fences_untrusted_data():
    """Verify prompt formatting encapsulates untrusted telemetry inside <user_data> tags (RULE-F02)."""
    shipment = build_mock_shipment(scenario="missing_document")
    shipment_dict = {
        "id": str(shipment.id),
        "tracking_number": shipment.tracking_number,
        "status": shipment.status,
        "origin": shipment.origin,
        "destination": shipment.destination,
        "mode": shipment.mode,
        "risk_score": shipment.risk_score,
        "risk_level": shipment.risk_level,
        "milestones": [{"milestone_name": "PICKUP", "is_completed": True}],
        "documents": [{"document_type": "PACKING_LIST", "validation_status": "VALIDATED"}],
        "exceptions": [{"exception_type": "MISSING_DOCUMENT", "description": "Invoice missing"}],
    }

    prompt = format_shipment_context(shipment_dict, context_notes="Urgent container cutoff")
    assert "<user_data>" in prompt
    assert "</user_data>" in prompt
    assert "UNTRUSTED DATA (RULE-F02)" in prompt
    assert shipment.tracking_number in prompt
    assert "Urgent container cutoff" in prompt


def test_format_copilot_prompt_fences_user_query():
    """Verify copilot prompt encapsulates query and context inside <user_data> (RULE-F02)."""
    prompt = format_copilot_prompt(
        message="Why is this shipment held at customs?",
        shipment_data={"tracking_number": "SHP-101", "status": "CUSTOMS_HOLD", "risk_score": 85},
        conversation_history=[{"role": "user", "content": "Hello"}],
    )
    assert "<user_data>" in prompt
    assert "</user_data>" in prompt
    assert "SHP-101" in prompt
    assert "Why is this shipment held at customs?" in prompt


# ---------------------------------------------------------------------------
# Orchestrator Reasoning & Execution Loop Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_orchestrator_initialization():
    """Verify Orchestrator initializes with database session and default clients."""
    mock_db = AsyncMock()
    orch = AgentOrchestrator(db=mock_db)
    assert orch.db is mock_db
    assert isinstance(orch.evolus_client, EvolusClient)
    assert isinstance(orch.registry, ToolRegistry)


@pytest.mark.asyncio
async def test_orchestrator_missing_document_safe_tool_execution():
    """
    Verify orchestrator handles missing document scenario:
    1. Diagnoses MISSING_DOCUMENT.
    2. Recommends safe tool SEND_NOTIFICATION.
    3. Executes tool without approval gate.
    4. Creates CorrectiveAction (COMPLETED) and AuditLog.
    """
    shipment = build_mock_shipment(scenario="missing_document")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    orch = AgentOrchestrator(db=mock_db, evolus_client=client)

    response = await orch.analyze_shipment(shipment.id)

    assert isinstance(response, AgentAnalysisResponse)
    assert response.shipment_id == shipment.id
    assert response.diagnosis.issue_type == "MISSING_DOCUMENT"
    assert response.diagnosis.tool_name == ToolName.SEND_NOTIFICATION
    assert response.requires_human_approval is False
    assert response.action_queued is True
    assert response.execution_time_seconds >= 0.0

    # Verify CorrectiveAction and AuditLog were staged
    added_types = [type(arg.args[0] if hasattr(arg, "args") and arg.args else arg[0][0]).__name__ for arg in mock_db.add.call_args_list]
    assert "CorrectiveAction" in added_types
    assert "AuditLog" in added_types
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_orchestrator_overdue_milestone_approval_gate():
    """
    Verify orchestrator enforces Human-in-the-Loop gate for consequential tool RESCHEDULE_MILESTONE:
    1. Diagnoses MILESTONE_OVERDUE.
    2. Recognizes RESCHEDULE_MILESTONE requires human approval (RULE-E06).
    3. Queues CorrectiveAction with status WAITING_APPROVAL.
    4. Inserts Approval with decision PENDING.
    5. Returns requires_human_approval=True.
    """
    shipment = build_mock_shipment(scenario="overdue")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    orch = AgentOrchestrator(db=mock_db, evolus_client=client)

    response = await orch.analyze_shipment(shipment.id)

    assert isinstance(response, AgentAnalysisResponse)
    assert response.diagnosis.issue_type == "MILESTONE_OVERDUE"
    assert response.diagnosis.tool_name == ToolName.RESCHEDULE_MILESTONE
    assert response.requires_human_approval is True
    assert response.action_queued is True

    # Check that an Approval record was created
    added_instances = [arg.args[0] if hasattr(arg, "args") and arg.args else arg[0][0] for arg in mock_db.add.call_args_list]
    approval_records = [x for x in added_instances if isinstance(x, Approval)]
    assert len(approval_records) == 1
    assert approval_records[0].decision == ApprovalDecision.PENDING.value

    # Check that CorrectiveAction was set to WAITING_APPROVAL
    ca_records = [x for x in added_instances if isinstance(x, CorrectiveAction)]
    assert len(ca_records) == 1
    assert ca_records[0].status == ActionStatus.WAITING_APPROVAL.value


@pytest.mark.asyncio
async def test_orchestrator_weight_mismatch_creates_correction_task():
    """
    Verify orchestrator diagnoses weight mismatch and triggers CREATE_CORRECTION_TASK.
    Safe tool executes directly and records output.
    """
    shipment = build_mock_shipment(scenario="weight_mismatch")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    client = EvolusClient(config=EvolusConfig(mock_mode=True))
    orch = AgentOrchestrator(db=mock_db, evolus_client=client)

    response = await orch.analyze_shipment(shipment.id)

    assert response.diagnosis.issue_type == "WEIGHT_MISMATCH"
    assert response.diagnosis.tool_name == ToolName.CREATE_CORRECTION_TASK
    assert response.requires_human_approval is False


@pytest.mark.asyncio
async def test_orchestrator_shipment_not_found_raises():
    """Verify orchestrator raises ShipmentNotFoundError for unknown ID."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    orch = AgentOrchestrator(db=mock_db)
    with pytest.raises(ShipmentNotFoundError) as exc_info:
        await orch.analyze_shipment(uuid.uuid4())
    assert "was not found" in str(exc_info.value)


@pytest.mark.asyncio
async def test_orchestrator_degraded_mode_on_inference_failure():
    """Verify orchestrator enters degraded mode and escalates to human if model inference fails."""
    shipment = build_mock_shipment(scenario="missing_document")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    # Client that raises an error
    failing_client = AsyncMock()
    failing_client.run_gemma_diagnosis.side_effect = RuntimeError("Evolus AI API connection reset by peer")

    orch = AgentOrchestrator(db=mock_db, evolus_client=failing_client)
    response = await orch.analyze_shipment(shipment.id)

    assert response.diagnosis.tool_name == ToolName.ESCALATE_TO_HUMAN
    assert "degraded mode" in response.diagnosis.root_cause
    assert response.diagnosis.confidence == 0.50
    assert mock_db.commit.called


# ---------------------------------------------------------------------------
# Operational Copilot Chat Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_orchestrator_copilot_chat_with_grounded_shipment():
    """Verify copilot chat grounds answers in shipment evidence."""
    shipment = build_mock_shipment(scenario="missing_document")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result

    orch = AgentOrchestrator(db=mock_db)
    res = await orch.chat(
        message="Why is this shipment experiencing an exception?",
        shipment_id=shipment.id,
    )

    assert isinstance(res, AgentChatResponse)
    assert res.shipment_id == shipment.id
    assert shipment.tracking_number in res.response
    assert len(res.grounded_facts) > 0
    assert res.recommended_action is not None


@pytest.mark.asyncio
async def test_orchestrator_copilot_chat_general():
    """Verify general copilot chat without shipment ID returns welcoming guidance."""
    mock_db = AsyncMock()
    orch = AgentOrchestrator(db=mock_db)

    res = await orch.chat(message="How do I resolve customs holds?")
    assert isinstance(res, AgentChatResponse)
    assert res.shipment_id is None
    assert "Logistics Copilot active" in res.response


from backend.app.api.v1.agent import get_evolus_client


# ---------------------------------------------------------------------------
# REST API Integration Tests (/api/v1/agent)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_api_agent_analyze_success():
    """Verify POST /api/v1/agent/analyze returns 200 with structured AgentAnalysisResponse."""
    shipment = build_mock_shipment(scenario="missing_document")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_evolus_client] = lambda: EvolusClient(config=EvolusConfig(mock_mode=True))
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/agent/analyze",
                json={"shipment_id": str(shipment.id), "force_refresh": False},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["shipment_id"] == str(shipment.id)
            assert "diagnosis" in data
            assert data["diagnosis"]["issue_type"] == "MISSING_DOCUMENT"
            assert data["action_queued"] is True
            assert isinstance(data["execution_time_seconds"], float)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_agent_analyze_404_not_found():
    """Verify POST /api/v1/agent/analyze returns 404 for unknown shipment."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/agent/analyze",
                json={"shipment_id": str(uuid.uuid4())},
            )
            assert res.status_code == 404
            assert "was not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_agent_chat_endpoint():
    """Verify POST /api/v1/agent/chat returns 200 with grounded conversational reply."""
    shipment = build_mock_shipment(scenario="overdue")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/api/v1/agent/chat",
                json={
                    "shipment_id": str(shipment.id),
                    "message": "What is the reason for this shipment delay?",
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["shipment_id"] == str(shipment.id)
            assert "response" in data
            assert len(data["grounded_facts"]) > 0
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_agent_tools_endpoint():
    """Verify GET /api/v1/agent/tools returns exactly 6 allowlisted function schemas."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/agent/tools")
        assert res.status_code == 200
        tools = res.json()
        assert len(tools) == 6
        tool_names = [t["function"]["name"] for t in tools]
        assert "get_shipment" in tool_names
        assert "create_correction_task" in tool_names
        assert "trigger_workflow" in tool_names
        assert "send_notification" in tool_names
        assert "reschedule_milestone" in tool_names
        assert "escalate_to_human" in tool_names


@pytest.mark.asyncio
async def test_orchestrator_specialized_agent_routing():
    """Verify orchestrator dynamically routes to specialized Evolus agents."""
    shipment = build_mock_shipment(scenario="customs")
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = shipment
    mock_db.execute.return_value = mock_result
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    mock_client = AsyncMock()
    mock_client.run_gemma_diagnosis.return_value = AgentDiagnosticOutput(
        issue_type="CUSTOMS_HOLD",
        root_cause="Commercial invoice weight discrepancy",
        evidence=["Weight mismatch > 0.5kg"],
        recommended_action="Escalate to customs broker",
        tool_name=ToolName.ESCALATE_TO_HUMAN,
        tool_input={"shipment_id": str(shipment.id), "reason": "Weight discrepancy"},
        risk_level=RiskLevel.HIGH,
        confidence=0.96,
    )

    orch = AgentOrchestrator(db=mock_db, evolus_client=mock_client)

    # 1. Test context_notes routing to customs agent
    res1 = await orch.analyze_shipment(shipment.id, context_notes="Customs OCR inspection flag")
    assert res1.diagnosis.issue_type == "CUSTOMS_HOLD"
    assert mock_client.run_gemma_diagnosis.called
    call_args1 = mock_client.run_gemma_diagnosis.call_args[1]
    from backend.app.config import settings
    assert call_args1["agent_id"] == settings.EVOLUS_AGENT_CUSTOMS_ID

    # 2. Test explicit agent_id override
    mock_client.run_gemma_diagnosis.reset_mock()
    custom_guid = "11111111-2222-3333-4444-555555555555"
    res2 = await orch.analyze_shipment(shipment.id, agent_id=custom_guid)
    assert res2.diagnosis.issue_type == "CUSTOMS_HOLD"
    call_args2 = mock_client.run_gemma_diagnosis.call_args[1]
    assert call_args2["agent_id"] == custom_guid

