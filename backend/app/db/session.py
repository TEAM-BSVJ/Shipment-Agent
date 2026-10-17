"""
backend/app/db/session.py

SQLAlchemy 2.0 Asynchronous Database Connection & Session Management.
Supports async PostgreSQL via asyncpg with connection pooling and pre-ping checks.
"""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.app.config import get_settings

logger = logging.getLogger("backend.app.db.session")
settings = get_settings()

# Configure Asynchronous Engine
# pool_pre_ping automatically tests connections before checkout
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.LOG_LEVEL.upper() == "DEBUG"),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an isolated asynchronous database session.
    Automatically rolls back on uncaught exceptions and guarantees session closure.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error("Database session transaction rolled back due to error: %s", exc)
            raise
        finally:
            await session.close()


async def close_db_engine() -> None:
    """Closes all connection pools gracefully on application shutdown."""
    logger.info("Disposing database connection pool.")
    await engine.dispose()
