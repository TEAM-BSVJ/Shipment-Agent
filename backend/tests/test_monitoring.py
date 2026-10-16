"""
backend/tests/test_monitoring.py

Unit tests for the explainable risk scoring engine (TASK-015) and
the in-process APScheduler milestone overdue monitor (TASK-016).
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

from backend.app.models.entities import (
    Shipment,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.monitoring import (
    OVERDUE_THRESHOLD_HOURS,
    MilestoneChecker,
    MonitoringScheduler,
    RiskScoreBreakdown,
    RiskScorer,
    calculate_risk_score,
)
from backend.app.schemas.enums import (
    BusinessPriority,
    ExceptionStatus,
    ExceptionType,
    MilestoneName,
    RiskLevel,
    ShipmentStatus,
    TransportMode,
)


def test_risk_scorer_baseline_on_time():
    """Verify on-time shipment with zero exceptions and low priority yields Risk Score 0 (LOW)."""
    future_delivery = date.today() + timedelta(days=7)
    breakdown = calculate_risk_score(
        delay_hours=0.0,
        open_exceptions=[],
        promised_delivery_date=future_delivery,
        business_priority=BusinessPriority.LOW,
        current_date=date.today(),
    )

    assert breakdown.total_score == 0
    assert breakdown.risk_level == RiskLevel.LOW
    assert breakdown.delay_penalty == 0
    assert breakdown.exception_weight == 0
    assert breakdown.deadline_urgency == 0
    assert breakdown.priority_weight == 0
    assert "Risk Score 0/100 (LOW)" in breakdown.explanation


def test_risk_scorer_delay_penalty_scaling():
    """Verify DelayPenalty scales at 2.0x delay_hours and caps at 40 points."""
    # 5 hours overdue -> 10 points
    assert RiskScorer.calculate_delay_penalty(5.0) == 10

    # 15 hours overdue -> 30 points
    assert RiskScorer.calculate_delay_penalty(15.0) == 30

    # 20 hours overdue -> 40 points (cap)
    assert RiskScorer.calculate_delay_penalty(20.0) == 40

    # 50 hours overdue -> 40 points (remains capped)
    assert RiskScorer.calculate_delay_penalty(50.0) == 40

    # 0 or negative -> 0 points
    assert RiskScorer.calculate_delay_penalty(0.0) == 0
    assert RiskScorer.calculate_delay_penalty(-2.0) == 0


def test_risk_scorer_exception_weight():
    """Verify ExceptionWeight assigns points according to highest active exception severity."""
    # Single exceptions
    assert RiskScorer.calculate_exception_weight([{"severity": "LOW"}]) == 5
    assert RiskScorer.calculate_exception_weight([{"severity": "MEDIUM"}]) == 15
    assert RiskScorer.calculate_exception_weight([{"severity": "HIGH"}]) == 30
    assert RiskScorer.calculate_exception_weight([{"severity": "CRITICAL"}]) == 40

    # Multiple exceptions: Takes highest severity (CRITICAL=40 over MEDIUM=15)
    mixed = [
        {"severity": "MEDIUM"},
        {"severity": "CRITICAL"},
        {"severity": "LOW"},
    ]
    assert RiskScorer.calculate_exception_weight(mixed) == 40

    # Empty -> 0
    assert RiskScorer.calculate_exception_weight([]) == 0
    assert RiskScorer.calculate_exception_weight(None) == 0


def test_risk_scorer_deadline_urgency():
    """Verify DeadlineUrgency points based on days remaining to promised delivery."""
    today = date(2026, 10, 16)

    # >= 3 days -> 0 points
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 20), current_date=today) == 0
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 19), current_date=today) == 0

    # < 3 days (2 days left) -> 10 points
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 18), current_date=today) == 10

    # < 2 days (1 day left) -> 20 points
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 17), current_date=today) == 20

    # < 1 day (today or past due) -> 30 points
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 16), current_date=today) == 30
    assert RiskScorer.calculate_deadline_urgency(date(2026, 10, 15), current_date=today) == 30


def test_risk_scorer_priority_weight():
    """Verify BusinessPriority weights: CRITICAL=15, HIGH=10, MEDIUM=5, LOW=0."""
    assert RiskScorer.calculate_priority_weight(BusinessPriority.CRITICAL) == 15
    assert RiskScorer.calculate_priority_weight(BusinessPriority.HIGH) == 10
    assert RiskScorer.calculate_priority_weight(BusinessPriority.MEDIUM) == 5
    assert RiskScorer.calculate_priority_weight(BusinessPriority.LOW) == 0


def test_risk_scorer_caps_at_100_and_critical():
    """Verify that score sums > 100 are capped cleanly at 100 and mapped to CRITICAL."""
    # 40 (delay) + 40 (critical exception) + 30 (due today) + 10 (high priority) = 120 -> capped to 100
    today = date.today()
    breakdown = calculate_risk_score(
        delay_hours=30.0,
        open_exceptions=[{"severity": RiskLevel.CRITICAL}],
        promised_delivery_date=today,
        business_priority=BusinessPriority.HIGH,
        current_date=today,
    )

    assert breakdown.total_score == 100
    assert breakdown.risk_level == RiskLevel.CRITICAL


def test_risk_scorer_tier_thresholds():
    """Verify tier mapping boundaries: 0-30 LOW, 31-60 MEDIUM, 61-80 HIGH, 81-100 CRITICAL."""
    assert RiskScorer.score_to_level(0) == RiskLevel.LOW
    assert RiskScorer.score_to_level(30) == RiskLevel.LOW
    assert RiskScorer.score_to_level(31) == RiskLevel.MEDIUM
    assert RiskScorer.score_to_level(60) == RiskLevel.MEDIUM
    assert RiskScorer.score_to_level(61) == RiskLevel.HIGH
    assert RiskScorer.score_to_level(80) == RiskLevel.HIGH
    assert RiskScorer.score_to_level(81) == RiskLevel.CRITICAL
    assert RiskScorer.score_to_level(100) == RiskLevel.CRITICAL


@pytest.mark.asyncio
async def test_milestone_checker_flags_overdue_milestone():
    """
    Verify MilestoneChecker detects milestone delayed by > 2 hours,
    creates MILESTONE_OVERDUE exception, and updates shipment risk score.
    """
    now = datetime(2026, 10, 16, 16, 0, 0, tzinfo=timezone.utc)
    expected_time = now - timedelta(hours=4, minutes=30)  # 4.5 hours overdue

    shipment_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    milestone = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.WAREHOUSE_DISPATCH.value,
        is_completed=False,
        expected_at=expected_time,
        completed_at=None,
    )

    shipment = Shipment(
        id=shipment_id,
        tracking_number="SHP-WH-102",
        status=ShipmentStatus.AT_WAREHOUSE.value,
        origin="Dallas DC",
        destination="Austin Hub",
        mode=TransportMode.ROAD.value,
        carrier_id="MOCK_CARRIER_01",
        promised_delivery_date=date(2026, 10, 18),
        business_priority=BusinessPriority.HIGH.value,
        risk_score=0,
        risk_level=RiskLevel.LOW.value,
        tenant_id=tenant_id,
    )
    shipment.milestones = [milestone]
    shipment.exceptions = []

    # Mock DB Session
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [shipment]
    mock_session.execute.return_value = mock_result

    flagged = await MilestoneChecker.evaluate_overdue_milestones(
        session=mock_session,
        current_time=now,
    )

    assert len(flagged) == 1
    assert flagged[0]["tracking_number"] == "SHP-WH-102"
    assert flagged[0]["milestone"] == MilestoneName.WAREHOUSE_DISPATCH.value
    assert flagged[0]["delay_hours"] == 4.5
    assert flagged[0]["severity"] == RiskLevel.HIGH.value

    # Verify session added exception and audit log
    assert mock_session.add.call_count >= 2

    # Verify shipment risk score updated
    assert shipment.risk_score > 0
    assert shipment.risk_level in (RiskLevel.HIGH.value, RiskLevel.MEDIUM.value)
    assert shipment.status == ShipmentStatus.EXCEPTION.value


@pytest.mark.asyncio
async def test_milestone_checker_idempotency_prevents_duplicates():
    """Verify that calling evaluate_overdue_milestones twice does not create duplicate exceptions."""
    now = datetime(2026, 10, 16, 16, 0, 0, tzinfo=timezone.utc)
    expected_time = now - timedelta(hours=3)

    shipment_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    milestone = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.WAREHOUSE_DISPATCH.value,
        expected_at=expected_time,
        completed_at=None,
        is_completed=False,
    )

    # Existing active exception already open
    existing_exc = ShipmentException(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        exception_type=ExceptionType.MILESTONE_OVERDUE.value,
        risk_level=RiskLevel.MEDIUM.value,
        status=ExceptionStatus.OPEN.value,
        description=f"Milestone '{MilestoneName.WAREHOUSE_DISPATCH.value}' is overdue",
    )

    shipment = Shipment(
        id=shipment_id,
        tracking_number="SHP-WH-103",
        status=ShipmentStatus.AT_WAREHOUSE.value,
        origin="Origin",
        destination="Destination",
        promised_delivery_date=date(2026, 10, 20),
        business_priority=BusinessPriority.MEDIUM.value,
        risk_score=20,
        risk_level=RiskLevel.LOW.value,
        tenant_id=tenant_id,
    )
    shipment.milestones = [milestone]
    shipment.exceptions = [existing_exc]

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [shipment]
    mock_session.execute.return_value = mock_result

    flagged = await MilestoneChecker.evaluate_overdue_milestones(
        session=mock_session,
        current_time=now,
    )

    # Should not flag a new exception because one already exists
    assert len(flagged) == 0


@pytest.mark.asyncio
async def test_milestone_checker_ignores_on_time_and_completed():
    """Verify that completed milestones, future milestones, or delays under 2 hours are ignored."""
    now = datetime(2026, 10, 16, 12, 0, 0, tzinfo=timezone.utc)

    shipment_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    # Milestone 1: Completed
    m1 = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.PICKUP_COMPLETED.value,
        expected_at=now - timedelta(hours=5),
        completed_at=now - timedelta(hours=4),
        is_completed=True,
    )

    # Milestone 2: Future (not yet due)
    m2 = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.PORT_ARRIVAL.value,
        expected_at=now + timedelta(hours=8),
        completed_at=None,
        is_completed=False,
    )

    # Milestone 3: Overdue by only 45 minutes (< 2.0 hours threshold)
    m3 = ShipmentMilestone(
        id=uuid.uuid4(),
        shipment_id=shipment_id,
        milestone_name=MilestoneName.WAREHOUSE_RECEIPT.value,
        expected_at=now - timedelta(minutes=45),
        completed_at=None,
        is_completed=False,
    )

    shipment = Shipment(
        id=shipment_id,
        tracking_number="SHP-NORMAL-104",
        status=ShipmentStatus.IN_TRANSIT.value,
        origin="Origin",
        destination="Destination",
        promised_delivery_date=date(2026, 10, 22),
        business_priority=BusinessPriority.MEDIUM.value,
        tenant_id=tenant_id,
    )
    shipment.milestones = [m1, m2, m3]
    shipment.exceptions = []

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [shipment]
    mock_session.execute.return_value = mock_result

    flagged = await MilestoneChecker.evaluate_overdue_milestones(
        session=mock_session,
        current_time=now,
    )

    assert len(flagged) == 0


@pytest.mark.asyncio
async def test_monitoring_scheduler_lifecycle():
    """Verify start and shutdown lifecycle of MonitoringScheduler."""
    scheduler = MonitoringScheduler(interval_seconds=60)
    assert scheduler.is_running() is False

    scheduler.start()
    assert scheduler.is_running() is True

    scheduler.shutdown()
    assert scheduler.is_running() is False
