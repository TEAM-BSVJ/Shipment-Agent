"""
backend/tests/test_document_checks.py

Unit tests for document processing, upload validation (RULE-F05), field extraction,
and cross-document reconciliation (Invoice vs Packing List weight mismatch).
"""

import os
import shutil
import tempfile
import uuid
from datetime import date
import pytest

from backend.app.document_processing import (
    ALLOWED_MIME_TYPES,
    FORBIDDEN_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    CrossDocumentValidator,
    DocumentParser,
    DocumentUploadValidator,
    FileValidationError,
    WEIGHT_TOLERANCE_KG,
    save_uploaded_file,
)
from backend.app.schemas.domain import DocumentExtractedFields
from backend.app.schemas.enums import (
    DocumentType,
    ExceptionStatus,
    ExceptionType,
    RiskLevel,
)


def test_file_upload_validator_accepts_valid_files():
    """Verify that valid PDF, PNG, and JPEG uploads within 10MB pass validation (RULE-F05)."""
    # Valid PDF
    DocumentUploadValidator.validate_upload(
        filename="commercial_invoice_SHP101.pdf",
        content_type="application/pdf",
        file_size=1024 * 500,  # 500 KB
    )

    # Valid PNG
    DocumentUploadValidator.validate_upload(
        filename="packing_list_scan.png",
        content_type="image/png",
        file_size=1024 * 1024 * 2,  # 2 MB
    )

    # Valid JPEG
    DocumentUploadValidator.validate_upload(
        filename="dock_receipt.jpg",
        content_type="image/jpeg",
        file_size=1024 * 250,  # 250 KB
    )


def test_file_upload_validator_rejects_executable_extensions():
    """Verify instant rejection of executable files per RULE-F05."""
    malicious_files = [
        ("malicious_script.sh", "application/x-sh"),
        ("payload.exe", "application/x-msdownload"),
        ("autoexec.bat", "application/x-bat"),
        ("trojan.cmd", "text/plain"),
        ("install.ps1", "text/plain"),
    ]

    for filename, content_type in malicious_files:
        with pytest.raises(FileValidationError) as exc_info:
            DocumentUploadValidator.validate_upload(
                filename=filename,
                content_type=content_type,
                file_size=1024,
            )
        assert "Executable files" in str(exc_info.value)
        assert "strictly forbidden (RULE-F05)" in str(exc_info.value)


def test_file_upload_validator_rejects_exceeding_file_size():
    """Verify rejection of files exceeding the 10MB limit (RULE-F05)."""
    oversized = MAX_FILE_SIZE_BYTES + 1024  # 10MB + 1KB
    with pytest.raises(FileValidationError) as exc_info:
        DocumentUploadValidator.validate_upload(
            filename="massive_scan.pdf",
            content_type="application/pdf",
            file_size=oversized,
        )
    assert "exceeds the maximum allowed limit of 10MB" in str(exc_info.value)


def test_file_upload_validator_rejects_disallowed_mime():
    """Verify rejection of unallowed MIME types like HTML, ZIP, or executables."""
    with pytest.raises(FileValidationError) as exc_info:
        DocumentUploadValidator.validate_upload(
            filename="archive.zip",
            content_type="application/zip",
            file_size=1024 * 100,
        )
    assert "MIME type 'application/zip' is not supported" in str(exc_info.value)


def test_document_parser_extracts_commercial_invoice_fields():
    """Verify deterministic extraction of key invoice fields from raw document text."""
    sample_invoice_text = (
        "COMMERCIAL INVOICE\n"
        "Shipper: Bharat Industrial Exports Ltd\n"
        "Consignee: Rotterdam Gateway Logistics BV\n"
        "Invoice No: INV-2026-8801\n"
        "Issue Date: 2026-10-15\n"
        "Description of Goods: Industrial Pump Valves\n"
        "Gross Weight: 250.00 kg\n"
        "Total Value: $45,000.00 USD\n"
        "Country of Origin: India\n"
    )

    fields = DocumentParser.parse_text(sample_invoice_text, DocumentType.COMMERCIAL_INVOICE)

    assert fields.invoice_number == "INV-2026-8801"
    assert fields.issuer == "Bharat Industrial Exports Ltd"
    assert fields.consignee == "Rotterdam Gateway Logistics BV"
    assert fields.total_weight_kg == 250.0
    assert fields.declared_value == 45000.0
    assert fields.currency == "USD"
    assert fields.issue_date == date(2026, 10, 15)


def test_document_parser_extracts_packing_list_fields():
    """Verify extraction of packing list fields including weight."""
    sample_packing_list_text = (
        "PACKING LIST / CARGO MANIFEST\n"
        "Packing List #: PL-9920\n"
        "Consignee: Rotterdam Gateway Logistics BV\n"
        "Carton Count: 24 Pallets\n"
        "Total Weight: 310.0 kg\n"
        "Issue Date: 2026-10-15\n"
    )

    fields = DocumentParser.parse_text(sample_packing_list_text, DocumentType.PACKING_LIST)

    assert fields.invoice_number == "PL-9920"
    assert fields.consignee == "Rotterdam Gateway Logistics BV"
    assert fields.total_weight_kg == 310.0
    assert fields.issue_date == date(2026, 10, 15)


def test_cross_document_weight_discrepancy_detection():
    """
    Core Scenario: Commercial Invoice specifies 250 kg, but Packing List specifies 310 kg.
    Verify that delta = 60 kg (> 0.5 kg threshold) triggers WEIGHT_MISMATCH exception.
    """
    shipment_id = uuid.uuid4()
    invoice_fields = DocumentExtractedFields(
        invoice_number="INV-101",
        consignee="EuroPort Distribution",
        total_weight_kg=250.0,
    )
    packing_list_fields = DocumentExtractedFields(
        invoice_number="PL-101",
        consignee="EuroPort Distribution",
        total_weight_kg=310.0,
    )

    result = CrossDocumentValidator.reconcile(
        shipment_id=shipment_id,
        invoice_fields=invoice_fields,
        packing_list_fields=packing_list_fields,
    )

    assert result.is_valid is False
    assert len(result.discrepancies) == 1
    assert result.discrepancies[0].field_name == "total_weight_kg"
    assert result.discrepancies[0].difference == 60.0

    # Verify generated exception
    assert len(result.exceptions_generated) == 1
    exc = result.exceptions_generated[0]
    assert exc.exception_type == ExceptionType.WEIGHT_MISMATCH
    assert exc.risk_level == RiskLevel.HIGH
    assert "Packing List declares 310.00 kg" in exc.description
    assert "Commercial Invoice declares 250.00 kg" in exc.description


def test_cross_document_weight_within_tolerance_passes():
    """Verify that weight difference <= 0.5 kg (e.g., 0.2 kg due to scale rounding) is accepted."""
    shipment_id = uuid.uuid4()
    invoice_fields = DocumentExtractedFields(
        invoice_number="INV-102",
        consignee="EuroPort Distribution",
        total_weight_kg=250.0,
    )
    packing_list_fields = DocumentExtractedFields(
        invoice_number="PL-102",
        consignee="EuroPort Distribution",
        total_weight_kg=250.3,  # Delta = 0.3 kg <= 0.5 kg
    )

    result = CrossDocumentValidator.reconcile(
        shipment_id=shipment_id,
        invoice_fields=invoice_fields,
        packing_list_fields=packing_list_fields,
    )

    assert result.is_valid is True
    assert len(result.discrepancies) == 0
    assert len(result.exceptions_generated) == 0


def test_cross_document_consignee_mismatch_detection():
    """Verify that different consignees across paperwork trigger CONSIGNEE_MISMATCH."""
    shipment_id = uuid.uuid4()
    invoice_fields = DocumentExtractedFields(
        consignee="Rotterdam Global Terminal BV",
        total_weight_kg=500.0,
    )
    packing_list_fields = DocumentExtractedFields(
        consignee="Singapore Asian Distribution Ltd",
        total_weight_kg=500.0,
    )

    result = CrossDocumentValidator.reconcile(
        shipment_id=shipment_id,
        invoice_fields=invoice_fields,
        packing_list_fields=packing_list_fields,
    )

    assert result.is_valid is False
    assert len(result.discrepancies) == 1
    assert result.discrepancies[0].field_name == "consignee"
    assert result.exceptions_generated[0].exception_type == ExceptionType.CONSIGNEE_MISMATCH


def test_check_missing_mandatory_documents():
    """Verify detection of missing mandatory documents prior to customs clearance."""
    shipment_id = uuid.uuid4()

    # Case 1: Missing Commercial Invoice
    uploaded = [DocumentType.PACKING_LIST]
    exceptions = CrossDocumentValidator.check_missing_documents(
        shipment_id=shipment_id,
        uploaded_doc_types=uploaded,
    )

    assert len(exceptions) == 1
    assert exceptions[0].exception_type == ExceptionType.MISSING_DOCUMENT
    assert "Commercial Invoice" in exceptions[0].description

    # Case 2: All mandatory uploaded
    uploaded_both = [DocumentType.COMMERCIAL_INVOICE, DocumentType.PACKING_LIST]
    no_exceptions = CrossDocumentValidator.check_missing_documents(
        shipment_id=shipment_id,
        uploaded_doc_types=uploaded_both,
    )
    assert len(no_exceptions) == 0


def test_save_uploaded_file_creates_file_on_disk():
    """Verify secure saving of uploaded document content to disk."""
    temp_dir = tempfile.mkdtemp()
    try:
        content = b"PDF-1.4 Mock document binary content for testing"
        saved_path = save_uploaded_file(
            content=content,
            filename="shipping_manifest.pdf",
            target_dir=temp_dir,
        )

        assert os.path.exists(saved_path)
        with open(saved_path, "rb") as f:
            read_back = f.read()
        assert read_back == content
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
