"""
backend/app/api/v1/integrations.py

FastAPI router for external platform integrations.
Provides the Unified Webhook Gateway for Evolus AI Platform Automations & Workflows.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Shipment,
    ShipmentDocument,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    RiskLevel,
)

logger = logging.getLogger("backend.app.api.v1.integrations")
router = APIRouter(prefix="/integrations", tags=["Platform Integrations"])


class EvolusWebhookPayload(BaseModel):
    """Normalized payload schema ingested from Evolus Workflow API blocks."""
    model_config = ConfigDict(extra="ignore")

    event_type: str = Field(
        ...,
        description="Event discriminator: DOCUMENT_VERIFIED | CUSTOMS_DISCREPANCY | CORRECTION_TASK_CREATED | APPROVAL_REQUIRED | MILESTONE_RESCHEDULED",
    )
    shipment_id: Optional[str] = None
    document_id: Optional[str] = None
    milestone_id: Optional[str] = None
    status: Optional[str] = None
    confidence: Optional[Union[float, str]] = None
    root_cause: Optional[str] = None
    discrepancies: Optional[Union[str, List[Any]]] = None
    recommended_action: Optional[str] = None
    title: Optional[str] = None
    assigned_role: Optional[str] = None
    priority: Optional[str] = None
    instructions: Optional[str] = None
    action_type: Optional[str] = None
    urgency: Optional[str] = None
    reason: Optional[str] = None
    new_expected_at: Optional[str] = None


@router.post(
    "/evolus/webhook",
    status_code=status.HTTP_200_OK,
    summary="Unified webhook gateway for incoming Evolus AI workflow execution callbacks",
)
async def evolus_webhook_gateway(
    payload: EvolusWebhookPayload,
    x_workflow_execution_id: Optional[str] = Header(default=None, alias="X-Workflow-Execution-Id"),
    x_workflow_audit_id: Optional[str] = Header(default=None, alias="X-Workflow-Audit-Id"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Unified ingestion endpoint receiving callbacks from all Evolus automation workflows:
    - DOCUMENT_VERIFIED: Marks freight documents validated and records high confidence.
    - CUSTOMS_DISCREPANCY: Flags customs hold exception and opens human approval review.
    - CORRECTION_TASK_CREATED: Inserts pending shipper document remediation task.
    - APPROVAL_REQUIRED: Creates pending human sign-off for consequential operational actions.
    - MILESTONE_RESCHEDULED: Applies auto-executable milestone time shifts within buffer.
    """
    logger.info(
        "Received Evolus webhook event '%s' (Execution ID: %s, Audit ID: %s)",
        payload.event_type,
        x_workflow_execution_id,
        x_workflow_audit_id,
    )

    now_utc = datetime.now(timezone.utc)
    correlation_meta = {
        "evolus_execution_id": x_workflow_execution_id,
        "evolus_audit_id": x_workflow_audit_id,
        "event_type": payload.event_type,
    }

    # Helper to parse UUID safely
    def _parse_uuid(val: Optional[str]) -> Optional[uuid.UUID]:
        if not val or "{{" in val:
            return None
        try:
            return uuid.UUID(val)
        except ValueError:
            return None

    shipment_uuid = _parse_uuid(payload.shipment_id)
    doc_uuid = _parse_uuid(payload.document_id)
    milestone_uuid = _parse_uuid(payload.milestone_id)

    # -------------------------------------------------------------------------
    # 1. Event: DOCUMENT_VERIFIED
    # -------------------------------------------------------------------------
    if payload.event_type == "DOCUMENT_VERIFIED":
        if doc_uuid:
            stmt = select(ShipmentDocument).where(ShipmentDocument.id == doc_uuid)
            res = await db.execute(stmt)
            doc = res.scalars().first()
            if doc:
                doc.validation_status = DocumentValidationStatus.VALIDATED.value
                try:
                    conf = float(payload.confidence) if payload.confidence and "{{" not in str(payload.confidence) else 0.95
                    doc.confidence = min(max(conf, 0.0), 1.0)
                except (ValueError, TypeError):
                    doc.confidence = 0.95
                doc.updated_at = now_utc

                audit = AuditLog(
                    id=uuid.uuid4(),
                    entity_type="shipment_document",
                    entity_id=doc.id,
                    action="DOCUMENT_VERIFIED_EVOLUS",
                    actor_type="AGENT",
                    actor_id="evolus_workflow",
                    details=correlation_meta,
                    created_at=now_utc,
                )
                db.add(audit)
                await db.commit()
                return {"status": "SUCCESS", "event_type": payload.event_type, "document_id": str(doc.id)}

        return {"status": "ACKNOWLEDGED", "event_type": payload.event_type, "note": "Document ID not found or placeholder"}

    # -------------------------------------------------------------------------
    # 2. Event: CUSTOMS_DISCREPANCY
    # -------------------------------------------------------------------------
    elif payload.event_type == "CUSTOMS_DISCREPANCY":
        if shipment_uuid:
            exc_id = uuid.uuid4()
            discrepancy_str = str(payload.discrepancies) if payload.discrepancies and "{{" not in str(payload.discrepancies) else "Weight or consignee delta > 0.5kg"
            root_cause_str = payload.root_cause if payload.root_cause and "{{" not in payload.root_cause else "Discrepancy detected in customs paperwork"

            exception_entity = ShipmentException(
                id=exc_id,
                shipment_id=shipment_uuid,
                exception_type=ExceptionType.CUSTOMS_REJECTION.value,
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.OPEN.value,
                description=f"Customs inspection flagged discrepancy: {discrepancy_str}",
                evidence=[discrepancy_str],
                root_cause=root_cause_str,
                detected_at=now_utc,
            )
            db.add(exception_entity)

            action_id = uuid.uuid4()
            corrective_action = CorrectiveAction(
                id=action_id,
                exception_id=exc_id,
                action_type=ActionType.ESCALATE_TO_HUMAN.value,
                status=ActionStatus.PENDING.value,
                tool_used="escalate_to_human",
                input_data={"discrepancies": discrepancy_str, "root_cause": root_cause_str},
                idempotency_key=f"evolus:disc:{shipment_uuid}:{action_id}",
                created_at=now_utc,
            )
            db.add(corrective_action)

            approval_id = uuid.uuid4()
            approval = Approval(
                id=approval_id,
                action_id=action_id,
                decision=ApprovalDecision.PENDING.value,
                reason=root_cause_str,
                requested_at=now_utc,
            )
            db.add(approval)

            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="approval",
                entity_id=approval_id,
                action="CUSTOMS_DISCREPANCY_APPROVAL_CREATED",
                actor_type="AGENT",
                actor_id="evolus_workflow",
                details=correlation_meta,
                created_at=now_utc,
            )
            db.add(audit)
            await db.commit()
            return {"status": "SUCCESS", "event_type": payload.event_type, "approval_id": str(approval_id)}

        return {"status": "ACKNOWLEDGED", "event_type": payload.event_type, "note": "Shipment ID not found or placeholder"}

    # -------------------------------------------------------------------------
    # 3. Event: CORRECTION_TASK_CREATED
    # -------------------------------------------------------------------------
    elif payload.event_type == "CORRECTION_TASK_CREATED":
        if shipment_uuid:
            exc_id = uuid.uuid4()
            instructions_str = payload.instructions if payload.instructions and "{{" not in payload.instructions else "Upload missing commercial paperwork"
            
            exception_entity = ShipmentException(
                id=exc_id,
                shipment_id=shipment_uuid,
                exception_type=ExceptionType.MISSING_DOCUMENT.value,
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.OPEN.value,
                description=payload.title or "Missing Commercial Document Upload",
                evidence=["Required document not uploaded prior to customs window"],
                root_cause="Missing required freight paperwork",
                detected_at=now_utc,
            )
            db.add(exception_entity)

            action_id = uuid.uuid4()
            corrective_action = CorrectiveAction(
                id=action_id,
                exception_id=exc_id,
                action_type=ActionType.REQUEST_DOCUMENT.value,
                status=ActionStatus.PENDING.value,
                tool_used="create_correction_task",
                input_data={
                    "title": payload.title or "Missing Commercial Document Upload",
                    "assigned_role": payload.assigned_role or "SHIPPER",
                    "priority": payload.priority or "HIGH",
                    "instructions": instructions_str,
                },
                idempotency_key=f"evolus:task:{shipment_uuid}:{action_id}",
                created_at=now_utc,
            )
            db.add(corrective_action)

            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="corrective_action",
                entity_id=action_id,
                action="CORRECTION_TASK_CREATED_EVOLUS",
                actor_type="AGENT",
                actor_id="evolus_workflow",
                details=correlation_meta,
                created_at=now_utc,
            )
            db.add(audit)
            await db.commit()
            return {"status": "SUCCESS", "event_type": payload.event_type, "action_id": str(action_id)}

        return {"status": "ACKNOWLEDGED", "event_type": payload.event_type, "note": "Shipment ID not found or placeholder"}

    # -------------------------------------------------------------------------
    # 4. Event: APPROVAL_REQUIRED
    # -------------------------------------------------------------------------
    elif payload.event_type == "APPROVAL_REQUIRED":
        if shipment_uuid:
            exc_id = uuid.uuid4()
            reason_str = payload.reason if payload.reason and "{{" not in payload.reason else "Operational action requires supervisor sign-off"

            exception_entity = ShipmentException(
                id=exc_id,
                shipment_id=shipment_uuid,
                exception_type=ExceptionType.MILESTONE_OVERDUE.value,
                risk_level=RiskLevel.HIGH.value,
                status=ExceptionStatus.OPEN.value,
                description=f"Action required: {reason_str}",
                evidence=[reason_str],
                root_cause=reason_str,
                detected_at=now_utc,
            )
            db.add(exception_entity)

            action_id = uuid.uuid4()
            corrective_action = CorrectiveAction(
                id=action_id,
                exception_id=exc_id,
                action_type=payload.action_type or ActionType.RESCHEDULE_MILESTONE.value,
                status=ActionStatus.PENDING.value,
                tool_used="reschedule_milestone",
                input_data={
                    "milestone_id": payload.milestone_id,
                    "new_expected_at": payload.new_expected_at,
                    "reason": reason_str,
                },
                idempotency_key=f"evolus:appr:{shipment_uuid}:{action_id}",
                created_at=now_utc,
            )
            db.add(corrective_action)

            approval_id = uuid.uuid4()
            approval = Approval(
                id=approval_id,
                action_id=action_id,
                decision=ApprovalDecision.PENDING.value,
                reason=reason_str,
                requested_at=now_utc,
            )
            db.add(approval)

            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="approval",
                entity_id=approval_id,
                action="APPROVAL_REQUESTED_EVOLUS",
                actor_type="AGENT",
                actor_id="evolus_workflow",
                details=correlation_meta,
                created_at=now_utc,
            )
            db.add(audit)
            await db.commit()
            return {"status": "SUCCESS", "event_type": payload.event_type, "approval_id": str(approval_id)}

        return {"status": "ACKNOWLEDGED", "event_type": payload.event_type, "note": "Shipment ID not found or placeholder"}

    # -------------------------------------------------------------------------
    # 5. Event: MILESTONE_RESCHEDULED
    # -------------------------------------------------------------------------
    elif payload.event_type == "MILESTONE_RESCHEDULED":
        if milestone_uuid:
            stmt = select(ShipmentMilestone).where(ShipmentMilestone.id == milestone_uuid)
            res = await db.execute(stmt)
            milestone = res.scalars().first()
            if milestone and payload.new_expected_at and "{{" not in payload.new_expected_at:
                try:
                    cleaned_ts = payload.new_expected_at.strip().replace("Z", "+00:00")
                    new_dt = datetime.fromisoformat(cleaned_ts)
                    if new_dt.tzinfo is None:
                        new_dt = new_dt.replace(tzinfo=timezone.utc)
                    milestone.expected_at = new_dt
                except Exception as parse_err:
                    logger.warning("Failed parsing new_expected_at date '%s': %s", payload.new_expected_at, parse_err)

                audit = AuditLog(
                    id=uuid.uuid4(),
                    entity_type="shipment_milestone",
                    entity_id=milestone.id,
                    action="MILESTONE_RESCHEDULED_EVOLUS",
                    actor_type="AGENT",
                    actor_id="evolus_workflow",
                    details=correlation_meta,
                    created_at=now_utc,
                )
                db.add(audit)
                await db.commit()
                return {"status": "SUCCESS", "event_type": payload.event_type, "milestone_id": str(milestone.id)}

        return {"status": "ACKNOWLEDGED", "event_type": payload.event_type, "note": "Milestone ID not found or placeholder"}

    else:
        logger.warning("Unrecognized Evolus webhook event_type: %s", payload.event_type)
        return {"status": "IGNORED", "event_type": payload.event_type, "note": "Unrecognized event_type"}
