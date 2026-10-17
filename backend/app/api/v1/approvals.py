"""
backend/app/api/v1/approvals.py

FastAPI router managing Human-in-the-Loop decision gates (TASK-025, RULE-E06).
Governs consequential actions (rescheduling milestones, rebooking carriers, customs escalation).
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
    Approval,
    AuditLog,
    CorrectiveAction,
    ShipmentException,
)
from backend.app.schemas.domain import (
    ApprovalDecisionRequest,
    ApprovalResponse,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ApprovalDecision,
    ExceptionStatus,
)

logger = logging.getLogger("backend.app.api.v1.approvals")
router = APIRouter(prefix="/approvals", tags=["Human Approvals"])


@router.get(
    "",
    response_model=List[ApprovalResponse],
    summary="List approval requests filtered by status",
)
async def list_approvals(
    response: Response,
    decision: Optional[ApprovalDecision] = Query(default=None, description="Filter by decision (PENDING, APPROVED, REJECTED)"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    db: AsyncSession = Depends(get_db),
) -> List[ApprovalResponse]:
    """Retrieves human approval queue items with optional status filtering."""
    query = select(Approval)
    count_query = select(func.count(Approval.id))

    if decision:
        query = query.where(Approval.decision == decision.value)
        count_query = count_query.where(Approval.decision == decision.value)

    count_res = await db.execute(count_query)
    total_count = count_res.scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(Approval.requested_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    approvals = list(res.scalars().all())

    return [ApprovalResponse.model_validate(a) for a in approvals]


@router.get(
    "/{id}",
    response_model=ApprovalResponse,
    summary="Get approval request details by ID",
)
async def get_approval(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    """Retrieves a single approval record by UUID."""
    stmt = select(Approval).where(Approval.id == id)
    res = await db.execute(stmt)
    approval = res.scalars().first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval with ID '{id}' not found.",
        )
    return ApprovalResponse.model_validate(approval)


@router.post(
    "/{id}/decide",
    response_model=ApprovalResponse,
    summary="Submit human approval or rejection decision",
)
async def decide_approval(
    id: uuid.UUID,
    decision_in: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    """
    Processes human sign-off on a pending corrective action.
    Updates approval state, transitions the associated corrective action and exception,
    and writes an immutable audit record.
    """
    stmt = (
        select(Approval)
        .options(selectinload(Approval.action).selectinload(CorrectiveAction.exception))
        .where(Approval.id == id)
    )
    res = await db.execute(stmt)
    approval = res.scalars().first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval with ID '{id}' not found.",
        )

    if approval.decision != ApprovalDecision.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval '{id}' has already been decided ({approval.decision}).",
        )

    now_utc = datetime.now(timezone.utc)
    decision_val = decision_in.decision.value if hasattr(decision_in.decision, "value") else str(decision_in.decision)
    approval.decision = decision_val
    approval.reviewer_id = decision_in.reviewer_id
    approval.reason = decision_in.reason
    approval.reviewed_at = now_utc

    # Update associated corrective action and exception
    action = approval.action
    if action:
        if decision_val == ApprovalDecision.APPROVED.value:
            action.status = ActionStatus.COMPLETED.value
            action.executed_at = now_utc
            if action.exception:
                action.exception.status = ExceptionStatus.RESOLVED.value
                action.exception.resolved_at = now_utc
                action.exception.resolved_by = str(decision_in.reviewer_id) if decision_in.reviewer_id else None
        else:
            action.status = ActionStatus.REJECTED.value

    # Audit log entry
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        entity_type="approval",
        entity_id=approval.id,
        action=f"APPROVAL_{decision_val}",
        actor_type="USER",
        actor_id=str(decision_in.reviewer_id),
        details={
            "decision": decision_val,
            "reason": decision_in.reason,
            "action_id": str(approval.action_id),
        },
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(approval)

    return ApprovalResponse.model_validate(approval)
