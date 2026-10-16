"""
backend/tests/test_db_session.py

Unit tests verifying asynchronous database engine configuration,
session factory, generator lifecycle, and ORM Base entity mixins.
"""

import inspect
import uuid
import pytest
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from backend.app.db.session import AsyncSessionLocal, close_db_engine, engine, get_db
from backend.app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


def test_engine_configuration():
    """Verify that the database engine is configured as an async PostgreSQL engine."""
    assert isinstance(engine, AsyncEngine)
    assert engine.dialect.name == "postgresql"
    assert engine.pool is not None


def test_sessionmaker_configuration():
    """Verify sessionmaker produces configured AsyncSession instances."""
    assert isinstance(AsyncSessionLocal, async_sessionmaker)
    assert AsyncSessionLocal.kw.get("expire_on_commit") is False


def test_get_db_generator_signature():
    """Verify get_db is an asynchronous generator suitable for FastAPI Depends()."""
    assert inspect.isasyncgenfunction(get_db)


def test_base_model_and_mixins():
    """Verify ORM model creation with UUID, Timestamp, and Tenant mixins."""

    class SampleEntity(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
        name: Mapped[str] = mapped_column(String(64))

    # Check table name auto-resolution
    assert SampleEntity.__tablename__ == "sampleentities"

    # Verify column presence
    columns = SampleEntity.__table__.columns
    assert "id" in columns
    assert "created_at" in columns
    assert "updated_at" in columns
    assert "tenant_id" in columns
    assert "name" in columns

    # Verify primary key and constraints
    assert columns["id"].primary_key is True
    assert columns["tenant_id"].nullable is False
    assert columns["created_at"].nullable is False


@pytest.mark.asyncio
async def test_close_db_engine_executes_safely():
    """Verify close_db_engine runs without throwing exceptions."""
    await close_db_engine()
