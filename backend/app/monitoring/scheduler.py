"""
backend/app/monitoring/scheduler.py

In-process APScheduler background monitoring engine for overdue milestone detection.
Adheres to Rules.md & Architecture.md:
  - In-process APScheduler without external Redis/Celery dependencies (RULE-C01, DEC-006)
  - Checks uncompleted milestones where expected_at < NOW()
  - Automatically flags MILESTONE_OVERDUE when delay > 2 hours (TASK-016)
  - Recalculates shipment risk score using deterministic formula
  - Idempotent: Does not create duplicate exceptions for the same milestone delay
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import AsyncSessionLocal
from backend.app.models.entities import (
    AuditLog,
    Shipment,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.monitoring.risk_scorer import calculate_risk_score
from backend.app.schemas.enums import (
    ExceptionStatus,
    ExceptionType,
    RiskLevel,
    ShipmentStatus,
)

logger = logging.getLogger("backend.app.monitoring.scheduler")

# Threshold in hours before a delayed milestone triggers a formal exception
OVERDUE_THRESHOLD_HOURS: float = 2.0


class MilestoneChecker:
    """Evaluates milestone timestamps and generates overdue exceptions."""

    @classmethod
    async def evaluate_overdue_milestones(
        cls,
        session: AsyncSession,
        current_time: Optional[datetime] = None,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Scans all uncompleted milestones where expected_at < NOW().
        If delay > 2 hours and no open MILESTONE_OVERDUE exception exists:
          1. Creates a ShipmentException record.
          2. Recalculates the shipment risk score and risk level.
          3. Emits an audit log.
        Returns a summary list of flagged exceptions.
        """
        now = current_time or datetime.now(timezone.utc)

        # Query all active shipments with milestones and exceptions loaded
        stmt = (
            select(Shipment)
            .where(Shipment.status != ShipmentStatus.DELIVERED.value)
            .where(Shipment.status != ShipmentStatus.CANCELLED.value)
            .options(
                selectinload(Shipment.milestones),
                selectinload(Shipment.exceptions),
            )
        )
        if tenant_id is not None:
            stmt = stmt.where(Shipment.tenant_id == tenant_id)

        result = await session.execute(stmt)
        shipments = result.scalars().all()

        flagged_events: List[Dict[str, Any]] = []

        for shipment in shipments:
            max_delay_hours = 0.0

            for milestone in shipment.milestones:
                # Milestone is pending if is_completed is False and completed_at is None
                is_completed = getattr(milestone, "is_completed", False) or bool(getattr(milestone, "completed_at", None))
                if is_completed or not milestone.expected_at:
                    continue

                m_name = getattr(milestone, "milestone_name", getattr(milestone, "name", "UNKNOWN"))

                # Ensure timezone-aware comparison
                exp_at = milestone.expected_at
                if exp_at.tzinfo is None:
                    exp_at = exp_at.replace(tzinfo=timezone.utc)
                if now.tzinfo is None:
                    now = now.replace(tzinfo=timezone.utc)

                if now > exp_at:
                    delay_hours = (now - exp_at).total_seconds() / 3600.0
                    if delay_hours > max_delay_hours:
                        max_delay_hours = delay_hours

                    if delay_hours >= OVERDUE_THRESHOLD_HOURS:
                        # Check for existing open exception for this milestone
                        has_open_exception = any(
                            (getattr(e, "exception_type", None) or getattr(e, "type", None)) == ExceptionType.MILESTONE_OVERDUE.value
                            and e.status in (ExceptionStatus.OPEN.value, ExceptionStatus.INVESTIGATING.value, ExceptionStatus.IN_PROGRESS.value)
                            and m_name in (e.description or "")
                            for e in shipment.exceptions
                        )

                        if not has_open_exception:
                            exc_severity = RiskLevel.CRITICAL if delay_hours >= 12.0 else (
                                RiskLevel.HIGH if delay_hours >= 4.0 else RiskLevel.MEDIUM
                            )
                            exc_id = uuid.uuid4()
                            description = (
                                f"Milestone '{m_name}' is overdue by {delay_hours:.1f} hours "
                                f"(scheduled for {exp_at.strftime('%Y-%m-%d %H:%M UTC')})."
                            )

                            new_exc = ShipmentException(
                                id=exc_id,
                                shipment_id=shipment.id,
                                exception_type=ExceptionType.MILESTONE_OVERDUE.value,
                                risk_level=exc_severity.value,
                                status=ExceptionStatus.OPEN.value,
                                description=description,
                            )
                            session.add(new_exc)
                            shipment.exceptions.append(new_exc)

                            # Structured Audit Log
                            audit = AuditLog(
                                entity_type="ShipmentException",
                                entity_id=exc_id,
                                action="AUTO_DETECT_MILESTONE_OVERDUE",
                                actor_type="SYSTEM",
                                actor_id="APScheduler-Monitor",
                                details={
                                    "shipment_id": str(shipment.id),
                                    "milestone_name": m_name,
                                    "delay_hours": round(delay_hours, 2),
                                    "severity": exc_severity.value,
                                },
                            )
                            session.add(audit)

                            flagged_events.append({
                                "shipment_id": str(shipment.id),
                                "tracking_number": shipment.tracking_number,
                                "milestone": m_name,
                                "delay_hours": round(delay_hours, 2),
                                "exception_id": str(exc_id),
                                "severity": exc_severity.value,
                            })

            # Recalculate shipment composite risk score
            active_exceptions = [
                e for e in shipment.exceptions
                if e.status not in (ExceptionStatus.RESOLVED.value, ExceptionStatus.DISMISSED.value)
            ]
            breakdown = calculate_risk_score(
                delay_hours=max_delay_hours,
                open_exceptions=active_exceptions,
                promised_delivery_date=shipment.promised_delivery_date,
                business_priority=shipment.business_priority,
                current_date=now.date(),
            )

            shipment.risk_score = breakdown.total_score
            shipment.risk_level = breakdown.risk_level.value

            if (active_exceptions or breakdown.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)) and shipment.status not in (
                ShipmentStatus.CUSTOMS_HOLD.value,
                ShipmentStatus.DELIVERED.value,
            ):
                shipment.status = ShipmentStatus.EXCEPTION.value

            session.add(shipment)

        if flagged_events:
            await session.flush()
            logger.info("Milestone monitor flagged %d overdue exceptions", len(flagged_events))

        return flagged_events


class MonitoringScheduler:
    """Manages the in-process APScheduler background evaluation job."""

    def __init__(self, interval_seconds: int = 300):
        self.interval_seconds = interval_seconds
        self.scheduler: AsyncIOScheduler = AsyncIOScheduler()
        self._is_running: bool = False

    def is_running(self) -> bool:
        return self._is_running

    async def _scheduled_job_wrapper(self) -> None:
        """Periodic task runner using an isolated asynchronous DB session."""
        try:
            async with AsyncSessionLocal() as session:
                await MilestoneChecker.evaluate_overdue_milestones(session)
                await session.commit()
        except Exception as exc:
            logger.error("Exception during background milestone monitoring run: %s", exc, exc_info=True)

    def start(self) -> None:
        """Starts the periodic background scheduler job."""
        if not self._is_running:
            self.scheduler.add_job(
                self._scheduled_job_wrapper,
                trigger="interval",
                seconds=self.interval_seconds,
                id="milestone_overdue_monitor",
                replace_existing=True,
            )
            self.scheduler.start()
            self._is_running = True
            logger.info("MonitoringScheduler started (interval: %ds)", self.interval_seconds)

    def shutdown(self) -> None:
        """Gracefully shuts down the background scheduler."""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("MonitoringScheduler shut down successfully.")

    async def trigger_now(
        self,
        session: AsyncSession,
        current_time: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Executes an immediate milestone evaluation pass on demand."""
        return await MilestoneChecker.evaluate_overdue_milestones(session, current_time=current_time)


# Global singleton instance
scheduler = MonitoringScheduler(interval_seconds=300)


def start_monitoring_scheduler(interval_seconds: int = 300) -> MonitoringScheduler:
    """Starts the global background monitoring scheduler."""
    scheduler.interval_seconds = interval_seconds
    scheduler.start()
    return scheduler


def shutdown_monitoring_scheduler() -> None:
    """Shuts down the global background monitoring scheduler."""
    scheduler.shutdown()
