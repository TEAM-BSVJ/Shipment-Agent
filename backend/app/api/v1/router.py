"""
backend/app/api/v1/router.py

Aggregates all API v1 domain routers.
"""

from fastapi import APIRouter

from backend.app.api.v1.events import router as events_router
from backend.app.api.v1.shipments import router as shipments_router

api_v1_router = APIRouter()

# Mount feature routers
api_v1_router.include_router(shipments_router)
api_v1_router.include_router(events_router)
