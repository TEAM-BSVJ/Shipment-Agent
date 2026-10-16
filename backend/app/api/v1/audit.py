"""
backend/app/api/v1/audit.py

FastAPI router querying the immutable audit log trail.
Adheres to compliance and transparency rules (RULE-A04, RULE-F01).
"""

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.entities import AuditLog
from backend.app.schemas.domain import AuditLogResponse

logger = logging.getLogger("backend.app.api.v1.audit")
router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get(
    "",
    response_model=List[AuditLogResponse],
    summary="Query chronological immutable audit logs",
)
async def list_audit_logs(
    response: Response,
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type (shipment, exception, approval)"),
    entity_id: Optional[uuid.UUID] = Query(default=None, description="Filter by entity UUID"),
    actor_type: Optional[str] = Query(default=None, description="Filter by actor type (AGENT, USER, PIPELINE, TELEMETRY)"),
    action: Optional[str] = Query(default=None, description="Filter by action name"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    db: AsyncSession = Depends(get_db),
) -> List[AuditLogResponse]:
    """Retrieves chronological audit trail records."""
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
        count_query = count_query.where(AuditLog.entity_id == entity_id)

    if actor_type:
        query = query.where(AuditLog.actor_type == actor_type)
        count_query = count_query.where(AuditLog.actor_type == actor_type)

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)

    count_res = await db.execute(count_query)
    total_count = count_res.scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    logs = list(res.scalars().all())

    return [AuditLogResponse.model_validate(log) for log in logs]
