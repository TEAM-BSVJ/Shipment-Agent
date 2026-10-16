"""
backend/app/monitoring/risk_scorer.py

Deterministic and explainable risk scoring engine.
Implements the exact formula from Architecture.md Section 11.2:
    RiskScore = min(100, DelayPenalty + ExceptionWeight + DeadlineUrgency + PriorityWeight)

Where:
    - DelayPenalty: min(40, delay_hours * 2.0) (0 to 40 points)
    - ExceptionWeight: CRITICAL=40, HIGH=30, MEDIUM=15, LOW=5, None=0
    - DeadlineUrgency: Days remaining to promised delivery date:
        < 1 day (or past due): 30
        < 2 days: 20
        < 3 days: 10
        >= 3 days: 0
    - PriorityWeight: HIGH=10, MEDIUM=5, LOW=0

Risk Tiers:
    - 0–30: LOW (Green)
    - 31–60: MEDIUM (Amber)
    - 61–80: HIGH (Orange)
    - 81–100: CRITICAL (Red)
"""

import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

from backend.app.schemas.enums import BusinessPriority, RiskLevel

logger = logging.getLogger("backend.app.monitoring.risk_scorer")


class RiskScoreBreakdown(BaseModel):
    """Transparent mathematical breakdown of computed shipment risk."""
    delay_hours: float = 0.0
    delay_penalty: int = 0
    exception_weight: int = 0
    deadline_urgency: int = 0
    priority_weight: int = 0
    total_score: int = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    explanation: str


class RiskScorer:
    """Computes deterministic operational risk scores for freight shipments."""

    @classmethod
    def score_to_level(cls, score: int) -> RiskLevel:
        """Categorizes raw score [0, 100] into semantic RiskLevel tiers."""
        if score <= 30:
            return RiskLevel.LOW
        elif score <= 60:
            return RiskLevel.MEDIUM
        elif score <= 80:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL

    @classmethod
    def calculate_delay_penalty(cls, delay_hours: float) -> int:
        """DelayPenalty: min(40, round(delay_hours * 2.0))."""
        if delay_hours <= 0:
            return 0
        return min(40, int(round(delay_hours * 2.0)))

    @classmethod
    def calculate_exception_weight(cls, exceptions: Optional[List[Any]]) -> int:
        """
        ExceptionWeight based on highest severity among active exceptions:
        CRITICAL=40, HIGH=30, MEDIUM=15, LOW=5, None=0
        """
        if not exceptions:
            return 0

        severity_scores = {
            RiskLevel.CRITICAL.value: 40,
            RiskLevel.HIGH.value: 30,
            RiskLevel.MEDIUM.value: 15,
            RiskLevel.LOW.value: 5,
        }

        max_weight = 0
        for exc in exceptions:
            # Handle ORM model or dict
            severity = getattr(exc, "severity", None) or (exc.get("severity") if isinstance(exc, dict) else None)
            if severity is None:
                severity = getattr(exc, "risk_level", None) or (exc.get("risk_level") if isinstance(exc, dict) else None)

            if isinstance(severity, RiskLevel):
                severity_val = severity.value
            else:
                severity_val = str(severity).upper() if severity else ""

            weight = severity_scores.get(severity_val, 0)
            if weight > max_weight:
                max_weight = weight

        return max_weight

    @classmethod
    def calculate_deadline_urgency(
        cls,
        promised_delivery_date: Optional[Union[date, datetime]],
        current_date: Optional[date] = None,
    ) -> int:
        """
        DeadlineUrgency based on days remaining to promised delivery:
        < 1 day: 30
        < 2 days: 20
        < 3 days: 10
        >= 3 days: 0
        """
        if promised_delivery_date is None:
            return 0

        now_date = current_date or datetime.utcnow().date()
        target_date = promised_delivery_date if isinstance(promised_delivery_date, date) and not isinstance(promised_delivery_date, datetime) else promised_delivery_date.date()

        days_remaining = (target_date - now_date).days

        if days_remaining < 1:
            return 30
        elif days_remaining < 2:
            return 20
        elif days_remaining < 3:
            return 10
        else:
            return 0

    @classmethod
    def calculate_priority_weight(cls, priority: Optional[Union[BusinessPriority, str]]) -> int:
        """
        PriorityWeight: HIGH=10, MEDIUM=5, LOW=0 (CRITICAL=15).
        """
        if not priority:
            return 5  # default MEDIUM

        p_str = priority.value if isinstance(priority, BusinessPriority) else str(priority).upper()

        if p_str == BusinessPriority.CRITICAL.value:
            return 15
        elif p_str == BusinessPriority.HIGH.value:
            return 10
        elif p_str == BusinessPriority.MEDIUM.value:
            return 5
        else:
            return 0

    @classmethod
    def calculate(
        cls,
        delay_hours: float = 0.0,
        open_exceptions: Optional[List[Any]] = None,
        promised_delivery_date: Optional[Union[date, datetime]] = None,
        business_priority: Optional[Union[BusinessPriority, str]] = None,
        current_date: Optional[date] = None,
    ) -> RiskScoreBreakdown:
        """
        Computes composite explainable risk score and returns detailed breakdown.
        """
        delay_penalty = cls.calculate_delay_penalty(delay_hours)
        exception_weight = cls.calculate_exception_weight(open_exceptions)
        deadline_urgency = cls.calculate_deadline_urgency(promised_delivery_date, current_date=current_date)
        priority_weight = cls.calculate_priority_weight(business_priority)

        raw_total = delay_penalty + exception_weight + deadline_urgency + priority_weight
        total_score = min(100, max(0, raw_total))
        risk_level = cls.score_to_level(total_score)

        explanation = (
            f"Risk Score {total_score}/100 ({risk_level.value}) computed from: "
            f"DelayPenalty={delay_penalty} ({delay_hours:.1f}h overdue), "
            f"ExceptionWeight={exception_weight}, "
            f"DeadlineUrgency={deadline_urgency}, "
            f"PriorityWeight={priority_weight}."
        )

        return RiskScoreBreakdown(
            delay_hours=round(delay_hours, 2),
            delay_penalty=delay_penalty,
            exception_weight=exception_weight,
            deadline_urgency=deadline_urgency,
            priority_weight=priority_weight,
            total_score=total_score,
            risk_level=risk_level,
            explanation=explanation,
        )


def calculate_risk_score(
    delay_hours: float = 0.0,
    open_exceptions: Optional[List[Any]] = None,
    promised_delivery_date: Optional[Union[date, datetime]] = None,
    business_priority: Optional[Union[BusinessPriority, str]] = None,
    current_date: Optional[date] = None,
) -> RiskScoreBreakdown:
    """Convenience functional interface for RiskScorer.calculate."""
    return RiskScorer.calculate(
        delay_hours=delay_hours,
        open_exceptions=open_exceptions,
        promised_delivery_date=promised_delivery_date,
        business_priority=business_priority,
        current_date=current_date,
    )

