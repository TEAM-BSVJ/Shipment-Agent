"""
backend/app/schemas/domain.py

Pydantic v2 data models and API schemas for the Logistics Bottleneck Resolution Agent.
Provides schema validation, serialization, and ORM conversion for all domain entities.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    MilestoneName,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ShipmentStatus,
    ToolName,
    TransportMode,
)


# ---------------------------------------------------------------------------
# Base Schema Configuration
# ---------------------------------------------------------------------------
class DomainBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------
class MilestoneBase(DomainBaseModel):
    milestone_name: MilestoneName
    expected_at: datetime
    source: str = Field(default="INTERNAL_TMS", description="Source system e.g. WMS, CARRIER_MOCK")


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(DomainBaseModel):
    expected_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_completed: Optional[bool] = None
    source: Optional[str] = None


class MilestoneResponse(MilestoneBase):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: UUID
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Shipment Documents & Extraction
# ---------------------------------------------------------------------------
class DocumentExtractedFields(DomainBaseModel):
    invoice_number: Optional[str] = None
    issuer: Optional[str] = None
    consignee: Optional[str] = None
    total_weight_kg: Optional[float] = Field(default=None, ge=0.0)
    declared_value: Optional[float] = Field(default=None, ge=0.0)
    currency: Optional[str] = Field(default="USD", max_length=3)
    issue_date: Optional[date] = None
    notes: Optional[str] = None
    raw_text_snippet: Optional[str] = None


class DocumentCreate(DomainBaseModel):
    document_type: DocumentType
    file_ref: str = Field(description="Storage path or URI to the document file")
    expiry_date: Optional[date] = None


class DocumentUpdate(DomainBaseModel):
    validation_status: Optional[DocumentValidationStatus] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    rejection_reason: Optional[str] = None


class DocumentResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: UUID
    document_type: DocumentType
    file_ref: str
    extraction_id: Optional[str] = None
    extracted_fields: Optional[DocumentExtractedFields] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    validation_status: DocumentValidationStatus = DocumentValidationStatus.PENDING
    validated_by: Optional[UUID] = None
    expiry_date: Optional[date] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Shipments
# ---------------------------------------------------------------------------
class ShipmentBase(DomainBaseModel):
    tracking_number: str = Field(..., min_length=3, max_length=64)
    origin: str = Field(..., min_length=2, max_length=128)
    destination: str = Field(..., min_length=2, max_length=128)
    mode: TransportMode = TransportMode.ROAD
    carrier_id: str = Field(default="MOCK_CARRIER_01", max_length=64)
    promised_delivery_date: date
    business_priority: BusinessPriority = BusinessPriority.MEDIUM
    tenant_id: UUID = Field(default_factory=uuid4)


class ShipmentCreate(ShipmentBase):
    initial_milestones: Optional[List[MilestoneCreate]] = None


class ShipmentUpdate(DomainBaseModel):
    status: Optional[ShipmentStatus] = None
    carrier_id: Optional[str] = None
    promised_delivery_date: Optional[date] = None
    business_priority: Optional[BusinessPriority] = None


class ShipmentResponse(ShipmentBase):
    id: UUID = Field(default_factory=uuid4)
    status: ShipmentStatus = ShipmentStatus.BOOKED
    risk_score: int = Field(default=0, ge=0, le=100)
    risk_level: RiskLevel = RiskLevel.LOW
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    milestones: List[MilestoneResponse] = Field(default_factory=list)
    documents: List[DocumentResponse] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Shipment Tracking Events (Telemetry)
# ---------------------------------------------------------------------------
class EventIngest(DomainBaseModel):
    shipment_id: UUID
    event_type: str = Field(..., min_length=2, max_length=64)
    event_data: Dict[str, Any] = Field(default_factory=dict)
    source: str = Field(default="MOCK_TELEMETRY", max_length=64)
    event_at: datetime = Field(default_factory=datetime.utcnow)
    idempotency_key: str = Field(..., min_length=8, max_length=128)


class EventResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: UUID
    event_type: str
    event_data: Dict[str, Any]
    source: str
    event_at: datetime
    idempotency_key: str


# ---------------------------------------------------------------------------
# Exceptions & Bottlenecks
# ---------------------------------------------------------------------------
class ExceptionCreate(DomainBaseModel):
    shipment_id: UUID
    exception_type: ExceptionType
    risk_level: RiskLevel = RiskLevel.MEDIUM
    description: str
    evidence: List[str] = Field(default_factory=list)
    root_cause: Optional[str] = None


class ExceptionUpdate(DomainBaseModel):
    status: Optional[ExceptionStatus] = None
    risk_level: Optional[RiskLevel] = None
    root_cause: Optional[str] = None
    resolved_by: Optional[str] = None


class ExceptionResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: UUID
    exception_type: ExceptionType
    risk_level: RiskLevel
    status: ExceptionStatus = ExceptionStatus.OPEN
    description: str
    evidence: Optional[List[str]] = Field(default_factory=list)
    root_cause: Optional[str] = None
    detected_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None


# ---------------------------------------------------------------------------
# Corrective Actions & Tool Executions
# ---------------------------------------------------------------------------
class CorrectiveActionCreate(DomainBaseModel):
    exception_id: UUID
    action_type: ActionType
    tool_used: ToolName
    input_data: Dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str = Field(..., min_length=8, max_length=128)


class CorrectiveActionResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    exception_id: UUID
    action_type: ActionType
    status: ActionStatus = ActionStatus.PENDING
    tool_used: ToolName
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Optional[Dict[str, Any]] = None
    idempotency_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Human-in-the-Loop Approvals
# ---------------------------------------------------------------------------
class ApprovalDecisionRequest(DomainBaseModel):
    decision: ApprovalDecision
    reviewer_id: UUID
    reason: str = Field(..., min_length=3, max_length=512)


class ApprovalResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    action_id: UUID
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[UUID] = None
    decision: ApprovalDecision = ApprovalDecision.PENDING
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
class NotificationCreate(DomainBaseModel):
    shipment_id: UUID
    recipient: str
    channel: NotificationChannel = NotificationChannel.EMAIL
    template_id: str
    content: str
    idempotency_key: str


class NotificationResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    shipment_id: UUID
    recipient: str
    channel: NotificationChannel
    template_id: str
    content: str
    status: NotificationStatus = NotificationStatus.QUEUED
    idempotency_key: str
    sent_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------
class AuditLogCreate(DomainBaseModel):
    entity_type: str = Field(..., max_length=64)
    entity_id: UUID
    action: str = Field(..., max_length=64)
    actor_type: str = Field(default="AGENT", max_length=32)
    actor_id: str = Field(default="Evolus-Gemma4-Agent", max_length=64)
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditLogResponse(DomainBaseModel):
    id: UUID = Field(default_factory=uuid4)
    entity_type: str
    entity_id: UUID
    action: str
    actor_type: str
    actor_id: str
    details: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# AI Agent Reasoning & Diagnosis Contracts
# ---------------------------------------------------------------------------
class AgentDiagnosticOutput(DomainBaseModel):
    """Structured JSON schema output returned by Evolus Gemma 4 31B-it."""
    issue_type: str
    root_cause: str
    evidence: List[str]
    recommended_action: str
    tool_name: ToolName
    tool_input: Dict[str, Any] = Field(default_factory=dict)
    risk_level: RiskLevel
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)


class AgentAnalysisRequest(DomainBaseModel):
    shipment_id: UUID
    force_refresh: bool = False
    context_notes: Optional[str] = None
    agent_id: Optional[str] = None


class AgentAnalysisResponse(DomainBaseModel):
    shipment_id: UUID
    diagnosis: AgentDiagnosticOutput
    action_queued: bool
    requires_human_approval: bool
    execution_time_seconds: float


class AgentChatRequest(DomainBaseModel):
    shipment_id: Optional[UUID] = None
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


class AgentChatResponse(DomainBaseModel):
    response: str
    shipment_id: Optional[UUID] = None
    grounded_facts: List[str] = Field(default_factory=list)
    recommended_action: Optional[str] = None

