"""
backend/tests/test_tools.py

Unit tests verifying the Allowlisted Tool Registry, handlers, input validation,
approval gating, and the hard recursion limit of 5 tool calls (RULE-E01, E02, E03, E06).
"""

import uuid
from datetime import datetime, timedelta
import pytest
from pydantic import ValidationError

from backend.app.schemas.enums import (
    ActionType,
    BusinessPriority,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ToolName,
)
from backend.app.tools import (
    MAX_TOOL_CALLS_PER_REQUEST,
    CreateCorrectionTaskInput,
    EscalateToHumanInput,
    GetShipmentInput,
    MaxToolCallsExceededError,
    RescheduleMilestoneInput,
    SendNotificationInput,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolRegistry,
    ToolValidationError,
    TriggerWorkflowInput,
    UnknownToolError,
    registry,
)


def test_registry_contains_exactly_six_allowlisted_tools():
    """Verify that only the 6 allowlisted tools are registered in the registry."""
    tools = registry.list_tools()
    assert len(tools) == 6

    expected_tools = {
        "get_shipment",
        "create_correction_task",
        "trigger_workflow",
        "send_notification",
        "reschedule_milestone",
        "escalate_to_human",
    }
    registered_names = set(registry.get_tool_names())
    assert registered_names == expected_tools


def test_unknown_tool_rejection():
    """Verify that calling an unallowlisted tool raises UnknownToolError (RULE-E01, RULE-E02)."""
    with pytest.raises(UnknownToolError) as exc_info:
        registry.get("execute_shell")
    assert "not registered in the allowlist" in str(exc_info.value)

    with pytest.raises(UnknownToolError):
        registry.get("run_raw_sql")

    with pytest.raises(UnknownToolError):
        registry.get("delete_database")


def test_approval_flags_match_specification():
    """Verify approval gating policy: reschedule_milestone and trigger_workflow require approval (RULE-E06)."""
    assert registry.get(ToolName.GET_SHIPMENT).requires_approval is False
    assert registry.get(ToolName.CREATE_CORRECTION_TASK).requires_approval is False
    assert registry.get(ToolName.SEND_NOTIFICATION).requires_approval is False
    assert registry.get(ToolName.ESCALATE_TO_HUMAN).requires_approval is False

    # Consequential actions MUST require human approval
    assert registry.get(ToolName.TRIGGER_WORKFLOW).requires_approval is True
    assert registry.get(ToolName.RESCHEDULE_MILESTONE).requires_approval is True


@pytest.mark.asyncio
async def test_tool_argument_validation():
    """Verify strict Pydantic schema validation on tool arguments (RULE-E02)."""
    # Missing required shipment_id
    with pytest.raises(ToolValidationError):
        await registry.execute(ToolName.GET_SHIPMENT, {})

    # Invalid UUID format
    with pytest.raises(ToolValidationError):
        await registry.execute(ToolName.GET_SHIPMENT, {"shipment_id": "not-a-valid-uuid"})

    # Description too short for correction task (min_length=5)
    with pytest.raises(ToolValidationError):
        await registry.execute(
            ToolName.CREATE_CORRECTION_TASK,
            {
                "shipment_id": str(uuid.uuid4()),
                "description": "abc",
            },
        )

    # Extra unauthorized parameters forbidden (extra="forbid")
    with pytest.raises(ToolValidationError):
        await registry.execute(
            ToolName.GET_SHIPMENT,
            {
                "shipment_id": str(uuid.uuid4()),
                "malicious_extra_field": "injected",
            },
        )


@pytest.mark.asyncio
async def test_hard_recursion_limit_enforced():
    """Verify hard recursion limit of maximum 5 tool calls per request (RULE-E03)."""
    ctx = ToolExecutionContext(call_count=0)
    shipment_id = str(uuid.uuid4())

    # Invocations 1 through 5 should succeed
    for i in range(1, 6):
        result = await registry.execute(
            ToolName.GET_SHIPMENT,
            {"shipment_id": shipment_id},
            context=ctx,
        )
        assert result.success is True
        assert result.call_count == i

    assert ctx.call_count == 5

    # 6th invocation must trigger recursion cutoff
    with pytest.raises(MaxToolCallsExceededError) as exc_info:
        await registry.execute(
            ToolName.GET_SHIPMENT,
            {"shipment_id": shipment_id},
            context=ctx,
            raise_on_limit=True,
        )
    assert "Recursion limit reached: Maximum 5 tool invocations per request exceeded" in str(exc_info.value)

    # Non-raising mode returns an escalation error
    fallback_result = await registry.execute(
        ToolName.GET_SHIPMENT,
        {"shipment_id": shipment_id},
        context=ctx,
        raise_on_limit=False,
    )
    assert fallback_result.success is False
    assert fallback_result.escalated_to_human is True
    assert "Recursion limit reached" in fallback_result.error


@pytest.mark.asyncio
async def test_execute_get_shipment():
    """Verify execution of get_shipment returns structured metadata."""
    shipment_id = uuid.uuid4()
    result = await registry.execute(
        ToolName.GET_SHIPMENT,
        {"shipment_id": str(shipment_id)},
    )
    assert result.success is True
    assert result.requires_approval is False
    assert result.data["shipment_id"] == str(shipment_id)
    assert "risk_score" in result.data


@pytest.mark.asyncio
async def test_execute_create_correction_task():
    """Verify execution of create_correction_task creates task without human gating."""
    shipment_id = uuid.uuid4()
    result = await registry.execute(
        ToolName.CREATE_CORRECTION_TASK,
        {
            "shipment_id": str(shipment_id),
            "description": "Request revised commercial invoice with matching total weight",
            "action_type": ActionType.REQUEST_DOCUMENT.value,
            "priority": BusinessPriority.HIGH.value,
        },
    )
    assert result.success is True
    assert result.requires_approval is False
    assert result.data["shipment_id"] == str(shipment_id)
    assert result.data["action_type"] == ActionType.REQUEST_DOCUMENT.value
    assert "task_id" in result.data


@pytest.mark.asyncio
async def test_execute_trigger_workflow_approval_gate():
    """Verify trigger_workflow is held for human approval when unapproved, and executed when authorized."""
    shipment_id = uuid.uuid4()
    args = {
        "shipment_id": str(shipment_id),
        "workflow_name": "missing_document_workflow",
        "parameters": {"doc_type": "COMMERCIAL_INVOICE"},
    }

    # Case 1: Unapproved -> Pauses in approval queue
    ctx_unapproved = ToolExecutionContext(is_approved=False)
    result1 = await registry.execute(ToolName.TRIGGER_WORKFLOW, args, context=ctx_unapproved)
    assert result1.success is True
    assert result1.requires_approval is True
    assert result1.data["status"] == "QUEUED_FOR_APPROVAL"
    assert "approval_id" in result1.data

    # Case 2: Pre-approved -> Dispatches workflow directly
    ctx_approved = ToolExecutionContext(is_approved=True)
    result2 = await registry.execute(ToolName.TRIGGER_WORKFLOW, args, context=ctx_approved)
    assert result2.success is True
    assert result2.requires_approval is False
    assert result2.data["status"] == "EXECUTED"
    assert "workflow_run_id" in result2.data


@pytest.mark.asyncio
async def test_execute_reschedule_milestone_approval_gate():
    """Verify reschedule_milestone requires human approval per RULE-E06."""
    shipment_id = uuid.uuid4()
    milestone_id = uuid.uuid4()
    new_date = datetime.utcnow() + timedelta(days=2)
    args = {
        "shipment_id": str(shipment_id),
        "milestone_id": str(milestone_id),
        "new_expected_at": new_date.isoformat(),
        "reason": "Vessel mechanical failure delayed berthing at destination port",
    }

    # Case 1: Unapproved -> Held in queue
    ctx_unapproved = ToolExecutionContext(is_approved=False)
    result1 = await registry.execute(ToolName.RESCHEDULE_MILESTONE, args, context=ctx_unapproved)
    assert result1.success is True
    assert result1.requires_approval is True
    assert result1.data["status"] == "QUEUED_FOR_APPROVAL"
    assert "approval_id" in result1.data

    # Case 2: Approved -> Reschedules timestamp
    ctx_approved = ToolExecutionContext(is_approved=True)
    result2 = await registry.execute(ToolName.RESCHEDULE_MILESTONE, args, context=ctx_approved)
    assert result2.success is True
    assert result2.requires_approval is False
    assert result2.data["status"] == "RESCHEDULED"


@pytest.mark.asyncio
async def test_execute_send_notification_template():
    """Verify pre-approved notification dispatch without unverified free-form text (RULE-F03)."""
    shipment_id = uuid.uuid4()
    result = await registry.execute(
        ToolName.SEND_NOTIFICATION,
        {
            "shipment_id": str(shipment_id),
            "recipient": "shipper_ops@example.com",
            "template_id": "TEMPLATE_DOC_REQUEST_V1",
            "parameters": {
                "tracking_number": "SHP-101",
                "document_type": "Commercial Invoice",
            },
            "channel": NotificationChannel.EMAIL.value,
        },
    )
    assert result.success is True
    assert result.requires_approval is False
    assert result.data["status"] == NotificationStatus.SENT.value
    assert "Commercial Invoice" in result.data["content"]
    assert "SHP-101" in result.data["content"]

    # Reject unapproved template
    failed_result = await registry.execute(
        ToolName.SEND_NOTIFICATION,
        {
            "shipment_id": str(shipment_id),
            "recipient": "carrier@example.com",
            "template_id": "NON_EXISTENT_TEMPLATE",
            "parameters": {},
        },
    )
    assert failed_result.success is False
    assert "Invalid template_id" in failed_result.error


@pytest.mark.asyncio
async def test_execute_escalate_to_human():
    """Verify escalate_to_human directly dispatches to the operator queue."""
    shipment_id = uuid.uuid4()
    result = await registry.execute(
        ToolName.ESCALATE_TO_HUMAN,
        {
            "shipment_id": str(shipment_id),
            "reason": "Customs rejected paperwork for undeclared hazardous materials classification",
            "urgency": RiskLevel.CRITICAL.value,
        },
    )
    assert result.success is True
    assert result.requires_approval is False
    assert result.data["status"] == "ESCALATED"
    assert result.data["urgency"] == RiskLevel.CRITICAL.value
    assert "escalation_id" in result.data


def test_tool_schemas_export_for_llm():
    """Verify registry exports valid OpenAI / Evolus function calling tool definitions."""
    schemas = registry.get_schemas()
    assert len(schemas) == 6
    for tool_schema in schemas:
        assert tool_schema["type"] == "function"
        fn = tool_schema["function"]
        assert "name" in fn
        assert "description" in fn
        assert "parameters" in fn
        assert "properties" in fn["parameters"]
