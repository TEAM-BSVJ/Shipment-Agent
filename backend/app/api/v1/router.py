"""
backend/app/api/v1/router.py

Aggregates all API v1 domain routers.
"""

from fastapi import APIRouter

from backend.app.api.v1.approvals import router as approvals_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.documents import router as documents_router
from backend.app.api.v1.events import router as events_router
from backend.app.api.v1.exceptions import router as exceptions_router
from backend.app.api.v1.notifications import router as notifications_router
from backend.app.api.v1.shipments import router as shipments_router

api_v1_router = APIRouter()

# Mount feature routers
api_v1_router.include_router(shipments_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(exceptions_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(notifications_router)
