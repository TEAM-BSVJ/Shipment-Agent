"""
backend/app/services/shipment_service.py

Service layer implementing business logic for freight shipment lifecycle,
milestone timeline progression, and carrier/WMS telemetry event ingestion.
Adheres to multi-tenant isolation (RULE-F04) and idempotency invariants.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.config import get_settings
from backend.app.models.entities import (
    AuditLog,
    Shipment,
    ShipmentEvent,
    ShipmentMilestone,
)
from backend.app.schemas.domain import (
    EventIngest,
    ShipmentCreate,
)
from backend.app.schemas.enums import (
    MilestoneName,
    RiskLevel,
    ShipmentStatus,
)

logger = logging.getLogger("backend.app.services.shipment_service")
settings = get_settings()

DEFAULT_TENANT_ID: uuid.UUID = uuid.UUID("a0000000-0000-0000-0000-000000000001")


class ShipmentError(Exception):
    """Base exception for shipment service operations."""
    pass


class ShipmentDuplicateError(ShipmentError):
    """Raised when attempting to create a shipment with a duplicate tracking number."""
    pass


class ShipmentNotFoundError(ShipmentError):
    """Raised when a specified shipment is not found."""
    pass


class ShipmentService:
    """Encapsulates transactional business logic for shipments and telemetry."""

    @staticmethod
    async def list_shipments(
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        business_priority: Optional[str] = None,
        risk_level: Optional[str] = None,
        mode: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Shipment], int]:
        """
        Queries shipments with filtering and pagination.
        Returns a tuple of (shipments_list, total_count).
        """
        tid = tenant_id or DEFAULT_TENANT_ID

        # Base query with eager-loading for relational integrity
        query = (
            select(Shipment)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.documents),
                selectinload(Shipment.exceptions),
                selectinload(Shipment.notifications),
            )
            .where(Shipment.tenant_id == tid)
        )

        count_query = select(func.count(Shipment.id)).where(Shipment.tenant_id == tid)

        # Filters
        if status:
            query = query.where(Shipment.status == status.upper())
            count_query = count_query.where(Shipment.status == status.upper())

        if business_priority:
            query = query.where(Shipment.business_priority == business_priority.upper())
            count_query = count_query.where(Shipment.business_priority == business_priority.upper())

        if risk_level:
            query = query.where(Shipment.risk_level == risk_level.upper())
            count_query = count_query.where(Shipment.risk_level == risk_level.upper())

        if mode:
            query = query.where(Shipment.mode == mode.upper())
            count_query = count_query.where(Shipment.mode == mode.upper())

        if search:
            search_filter = or_(
                Shipment.tracking_number.ilike(f"%{search}%"),
                Shipment.origin.ilike(f"%{search}%"),
                Shipment.destination.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Execute total count
        count_res = await db.execute(count_query)
        total_count = count_res.scalar() or 0

        # Order and paginate
        query = query.order_by(Shipment.created_at.desc()).offset(skip).limit(limit)
        res = await db.execute(query)
        shipments = list(res.scalars().all())

        return shipments, total_count

    @staticmethod
    async def get_shipment_by_id(
        db: AsyncSession,
        shipment_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Optional[Shipment]:
        """Retrieves a shipment by UUID with its full relational graph."""
        tid = tenant_id or DEFAULT_TENANT_ID
        query = (
            select(Shipment)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.documents),
                selectinload(Shipment.events),
                selectinload(Shipment.exceptions),
                selectinload(Shipment.notifications),
            )
            .where(Shipment.id == shipment_id, Shipment.tenant_id == tid)
        )
        res = await db.execute(query)
        return res.scalars().first()

    @staticmethod
    async def get_shipment_by_tracking(
        db: AsyncSession,
        tracking_number: str,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Optional[Shipment]:
        """Retrieves a shipment by unique tracking number."""
        tid = tenant_id or DEFAULT_TENANT_ID
        query = (
            select(Shipment)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.documents),
                selectinload(Shipment.events),
                selectinload(Shipment.exceptions),
                selectinload(Shipment.notifications),
            )
            .where(Shipment.tracking_number == tracking_number, Shipment.tenant_id == tid)
        )
        res = await db.execute(query)
        return res.scalars().first()

    @staticmethod
    async def create_shipment(
        db: AsyncSession,
        shipment_in: ShipmentCreate,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Shipment:
        """
        Creates a new shipment record, instantiates initial milestones,
        and logs an audit trail event.
        """
        tid = tenant_id or shipment_in.tenant_id or DEFAULT_TENANT_ID

        # Verify tracking number uniqueness
        existing = await ShipmentService.get_shipment_by_tracking(db, shipment_in.tracking_number, tid)
        if existing:
            raise ShipmentDuplicateError(f"Shipment with tracking number '{shipment_in.tracking_number}' already exists.")

        shipment = Shipment(
            id=uuid.uuid4(),
            tenant_id=tid,
            tracking_number=shipment_in.tracking_number,
            status=ShipmentStatus.BOOKED.value,
            origin=shipment_in.origin,
            destination=shipment_in.destination,
            mode=shipment_in.mode.value if hasattr(shipment_in.mode, "value") else str(shipment_in.mode),
            carrier_id=shipment_in.carrier_id,
            promised_delivery_date=shipment_in.promised_delivery_date,
            business_priority=(
                shipment_in.business_priority.value
                if hasattr(shipment_in.business_priority, "value")
                else str(shipment_in.business_priority)
            ),
            risk_score=0,
            risk_level=RiskLevel.LOW.value,
        )
        db.add(shipment)

        # Initial milestones
        if shipment_in.initial_milestones:
            now_utc = datetime.now(timezone.utc)
            for m_in in shipment_in.initial_milestones:
                m_name = (
                    m_in.milestone_name.value
                    if hasattr(m_in.milestone_name, "value")
                    else str(m_in.milestone_name)
                )
                milestone = ShipmentMilestone(
                    id=uuid.uuid4(),
                    shipment_id=shipment.id,
                    milestone_name=m_name,
                    expected_at=m_in.expected_at,
                    source=m_in.source,
                    is_completed=False,
                    created_at=now_utc,
                )
                db.add(milestone)

        # Audit log entry
        audit_entry = AuditLog(
            id=uuid.uuid4(),
            entity_type="shipment",
            entity_id=shipment.id,
            action="SHIPMENT_CREATED",
            actor_type="API",
            actor_id="OPERATOR",
            details={
                "tracking_number": shipment.tracking_number,
                "origin": shipment.origin,
                "destination": shipment.destination,
                "mode": shipment.mode,
            },
        )
        db.add(audit_entry)

        await db.commit()

        # Reload with eager loaded relationships
        return await ShipmentService.get_shipment_by_id(db, shipment.id, tid)  # type: ignore

    @staticmethod
    async def ingest_event(
        db: AsyncSession,
        shipment_id: uuid.UUID,
        event_in: EventIngest,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Tuple[ShipmentEvent, bool]:
        """
        Ingests tracking telemetry with strict idempotency (RULE-C01, TASK-014).
        If idempotency_key is seen, returns the existing record without duplicate state changes.
        Advances milestone completion if the event corresponds to a milestone.
        Returns (event_instance, was_created).
        """
        tid = tenant_id or DEFAULT_TENANT_ID

        # 1. Idempotency verification
        stmt = select(ShipmentEvent).where(ShipmentEvent.idempotency_key == event_in.idempotency_key)
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            logger.info("Duplicate event ignored due to idempotency_key: %s", event_in.idempotency_key)
            return existing, False

        # 2. Shipment verification
        shipment = await ShipmentService.get_shipment_by_id(db, shipment_id, tid)
        if not shipment:
            raise ShipmentNotFoundError(f"Shipment with ID '{shipment_id}' not found.")

        # 3. Create event entity
        event_at = event_in.event_at or datetime.now(timezone.utc)
        event = ShipmentEvent(
            id=uuid.uuid4(),
            shipment_id=shipment_id,
            event_type=event_in.event_type,
            event_data=event_in.event_data or {},
            source=event_in.source,
            event_at=event_at,
            idempotency_key=event_in.idempotency_key,
        )
        db.add(event)

        # 4. Check if event advances a milestone
        event_type_norm = event_in.event_type.strip().upper()
        milestone_target = None
        for m in shipment.milestones:
            if m.milestone_name.strip().upper() == event_type_norm:
                milestone_target = m
                break
            # Also check if event_data explicitly names the milestone
            if event_in.event_data and event_in.event_data.get("milestone_name"):
                named_m = str(event_in.event_data["milestone_name"]).strip().upper()
                if m.milestone_name.strip().upper() == named_m:
                    milestone_target = m
                    break

        if milestone_target and not milestone_target.is_completed:
            milestone_target.is_completed = True
            milestone_target.completed_at = event_at
            logger.info(
                "Shipment %s milestone %s marked completed at %s via event %s",
                shipment.tracking_number,
                milestone_target.milestone_name,
                event_at,
                event_in.event_type,
            )

        # 5. Audit log entry
        audit_entry = AuditLog(
            id=uuid.uuid4(),
            entity_type="shipment_event",
            entity_id=event.id,
            action="EVENT_INGESTED",
            actor_type="TELEMETRY",
            actor_id=event_in.source,
            details={
                "event_type": event_in.event_type,
                "shipment_id": str(shipment_id),
                "idempotency_key": event_in.idempotency_key,
                "milestone_completed": milestone_target.milestone_name if milestone_target else None,
            },
        )
        db.add(audit_entry)

        await db.commit()
        await db.refresh(event)

        return event, True


_shipment_service_instance = ShipmentService()


def get_shipment_service() -> ShipmentService:
    """Dependency provider returning singleton ShipmentService."""
    return _shipment_service_instance
