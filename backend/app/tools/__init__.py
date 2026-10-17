"""
backend/app/tools/__init__.py

Central export module for the allowlisted tool execution engine.
"""

from backend.app.schemas.enums import ToolName
from backend.app.tools.handlers import (
    APPROVED_NOTIFICATION_TEMPLATES,
    handle_create_correction_task,
    handle_escalate_to_human,
    handle_get_shipment,
    handle_reschedule_milestone,
    handle_send_notification,
    handle_trigger_workflow,
)
from backend.app.tools.registry import (
    MAX_TOOL_CALLS_PER_REQUEST,
    CreateCorrectionTaskInput,
    EscalateToHumanInput,
    GetShipmentInput,
    MaxToolCallsExceededError,
    RescheduleMilestoneInput,
    SendNotificationInput,
    ToolDefinition,
    ToolError,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolRegistry,
    ToolValidationError,
    TriggerWorkflowInput,
    UnknownToolError,
    registry,
)

__all__ = [
    "ToolName",
    "MAX_TOOL_CALLS_PER_REQUEST",
    "ToolError",
    "UnknownToolError",
    "ToolValidationError",
    "MaxToolCallsExceededError",
    "GetShipmentInput",
    "CreateCorrectionTaskInput",
    "TriggerWorkflowInput",
    "SendNotificationInput",
    "RescheduleMilestoneInput",
    "EscalateToHumanInput",
    "ToolExecutionContext",
    "ToolExecutionResult",
    "ToolDefinition",
    "ToolRegistry",
    "registry",
    "APPROVED_NOTIFICATION_TEMPLATES",
    "handle_get_shipment",
    "handle_create_correction_task",
    "handle_trigger_workflow",
    "handle_send_notification",
    "handle_reschedule_milestone",
    "handle_escalate_to_human",
]

