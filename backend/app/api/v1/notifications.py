"""
backend/app/api/v1/notifications.py

FastAPI router querying external stakeholder notifications and delivery status.
"""

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.entities import Notification
from backend.app.schemas.domain import NotificationResponse
from backend.app.schemas.enums import NotificationStatus

logger = logging.getLogger("backend.app.api.v1.notifications")
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="Query outbound stakeholder notifications",
)
async def list_notifications(
    response: Response,
    shipment_id: Optional[uuid.UUID] = Query(default=None, description="Filter by shipment UUID"),
    status: Optional[NotificationStatus] = Query(default=None, description="Filter by status (QUEUED, SENT, DELIVERED, FAILED)"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    db: AsyncSession = Depends(get_db),
) -> List[NotificationResponse]:
    """Retrieves notifications with optional shipment and status filtering."""
    query = select(Notification)
    count_query = select(func.count(Notification.id))

    if shipment_id:
        query = query.where(Notification.shipment_id == shipment_id)
        count_query = count_query.where(Notification.shipment_id == shipment_id)

    if status:
        query = query.where(Notification.status == status.value)
        count_query = count_query.where(Notification.status == status.value)

    count_res = await db.execute(count_query)
    total_count = count_res.scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(Notification.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    notifications = list(res.scalars().all())

    return [NotificationResponse.model_validate(n) for n in notifications]
