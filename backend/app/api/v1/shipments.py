"""
backend/app/api/v1/shipments.py

FastAPI router handling freight shipment queries and registrations.
Provides pagination, multi-criteria filtering, and eager-loaded relational views.
"""

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.schemas.domain import (
    ShipmentCreate,
    ShipmentResponse,
)
from backend.app.schemas.enums import (
    BusinessPriority,
    RiskLevel,
    ShipmentStatus,
    TransportMode,
)
from backend.app.services.shipment_service import (
    DEFAULT_TENANT_ID,
    ShipmentDuplicateError,
    ShipmentService,
    get_shipment_service,
)

logger = logging.getLogger("backend.app.api.v1.shipments")
router = APIRouter(prefix="/shipments", tags=["Shipments"])


@router.get(
    "",
    response_model=List[ShipmentResponse],
    summary="List shipments with pagination and filters",
)
async def list_shipments(
    response: Response,
    status: Optional[ShipmentStatus] = Query(default=None, description="Filter by shipment status"),
    business_priority: Optional[BusinessPriority] = Query(default=None, description="Filter by business priority"),
    risk_level: Optional[RiskLevel] = Query(default=None, description="Filter by risk tier"),
    mode: Optional[TransportMode] = Query(default=None, description="Filter by transportation mode"),
    search: Optional[str] = Query(default=None, description="Search tracking number, origin, or destination"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    service: ShipmentService = Depends(get_shipment_service),
) -> List[ShipmentResponse]:
    """Retrieves a paginated list of shipments matching optional query filters."""
    tenant_id = x_tenant_id or DEFAULT_TENANT_ID

    shipments, total_count = await service.list_shipments(
        db=db,
        tenant_id=tenant_id,
        status=status.value if status else None,
        business_priority=business_priority.value if business_priority else None,
        risk_level=risk_level.value if risk_level else None,
        mode=mode.value if mode else None,
        search=search,
        skip=skip,
        limit=limit,
    )

    response.headers["X-Total-Count"] = str(total_count)
    return [ShipmentResponse.model_validate(s) for s in shipments]


@router.get(
    "/{id}",
    response_model=ShipmentResponse,
    summary="Get shipment details by ID",
)
async def get_shipment(
    id: uuid.UUID,
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    service: ShipmentService = Depends(get_shipment_service),
) -> ShipmentResponse:
    """Retrieves full shipment details including milestones, documents, and exceptions."""
    tenant_id = x_tenant_id or DEFAULT_TENANT_ID
    shipment = await service.get_shipment_by_id(db=db, shipment_id=id, tenant_id=tenant_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{id}' not found.",
        )

    return ShipmentResponse.model_validate(shipment)


@router.post(
    "",
    response_model=ShipmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new shipment with initial milestones",
)
async def create_shipment(
    shipment_in: ShipmentCreate,
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    service: ShipmentService = Depends(get_shipment_service),
) -> ShipmentResponse:
    """Registers a new shipment with initial milestone milestones."""
    tenant_id = x_tenant_id or shipment_in.tenant_id or DEFAULT_TENANT_ID

    try:
        shipment = await service.create_shipment(db=db, shipment_in=shipment_in, tenant_id=tenant_id)
        return ShipmentResponse.model_validate(shipment)
    except ShipmentDuplicateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
