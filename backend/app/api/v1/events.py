"""
backend/app/api/v1/events.py

FastAPI router handling tracking telemetry and milestone events.
Enforces idempotency keys (TASK-014) to prevent duplicate processing from carrier pings.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.entities import ShipmentEvent
from backend.app.schemas.domain import (
    DomainBaseModel,
    EventIngest,
    EventResponse,
)
from backend.app.services.shipment_service import (
    DEFAULT_TENANT_ID,
    ShipmentNotFoundError,
    ShipmentService,
    get_shipment_service,
)

logger = logging.getLogger("backend.app.api.v1.events")
router = APIRouter(prefix="/shipments", tags=["Telemetry & Events"])


class EventIngestPayload(DomainBaseModel):
    """Payload for event ingestion where shipment_id is supplied in the URL path."""

    event_type: str = Field(..., min_length=2, max_length=64, description="Event or milestone name")
    event_data: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary")
    source: str = Field(default="MOCK_TELEMETRY", max_length=64, description="Originating system or sensor")
    event_at: Optional[datetime] = Field(default=None, description="Timestamp when event occurred")
    idempotency_key: str = Field(..., min_length=8, max_length=128, description="Unique client idempotency token")


@router.post(
    "/{id}/events",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest carrier or warehouse tracking event with idempotency",
)
async def ingest_shipment_event(
    id: uuid.UUID,
    payload: EventIngestPayload,
    response: Response,
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    service: ShipmentService = Depends(get_shipment_service),
) -> EventResponse:
    """
    Ingests tracking telemetry for a specific shipment.
    Guarantees idempotency via `idempotency_key`: if an event with this key was already ingested,
    it returns the existing record without duplicate state changes (HTTP 200).
    """
    tenant_id = x_tenant_id or DEFAULT_TENANT_ID

    event_in = EventIngest(
        shipment_id=id,
        event_type=payload.event_type,
        event_data=payload.event_data,
        source=payload.source,
        event_at=payload.event_at or datetime.now(timezone.utc),
        idempotency_key=payload.idempotency_key,
    )

    try:
        event, was_created = await service.ingest_event(
            db=db,
            shipment_id=id,
            event_in=event_in,
            tenant_id=tenant_id,
        )

        if not was_created:
            # Idempotent response returns HTTP 200 OK instead of 201 Created
            response.status_code = status.HTTP_200_OK

        return EventResponse.model_validate(event)

    except (KeyError, ShipmentNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/{id}/events",
    response_model=List[EventResponse],
    summary="List chronological telemetry events for a shipment",
)
async def list_shipment_events(
    id: uuid.UUID,
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    service: ShipmentService = Depends(get_shipment_service),
) -> List[EventResponse]:
    """Retrieves all tracking telemetry events recorded for a shipment."""
    tenant_id = x_tenant_id or DEFAULT_TENANT_ID
    shipment = await service.get_shipment_by_id(db=db, shipment_id=id, tenant_id=tenant_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{id}' not found.",
        )

    stmt = (
        select(ShipmentEvent)
        .where(ShipmentEvent.shipment_id == id)
        .order_by(ShipmentEvent.event_at.asc())
    )
    res = await db.execute(stmt)
    events = list(res.scalars().all())
    return [EventResponse.model_validate(e) for e in events]
