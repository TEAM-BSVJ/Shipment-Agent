"""
backend/app/api/v1/exceptions.py

FastAPI router for querying, filtering, and resolving operational exceptions and bottlenecks.
Provides prioritized triage by risk severity and status.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.models.entities import (
    AuditLog,
    Shipment,
    ShipmentException,
)
from backend.app.monitoring.risk_scorer import calculate_risk_score
from backend.app.schemas.domain import (
    ExceptionResponse,
    ExceptionUpdate,
)
from backend.app.schemas.enums import (
    BusinessPriority,
    ExceptionStatus,
    RiskLevel,
)
from backend.app.services.shipment_service import (
    ShipmentService,
    get_shipment_service,
)

logger = logging.getLogger("backend.app.api.v1.exceptions")
router = APIRouter(tags=["Exceptions & Bottlenecks"])


@router.get(
    "/exceptions",
    response_model=List[ExceptionResponse],
    summary="List active operational exceptions with triage filters",
)
async def list_exceptions(
    response: Response,
    status: Optional[ExceptionStatus] = Query(default=None, description="Filter by exception status (e.g. OPEN)"),
    risk_level: Optional[RiskLevel] = Query(default=None, description="Filter by risk severity tier"),
    shipment_id: Optional[uuid.UUID] = Query(default=None, description="Filter by specific shipment UUID"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    db: AsyncSession = Depends(get_db),
) -> List[ExceptionResponse]:
    """Retrieves operational bottlenecks ordered chronologically and by severity."""
    query = select(ShipmentException)
    count_query = select(func.count(ShipmentException.id))

    if status:
        query = query.where(ShipmentException.status == status.value)
        count_query = count_query.where(ShipmentException.status == status.value)

    if risk_level:
        query = query.where(ShipmentException.risk_level == risk_level.value)
        count_query = count_query.where(ShipmentException.risk_level == risk_level.value)

    if shipment_id:
        query = query.where(ShipmentException.shipment_id == shipment_id)
        count_query = count_query.where(ShipmentException.shipment_id == shipment_id)

    count_res = await db.execute(count_query)
    total_count = count_res.scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(ShipmentException.detected_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    exceptions = list(res.scalars().all())

    return [ExceptionResponse.model_validate(e) for e in exceptions]


@router.get(
    "/exceptions/{id}",
    response_model=ExceptionResponse,
    summary="Get exception details by ID",
)
async def get_exception(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ExceptionResponse:
    """Retrieves full exception record including evidence and root cause."""
    stmt = select(ShipmentException).where(ShipmentException.id == id)
    res = await db.execute(stmt)
    exc = res.scalars().first()
    if not exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exception with ID '{id}' not found.",
        )
    return ExceptionResponse.model_validate(exc)


@router.patch(
    "/exceptions/{id}",
    response_model=ExceptionResponse,
    summary="Update exception status, root cause, or resolution",
)
async def update_exception(
    id: uuid.UUID,
    update_in: ExceptionUpdate,
    db: AsyncSession = Depends(get_db),
) -> ExceptionResponse:
    """Updates exception status or adds operator notes, then recalculates risk score."""
    stmt = select(ShipmentException).where(ShipmentException.id == id)
    res = await db.execute(stmt)
    exc = res.scalars().first()
    if not exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exception with ID '{id}' not found.",
        )

    # Apply updates
    if update_in.status:
        status_val = update_in.status.value if hasattr(update_in.status, "value") else str(update_in.status)
        exc.status = status_val
        if status_val in [ExceptionStatus.RESOLVED.value, ExceptionStatus.DISMISSED.value]:
            if not exc.resolved_at:
                exc.resolved_at = datetime.now(timezone.utc)
        else:
            exc.resolved_at = None

    if update_in.resolved_by is not None:
        exc.resolved_by = update_in.resolved_by

    if update_in.risk_level:
        risk_val = update_in.risk_level.value if hasattr(update_in.risk_level, "value") else str(update_in.risk_level)
        exc.risk_level = risk_val

    if update_in.root_cause:
        exc.root_cause = update_in.root_cause

    # Recalculate parent shipment risk score
    shipment_stmt = (
        select(Shipment)
        .options(selectinload(Shipment.exceptions))
        .where(Shipment.id == exc.shipment_id)
    )
    s_res = await db.execute(shipment_stmt)
    shipment = s_res.scalars().first()

    if shipment:
        open_excs = [e for e in shipment.exceptions if e.status == ExceptionStatus.OPEN.value]
        priority_enum = (
            BusinessPriority(shipment.business_priority)
            if shipment.business_priority in [p.value for p in BusinessPriority]
            else BusinessPriority.MEDIUM
        )
        breakdown = calculate_risk_score(
            delay_hours=0.0,
            open_exceptions=open_excs,
            promised_delivery_date=shipment.promised_delivery_date,
            business_priority=priority_enum,
        )
        shipment.risk_score = breakdown.total_score
        shipment.risk_level = breakdown.risk_level.value

    # Audit trail
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        entity_type="exception",
        entity_id=exc.id,
        action="EXCEPTION_UPDATED",
        actor_type="USER",
        actor_id=str(update_in.resolved_by or "OPERATOR"),
        details={
            "status": exc.status,
            "risk_level": exc.risk_level,
            "root_cause": exc.root_cause,
        },
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(exc)

    return ExceptionResponse.model_validate(exc)


@router.get(
    "/shipments/{id}/exceptions",
    response_model=List[ExceptionResponse],
    summary="List all exceptions for a shipment",
)
async def list_shipment_exceptions(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    shipment_service: ShipmentService = Depends(get_shipment_service),
) -> List[ExceptionResponse]:
    """Retrieves all exceptions detected for a specific shipment."""
    shipment = await shipment_service.get_shipment_by_id(db=db, shipment_id=id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{id}' not found.",
        )

    stmt = select(ShipmentException).where(ShipmentException.shipment_id == id).order_by(ShipmentException.detected_at.desc())
    res = await db.execute(stmt)
    exceptions = list(res.scalars().all())
    return [ExceptionResponse.model_validate(e) for e in exceptions]
