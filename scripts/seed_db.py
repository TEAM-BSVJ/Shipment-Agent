#!/usr/bin/env python3
"""
scripts/seed_db.py

Deterministic database seed script populating 5 realistic freight scenarios (TASK-009).
Designed for end-to-end integration testing, UI demonstration, and hackathon evaluation.

Scenarios seeded:
  - SHP-101: International Sea Freight (Mumbai to Rotterdam) — Missing Commercial Invoice
  - SHP-102: Domestic Air Freight (Dallas to Austin) — Overdue Warehouse Dispatch (+4.5 hours)
  - SHP-103: Multi-Modal Sea Freight (Shanghai to Los Angeles) — Cross-Document Weight Mismatch (250 kg vs 310 kg)
  - SHP-104: Road Freight (Detroit to Cleveland) — Healthy Baseline Operating on Schedule
  - SHP-105: Critical Air Cargo (Frankfurt to Chicago) — Urgent Customs Hold & Resolved Escalation
"""

import argparse
import asyncio
import logging
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("seed_db")

# Ensure project root is in sys.path
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.db.session import AsyncSessionLocal, engine
from backend.app.models.base import Base
from backend.app.models.entities import (
    Approval,
    AuditLog,
    CorrectiveAction,
    Notification,
    Shipment,
    ShipmentDocument,
    ShipmentEvent,
    ShipmentException,
    ShipmentMilestone,
)
from backend.app.schemas.enums import (
    ActionStatus,
    ActionType,
    ApprovalDecision,
    BusinessPriority,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    MilestoneName,
    NotificationChannel,
    NotificationStatus,
    RiskLevel,
    ShipmentStatus,
    ToolName,
    TransportMode,
)

# Deterministic Multi-Tenant ID for all demo scenarios
DEFAULT_TENANT_ID: uuid.UUID = uuid.UUID("a0000000-0000-0000-0000-000000000001")


def build_seed_entities(
    tenant_id: Optional[uuid.UUID] = None,
    base_time: Optional[datetime] = None,
) -> Dict[str, List[Any]]:
    """
    Constructs all in-memory ORM entity instances for the 5 benchmark demo scenarios.
    Returns a dictionary of entity lists categorized by table type.
    """
    tid = tenant_id or DEFAULT_TENANT_ID
    now = base_time or datetime.now(timezone.utc)
    today = now.date()

    entities: Dict[str, List[Any]] = {
        "shipments": [],
        "milestones": [],
        "documents": [],
        "events": [],
        "exceptions": [],
        "corrective_actions": [],
        "approvals": [],
        "notifications": [],
        "audit_logs": [],
    }

    # =========================================================================
    # SCENARIO 1: SHP-101 (International Sea Freight - Missing Commercial Invoice)
    # =========================================================================
    s1_id = uuid.UUID("11111111-1111-1111-1111-111111111001")
    s1 = Shipment(
        id=s1_id,
        tracking_number="SHP-101",
        status=ShipmentStatus.CUSTOMS_HOLD.value,
        origin="Mumbai Port (INBOM)",
        destination="Rotterdam Port (NLRTM)",
        mode=TransportMode.SEA.value,
        carrier_id="MAERSK_LINE",
        promised_delivery_date=today + timedelta(days=12),
        business_priority=BusinessPriority.HIGH.value,
        risk_score=75,
        risk_level=RiskLevel.HIGH.value,
        tenant_id=tid,
    )
    entities["shipments"].append(s1)

    s1_milestones = [
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111001"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
            expected_at=now - timedelta(days=3),
            completed_at=now - timedelta(days=3),
            is_completed=True,
            source="CARRIER_EDI",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111002"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.PICKUP_COMPLETED.value,
            expected_at=now - timedelta(days=2),
            completed_at=now - timedelta(days=2),
            is_completed=True,
            source="WMS_SCAN",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111003"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.CUSTOMS_CLEARANCE.value,
            expected_at=now - timedelta(hours=12),
            completed_at=None,
            is_completed=False,
            source="CUSTOMS_PORTAL",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111004"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.VESSEL_DEPARTURE.value,
            expected_at=now + timedelta(days=1),
            completed_at=None,
            is_completed=False,
            source="MAERSK_SCHEDULE",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111005"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.PORT_ARRIVAL.value,
            expected_at=now + timedelta(days=10),
            completed_at=None,
            is_completed=False,
            source="PORT_SCHEDULE",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111111006"),
            shipment_id=s1_id,
            milestone_name=MilestoneName.DELIVERED.value,
            expected_at=now + timedelta(days=12),
            completed_at=None,
            is_completed=False,
            source="INTERNAL_TMS",
        ),
    ]
    entities["milestones"].extend(s1_milestones)

    # Documents for SHP-101: Packing list is present, but Commercial Invoice is missing!
    s1_doc1 = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111111001"),
        shipment_id=s1_id,
        document_type=DocumentType.PACKING_LIST.value,
        file_ref="data/documents/SHP-101_packing_list.pdf",
        extraction_id="EXT-101-PL",
        extracted_fields={
            "document_type": "PACKING_LIST",
            "document_number": "PL-INBOM-2026-901",
            "shipper": "Tata Steel Export Desk",
            "consignee": "EuroMetal Distributors B.V.",
            "weight_kg": 25000.0,
            "total_packages": 120,
            "hs_codes": ["7208.39"],
        },
        confidence=0.96,
        validation_status=DocumentValidationStatus.VALIDATED.value,
    )
    entities["documents"].append(s1_doc1)

    s1_exc_id = uuid.UUID("e1111111-1111-1111-1111-111111111001")
    s1_exc = ShipmentException(
        id=s1_exc_id,
        shipment_id=s1_id,
        exception_type=ExceptionType.MISSING_DOCUMENT.value,
        risk_level=RiskLevel.HIGH.value,
        status=ExceptionStatus.OPEN.value,
        description="Mandatory Commercial Invoice missing prior to export customs clearance at Mumbai Port.",
        evidence=[
            "Required document COMMERCIAL_INVOICE not found in shipment repository",
            "Export customs gate cutoff at Mumbai Port in 24 hours",
        ],
        root_cause="Shipper commercial desk has not transmitted the finalized tax invoice after container sealing.",
        detected_at=now - timedelta(hours=12),
    )
    entities["exceptions"].append(s1_exc)

    s1_action_id = uuid.UUID("c1111111-1111-1111-1111-111111111001")
    s1_action = CorrectiveAction(
        id=s1_action_id,
        exception_id=s1_exc_id,
        action_type=ActionType.REQUEST_DOCUMENT.value,
        status=ActionStatus.PENDING.value,
        tool_used=ToolName.CREATE_CORRECTION_TASK.value,
        input_data={
            "document_type": "COMMERCIAL_INVOICE",
            "recipient": "export-desk@tatasteel.mock",
            "deadline_hours": 12,
        },
        idempotency_key="ca-shp101-doc-req",
    )
    entities["corrective_actions"].append(s1_action)

    s1_notif = Notification(
        id=uuid.UUID("f1111111-1111-1111-1111-111111111001"),
        shipment_id=s1_id,
        recipient="export-desk@tatasteel.mock",
        channel=NotificationChannel.EMAIL.value,
        template_id="MISSING_DOCUMENT_ADVISORY",
        content="Action Required: Commercial Invoice missing for shipment SHP-101. Please upload immediately to prevent customs detention.",
        status=NotificationStatus.SENT.value,
        idempotency_key=f"notif-s1-{today.isoformat()}",
        sent_at=now - timedelta(hours=11),
    )
    entities["notifications"].append(s1_notif)

    entities["audit_logs"].append(
        AuditLog(
            id=uuid.UUID("a0000001-1111-1111-1111-111111111001"),
            entity_type="Shipment",
            entity_id=s1_id,
            action="SEED_SHIPMENT_CREATED",
            actor_type="SYSTEM",
            actor_id="SeedScript",
            details={"tracking_number": "SHP-101", "scenario": "Missing Commercial Invoice"},
        )
    )

    # =========================================================================
    # SCENARIO 2: SHP-102 (Domestic Air Freight - Overdue Warehouse Dispatch)
    # =========================================================================
    s2_id = uuid.UUID("11111111-1111-1111-1111-111111111002")
    s2 = Shipment(
        id=s2_id,
        tracking_number="SHP-102",
        status=ShipmentStatus.EXCEPTION.value,
        origin="Dallas DC (DFW-1)",
        destination="Austin Hub (AUS-2)",
        mode=TransportMode.AIR.value,
        carrier_id="FEDEX_FREIGHT",
        promised_delivery_date=today + timedelta(days=1),
        business_priority=BusinessPriority.HIGH.value,
        risk_score=72,
        risk_level=RiskLevel.HIGH.value,
        tenant_id=tid,
    )
    entities["shipments"].append(s2)

    s2_milestones = [
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111112001"),
            shipment_id=s2_id,
            milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
            expected_at=now - timedelta(days=1),
            completed_at=now - timedelta(days=1),
            is_completed=True,
            source="CARRIER_EDI",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111112002"),
            shipment_id=s2_id,
            milestone_name=MilestoneName.WAREHOUSE_RECEIPT.value,
            expected_at=now - timedelta(hours=8),
            completed_at=now - timedelta(hours=8),
            is_completed=True,
            source="WMS_SCAN",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111112003"),
            shipment_id=s2_id,
            milestone_name=MilestoneName.WAREHOUSE_DISPATCH.value,
            expected_at=now - timedelta(hours=4, minutes=30),  # 4.5h overdue!
            completed_at=None,
            is_completed=False,
            source="WMS_SCAN",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111112004"),
            shipment_id=s2_id,
            milestone_name=MilestoneName.OUT_FOR_DELIVERY.value,
            expected_at=now + timedelta(hours=14),
            completed_at=None,
            is_completed=False,
            source="CARRIER_EDI",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111112005"),
            shipment_id=s2_id,
            milestone_name=MilestoneName.DELIVERED.value,
            expected_at=now + timedelta(hours=22),
            completed_at=None,
            is_completed=False,
            source="INTERNAL_TMS",
        ),
    ]
    entities["milestones"].extend(s2_milestones)

    # Documents for SHP-102
    s2_doc = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111112001"),
        shipment_id=s2_id,
        document_type=DocumentType.AIR_WAYBILL.value,
        file_ref="data/documents/SHP-102_awb.pdf",
        confidence=0.99,
        validation_status=DocumentValidationStatus.VALIDATED.value,
        extracted_fields={
            "document_type": "AIR_WAYBILL",
            "document_number": "AWB-DFW-8820",
            "shipper": "Dallas Medical Supplies",
            "consignee": "Austin Regional Health",
            "weight_kg": 45.0,
            "pieces": 2,
        },
    )
    entities["documents"].append(s2_doc)

    s2_exc_id = uuid.UUID("e1111111-1111-1111-1111-111111112001")
    s2_exc = ShipmentException(
        id=s2_exc_id,
        shipment_id=s2_id,
        exception_type=ExceptionType.MILESTONE_OVERDUE.value,
        risk_level=RiskLevel.HIGH.value,
        status=ExceptionStatus.INVESTIGATING.value,
        description="Milestone 'WAREHOUSE_DISPATCH' is overdue by 4.5 hours at Dallas DC dock 4B.",
        evidence=[
            "Milestone expected 4.5 hours ago",
            "No outbound dock scan received from Dallas DC dock 4B",
            "Carrier vehicle staged and waiting",
        ],
        root_cause="Staging area 4B forklift mechanical failure delayed cargo pallet loading.",
        detected_at=now - timedelta(hours=2, minutes=30),
    )
    entities["exceptions"].append(s2_exc)

    s2_action_id = uuid.UUID("c1111111-1111-1111-1111-111111112001")
    s2_action = CorrectiveAction(
        id=s2_action_id,
        exception_id=s2_exc_id,
        action_type=ActionType.RESCHEDULE_MILESTONE.value,
        status=ActionStatus.WAITING_APPROVAL.value,
        tool_used=ToolName.RESCHEDULE_MILESTONE.value,
        input_data={
            "milestone_name": MilestoneName.WAREHOUSE_DISPATCH.value,
            "rescheduled_hours": 5.0,
            "carrier_id": "FEDEX_FREIGHT",
        },
        idempotency_key="ca-shp102-reschedule",
    )
    entities["corrective_actions"].append(s2_action)

    s2_approval = Approval(
        id=uuid.UUID("a1111111-1111-1111-1111-111111112001"),
        action_id=s2_action_id,
        requested_at=now - timedelta(hours=2),
        decision=ApprovalDecision.PENDING.value,
        reason="Requires Operations Supervisor sign-off to authorize freight re-routing.",
    )
    entities["approvals"].append(s2_approval)

    entities["audit_logs"].append(
        AuditLog(
            id=uuid.UUID("a0000001-1111-1111-1111-111111112001"),
            entity_type="Shipment",
            entity_id=s2_id,
            action="SEED_SHIPMENT_CREATED",
            actor_type="SYSTEM",
            actor_id="SeedScript",
            details={"tracking_number": "SHP-102", "scenario": "Overdue Warehouse Dispatch"},
        )
    )

    # =========================================================================
    # SCENARIO 3: SHP-103 (Multi-Modal Sea Freight - Weight Discrepancy)
    # =========================================================================
    s3_id = uuid.UUID("11111111-1111-1111-1111-111111111003")
    s3 = Shipment(
        id=s3_id,
        tracking_number="SHP-103",
        status=ShipmentStatus.EXCEPTION.value,
        origin="Shanghai Port (CNSHA)",
        destination="Los Angeles Port (USLAX)",
        mode=TransportMode.SEA.value,
        carrier_id="COSCO_SHIPPING",
        promised_delivery_date=today + timedelta(days=6),
        business_priority=BusinessPriority.CRITICAL.value,
        risk_score=70,
        risk_level=RiskLevel.HIGH.value,
        tenant_id=tid,
    )
    entities["shipments"].append(s3)

    s3_milestones = [
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111113001"),
            shipment_id=s3_id,
            milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
            expected_at=now - timedelta(days=4),
            completed_at=now - timedelta(days=4),
            is_completed=True,
            source="COSCO_EDI",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111113002"),
            shipment_id=s3_id,
            milestone_name=MilestoneName.PICKUP_COMPLETED.value,
            expected_at=now - timedelta(days=2),
            completed_at=now - timedelta(days=2),
            is_completed=True,
            source="SHANGHAI_PORT_SCAN",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111113003"),
            shipment_id=s3_id,
            milestone_name=MilestoneName.VESSEL_DEPARTURE.value,
            expected_at=now + timedelta(days=1),
            completed_at=None,
            is_completed=False,
            source="COSCO_SCHEDULE",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111113004"),
            shipment_id=s3_id,
            milestone_name=MilestoneName.PORT_ARRIVAL.value,
            expected_at=now + timedelta(days=5),
            completed_at=None,
            is_completed=False,
            source="LAX_PORT_SCHEDULE",
        ),
    ]
    entities["milestones"].extend(s3_milestones)

    # Documents with 60 kg weight discrepancy: Invoice (250 kg) vs Packing List (310 kg)
    s3_inv = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111113001"),
        shipment_id=s3_id,
        document_type=DocumentType.COMMERCIAL_INVOICE.value,
        file_ref="data/documents/SHP-103_invoice.pdf",
        confidence=0.98,
        validation_status=DocumentValidationStatus.REJECTED.value,
        extracted_fields={
            "document_type": "COMMERCIAL_INVOICE",
            "document_number": "INV-CNSHA-2026-441",
            "shipper": "Zhejiang Electronics Corp",
            "consignee": "Pacific West Wholesale Inc",
            "weight_kg": 250.0,
            "total_packages": 50,
            "currency": "USD",
            "total_amount": 145000.0,
        },
    )
    s3_pl = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111113002"),
        shipment_id=s3_id,
        document_type=DocumentType.PACKING_LIST.value,
        file_ref="data/documents/SHP-103_packing_list.pdf",
        confidence=0.97,
        validation_status=DocumentValidationStatus.REJECTED.value,
        extracted_fields={
            "document_type": "PACKING_LIST",
            "document_number": "PL-CNSHA-2026-441",
            "shipper": "Zhejiang Electronics Corp",
            "consignee": "Pacific West Wholesale Inc",
            "weight_kg": 310.0,
            "total_packages": 50,
        },
    )
    entities["documents"].extend([s3_inv, s3_pl])

    s3_exc_id = uuid.UUID("e1111111-1111-1111-1111-111111113001")
    s3_exc = ShipmentException(
        id=s3_exc_id,
        shipment_id=s3_id,
        exception_type=ExceptionType.WEIGHT_MISMATCH.value,
        risk_level=RiskLevel.HIGH.value,
        status=ExceptionStatus.OPEN.value,
        description="Weight discrepancy detected between Commercial Invoice (250.0 kg) and Packing List (310.0 kg): discrepancy 60.0 kg exceeds tolerance of 0.5 kg.",
        evidence=[
            "Commercial Invoice declared weight: 250.0 kg",
            "Packing List certified weight: 310.0 kg",
            "Absolute discrepancy: 60.0 kg (Tolerance: 0.5 kg)",
        ],
        root_cause="Pallet tare weight (60 kg) was omitted from Commercial Invoice line items but included on warehouse packing scale.",
        detected_at=now - timedelta(hours=5),
    )
    entities["exceptions"].append(s3_exc)

    s3_action_id = uuid.UUID("c1111111-1111-1111-1111-111111113001")
    s3_action = CorrectiveAction(
        id=s3_action_id,
        exception_id=s3_exc_id,
        action_type=ActionType.TRIGGER_AUTOMATION.value,
        status=ActionStatus.WAITING_APPROVAL.value,
        tool_used=ToolName.TRIGGER_WORKFLOW.value,
        input_data={"workflow_type": "WEIGHT_RECONCILIATION", "discrepancy_kg": 60.0},
        idempotency_key="ca-shp103-workflow",
    )
    entities["corrective_actions"].append(s3_action)

    s3_approval = Approval(
        id=uuid.UUID("a1111111-1111-1111-1111-111111113001"),
        action_id=s3_action_id,
        requested_at=now - timedelta(hours=4),
        decision=ApprovalDecision.PENDING.value,
        reason="Requires Customs Compliance Officer review before issuing revised customs manifest.",
    )
    entities["approvals"].append(s3_approval)

    entities["audit_logs"].append(
        AuditLog(
            id=uuid.UUID("a0000001-1111-1111-1111-111111113001"),
            entity_type="Shipment",
            entity_id=s3_id,
            action="SEED_SHIPMENT_CREATED",
            actor_type="SYSTEM",
            actor_id="SeedScript",
            details={"tracking_number": "SHP-103", "scenario": "Cross-Document Weight Discrepancy"},
        )
    )

    # =========================================================================
    # SCENARIO 4: SHP-104 (Road Freight - Healthy Baseline On-Schedule)
    # =========================================================================
    s4_id = uuid.UUID("11111111-1111-1111-1111-111111111004")
    s4 = Shipment(
        id=s4_id,
        tracking_number="SHP-104",
        status=ShipmentStatus.IN_TRANSIT.value,
        origin="Detroit Assembly (DET-1)",
        destination="Cleveland DC (CLE-4)",
        mode=TransportMode.ROAD.value,
        carrier_id="SCHNEIDER_NATIONAL",
        promised_delivery_date=today + timedelta(days=2),
        business_priority=BusinessPriority.MEDIUM.value,
        risk_score=0,
        risk_level=RiskLevel.LOW.value,
        tenant_id=tid,
    )
    entities["shipments"].append(s4)

    s4_milestones = [
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111114001"),
            shipment_id=s4_id,
            milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
            expected_at=now - timedelta(days=1),
            completed_at=now - timedelta(days=1),
            is_completed=True,
            source="TMS_AUTO",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111114002"),
            shipment_id=s4_id,
            milestone_name=MilestoneName.PICKUP_COMPLETED.value,
            expected_at=now - timedelta(hours=6),
            completed_at=now - timedelta(hours=6),
            is_completed=True,
            source="DRIVER_APP",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111114003"),
            shipment_id=s4_id,
            milestone_name=MilestoneName.WAREHOUSE_DISPATCH.value,
            expected_at=now - timedelta(hours=4),
            completed_at=now - timedelta(hours=4),
            is_completed=True,
            source="GPS_TELEMETRY",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111114004"),
            shipment_id=s4_id,
            milestone_name=MilestoneName.OUT_FOR_DELIVERY.value,
            expected_at=now + timedelta(hours=18),
            completed_at=None,
            is_completed=False,
            source="CARRIER_EDI",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111114005"),
            shipment_id=s4_id,
            milestone_name=MilestoneName.DELIVERED.value,
            expected_at=now + timedelta(days=2),
            completed_at=None,
            is_completed=False,
            source="INTERNAL_TMS",
        ),
    ]
    entities["milestones"].extend(s4_milestones)

    s4_doc = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111114001"),
        shipment_id=s4_id,
        document_type=DocumentType.BILL_OF_LADING.value,
        file_ref="data/documents/SHP-104_bol.pdf",
        confidence=0.99,
        validation_status=DocumentValidationStatus.VALIDATED.value,
        extracted_fields={
            "document_type": "BILL_OF_LADING",
            "document_number": "BOL-DET-9921",
            "shipper": "Midwest Auto Components",
            "consignee": "Great Lakes Manufacturing",
            "weight_kg": 4200.0,
            "pieces": 14,
        },
    )
    entities["documents"].append(s4_doc)

    entities["audit_logs"].append(
        AuditLog(
            id=uuid.UUID("a0000001-1111-1111-1111-111111114001"),
            entity_type="Shipment",
            entity_id=s4_id,
            action="SEED_SHIPMENT_CREATED",
            actor_type="SYSTEM",
            actor_id="SeedScript",
            details={"tracking_number": "SHP-104", "scenario": "Healthy Baseline On-Schedule"},
        )
    )

    # =========================================================================
    # SCENARIO 5: SHP-105 (Critical Air Cargo - Customs Hold & Resolved Escalation)
    # =========================================================================
    s5_id = uuid.UUID("11111111-1111-1111-1111-111111111005")
    s5 = Shipment(
        id=s5_id,
        tracking_number="SHP-105",
        status=ShipmentStatus.CUSTOMS_HOLD.value,
        origin="Frankfurt CargoCity (FRA)",
        destination="Chicago O'Hare Hub (ORD)",
        mode=TransportMode.AIR.value,
        carrier_id="LUFTHANSA_CARGO",
        promised_delivery_date=today,  # Due today!
        business_priority=BusinessPriority.CRITICAL.value,
        risk_score=85,
        risk_level=RiskLevel.CRITICAL.value,
        tenant_id=tid,
    )
    entities["shipments"].append(s5)

    s5_milestones = [
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111115001"),
            shipment_id=s5_id,
            milestone_name=MilestoneName.BOOKING_CONFIRMED.value,
            expected_at=now - timedelta(days=2),
            completed_at=now - timedelta(days=2),
            is_completed=True,
            source="LUFTHANSA_API",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111115002"),
            shipment_id=s5_id,
            milestone_name=MilestoneName.VESSEL_DEPARTURE.value,
            expected_at=now - timedelta(hours=14),
            completed_at=now - timedelta(hours=14),
            is_completed=True,
            source="FLIGHT_RADAR",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111115003"),
            shipment_id=s5_id,
            milestone_name=MilestoneName.PORT_ARRIVAL.value,
            expected_at=now - timedelta(hours=4),
            completed_at=now - timedelta(hours=4),
            is_completed=True,
            source="ORD_CARGO_SCAN",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111115004"),
            shipment_id=s5_id,
            milestone_name=MilestoneName.CUSTOMS_CLEARANCE.value,
            expected_at=now - timedelta(hours=1),
            completed_at=None,
            is_completed=False,
            source="CBP_ACE_PORTAL",
        ),
        ShipmentMilestone(
            id=uuid.UUID("21111111-1111-1111-1111-111111115005"),
            shipment_id=s5_id,
            milestone_name=MilestoneName.DELIVERED.value,
            expected_at=now + timedelta(hours=5),
            completed_at=None,
            is_completed=False,
            source="INTERNAL_TMS",
        ),
    ]
    entities["milestones"].extend(s5_milestones)

    s5_doc = ShipmentDocument(
        id=uuid.UUID("d1111111-1111-1111-1111-111111115001"),
        shipment_id=s5_id,
        document_type=DocumentType.AIR_WAYBILL.value,
        file_ref="data/documents/SHP-105_awb.pdf",
        confidence=0.98,
        validation_status=DocumentValidationStatus.VALIDATED.value,
        extracted_fields={
            "document_type": "AIR_WAYBILL",
            "document_number": "020-FRA-88123910",
            "shipper": "BioPharma Deutschland GmbH",
            "consignee": "Midwest Therapeutics Chicago",
            "weight_kg": 180.0,
            "special_handling": "TEMPERATURE_CONTROLLED_COLD_CHAIN",
        },
    )
    entities["documents"].append(s5_doc)

    s5_exc_id = uuid.UUID("e1111111-1111-1111-1111-111111115001")
    s5_exc = ShipmentException(
        id=s5_exc_id,
        shipment_id=s5_id,
        exception_type=ExceptionType.CUSTOMS_REJECTION.value,
        risk_level=RiskLevel.CRITICAL.value,
        status=ExceptionStatus.RESOLVED.value,
        description="Container flagged for CBP biological & temperature-sensitive pharma inspection hold at ORD.",
        evidence=[
            "CBP inspection notice 1H received at ORD facility",
            "Cold chain sensor verified 3.8 deg C (safe threshold 2-8 deg C)",
            "Licensed broker clearance protocol executed",
        ],
        root_cause="Random customs regulatory sampling check on temperature-controlled pharmaceutical products.",
        detected_at=now - timedelta(hours=3),
        resolved_at=now - timedelta(minutes=45),
    )
    entities["exceptions"].append(s5_exc)

    s5_action_id = uuid.UUID("c1111111-1111-1111-1111-111111115001")
    s5_action = CorrectiveAction(
        id=s5_action_id,
        exception_id=s5_exc_id,
        action_type=ActionType.ESCALATE_TO_HUMAN.value,
        status=ActionStatus.COMPLETED.value,
        tool_used=ToolName.ESCALATE_TO_HUMAN.value,
        input_data={"priority": "EMERGENCY_COLD_CHAIN", "facility": "ORD_CARGO_5"},
        output_data={"release_permit_id": "CBP-ORD-BIO-89211"},
        idempotency_key="ca-shp105-escalate",
        executed_at=now - timedelta(hours=1),
    )
    entities["corrective_actions"].append(s5_action)

    s5_approval = Approval(
        id=uuid.UUID("a1111111-1111-1111-1111-111111115001"),
        action_id=s5_action_id,
        requested_at=now - timedelta(hours=2),
        reviewed_at=now - timedelta(minutes=50),
        decision=ApprovalDecision.APPROVED.value,
        reason="Licensed broker verified all biological import permits and CBP inspector signed release form.",
    )
    entities["approvals"].append(s5_approval)

    entities["audit_logs"].append(
        AuditLog(
            id=uuid.UUID("a0000001-1111-1111-1111-111111115001"),
            entity_type="Shipment",
            entity_id=s5_id,
            action="SEED_SHIPMENT_CREATED",
            actor_type="SYSTEM",
            actor_id="SeedScript",
            details={"tracking_number": "SHP-105", "scenario": "Customs Hold & Resolved Escalation"},
        )
    )

    return entities


async def seed_database(
    session: AsyncSession,
    reset: bool = True,
    tenant_id: Optional[uuid.UUID] = None,
) -> Dict[str, int]:
    """
    Populates database with 5 deterministic demo shipments and dependent relational entities.
    Returns row count totals for each seeded entity type.
    """
    data = build_seed_entities(tenant_id=tenant_id)
    counts: Dict[str, int] = {}

    if reset:
        logger.info("Clearing existing seed records...")
        # Delete in reverse foreign-key order
        for entity_cls in [
            Approval,
            CorrectiveAction,
            Notification,
            ShipmentEvent,
            ShipmentException,
            ShipmentDocument,
            ShipmentMilestone,
            AuditLog,
            Shipment,
        ]:
            stmt = select(entity_cls)
            result = await session.execute(stmt)
            existing = result.scalars().all()
            for obj in existing:
                await session.delete(obj)
        await session.flush()

    logger.info("Inserting benchmark shipments and relational trees...")

    # Insert Shipments
    for s in data["shipments"]:
        session.add(s)
    await session.flush()
    counts["shipments"] = len(data["shipments"])

    # Insert Milestones
    for m in data["milestones"]:
        session.add(m)
    counts["milestones"] = len(data["milestones"])

    # Insert Documents
    for d in data["documents"]:
        session.add(d)
    counts["documents"] = len(data["documents"])

    # Insert Exceptions
    for e in data["exceptions"]:
        session.add(e)
    await session.flush()
    counts["exceptions"] = len(data["exceptions"])

    # Insert Corrective Actions
    for ca in data["corrective_actions"]:
        session.add(ca)
    await session.flush()
    counts["corrective_actions"] = len(data["corrective_actions"])

    # Insert Approvals
    for app in data["approvals"]:
        session.add(app)
    counts["approvals"] = len(data["approvals"])

    # Insert Notifications
    for notif in data["notifications"]:
        session.add(notif)
    counts["notifications"] = len(data["notifications"])

    # Insert Audit Logs
    for audit in data["audit_logs"]:
        session.add(audit)
    counts["audit_logs"] = len(data["audit_logs"])

    await session.commit()
    logger.info("Successfully seeded database: %s", counts)
    return counts


async def run_seed_cli(reset: bool = True) -> None:
    """CLI runner ensuring tables exist before seeding data."""
    logger.info("Connecting to database: %s", engine.url.render_as_string(hide_password=True))
    try:
        # Guarantee all table schemas exist in database
        async with engine.begin() as conn:
            if reset:
                logger.info("Resetting database schema tables...")
                await conn.run_sync(Base.metadata.create_all)

        async with AsyncSessionLocal() as session:
            counts = await seed_database(session, reset=reset)
            print("\n" + "=" * 60)
            print("  DATABASE SEEDING COMPLETED SUCCESSFULLY")
            print("=" * 60)
            for k, v in counts.items():
                print(f"  {k:<22}: {v} records")
            print("=" * 60 + "\n")
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Deterministic database seeder for Logistics Agent")
    parser.add_argument(
        "--reset",
        action="store_true",
        default=True,
        help="Clear existing records before seeding (default: True)",
    )
    parser.add_argument(
        "--no-reset",
        action="store_false",
        dest="reset",
        help="Do not clear existing records before seeding",
    )
    args = parser.parse_args()

    asyncio.run(run_seed_cli(reset=args.reset))


if __name__ == "__main__":
    main()
