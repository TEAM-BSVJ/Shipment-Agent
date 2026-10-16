"""
backend/app/models/entities.py

SQLAlchemy 2.0 ORM Mapped Models for the Logistics Bottleneck Resolution Agent.
Implements the 9 relational tables specified in Architecture.md with relationships,
foreign key cascades, and operational indexes.
"""

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.schemas.enums import (
    ActionStatus,
    ApprovalDecision,
    BusinessPriority,
    DocumentValidationStatus,
    ExceptionStatus,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ShipmentStatus,
    TransportMode,
)

# Cross-dialect JSON type (JSONB on PostgreSQL, standard JSON fallback)
GenericJSON = JSON().with_variant(JSONB, "postgresql")


class Shipment(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    """Core freight shipment record tracked across multimodal milestone points."""

    __tablename__ = "shipments"

    tracking_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=ShipmentStatus.BOOKED.value, index=True, nullable=False)
    origin: Mapped[str] = mapped_column(String(128), nullable=False)
    destination: Mapped[str] = mapped_column(String(128), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), default=TransportMode.ROAD.value, nullable=False)
    carrier_id: Mapped[str] = mapped_column(String(64), default="MOCK_CARRIER_01", nullable=False)
    promised_delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    business_priority: Mapped[str] = mapped_column(String(16), default=BusinessPriority.MEDIUM.value, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), default=RiskLevel.LOW.value, nullable=False)

    # Relationships with cascading lifecycle
    milestones: Mapped[List["ShipmentMilestone"]] = relationship(
        "ShipmentMilestone",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="ShipmentMilestone.expected_at",
        lazy="selectin",
    )
    documents: Mapped[List["ShipmentDocument"]] = relationship(
        "ShipmentDocument",
        back_populates="shipment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    events: Mapped[List["ShipmentEvent"]] = relationship(
        "ShipmentEvent",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="ShipmentEvent.event_at.desc()",
        lazy="selectin",
    )
    exceptions: Mapped[List["ShipmentException"]] = relationship(
        "ShipmentException",
        back_populates="shipment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="shipment",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("idx_shipments_tenant_tracking", "tenant_id", "tracking_number"),
        Index("idx_shipments_status_risk", "status", "risk_level"),
    )


class ShipmentMilestone(Base, UUIDPrimaryKeyMixin):
    """Chronological milestone check-in points for transit monitoring."""

    __tablename__ = "shipment_milestones"

    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    milestone_name: Mapped[str] = mapped_column(String(64), nullable=False)
    expected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="INTERNAL_TMS", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="milestones")

    __table_args__ = (
        Index("idx_milestones_overdue", "is_completed", "expected_at"),
    )


class ShipmentDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Digitized shipping document with extracted metadata and validation status."""

    __tablename__ = "shipment_documents"

    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    file_ref: Mapped[str] = mapped_column(String(256), nullable=False)
    extraction_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    extracted_fields: Mapped[Optional[Dict[str, Any]]] = mapped_column(GenericJSON, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    validation_status: Mapped[str] = mapped_column(
        String(32),
        default=DocumentValidationStatus.PENDING.value,
        index=True,
        nullable=False,
    )
    validated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="documents")


class ShipmentEvent(Base, UUIDPrimaryKeyMixin):
    """Raw telemetry and state-change events ingested from carriers and warehouses."""

    __tablename__ = "shipment_events"

    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    event_data: Mapped[Dict[str, Any]] = mapped_column(GenericJSON, default=dict, nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="MOCK_TELEMETRY", nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="events")


class ShipmentException(Base, UUIDPrimaryKeyMixin):
    """Operational bottlenecks, documentation errors, and milestone delay exceptions."""

    __tablename__ = "exceptions"

    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    exception_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), default=RiskLevel.MEDIUM.value, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=ExceptionStatus.OPEN.value, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[List[str]] = mapped_column(GenericJSON, default=list, nullable=False)
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="exceptions")
    corrective_actions: Mapped[List["CorrectiveAction"]] = relationship(
        "CorrectiveAction",
        back_populates="exception",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CorrectiveAction(Base, UUIDPrimaryKeyMixin):
    """Tool invocation or workflow task triggered to remediate an exception."""

    __tablename__ = "corrective_actions"

    exception_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exceptions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=ActionStatus.PENDING.value, index=True, nullable=False)
    tool_used: Mapped[str] = mapped_column(String(64), nullable=False)
    input_data: Mapped[Dict[str, Any]] = mapped_column(GenericJSON, default=dict, nullable=False)
    output_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(GenericJSON, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    exception: Mapped["ShipmentException"] = relationship("ShipmentException", back_populates="corrective_actions")
    approval: Mapped[Optional["Approval"]] = relationship(
        "Approval",
        back_populates="action",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Approval(Base, UUIDPrimaryKeyMixin):
    """Human-in-the-Loop decision gate for sensitive operational actions."""

    __tablename__ = "approvals"

    action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("corrective_actions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    decision: Mapped[str] = mapped_column(String(16), default=ApprovalDecision.PENDING.value, index=True, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    action: Mapped["CorrectiveAction"] = relationship("CorrectiveAction", back_populates="approval")


class Notification(Base, UUIDPrimaryKeyMixin):
    """Pre-approved advisory communication dispatched to external stakeholders."""

    __tablename__ = "notifications"

    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    recipient: Mapped[str] = mapped_column(String(128), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), default=NotificationChannel.EMAIL.value, nullable=False)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=NotificationStatus.QUEUED.value, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    shipment: Mapped["Shipment"] = relationship("Shipment", back_populates="notifications")


class AuditLog(Base, UUIDPrimaryKeyMixin):
    """Immutable audit trail recording every event, AI inference, and human sign-off."""

    __tablename__ = "audit_logs"

    entity_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    actor_type: Mapped[str] = mapped_column(String(32), default="AGENT", nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), default="Evolus-Gemma4-Agent", nullable=False)
    details: Mapped[Dict[str, Any]] = mapped_column(GenericJSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_audit_entity", "entity_type", "entity_id"),
        Index("idx_audit_created", "created_at"),
    )
