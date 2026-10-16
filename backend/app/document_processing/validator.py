"""
backend/app/document_processing/validator.py

Cross-document reconciliation and validation engine.
Performs deterministic comparisons across commercial documents:
  - Compares Commercial Invoice weight against Packing List weight.
  - Enforces a 0.5 kg tolerance threshold (RULE-E05, PRD.md).
  - Automatically flags WEIGHT_MISMATCH, CONSIGNEE_MISMATCH, and MISSING_DOCUMENT exceptions.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.entities import ShipmentDocument, ShipmentException
from backend.app.schemas.domain import DocumentExtractedFields, ExceptionCreate
from backend.app.schemas.enums import (
    DocumentType,
    DocumentValidationStatus,
    ExceptionStatus,
    ExceptionType,
    RiskLevel,
)

logger = logging.getLogger("backend.app.document_processing.validator")

# Allowable weight difference threshold between Commercial Invoice and Packing List
WEIGHT_TOLERANCE_KG: float = 0.5

# Mandatory documents for international freight
MANDATORY_INTERNATIONAL_DOCS = [
    DocumentType.COMMERCIAL_INVOICE,
    DocumentType.PACKING_LIST,
]


class DiscrepancyItem(BaseModel):
    """Details of a single detected field inconsistency."""
    field_name: str
    expected_value: Any
    actual_value: Any
    difference: Optional[float] = None
    tolerance: Optional[float] = None
    severity: RiskLevel = RiskLevel.HIGH
    message: str


class ReconciliationResult(BaseModel):
    """Overall outcome of cross-document reconciliation."""
    shipment_id: uuid.UUID
    is_valid: bool
    discrepancies: List[DiscrepancyItem] = Field(default_factory=list)
    exceptions_generated: List[ExceptionCreate] = Field(default_factory=list)
    summary: str


class CrossDocumentValidator:
    """Deterministic validation engine for cross-checking freight documentation."""

    @classmethod
    def compare_weights(
        cls,
        invoice_weight: Optional[float],
        packing_list_weight: Optional[float],
        tolerance_kg: float = WEIGHT_TOLERANCE_KG,
    ) -> Optional[DiscrepancyItem]:
        """
        Compares Commercial Invoice weight against Packing List weight.
        Returns DiscrepancyItem if the delta exceeds the tolerance threshold.
        """
        if invoice_weight is None or packing_list_weight is None:
            return None

        delta = round(abs(packing_list_weight - invoice_weight), 2)
        if delta > tolerance_kg:
            logger.warning(
                "Weight mismatch detected: Invoice=%s kg, PackingList=%s kg, delta=%s kg (> %s kg)",
                invoice_weight,
                packing_list_weight,
                delta,
                tolerance_kg,
            )
            return DiscrepancyItem(
                field_name="total_weight_kg",
                expected_value=packing_list_weight,
                actual_value=invoice_weight,
                difference=delta,
                tolerance=tolerance_kg,
                severity=RiskLevel.HIGH,
                message=(
                    f"Weight discrepancy detected: Packing List declares {packing_list_weight:.2f} kg "
                    f"while Commercial Invoice declares {invoice_weight:.2f} kg. "
                    f"Delta of {delta:.2f} kg exceeds allowable threshold of {tolerance_kg:.2f} kg."
                ),
            )
        return None

    @classmethod
    def compare_consignees(
        cls,
        invoice_consignee: Optional[str],
        packing_list_consignee: Optional[str],
    ) -> Optional[DiscrepancyItem]:
        """
        Cross-checks consignee entities across documents.
        """
        if not invoice_consignee or not packing_list_consignee:
            return None

        inv_clean = invoice_consignee.strip().lower()
        pl_clean = packing_list_consignee.strip().lower()

        # Check if one is a substring of the other or exact match
        if inv_clean not in pl_clean and pl_clean not in inv_clean:
            return DiscrepancyItem(
                field_name="consignee",
                expected_value=packing_list_consignee,
                actual_value=invoice_consignee,
                severity=RiskLevel.MEDIUM,
                message=(
                    f"Consignee mismatch: Commercial Invoice lists '{invoice_consignee}', "
                    f"but Packing List lists '{packing_list_consignee}'."
                ),
            )
        return None

    @classmethod
    def reconcile(
        cls,
        shipment_id: uuid.UUID,
        invoice_fields: Optional[DocumentExtractedFields],
        packing_list_fields: Optional[DocumentExtractedFields],
        tenant_id: Optional[uuid.UUID] = None,
    ) -> ReconciliationResult:
        """
        Executes cross-document checks between Commercial Invoice and Packing List.
        """
        discrepancies: List[DiscrepancyItem] = []
        exceptions: List[ExceptionCreate] = []

        if invoice_fields and packing_list_fields:
            # 1. Weight Reconciliation
            weight_disc = cls.compare_weights(
                invoice_fields.total_weight_kg,
                packing_list_fields.total_weight_kg,
            )
            if weight_disc:
                discrepancies.append(weight_disc)
                exceptions.append(
                    ExceptionCreate(
                        shipment_id=shipment_id,
                        exception_type=ExceptionType.WEIGHT_MISMATCH,
                        risk_level=RiskLevel.HIGH,
                        description=weight_disc.message,
                        evidence=[
                            f"Commercial Invoice weight: {invoice_fields.total_weight_kg} kg",
                            f"Packing List weight: {packing_list_fields.total_weight_kg} kg",
                        ],
                    )
                )

            # 2. Consignee Reconciliation
            consignee_disc = cls.compare_consignees(
                invoice_fields.consignee,
                packing_list_fields.consignee,
            )
            if consignee_disc:
                discrepancies.append(consignee_disc)
                exceptions.append(
                    ExceptionCreate(
                        shipment_id=shipment_id,
                        exception_type=ExceptionType.CONSIGNEE_MISMATCH,
                        risk_level=RiskLevel.MEDIUM,
                        description=consignee_disc.message,
                        evidence=[
                            f"Invoice consignee: {invoice_fields.consignee}",
                            f"Packing List consignee: {packing_list_fields.consignee}",
                        ],
                    )
                )

        is_valid = len(discrepancies) == 0
        summary = (
            "Documentation reconciled cleanly with zero discrepancies."
            if is_valid
            else f"Reconciliation failed with {len(discrepancies)} discrepancy/discrepancies."
        )

        return ReconciliationResult(
            shipment_id=shipment_id,
            is_valid=is_valid,
            discrepancies=discrepancies,
            exceptions_generated=exceptions,
            summary=summary,
        )

    @classmethod
    def check_missing_documents(
        cls,
        shipment_id: uuid.UUID,
        uploaded_doc_types: List[DocumentType],
        required_types: Optional[List[DocumentType]] = None,
    ) -> List[ExceptionCreate]:
        """
        Checks whether all mandatory documents have been uploaded for a shipment.
        """
        required = required_types or MANDATORY_INTERNATIONAL_DOCS
        uploaded_set = set(uploaded_doc_types)
        missing_exceptions: List[ExceptionCreate] = []

        for req in required:
            if req not in uploaded_set:
                doc_name = req.value.replace("_", " ").title()
                missing_exceptions.append(
                    ExceptionCreate(
                        shipment_id=shipment_id,
                        exception_type=ExceptionType.MISSING_DOCUMENT,
                        risk_level=RiskLevel.HIGH,
                        description=f"Mandatory document missing: {doc_name} is required prior to customs clearance.",
                        evidence=[f"Uploaded documents: {[d.value for d in uploaded_doc_types]}"],
                    )
                )

        return missing_exceptions

    @classmethod
    async def persist_exceptions(
        cls,
        exceptions: List[ExceptionCreate],
        session: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
    ) -> List[uuid.UUID]:
        """
        Inserts detected document exceptions into PostgreSQL database.
        """
        persisted_ids: List[uuid.UUID] = []
        for exc in exceptions:
            entity = ShipmentException(
                id=uuid.uuid4(),
                shipment_id=exc.shipment_id,
                type=exc.exception_type.value,
                severity=exc.risk_level.value,
                status=ExceptionStatus.OPEN.value,
                description=exc.description,
                tenant_id=tenant_id or uuid.uuid4(),
            )
            session.add(entity)
            persisted_ids.append(entity.id)

        if persisted_ids:
            await session.flush()
            logger.info("Persisted %d document exceptions to database", len(persisted_ids))

        return persisted_ids
