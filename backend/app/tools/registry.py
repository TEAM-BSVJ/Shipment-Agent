"""
backend/app/tools/registry.py

Allowlisted Tool Registry for the Logistics Bottleneck Resolution Agent.
Enforces RFC 2119 and Rules.md:
  - Zero direct system access for the language model (RULE-E01)
  - Strict allowlist mapping to registered tools (RULE-E02)
  - Hard recursion limit of maximum 5 tool calls per request (RULE-E03)
  - Pre-execution Pydantic schema validation (RULE-E02)
  - Human-in-the-loop approval gate for sensitive operations (RULE-E06)
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Type, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.schemas.enums import (
    ActionType,
    BusinessPriority,
    NotificationChannel,
    RiskLevel,
    ToolName,
)
from backend.app.tools.handlers import (
    handle_create_correction_task,
    handle_escalate_to_human,
    handle_get_shipment,
    handle_reschedule_milestone,
    handle_send_notification,
    handle_trigger_workflow,
)

logger = logging.getLogger("backend.app.tools.registry")

# Hard maximum limit of 5 tool invocations per request per RULE-E03
MAX_TOOL_CALLS_PER_REQUEST: int = 5


# ---------------------------------------------------------------------------
# Tool Exceptions
# ---------------------------------------------------------------------------
class ToolError(Exception):
    """Base exception for all tool registry errors."""
    pass


class UnknownToolError(ToolError):
    """Raised when an agent attempts to execute an unallowlisted tool."""
    pass


class ToolValidationError(ToolError):
    """Raised when tool arguments fail Pydantic schema validation."""
    pass


class MaxToolCallsExceededError(ToolError):
    """Raised when an agent hits the hard recursion limit of 5 tool calls (RULE-E03)."""
    pass


# ---------------------------------------------------------------------------
# Tool Input Schemas
# ---------------------------------------------------------------------------
class ToolInputBase(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class GetShipmentInput(ToolInputBase):
    shipment_id: uuid.UUID
    tracking_number: Optional[str] = None


class CreateCorrectionTaskInput(ToolInputBase):
    shipment_id: uuid.UUID
    description: str = Field(..., min_length=5, max_length=500)
    action_type: ActionType = ActionType.REQUEST_DOCUMENT
    exception_id: Optional[uuid.UUID] = None
    assigned_to: str = "operations_team"
    priority: BusinessPriority = BusinessPriority.MEDIUM


class TriggerWorkflowInput(ToolInputBase):
    shipment_id: uuid.UUID
    workflow_name: str = Field(..., min_length=3, max_length=128)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class SendNotificationInput(ToolInputBase):
    shipment_id: uuid.UUID
    recipient: str = Field(..., min_length=3)
    template_id: str = Field(..., min_length=3)
    parameters: Dict[str, str] = Field(default_factory=dict)
    channel: NotificationChannel = NotificationChannel.EMAIL


class RescheduleMilestoneInput(ToolInputBase):
    shipment_id: uuid.UUID
    milestone_id: uuid.UUID
    new_expected_at: datetime
    reason: str = Field(..., min_length=5, max_length=500)


class EscalateToHumanInput(ToolInputBase):
    shipment_id: uuid.UUID
    reason: str = Field(..., min_length=5, max_length=500)
    exception_id: Optional[uuid.UUID] = None
    urgency: RiskLevel = RiskLevel.HIGH


# ---------------------------------------------------------------------------
# Tool Execution Context & Results
# ---------------------------------------------------------------------------
class ToolExecutionContext(BaseModel):
    """Execution context passed through tool invocations."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    session: Optional[AsyncSession] = None
    tenant_id: Optional[uuid.UUID] = None
    call_count: int = 0
    is_approved: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionResult(BaseModel):
    """Standardized output returned after allowlisted tool execution."""
    tool_name: str
    success: bool
    requires_approval: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    call_count: int = 0
    escalated_to_human: bool = False


# ---------------------------------------------------------------------------
# Tool Definition Spec
# ---------------------------------------------------------------------------
class ToolDefinition:
    """Metadata and execution binding for a registered allowlisted tool."""

    def __init__(
        self,
        name: ToolName,
        description: str,
        input_schema: Type[BaseModel],
        handler: Callable[..., Any],
        requires_approval: bool,
        is_idempotent: bool,
    ):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.handler = handler
        self.requires_approval = requires_approval
        self.is_idempotent = is_idempotent

    def to_schema(self) -> Dict[str, Any]:
        """Generates standard JSON Schema for LLM function/tool calling."""
        return {
            "type": "function",
            "function": {
                "name": self.name.value,
                "description": self.description,
                "parameters": self.input_schema.model_json_schema(),
            },
        }


# ---------------------------------------------------------------------------
# Allowlisted Tool Registry
# ---------------------------------------------------------------------------
class ToolRegistry:
    """
    Central registry governing allowlisted agent actions.
    Enforces tool validation, authorization gates, and recursion cutoff.
    """

    def __init__(self) -> None:
        self._tools: Dict[str, ToolDefinition] = {}
        self._register_allowlisted_tools()

    def _register_allowlisted_tools(self) -> None:
        """Populates the 6 strictly approved logistics tools."""
        self.register(
            ToolDefinition(
                name=ToolName.GET_SHIPMENT,
                description="Retrieve full shipment details, milestones, documents, and active exceptions.",
                input_schema=GetShipmentInput,
                handler=handle_get_shipment,
                requires_approval=False,
                is_idempotent=True,
            )
        )
        self.register(
            ToolDefinition(
                name=ToolName.CREATE_CORRECTION_TASK,
                description="Create an internal correction or document collection task in the database.",
                input_schema=CreateCorrectionTaskInput,
                handler=handle_create_correction_task,
                requires_approval=False,
                is_idempotent=False,
            )
        )
        self.register(
            ToolDefinition(
                name=ToolName.TRIGGER_WORKFLOW,
                description="Start a multi-step resolution automation workflow on Evolus or internal engine.",
                input_schema=TriggerWorkflowInput,
                handler=handle_trigger_workflow,
                requires_approval=True,
                is_idempotent=False,
            )
        )
        self.register(
            ToolDefinition(
                name=ToolName.SEND_NOTIFICATION,
                description="Dispatch a pre-approved parameterized notification to stakeholders (RULE-F03).",
                input_schema=SendNotificationInput,
                handler=handle_send_notification,
                requires_approval=False,
                is_idempotent=False,
            )
        )
        self.register(
            ToolDefinition(
                name=ToolName.RESCHEDULE_MILESTONE,
                description="Update planned milestone timestamp due to verified operational delay (RULE-E06).",
                input_schema=RescheduleMilestoneInput,
                handler=handle_reschedule_milestone,
                requires_approval=True,
                is_idempotent=True,
            )
        )
        self.register(
            ToolDefinition(
                name=ToolName.ESCALATE_TO_HUMAN,
                description="Escalate unresolvable or high-risk exceptions directly to the human operator queue.",
                input_schema=EscalateToHumanInput,
                handler=handle_escalate_to_human,
                requires_approval=False,
                is_idempotent=True,
            )
        )

    def register(self, tool_def: ToolDefinition) -> None:
        """Registers a tool definition under its ToolName string key."""
        key = tool_def.name.value if isinstance(tool_def.name, ToolName) else str(tool_def.name)
        self._tools[key] = tool_def

    def get(self, name: Union[str, ToolName]) -> ToolDefinition:
        """Retrieves a registered tool definition by name or raises UnknownToolError."""
        key = name.value if isinstance(name, ToolName) else str(name)
        if key not in self._tools:
            allowed = list(self._tools.keys())
            raise UnknownToolError(
                f"Tool '{key}' is not registered in the allowlist. Allowed tools: {allowed}"
            )
        return self._tools[key]

    def list_tools(self) -> List[ToolDefinition]:
        """Returns all registered tool definitions."""
        return list(self._tools.values())

    def get_tool_names(self) -> List[str]:
        """Returns string list of all allowlisted tool identifiers."""
        return list(self._tools.keys())

    def get_schemas(self) -> List[Dict[str, Any]]:
        """Returns list of OpenAI/Evolus compatible function calling schemas."""
        return [t.to_schema() for t in self._tools.values()]

    async def execute(
        self,
        name: Union[str, ToolName],
        arguments: Dict[str, Any],
        context: Optional[ToolExecutionContext] = None,
        raise_on_limit: bool = True,
    ) -> ToolExecutionResult:
        """
        Executes a registered tool with recursion limit, schema validation, and approval checks.
        """
        ctx = context or ToolExecutionContext()
        key = name.value if isinstance(name, ToolName) else str(name)

        # 1. Enforce hard recursion limit per RULE-E03
        if ctx.call_count >= MAX_TOOL_CALLS_PER_REQUEST:
            msg = (
                f"Recursion limit reached: Maximum {MAX_TOOL_CALLS_PER_REQUEST} tool invocations "
                f"per request exceeded (RULE-E03). Escalating to human operator."
            )
            logger.error(msg)
            if raise_on_limit:
                raise MaxToolCallsExceededError(msg)
            return ToolExecutionResult(
                tool_name=key,
                success=False,
                requires_approval=False,
                error=msg,
                call_count=ctx.call_count,
                escalated_to_human=True,
            )

        # 2. Enforce allowlist check (RULE-E02)
        tool_def = self.get(key)

        # 3. Validate arguments against Pydantic schema (RULE-E02)
        try:
            validated_input = tool_def.input_schema.model_validate(arguments)
        except ValidationError as exc:
            msg = f"Argument validation failed for tool '{key}': {exc}"
            logger.warning(msg)
            raise ToolValidationError(msg) from exc

        # 4. Increment call counter
        ctx.call_count += 1

        # 5. Execute handler
        try:
            kwargs = validated_input.model_dump()
            kwargs["session"] = ctx.session
            kwargs["tenant_id"] = ctx.tenant_id

            # Pass is_approved for tools that support gating
            if tool_def.requires_approval:
                kwargs["is_approved"] = ctx.is_approved

            data = await tool_def.handler(**kwargs)

            # Check if handler flagged approval requirement
            needs_approval = data.get("requires_approval", tool_def.requires_approval and not ctx.is_approved)

            return ToolExecutionResult(
                tool_name=key,
                success=True,
                requires_approval=needs_approval,
                data=data,
                call_count=ctx.call_count,
            )

        except Exception as exc:
            logger.error("Error executing tool '%s': %s", key, exc, exc_info=True)
            return ToolExecutionResult(
                tool_name=key,
                success=False,
                requires_approval=False,
                error=str(exc),
                call_count=ctx.call_count,
            )


# Global singleton registry instance
registry = ToolRegistry()

