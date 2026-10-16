"""
backend/tests/test_models.py

Comprehensive unit tests verifying SQLAlchemy 2.0 ORM entity definitions,
metadata registration, table naming, foreign key relationships, and indexes.
"""

from datetime import date, datetime
import uuid
from sqlalchemy.orm import class_mapper

from backend.app.models import (
    Approval,
    AuditLog,
    Base,
    CorrectiveAction,
    Notification,
    Shipment,
    ShipmentDocument,
    ShipmentEvent,
    ShipmentException,
    ShipmentMilestone,
)


def test_metadata_contains_all_nine_tables():
    """Verify that all 9 domain tables are registered on Base.metadata."""
    expected_tables = {
        "shipments",
        "shipment_milestones",
        "shipment_documents",
        "shipment_events",
        "exceptions",
        "corrective_actions",
        "approvals",
        "notifications",
        "audit_logs",
    }
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables)


def test_shipment_foreign_keys_and_relationships():
    """Verify foreign keys and bidirectional relationships from Shipment."""
    # Milestones
    fk_milestone = next(iter(ShipmentMilestone.__table__.foreign_keys))
    assert fk_milestone.column.table.name == "shipments"
    assert fk_milestone.column.name == "id"

    # Documents
    fk_doc = next(iter(ShipmentDocument.__table__.foreign_keys))
    assert fk_doc.column.table.name == "shipments"
    assert fk_doc.column.name == "id"

    # Exceptions
    fk_exc = next(iter(ShipmentException.__table__.foreign_keys))
    assert fk_exc.column.table.name == "shipments"
    assert fk_exc.column.name == "id"

    # Mapper relationships on Shipment
    shipment_mapper = class_mapper(Shipment)
    assert "milestones" in shipment_mapper.relationships
    assert "documents" in shipment_mapper.relationships
    assert "exceptions" in shipment_mapper.relationships
    assert "events" in shipment_mapper.relationships
    assert "notifications" in shipment_mapper.relationships


def test_corrective_action_and_approval_relationship():
    """Verify one-to-one relationship between CorrectiveAction and Approval."""
    action_mapper = class_mapper(CorrectiveAction)
    assert "approval" in action_mapper.relationships
    assert action_mapper.relationships["approval"].uselist is False

    approval_fk = next(iter(Approval.__table__.foreign_keys))
    assert approval_fk.column.table.name == "corrective_actions"
    assert approval_fk.column.name == "id"


def test_index_definitions():
    """Verify critical performance indexes are registered on table metadata."""
    shipment_indexes = {idx.name for idx in Shipment.__table__.indexes}
    assert "idx_shipments_tenant_tracking" in shipment_indexes
    assert "idx_shipments_status_risk" in shipment_indexes

    milestone_indexes = {idx.name for idx in ShipmentMilestone.__table__.indexes}
    assert "idx_milestones_overdue" in milestone_indexes

    audit_indexes = {idx.name for idx in AuditLog.__table__.indexes}
    assert "idx_audit_entity" in audit_indexes
    assert "idx_audit_created" in audit_indexes


def test_model_column_defaults_and_instantiation():
    """Verify that models define expected column defaults and instantiate cleanly."""
    # Verify ColumnDefault configurations on mapped tables
    assert Shipment.__table__.c.status.default.arg == "BOOKED"
    assert Shipment.__table__.c.risk_score.default.arg == 0
    assert Shipment.__table__.c.risk_level.default.arg == "LOW"
    assert ShipmentMilestone.__table__.c.is_completed.default.arg is False
    assert ShipmentException.__table__.c.status.default.arg == "OPEN"

    # Verify instantiation with assigned attributes
    shipment_id = uuid.uuid4()
    shipment = Shipment(
        id=shipment_id,
        tracking_number="SHP-SEA-999",
        origin="Shanghai",
        destination="Rotterdam",
        mode="SEA",
        carrier_id="MAERSK",
        promised_delivery_date=date(2026, 12, 1),
        status="BOOKED",
        risk_score=0,
        risk_level="LOW",
    )
    assert shipment.tracking_number == "SHP-SEA-999"
    assert shipment.status == "BOOKED"
    assert shipment.origin == "Shanghai"

    milestone = ShipmentMilestone(
        shipment_id=shipment_id,
        milestone_name="WAREHOUSE_DISPATCH",
        expected_at=datetime(2026, 11, 20, 10, 0),
        is_completed=False,
    )
    assert milestone.milestone_name == "WAREHOUSE_DISPATCH"
    assert milestone.is_completed is False

    exception = ShipmentException(
        shipment_id=shipment_id,
        exception_type="WEIGHT_MISMATCH",
        status="OPEN",
        description="Weight mismatch detected between invoice and packing list",
        evidence=["Invoice: 250kg", "Packing List: 310kg"],
    )
    assert exception.status == "OPEN"
    assert len(exception.evidence) == 2
