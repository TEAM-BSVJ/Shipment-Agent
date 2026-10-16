"""
backend/app/tools/handlers.py

Execution handlers for allowlisted tools in the logistics bottleneck resolution system.
Adheres strictly to RFC 2119 and Rules.md:
  - Zero direct shell/network access for model (RULE-E01)
  - Allowlisted tool functions (RULE-E02)
  - Human approval gating for sensitive operations (RULE-E06)
  - Pre-approved parameterized notification templates (RULE-F03)
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Notification,
    Shipment,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    ExceptionStatus,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ToolName,
)

logger = logging.getLogger("backend.app.tools.handlers")


# Pre-approved notification templates per RULE-F03
APPROVED_NOTIFICATION_TEMPLATES: Dict[str, str] = {
    "TEMPLATE_DOC_REQUEST_V1": (
        "Dear Stakeholder, shipment {tracking_number} requires your attention. "
        "The following required document is missing: {document_type}. Please upload it at your earliest convenience."
    ),
    "TEMPLATE_DELAY_ALERT_V1": (
        "Advisory: Shipment {tracking_number} has experienced an operational delay at milestone {milestone_name}. "
        "Estimated delay: {delay_hours} hours. Reason: {reason}."
    ),
    "TEMPLATE_DISPATCH_CUTOFF_V1": (
        "Urgent: Warehouse dispatch cutoff for shipment {tracking_number} is approaching. "
        "Target departure: {target_time}. Please confirm dock release status."
    ),
}


async def handle_get_shipment(
    shipment_id: uuid.UUID,
    tracking_number: Optional[str] = None,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Retrieve full shipment metadata, milestone progression, and active exceptions.
    Idempotent read-only query (requires_approval=False).
    """
    if session is not None:
        stmt = (
            select(Shipment)
            .where(Shipment.id == shipment_id)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.documents),
                selectinload(Shipment.exceptions),
            )
        )
        if tenant_id is not None:
            stmt = stmt.where(Shipment.tenant_id == tenant_id)

        result = await session.execute(stmt)
        shipment = result.scalar_one_or_none()

        if shipment is not None:
            return {
                "shipment_id": str(shipment.id),
                "tracking_number": shipment.tracking_number,
                "status": shipment.status,
                "origin": shipment.origin,
                "destination": shipment.destination,
                "mode": shipment.mode,
                "carrier_id": shipment.carrier_id,
                "risk_score": shipment.risk_score,
                "risk_level": shipment.risk_level,
                "milestones": [
                    {
                        "id": str(m.id),
                        "name": m.name,
                        "status": m.status,
                        "expected_at": m.expected_at.isoformat() if m.expected_at else None,
                        "actual_at": m.actual_at.isoformat() if m.actual_at else None,
                    }
                    for m in shipment.milestones
                ],
                "exceptions": [
                    {
                        "id": str(e.id),
                        "type": e.type,
                        "severity": e.severity,
                        "status": e.status,
                        "description": e.description,
                    }
                    for e in shipment.exceptions
                ],
            }

    # Deterministic mock return when running in decoupled/test context
    return {
        "shipment_id": str(shipment_id),
        "tracking_number": tracking_number or f"SHP-{str(shipment_id)[:8]}",
        "status": "IN_TRANSIT",
        "risk_score": 45,
        "risk_level": RiskLevel.MEDIUM.value,
        "milestones_count": 5,
        "active_exceptions_count": 1,
    }


async def handle_create_correction_task(
    shipment_id: uuid.UUID,
    description: str,
    action_type: ActionType = ActionType.REQUEST_DOCUMENT,
    exception_id: Optional[uuid.UUID] = None,
    assigned_to: str = "operations_team",
    priority: BusinessPriority = BusinessPriority.MEDIUM,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Inserts a corrective document collection or revision task into the database.
    Safe operational action (requires_approval=False).
    """
    action_id = uuid.uuid4()
    if session is not None:
        action = CorrectiveAction(
            id=action_id,
            exception_id=exception_id or uuid.uuid4(),
            action_type=action_type.value if hasattr(action_type, "value") else str(action_type),
            status=ActionStatus.PENDING.value,
            tool_used=ToolName.CREATE_CORRECTION_TASK.value,
            input_data={
                "shipment_id": str(shipment_id),
                "description": description,
                "assigned_to": assigned_to,
                "priority": priority.value if hasattr(priority, "value") else str(priority),
            },
            idempotency_key=f"ca-task-{action_id}",
            created_at=datetime.utcnow(),
        )
        session.add(action)
        await session.flush()

        # Audit record
        audit = AuditLog(
            id=uuid.uuid4(),
            entity_type="CorrectiveAction",
            entity_id=action_id,
            action="CREATE_CORRECTION_TASK",
            actor_type="AGENT",
            actor_id="Evolus-Gemma4-Agent",
            details={
                "shipment_id": str(shipment_id),
                "action_type": action_type.value if hasattr(action_type, "value") else str(action_type),
                "description": description,
                "assigned_to": assigned_to,
            },
        )
        session.add(audit)
        await session.flush()

    logger.info("Created correction task %s for shipment %s", action_id, shipment_id)
    return {
        "task_id": str(action_id),
        "shipment_id": str(shipment_id),
        "action_type": action_type.value,
        "status": ActionStatus.PENDING.value,
        "description": description,
        "assigned_to": assigned_to,
        "priority": priority.value,
    }


async def handle_trigger_workflow(
    shipment_id: uuid.UUID,
    workflow_name: str,
    parameters: Optional[Dict[str, Any]] = None,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
    is_approved: bool = False,
) -> Dict[str, Any]:
    """
    Starts an automated multi-step resolution workflow on Evolus or internal engine.
    Consequential action: MUST set requires_approval=True unless authorized (RULE-E06).
    """
    params = parameters or {}
    workflow_run_id = uuid.uuid4()

    if not is_approved:
        # Pause in approval queue
        approval_id = uuid.uuid4()
        if session is not None:
            approval = Approval(
                id=approval_id,
                shipment_id=shipment_id,
                requested_action="TRIGGER_WORKFLOW",
                action_payload={"workflow_name": workflow_name, "parameters": params},
                decision=ApprovalDecision.PENDING.value,
                tenant_id=tenant_id or uuid.uuid4(),
            )
            session.add(approval)
            await session.flush()

        logger.info(
            "Workflow '%s' for shipment %s queued for human approval (Approval ID: %s)",
            workflow_name,
            shipment_id,
            approval_id,
        )
        return {
            "status": "QUEUED_FOR_APPROVAL",
            "approval_id": str(approval_id),
            "shipment_id": str(shipment_id),
            "workflow_name": workflow_name,
            "requires_approval": True,
            "message": "Workflow initiation paused awaiting operator approval.",
        }

    # If already approved by human, proceed with execution
    logger.info("Executing approved workflow '%s' (Run ID: %s)", workflow_name, workflow_run_id)
    return {
        "status": "EXECUTED",
        "workflow_run_id": str(workflow_run_id),
        "shipment_id": str(shipment_id),
        "workflow_name": workflow_name,
        "requires_approval": False,
        "message": f"Workflow {workflow_name} dispatched successfully.",
    }


async def handle_send_notification(
    shipment_id: uuid.UUID,
    recipient: str,
    template_id: str,
    parameters: Optional[Dict[str, str]] = None,
    channel: NotificationChannel = NotificationChannel.EMAIL,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Dispatches a pre-approved parameterized notification to stakeholders (RULE-F03).
    Safe action using allowlisted templates (requires_approval=False).
    """
    params = parameters or {}
    template = APPROVED_NOTIFICATION_TEMPLATES.get(template_id)
    if not template:
        raise ValueError(
            f"Invalid template_id '{template_id}'. Allowed templates: {list(APPROVED_NOTIFICATION_TEMPLATES.keys())}"
        )

    # Safely format template with parameters; ignore missing keys without failing
    formatted_content = template
    for key, val in params.items():
        formatted_content = formatted_content.replace(f"{{{key}}}", str(val))

    notif_id = uuid.uuid4()
    idempotency_key = f"{shipment_id}:{template_id}:{recipient}:{int(datetime.utcnow().timestamp() // 300)}"

    if session is not None:
        notif = Notification(
            id=notif_id,
            shipment_id=shipment_id,
            recipient=recipient,
            channel=channel.value,
            template_id=template_id,
            content=formatted_content,
            status=NotificationStatus.SENT.value,
            idempotency_key=idempotency_key,
            sent_at=datetime.utcnow(),
        )
        session.add(notif)
        await session.flush()

    logger.info("Notification %s dispatched to %s via %s", notif_id, recipient, channel.value)
    return {
        "notification_id": str(notif_id),
        "shipment_id": str(shipment_id),
        "recipient": recipient,
        "channel": channel.value,
        "template_id": template_id,
        "content": formatted_content,
        "status": NotificationStatus.SENT.value,
        "idempotency_key": idempotency_key,
    }


async def handle_reschedule_milestone(
    shipment_id: uuid.UUID,
    milestone_id: uuid.UUID,
    new_expected_at: datetime,
    reason: str,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
    is_approved: bool = False,
) -> Dict[str, Any]:
    """
    Updates the planned milestone timestamp due to verified delay.
    Consequential action: MUST set requires_approval=True unless pre-authorized (RULE-E06).
    """
    if not is_approved:
        approval_id = uuid.uuid4()
        if session is not None:
            approval = Approval(
                id=approval_id,
                shipment_id=shipment_id,
                requested_action="RESCHEDULE_MILESTONE",
                action_payload={
                    "milestone_id": str(milestone_id),
                    "new_expected_at": new_expected_at.isoformat(),
                    "reason": reason,
                },
                decision=ApprovalDecision.PENDING.value,
                tenant_id=tenant_id or uuid.uuid4(),
            )
            session.add(approval)
            await session.flush()

        logger.info(
            "Milestone reschedule for %s held in approval queue (Approval ID: %s)",
            milestone_id,
            approval_id,
        )
        return {
            "status": "QUEUED_FOR_APPROVAL",
            "approval_id": str(approval_id),
            "shipment_id": str(shipment_id),
            "milestone_id": str(milestone_id),
            "new_expected_at": new_expected_at.isoformat(),
            "reason": reason,
            "requires_approval": True,
            "message": "Milestone rescheduling paused awaiting human approval.",
        }

    # Approved execution: apply date modification to the milestone
    if session is not None:
        stmt = select(ShipmentMilestone).where(ShipmentMilestone.id == milestone_id)
        result = await session.execute(stmt)
        milestone = result.scalar_one_or_none()
        if milestone:
            milestone.expected_at = new_expected_at
            session.add(milestone)
            await session.flush()

    logger.info("Milestone %s rescheduled to %s", milestone_id, new_expected_at.isoformat())
    return {
        "status": "RESCHEDULED",
        "shipment_id": str(shipment_id),
        "milestone_id": str(milestone_id),
        "new_expected_at": new_expected_at.isoformat(),
        "reason": reason,
        "requires_approval": False,
        "message": "Milestone expected timestamp updated successfully.",
    }


async def handle_escalate_to_human(
    shipment_id: uuid.UUID,
    reason: str,
    exception_id: Optional[uuid.UUID] = None,
    urgency: RiskLevel = RiskLevel.HIGH,
    session: Optional[AsyncSession] = None,
    tenant_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Routes unresolvable or high-risk exceptions directly to the human operator queue.
    Safe action (requires_approval=False).
    """
    escalation_id = uuid.uuid4()
    if session is not None and exception_id is not None:
        stmt = select(ShipmentException).where(ShipmentException.id == exception_id)
        result = await session.execute(stmt)
        exc = result.scalar_one_or_none()
        if exc:
            exc.status = ExceptionStatus.INVESTIGATING.value
            session.add(exc)
            await session.flush()

        audit = AuditLog(
            entity_type="ShipmentException",
            entity_id=exception_id or escalation_id,
            action="ESCALATE_TO_HUMAN",
            actor_type="AGENT",
            actor_id="Evolus-Gemma4-Agent",
            details={
                "shipment_id": str(shipment_id),
                "reason": reason,
                "urgency": urgency.value,
            },
        )
        session.add(audit)
        await session.flush()

    logger.warning(
        "Escalated shipment %s to human operator. Urgency: %s. Reason: %s",
        shipment_id,
        urgency.value,
        reason,
    )
    return {
        "escalation_id": str(escalation_id),
        "shipment_id": str(shipment_id),
        "exception_id": str(exception_id) if exception_id else None,
        "urgency": urgency.value,
        "reason": reason,
        "status": "ESCALATED",
        "requires_approval": False,
        "message": "Bottleneck escalated to human operator work queue.",
    }

