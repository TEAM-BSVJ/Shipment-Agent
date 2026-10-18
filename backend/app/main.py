"""
backend/app/main.py

FastAPI Application Entry Point & Factory.
Configures CORS middleware, lifespan context manager, and core system endpoints.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.router import api_v1_router
from backend.app.config import get_settings

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backend.app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager for startup and shutdown events.
    Initializes database schema and connection pools during startup.
    """
    logger.info("Starting %s v%s in %s mode", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)
    try:
        from backend.app.db.session import AsyncSessionLocal, engine
        from backend.app.models.base import Base
        import backend.app.models.entities  # noqa: F401 - registers all ORM models with Base.metadata
        from backend.app.models.entities import Shipment
        from sqlalchemy import select

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified and initialized.")

        # Auto-seed benchmark data if shipments table is empty
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Shipment.id).limit(1))
            if result.scalars().first() is None:
                logger.info("Database is empty. Auto-seeding initial benchmark freight records...")
                from scripts.seed_db import seed_database
                counts = await seed_database(session, reset=False)
                logger.info("Auto-seeding completed successfully: %s", counts)
            else:
                logger.info("Database already contains shipment records. Skipping auto-seed.")
    except Exception as exc:
        logger.warning("Database schema initialization or auto-seeding skipped: %s", exc)

    yield
    logger.info("Shutting down %s", settings.APP_NAME)


def create_app() -> FastAPI:
    """Factory function to build and configure the FastAPI application."""
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API v1 Routers
    application.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    @application.post("/api/v1/system/seed", tags=["System"])
    async def trigger_seed(reset: bool = False) -> Dict[str, Any]:
        """Manual admin endpoint to seed benchmark freight scenarios on cloud platforms."""
        from backend.app.db.session import AsyncSessionLocal
        from scripts.seed_db import seed_database

        async with AsyncSessionLocal() as session:
            counts = await seed_database(session, reset=reset)
            return {
                "status": "success",
                "message": "Database seeded successfully",
                "counts": counts,
            }

    @application.get("/health", tags=["System"])
    async def health_check() -> Dict[str, Any]:
        """System health and readiness check endpoint."""
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
            "evolus_configured": settings.has_evolus_credentials,
        }

    @application.get("/", tags=["System"])
    async def root_info() -> Dict[str, Any]:
        """Service metadata and documentation pointers."""
        return {
            "message": "Logistics Bottleneck Resolution Agent API",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "health": "/health",
        }

    return application


app = create_app()
