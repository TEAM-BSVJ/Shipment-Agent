"""
backend/app/document_processing/pipeline.py

Document upload validation and structured field extraction pipeline.
Adheres to Rules.md:
  - Allowed MIME types: application/pdf, image/png, image/jpeg (RULE-F05)
  - Enforced file size limits <= 10MB (RULE-F05)
  - Instant rejection of executable files (.exe, .sh, .bat) (RULE-F05)
  - Deterministic field extraction into DocumentExtractedFields schema
"""

import logging
import os
import re
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional, Set, Tuple

from backend.app.config import get_settings
from backend.app.schemas.domain import DocumentExtractedFields
from backend.app.schemas.enums import DocumentType

logger = logging.getLogger("backend.app.document_processing.pipeline")

# Allowed MIME types per RULE-F05
ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}

# Forbidden file extensions per RULE-F05
FORBIDDEN_EXTENSIONS: Set[str] = {
    ".exe",
    ".sh",
    ".bat",
    ".cmd",
    ".bin",
    ".msi",
    ".com",
    ".py",
    ".js",
    ".vbs",
    ".ps1",
}

MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB per RULE-F05


class FileValidationError(ValueError):
    """Raised when an uploaded document violates size, type, or extension rules."""
    pass


class DocumentUploadValidator:
    """Validates uploaded freight documents for security and format constraints."""

    @classmethod
    def validate_upload(
        cls,
        filename: str,
        content_type: str,
        file_size: int,
    ) -> None:
        """
        Validates filename, MIME type, and size.
        Raises FileValidationError on violation.
        """
        # 1. Reject forbidden executable extensions immediately
        ext = Path(filename).suffix.lower()
        if ext in FORBIDDEN_EXTENSIONS:
            logger.warning("Rejected upload with forbidden extension: %s", filename)
            raise FileValidationError(
                f"Security violation: Executable files with extension '{ext}' are strictly forbidden (RULE-F05)."
            )

        # 2. Enforce file size <= 10MB
        if file_size > MAX_FILE_SIZE_BYTES:
            logger.warning("Rejected upload exceeding size limit: %d bytes", file_size)
            raise FileValidationError(
                f"File size {file_size / (1024 * 1024):.2f}MB exceeds the maximum allowed limit of 10MB (RULE-F05)."
            )

        if file_size <= 0:
            raise FileValidationError("Uploaded file is empty (0 bytes).")

        # 3. Validate MIME type
        normalized_mime = content_type.lower().split(";")[0].strip()
        if normalized_mime not in ALLOWED_MIME_TYPES:
            logger.warning("Rejected upload with disallowed MIME type: %s", content_type)
            raise FileValidationError(
                f"MIME type '{normalized_mime}' is not supported. Allowed formats: PDF, PNG, JPEG (RULE-F05)."
            )


class DocumentParser:
    """
    Deterministic field extraction engine parsing raw document text
    into typed DocumentExtractedFields.
    """

    @classmethod
    def parse_text(
        cls,
        text_content: str,
        document_type: DocumentType = DocumentType.COMMERCIAL_INVOICE,
    ) -> DocumentExtractedFields:
        """
        Extracts key logistics fields using deterministic pattern matching:
          - Invoice / Reference Number
          - Consignee
          - Total / Gross Weight (in kg)
          - Declared Value & Currency
          - Issue Date
        """
        raw_snippet = text_content[:500].strip() if text_content else None

        invoice_num = cls._extract_invoice_number(text_content)
        consignee = cls._extract_consignee(text_content)
        weight_kg = cls._extract_weight(text_content)
        declared_value, currency = cls._extract_declared_value(text_content)
        issue_date = cls._extract_date(text_content)
        issuer = cls._extract_issuer(text_content)

        return DocumentExtractedFields(
            invoice_number=invoice_num,
            issuer=issuer,
            consignee=consignee,
            total_weight_kg=weight_kg,
            declared_value=declared_value,
            currency=currency,
            issue_date=issue_date,
            raw_text_snippet=raw_snippet,
        )

    @classmethod
    def _extract_invoice_number(cls, text: str) -> Optional[str]:
        # Match patterns like: "Invoice No: INV-12345", "Invoice #: 987654", "Bill No: BL-990"
        patterns = [
            r"(?:Invoice\s*(?:No|Number|#|Ref)[\s.:#]*)([A-Za-z0-9\-_/]+)",
            r"(?:Packing\s*List\s*(?:No|#)[\s.:#]*)([A-Za-z0-9\-_/]+)",
            r"(?:Bill\s*of\s*Lading\s*(?:No|#)[\s.:#]*)([A-Za-z0-9\-_/]+)",
            r"\b(INV-[0-9]{4,8})\b",
            r"\b(PL-[0-9]{4,8})\b",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    @classmethod
    def _extract_consignee(cls, text: str) -> Optional[str]:
        # Match patterns like: "Consignee: Global Imports BV", "Ship To: Acme Logistics"
        patterns = [
            r"(?:Consignee|Deliver\s*To|Ship\s*To)[\s.:]+([A-Za-z0-9\s.,\-_&]+?)(?:\r?\n|$)",
            r"(?:Notify\s*Party)[\s.:]+([A-Za-z0-9\s.,\-_&]+?)(?:\r?\n|$)",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up if matched too many trailing words
                return name[:128]
        return None

    @classmethod
    def _extract_weight(cls, text: str) -> Optional[float]:
        # Match patterns like: "Gross Weight: 310 kg", "Total Weight: 250.5 KGS", "310.00 KG"
        patterns = [
            r"(?:Gross\s*Weight|Total\s*Weight|Net\s*Weight|Weight)[\s.:]*([\d,]+(?:\.\d+)?)\s*(?:kg|kgs|kilograms|kilos)?\b",
            r"\b([\d,]+(?:\.\d+)?)\s*(?:kg|kgs|kilograms|kilos)\b",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                val_str = match.group(1).replace(",", "")
                try:
                    val = float(val_str)
                    if 0.0 < val < 1000000.0:
                        return val
                except ValueError:
                    continue
        return None

    @classmethod
    def _extract_declared_value(cls, text: str) -> Tuple[Optional[float], str]:
        # Match patterns like: "Total Value: $45,000.00", "Declared Value: 12000 USD", "EUR 3,500.00"
        currency = "USD"
        if "EUR" in text or "€" in text:
            currency = "EUR"
        elif "GBP" in text or "£" in text:
            currency = "GBP"
        elif "INR" in text or "₹" in text:
            currency = "INR"

        patterns = [
            r"(?:Total\s*Amount|Total\s*Value|Invoice\s*Value|Declared\s*Value)[\s.:]*[$€£₹]?\s*([\d,]+(?:\.\d+)?)\s*(?:USD|EUR|GBP|INR)?",
            r"[$€£₹]\s*([\d,]+(?:\.\d+)?)",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                val_str = match.group(1).replace(",", "")
                try:
                    val = float(val_str)
                    return val, currency
                except ValueError:
                    continue
        return None, currency

    @classmethod
    def _extract_date(cls, text: str) -> Optional[date]:
        # Match ISO format: YYYY-MM-DD or DD-MM-YYYY or MM/DD/YYYY
        iso_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
        if iso_match:
            try:
                return datetime.strptime(iso_match.group(0), "%Y-%m-%d").date()
            except ValueError:
                pass

        slash_match = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", text)
        if slash_match:
            try:
                return datetime.strptime(slash_match.group(0), "%m/%d/%Y").date()
            except ValueError:
                try:
                    return datetime.strptime(slash_match.group(0), "%d/%m/%Y").date()
                except ValueError:
                    pass

        return None

    @classmethod
    def _extract_issuer(cls, text: str) -> Optional[str]:
        # Match patterns like: "Shipper: Mumbai Exports Ltd", "From: Bharat Industrial Corp"
        patterns = [
            r"(?:Shipper|Exporter|Vendor|From)[\s.:]+([A-Za-z0-9\s.,\-_&]+?)(?:\r?\n|$)",
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:128]
        return None


def save_uploaded_file(
    content: bytes,
    filename: str,
    target_dir: Optional[str] = None,
) -> str:
    """
    Saves validated uploaded bytes to application storage directory.
    Returns relative storage path.
    """
    settings = get_settings()
    base_dir = Path(target_dir or settings.DOCUMENT_STORAGE_DIR)
    base_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex[:12]}_{Path(filename).name}"
    dest_path = base_dir / safe_filename

    with open(dest_path, "wb") as f:
        f.write(content)

    logger.info("Saved uploaded file to %s (%d bytes)", dest_path, len(content))
    return str(dest_path)

