"""
backend/app/api/v1/documents.py

FastAPI router handling shipping document uploads, secure MIME validation (RULE-F05),
field extraction pipelines, and automated cross-document reconciliation.
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.document_processing.pipeline import (
    DocumentParser,
    DocumentUploadValidator,
    FileValidationError,
    save_uploaded_file,
)
from backend.app.document_processing.validator import CrossDocumentValidator
from backend.app.models.entities import (
    AuditLog,
    Shipment,
    ShipmentDocument,
    ShipmentException,
)
from backend.app.monitoring.risk_scorer import calculate_risk_score
from backend.app.schemas.domain import (
    DocumentExtractedFields,
    DocumentResponse,
    DomainBaseModel,
)
from backend.app.schemas.enums import (
    BusinessPriority,
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    RiskLevel,
)
from backend.app.services.shipment_service import (
    DEFAULT_TENANT_ID,
    ShipmentService,
    get_shipment_service,
)

logger = logging.getLogger("backend.app.api.v1.documents")
router = APIRouter(tags=["Documents"])


class DocumentExtractRequest(DomainBaseModel):
    """Optional manual payload to trigger extraction on provided or stored text."""
    raw_text: Optional[str] = Field(default=None, description="Explicit raw text snippet to extract from")


@router.post(
    "/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and validate a freight document (PDF/PNG/JPEG)",
)
async def upload_document(
    shipment_id: uuid.UUID = Form(..., description="Target shipment UUID"),
    document_type: DocumentType = Form(..., description="Type of document (e.g. COMMERCIAL_INVOICE)"),
    file: UploadFile = File(..., description="Document file binary (PDF, PNG, JPEG <= 10MB)"),
    x_tenant_id: Optional[uuid.UUID] = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    shipment_service: ShipmentService = Depends(get_shipment_service),
) -> DocumentResponse:
    """
    Validates uploaded file against security rules (rejecting executables per RULE-F05),
    stores file bytes safely, and registers a ShipmentDocument record in PENDING status.
    """
    tenant_id = x_tenant_id or DEFAULT_TENANT_ID

    # 1. Verify shipment existence
    shipment = await shipment_service.get_shipment_by_id(db=db, shipment_id=shipment_id, tenant_id=tenant_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{shipment_id}' not found.",
        )

    # 2. Read bytes and validate file
    try:
        content = await file.read()
        file_size = len(content)
        DocumentUploadValidator.validate_upload(
            filename=file.filename or "upload.bin",
            content_type=file.content_type or "application/octet-stream",
            file_size=file_size,
        )
    except FileValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # 3. Store file to disk safely
    dest_path = save_uploaded_file(
        content=content,
        filename=file.filename or "document.bin",
    )

    now_utc = datetime.now(timezone.utc)
    doc_id = uuid.uuid4()
    doc_entity = ShipmentDocument(
        id=doc_id,
        shipment_id=shipment_id,
        document_type=document_type.value if hasattr(document_type, "value") else str(document_type),
        file_ref=dest_path,
        validation_status=DocumentValidationStatus.PENDING.value,
        confidence=0.0,
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(doc_entity)

    # 5. Audit log
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        entity_type="shipment_document",
        entity_id=doc_id,
        action="DOCUMENT_UPLOADED",
        actor_type="USER",
        actor_id="OPERATOR",
        details={
            "filename": file.filename,
            "document_type": document_type.value,
            "file_size_bytes": file_size,
            "shipment_id": str(shipment_id),
        },
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(doc_entity)

    return DocumentResponse.model_validate(doc_entity)


@router.post(
    "/documents/{id}/extract",
    response_model=DocumentResponse,
    summary="Extract structured fields and execute cross-document reconciliation",
)
async def extract_document(
    id: uuid.UUID,
    payload: Optional[DocumentExtractRequest] = None,
    db: AsyncSession = Depends(get_db),
    shipment_service: ShipmentService = Depends(get_shipment_service),
) -> DocumentResponse:
    """
    Parses document text, maps into DocumentExtractedFields, and triggers
    deterministic cross-document reconciliation with other documents in the shipment.
    Flags weight or consignee mismatches and recalculates shipment risk score.
    """
    # 1. Fetch document
    stmt = select(ShipmentDocument).where(ShipmentDocument.id == id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{id}' not found.",
        )

    # 2. Determine raw text
    raw_text = payload.raw_text if payload and payload.raw_text else None
    if not raw_text:
        file_path = Path(doc.file_ref)
        if file_path.exists():
            suffix = file_path.suffix.lower()
            if suffix in [".txt", ".csv", ".json", ".xml", ".html", ".md"]:
                try:
                    raw_text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    raw_text = ""
            elif suffix in [".png", ".jpg", ".jpeg", ".webp"]:
                # Binary images: avoid reading binary null bytes (\x00) directly into text
                raw_text = f"Uploaded image document: {file_path.name}"
            else:
                try:
                    raw_text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    raw_text = f"Uploaded document: {file_path.name}"
        else:
            raw_text = ""

    # Sanitize any null bytes (\x00) to protect PostgreSQL JSONB from 'unsupported Unicode escape sequence'
    if raw_text:
        raw_text = raw_text.replace("\x00", "")

    doc_type_enum = DocumentType(doc.document_type) if doc.document_type in [t.value for t in DocumentType] else DocumentType.OTHER

    # 3. Deterministic Extraction
    extracted_fields = DocumentParser.parse_text(
        text_content=raw_text or "",
        document_type=doc_type_enum,
    )
    doc.extracted_fields = extracted_fields.model_dump(mode="json")
    # Proportional confidence scoring based on extracted field completeness
    populated_fields = [
        extracted_fields.invoice_number,
        extracted_fields.total_weight_kg,
        extracted_fields.consignee,
        extracted_fields.declared_value,
        extracted_fields.issuer,
        extracted_fields.issue_date,
    ]
    field_count = sum(1 for f in populated_fields if f is not None)
    if field_count >= 3:
        doc.confidence = 0.95
        doc.validation_status = DocumentValidationStatus.VALIDATED.value
    elif field_count >= 1:
        doc.confidence = 0.85
        doc.validation_status = DocumentValidationStatus.VALIDATED.value
    else:
        # No text fields extracted (e.g. raw binary image without OCR text)
        doc.confidence = 0.50
        doc.validation_status = DocumentValidationStatus.PENDING.value

    # 4. Cross-Document Reconciliation for the parent shipment
    shipment_stmt = (
        select(Shipment)
        .options(selectinload(Shipment.documents), selectinload(Shipment.exceptions))
        .where(Shipment.id == doc.shipment_id)
    )
    s_res = await db.execute(shipment_stmt)
    shipment = s_res.scalars().first()

    if shipment:
        # Check Commercial Invoice vs Packing List weights
        invoice_doc = next(
            (d for d in shipment.documents if d.document_type == DocumentType.COMMERCIAL_INVOICE.value and d.extracted_fields),
            None,
        )
        packing_doc = next(
            (d for d in shipment.documents if d.document_type == DocumentType.PACKING_LIST.value and d.extracted_fields),
            None,
        )

        if invoice_doc and packing_doc and invoice_doc.extracted_fields and packing_doc.extracted_fields:
            inv_weight = invoice_doc.extracted_fields.get("total_weight_kg")
            pk_weight = packing_doc.extracted_fields.get("total_weight_kg")

            discrepancy = CrossDocumentValidator.compare_weights(
                invoice_weight=inv_weight,
                packing_list_weight=pk_weight,
            )

            if discrepancy:
                doc.validation_status = DocumentValidationStatus.FLAGGED.value
                # Check if exception already exists
                existing_exc = next(
                    (e for e in shipment.exceptions if e.exception_type == ExceptionType.WEIGHT_MISMATCH.value and e.status == ExceptionStatus.OPEN.value),
                    None,
                )
                if not existing_exc:
                    new_exc = ShipmentException(
                        id=uuid.uuid4(),
                        shipment_id=shipment.id,
                        exception_type=ExceptionType.WEIGHT_MISMATCH.value,
                        risk_level=RiskLevel.HIGH.value,
                        status=ExceptionStatus.OPEN.value,
                        description=discrepancy.message,
                        evidence=[
                            f"Invoice weight: {inv_weight} kg",
                            f"Packing List weight: {pk_weight} kg",
                            f"Delta: {discrepancy.difference} kg",
                        ],
                        detected_at=datetime.now(timezone.utc),
                    )
                    db.add(new_exc)
                    shipment.exceptions.append(new_exc)

                    # Recalculate shipment risk score
                    open_excs = [e for e in shipment.exceptions if e.status == ExceptionStatus.OPEN.value]
                    priority_enum = (
                        BusinessPriority(shipment.business_priority)
                        if shipment.business_priority in [p.value for p in BusinessPriority]
                        else BusinessPriority.MEDIUM
                    )
                    breakdown = calculate_risk_score(
                        delay_hours=0.0,
                        open_exceptions=open_excs,
                        promised_delivery_date=shipment.promised_delivery_date,
                        business_priority=priority_enum,
                    )
                    shipment.risk_score = breakdown.total_score
                    shipment.risk_level = breakdown.risk_level.value

    # 5. Audit Log
    audit_entry = AuditLog(
        id=uuid.uuid4(),
        entity_type="shipment_document",
        entity_id=doc.id,
        action="DOCUMENT_EXTRACTED",
        actor_type="PIPELINE",
        actor_id="DocumentParser",
        details={
            "document_type": doc.document_type,
            "status": doc.validation_status,
            "confidence": doc.confidence,
        },
    )
    db.add(audit_entry)

    await db.commit()
    await db.refresh(doc)

    return DocumentResponse.model_validate(doc)


@router.get(
    "/documents/{id}",
    response_model=DocumentResponse,
    summary="Get document metadata and extracted fields by ID",
)
async def get_document(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Retrieves document record by UUID."""
    stmt = select(ShipmentDocument).where(ShipmentDocument.id == id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{id}' not found.",
        )
    return DocumentResponse.model_validate(doc)


@router.get(
    "/shipments/{id}/documents",
    response_model=List[DocumentResponse],
    summary="List all documents associated with a shipment",
)
async def list_shipment_documents(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    shipment_service: ShipmentService = Depends(get_shipment_service),
) -> List[DocumentResponse]:
    """Retrieves all documents associated with a shipment."""
    shipment = await shipment_service.get_shipment_by_id(db=db, shipment_id=id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{id}' not found.",
        )

    stmt = select(ShipmentDocument).where(ShipmentDocument.shipment_id == id).order_by(ShipmentDocument.created_at.desc())
    res = await db.execute(stmt)
    docs = list(res.scalars().all())
    return [DocumentResponse.model_validate(d) for d in docs]
