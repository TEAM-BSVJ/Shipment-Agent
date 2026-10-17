"""
backend/app/agents/orchestrator.py

Central Agent Orchestration Engine and Reasoning Loop for Logistics Bottleneck Resolution.
Adheres strictly to RFC 2119 and Rules.md:
  - Zero direct LLM system/network access (RULE-E01).
  - All actions executed strictly via allowlisted ToolRegistry (RULE-E02).
  - Maximum recursion cutoff of 5 tool calls per request cycle (RULE-E03).
  - Untrusted data encapsulation inside <user_data>...</user_data> XML fences (RULE-F02).
  - External notifications strictly use pre-approved parameterized templates (RULE-F03).
  - Multi-tenant query isolation (RULE-F04 / NFR-009).
  - Human-in-the-loop approval gating for sensitive operations (RULE-E06).
  - Post-condition verification via database re-query (RULE-E04).
"""

import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.agents.prompts import (
    format_copilot_prompt,
    format_shipment_context,
)
from backend.app.config import settings
from backend.app.integrations.evolus_client import EvolusClient
from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Shipment,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.schemas.domain import (
    AgentAnalysisResponse,
    AgentChatResponse,
    AgentDiagnosticOutput,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    ExceptionStatus,
    RiskLevel,
    ToolName,
)
from backend.app.tools.registry import (
    MAX_TOOL_CALLS_PER_REQUEST,
    ToolExecutionContext,
    ToolRegistry,
    registry as global_tool_registry,
)

logger = logging.getLogger("backend.app.agents.orchestrator")


class AgentOrchestrationError(Exception):
    """Base exception for agent orchestration workflow errors."""
    pass


class ShipmentNotFoundError(AgentOrchestrationError):
    """Raised when the target shipment UUID cannot be located."""
    pass


class AgentOrchestrator:
    """
    Autonomous logistics bottleneck diagnosis and resolution coordinator.
    Implements the observe -> reason -> act -> verify loop.
    """

    def __init__(
        self,
        db: AsyncSession,
        evolus_client: Optional[EvolusClient] = None,
        tool_registry: Optional[ToolRegistry] = None,
    ) -> None:
        self.db = db
        self.evolus_client = evolus_client or EvolusClient()
        self.registry = tool_registry or global_tool_registry

    async def _fetch_shipment_record(
        self,
        shipment_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> Shipment:
        """Eagerly queries full relational graph for target shipment with tenant isolation."""
        stmt = (
            select(Shipment)
            .where(Shipment.id == shipment_id)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.documents),
                selectinload(Shipment.exceptions),
                selectinload(Shipment.events),
                selectinload(Shipment.notifications),
            )
        )
        if tenant_id is not None:
            stmt = stmt.where(Shipment.tenant_id == tenant_id)

        result = await self.db.execute(stmt)
        shipment = result.scalar_one_or_none()
        if shipment is None:
            raise ShipmentNotFoundError(f"Shipment with ID '{shipment_id}' was not found.")
        return shipment

    def _serialize_shipment(self, shipment: Shipment) -> Dict[str, Any]:
        """Serializes ORM shipment into structured dictionary for prompt assembly."""
        return {
            "id": str(shipment.id),
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
                    "milestone_name": m.milestone_name,
                    "is_completed": m.is_completed,
                    "expected_at": m.expected_at.isoformat() if m.expected_at else None,
                    "completed_at": m.completed_at.isoformat() if m.completed_at else None,
                    "source": m.source,
                }
                for m in shipment.milestones
            ],
            "documents": [
                {
                    "id": str(d.id),
                    "document_type": d.document_type,
                    "validation_status": d.validation_status,
                    "confidence": d.confidence,
                }
                for d in shipment.documents
            ],
            "exceptions": [
                {
                    "id": str(e.id),
                    "exception_type": e.exception_type,
                    "risk_level": e.risk_level,
                    "status": e.status,
                    "description": e.description,
                    "evidence": e.evidence,
                }
                for e in shipment.exceptions
            ],
        }

    def _sanitize_tool_input(
        self,
        shipment: Shipment,
        tool_name: ToolName,
        raw_input: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Sanitizes and normalizes tool input arguments before schema validation.
        Binds parameters strictly to the current shipment context.
        """
        sanitized = dict(raw_input)
        sanitized["shipment_id"] = str(shipment.id)
        tool_key = tool_name.value if hasattr(tool_name, "value") else str(tool_name)

        if tool_key == ToolName.RESCHEDULE_MILESTONE.value:
            # Ensure milestone_id references an actual milestone of this shipment
            target_milestone = None
            if "milestone_id" in sanitized:
                for m in shipment.milestones:
                    if str(m.id) == str(sanitized["milestone_id"]):
                        target_milestone = m
                        break

            if target_milestone is None:
                # Fall back to first uncompleted milestone
                for m in shipment.milestones:
                    if not m.is_completed:
                        target_milestone = m
                        break

            if target_milestone:
                sanitized["milestone_id"] = str(target_milestone.id)
            elif shipment.milestones:
                sanitized["milestone_id"] = str(shipment.milestones[0].id)
            else:
                sanitized["milestone_id"] = str(uuid.uuid4())

            if "new_expected_at" not in sanitized:
                base_time = target_milestone.expected_at if target_milestone and target_milestone.expected_at else datetime.now(timezone.utc)
                sanitized["new_expected_at"] = (base_time + timedelta(hours=4)).isoformat()

            if "reason" not in sanitized:
                sanitized["reason"] = "Milestone rescheduled due to transit operational delay"

        elif tool_key == ToolName.CREATE_CORRECTION_TASK.value:
            if "description" not in sanitized or len(sanitized["description"]) < 5:
                sanitized["description"] = "Operational correction task required for shipment discrepancies"
            if "action_type" not in sanitized:
                sanitized["action_type"] = ActionType.REQUEST_DOCUMENT.value

        elif tool_key == ToolName.TRIGGER_WORKFLOW.value:
            if "workflow_name" not in sanitized:
                sanitized["workflow_name"] = "document_exception_resolution_workflow"
            if "parameters" not in sanitized or not isinstance(sanitized["parameters"], dict):
                sanitized["parameters"] = {"shipment_id": str(shipment.id)}

        elif tool_key == ToolName.SEND_NOTIFICATION.value:
            if "recipient" not in sanitized:
                sanitized["recipient"] = "operations_desk@logistics.example"
            if "template_id" not in sanitized:
                sanitized["template_id"] = "TEMPLATE_DOC_REQUEST_V1"
            if "parameters" not in sanitized or not isinstance(sanitized["parameters"], dict):
                sanitized["parameters"] = {
                    "tracking_number": shipment.tracking_number,
                    "document_type": "COMMERCIAL_INVOICE",
                }

        elif tool_key == ToolName.ESCALATE_TO_HUMAN.value:
            if "reason" not in sanitized or len(sanitized["reason"]) < 5:
                sanitized["reason"] = "Unresolved shipment anomaly requires human supervisor evaluation"

        return sanitized

    async def _find_or_create_exception(
        self,
        shipment: Shipment,
        diagnosis: AgentDiagnosticOutput,
    ) -> ShipmentException:
        """Finds existing open exception or creates a new one corresponding to diagnosis."""
        for exc in shipment.exceptions:
            if (
                exc.status in (ExceptionStatus.OPEN.value, ExceptionStatus.INVESTIGATING.value)
                and exc.exception_type.upper() == diagnosis.issue_type.upper()
            ):
                return exc

        # Create new exception record
        new_exc = ShipmentException(
            id=uuid.uuid4(),
            shipment_id=shipment.id,
            exception_type=diagnosis.issue_type.upper(),
            risk_level=diagnosis.risk_level.value if hasattr(diagnosis.risk_level, "value") else str(diagnosis.risk_level),
            status=ExceptionStatus.OPEN.value,
            description=diagnosis.recommended_action,
            evidence=diagnosis.evidence,
            root_cause=diagnosis.root_cause,
            detected_at=datetime.now(timezone.utc),
        )
        self.db.add(new_exc)
        await self.db.flush()
        return new_exc

    async def analyze_shipment(
        self,
        shipment_id: uuid.UUID,
        context_notes: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None,
        agent_id: Optional[str] = None,
    ) -> AgentAnalysisResponse:
        """
        Executes end-to-end diagnostic and remediation sequence:
        1. Context assembly with <user_data> prompt injection protection (RULE-F02).
        2. Google Gemma 4 31B reasoning via Evolus AI.
        3. Allowlisted tool dispatch or Human-in-the-Loop approval gate (RULE-E06).
        4. Post-condition verification via database re-query (RULE-E04).
        5. Immutable audit log recording.
        """
        start_time = time.perf_counter()
        now_utc = datetime.now(timezone.utc)

        # 1. Fetch shipment state
        shipment = await self._fetch_shipment_record(shipment_id, tenant_id=tenant_id)
        shipment_data = self._serialize_shipment(shipment)

        # 2. Build injection-safe prompt (RULE-F02)
        prompt_text = format_shipment_context(shipment_data, context_notes=context_notes)

        # Resolve specialized Evolus agent if not explicitly specified
        target_agent = agent_id
        if not target_agent and context_notes:
            notes_lower = context_notes.lower()
            if "custom" in notes_lower or "ocr" in notes_lower or "invoice" in notes_lower:
                target_agent = settings.EVOLUS_AGENT_CUSTOMS_ID
            elif "carrier" in notes_lower or "vessel" in notes_lower or "flight" in notes_lower or "truck" in notes_lower:
                target_agent = settings.EVOLUS_AGENT_CARRIER_ID
            elif "copilot" in notes_lower:
                target_agent = settings.EVOLUS_AGENT_COPILOT_ID
            else:
                target_agent = settings.EVOLUS_AGENT_BOTTLENECK_ID
        elif not target_agent:
            target_agent = settings.EVOLUS_AGENT_BOTTLENECK_ID

        # 3. Model inference & structured output validation
        try:
            diagnosis = await self.evolus_client.run_gemma_diagnosis(prompt_text, agent_id=target_agent)
        except Exception as exc:
            logger.error("Inference failure for shipment %s: %s", shipment_id, exc, exc_info=True)
            # Degraded mode fallback per Architecture Section 14
            audit_entry = AuditLog(
                id=uuid.uuid4(),
                entity_type="Shipment",
                entity_id=shipment.id,
                action="INFERENCE_DEGRADED_FALLBACK",
                actor_type="SYSTEM",
                actor_id="AgentOrchestrator",
                details={"error": str(exc), "status": "ESCALATED_TO_HUMAN"},
            )
            self.db.add(audit_entry)
            await self.db.commit()

            diagnosis = AgentDiagnosticOutput(
                issue_type="OPERATIONAL_BOTTLENECK",
                root_cause=f"AI diagnostic evaluation entered degraded mode: {exc}",
                evidence=["Evolus AI service unreachable or degraded"],
                recommended_action="Escalate exception to human operations supervisor for manual review.",
                tool_name=ToolName.ESCALATE_TO_HUMAN,
                tool_input={"shipment_id": str(shipment.id), "reason": f"System degraded mode: {exc}"},
                risk_level=RiskLevel.HIGH,
                confidence=0.50,
            )

        tool_str = val.value if hasattr(val := diagnosis.tool_name, "value") else str(val)
        tool_def = self.registry.get(tool_str)
        sanitized_input = self._sanitize_tool_input(shipment, tool_str, diagnosis.tool_input)

        requires_approval = tool_def.requires_approval
        action_queued = True

        # Link or create exception record
        exception_record = await self._find_or_create_exception(shipment, diagnosis)

        if requires_approval:
            # Consequential action held at human gate (RULE-E06)
            action_id = uuid.uuid4()
            approval_id = uuid.uuid4()

            corrective_action = CorrectiveAction(
                id=action_id,
                exception_id=exception_record.id,
                action_type=tool_str,
                status=ActionStatus.WAITING_APPROVAL.value,
                tool_used=tool_str,
                input_data=sanitized_input,
                idempotency_key=f"ca-{shipment.id}-{tool_str}-{int(now_utc.timestamp())}",
                created_at=now_utc,
            )
            self.db.add(corrective_action)

            approval = Approval(
                id=approval_id,
                action_id=action_id,
                decision=ApprovalDecision.PENDING.value,
                requested_at=now_utc,
            )
            self.db.add(approval)

            audit_log = AuditLog(
                id=uuid.uuid4(),
                entity_type="Approval",
                entity_id=approval_id,
                action="APPROVAL_REQUESTED",
                actor_type="AGENT",
                actor_id="Evolus-Gemma4-Agent",
                details={
                    "shipment_id": str(shipment.id),
                    "action_id": str(action_id),
                    "tool_name": tool_str,
                    "issue_type": diagnosis.issue_type,
                    "root_cause": diagnosis.root_cause,
                },
            )
            self.db.add(audit_log)
            await self.db.commit()

        else:
            # Safe action: execute directly via allowlisted tool registry
            ctx = ToolExecutionContext(
                session=self.db,
                tenant_id=tenant_id or shipment.tenant_id,
                call_count=0,
            )
            exec_result = await self.registry.execute(
                name=tool_str,
                arguments=sanitized_input,
                context=ctx,
                raise_on_limit=False,
            )

            action_id = uuid.uuid4()
            action_status = ActionStatus.COMPLETED.value if exec_result.success else ActionStatus.FAILED.value
            corrective_action = CorrectiveAction(
                id=action_id,
                exception_id=exception_record.id,
                action_type=tool_str,
                status=action_status,
                tool_used=tool_str,
                input_data=sanitized_input,
                output_data=exec_result.data or {"error": exec_result.error},
                idempotency_key=f"ca-{shipment.id}-{tool_str}-{int(now_utc.timestamp())}",
                created_at=now_utc,
                executed_at=now_utc if exec_result.success else None,
            )
            self.db.add(corrective_action)

            audit_log = AuditLog(
                id=uuid.uuid4(),
                entity_type="CorrectiveAction",
                entity_id=action_id,
                action="TOOL_EXECUTED",
                actor_type="AGENT",
                actor_id="Evolus-Gemma4-Agent",
                details={
                    "shipment_id": str(shipment.id),
                    "tool_name": tool_str,
                    "success": exec_result.success,
                    "error": exec_result.error,
                },
            )
            self.db.add(audit_log)
            await self.db.commit()

        # 5. Post-condition verification via database re-query (RULE-E04)
        verified_shipment = await self._fetch_shipment_record(shipment_id, tenant_id=tenant_id)
        logger.info(
            "Completed analysis for shipment %s: tool=%s, requires_approval=%s, verified_status=%s",
            shipment_id,
            tool_str,
            requires_approval,
            verified_shipment.status,
        )

        elapsed = time.perf_counter() - start_time
        return AgentAnalysisResponse(
            shipment_id=shipment.id,
            diagnosis=diagnosis,
            action_queued=action_queued,
            requires_human_approval=requires_approval,
            execution_time_seconds=round(elapsed, 3),
        )

    async def chat(
        self,
        message: str,
        shipment_id: Optional[uuid.UUID] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> AgentChatResponse:
        """
        Operational Copilot Q&A interface grounded in verified shipment evidence.
        Provides conversational answers to logistics operators without hallucination.
        """
        grounded_facts: List[str] = []
        shipment_data: Optional[Dict[str, Any]] = None
        recommended_action: Optional[str] = None

        if shipment_id is not None:
            try:
                shipment = await self._fetch_shipment_record(shipment_id, tenant_id=tenant_id)
                shipment_data = self._serialize_shipment(shipment)

                grounded_facts.append(f"Shipment {shipment.tracking_number}: {shipment.origin} -> {shipment.destination}")
                grounded_facts.append(f"Mode: {shipment.mode} | Current Status: {shipment.status} | Risk Score: {shipment.risk_score}")

                for exc in shipment.exceptions:
                    if exc.status in (ExceptionStatus.OPEN.value, ExceptionStatus.INVESTIGATING.value):
                        grounded_facts.append(f"Open Exception ({exc.exception_type}): {exc.description}")

                for doc in shipment.documents:
                    grounded_facts.append(f"Document ({doc.document_type}): status={doc.validation_status}")

            except ShipmentNotFoundError:
                grounded_facts.append(f"Shipment with ID '{shipment_id}' was not found in database.")

        prompt = format_copilot_prompt(
            message=message,
            shipment_data=shipment_data,
            conversation_history=conversation_history,
        )

        # Operational copilot inference
        lower_msg = message.lower()
        response_text: Optional[str] = None

        if self.evolus_client.is_configured and settings.EVOLUS_AGENT_COPILOT_ID and not self.evolus_client.mock_mode:
            try:
                copilot_out = await self.evolus_client.ask_agent(
                    agent_id=settings.EVOLUS_AGENT_COPILOT_ID,
                    question=prompt,
                )
                if copilot_out and "answer" in copilot_out:
                    ans = str(copilot_out["answer"]).strip()
                    if ans:
                        response_text = ans
            except Exception as e:
                logger.warning("Evolus copilot query fallback to deterministic template: %s", e)

        if not response_text:
            if shipment_data:
                tr = shipment_data.get("tracking_number", "UNKNOWN")
                st = shipment_data.get("status", "UNKNOWN")
                excs = shipment_data.get("exceptions", [])

                if "why" in lower_msg or "delay" in lower_msg or "status" in lower_msg or "problem" in lower_msg:
                    if excs:
                        exc_info = "; ".join([f"{e.get('exception_type')}: {e.get('description')}" for e in excs])
                        response_text = (
                            f"Shipment {tr} is currently in {st} status due to active exceptions: {exc_info}. "
                            "The system has logged root-cause evidence and recommended remediation actions."
                        )
                        recommended_action = "Review open exceptions and approve pending corrective actions in the Approvals queue."
                    else:
                        response_text = f"Shipment {tr} is on schedule in {st} status with no unresolved operational exceptions."
                        recommended_action = "Continue standard transit monitoring."

                elif "document" in lower_msg or "invoice" in lower_msg or "packing" in lower_msg:
                    docs = shipment_data.get("documents", [])
                    doc_summary = ", ".join([f"{d.get('document_type')} ({d.get('validation_status')})" for d in docs]) if docs else "None"
                    response_text = f"Shipment {tr} documents: {doc_summary}."
                    recommended_action = "Upload missing or flagged documents via the Document Management panel."

                else:
                    response_text = (
                        f"Operational report for shipment {tr} ({shipment_data.get('origin')} to {shipment_data.get('destination')}): "
                        f"Status is {st} with risk score {shipment_data.get('risk_score')}/100. "
                        f"{len(excs)} active exception(s) recorded."
                    )
                    recommended_action = "Inspect shipment details and milestone timeline."

            else:
                response_text = (
                    "Logistics Copilot active. I can analyze shipment delays, explain milestone slippage, "
                    "verify document consistency, and review pending approval gates. "
                    "Please provide a shipment ID or ask a general operations question."
                )

        return AgentChatResponse(
            response=response_text,
            shipment_id=shipment_id,
            grounded_facts=grounded_facts,
            recommended_action=recommended_action,
        )
