"""
backend/app/models/base.py

SQLAlchemy 2.0 Declarative Base and Reusable Entity Mixins.
Enforces multi-tenancy scoping, UUID primary keys, and UTC timestamps.
"""

import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(DeclarativeBase):
    """Declarative root class for all SQLAlchemy ORM models."""

    # Generate __tablename__ automatically in lowercase plural if not specified
    @declared_attr.directive
    def __tablename__(cls) -> str:
        name = cls.__name__.lower()
        if name.endswith("y"):
            return name[:-1] + "ies"
        elif not name.endswith("s"):
            return name + "s"
        return name


class UUIDPrimaryKeyMixin:
    """Provides an indexed UUID primary key default."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        sort_order=-10,
    )


class TimestampMixin:
    """Provides created_at and updated_at timestamps in UTC."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )


class TenantMixin:
    """Enforces multi-tenant data isolation per NFR-009 / RULE-F04."""

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )
