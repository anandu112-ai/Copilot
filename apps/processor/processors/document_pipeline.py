"""
Master Document Processing Pipeline — CA Copilot
Orchestrates the complete document-to-Excel pipeline:
  1. Ingest any supported format
  2. Auto-classify document type
  3. OCR + image preprocessing if needed
  4. Parse extracted text (invoice / bank statement)
  5. Run audit intelligence
  6. Build ExtractionResult with all findings
"""
import time
from pathlib import Path
from typing import Optional
from loguru import logger

from models.schemas import ExtractionResult, ExtractionRequest
from processors.document_ingestion import DocumentIngestionEngine
from processors.document_classifier import classify_document
from parsers.extended_invoice_parser import parse_invoice_document
from parsers.bank_statement_parser import parse_bank_statement
from processors.audit_engine import run_audit


BANK_STATEMENT_TYPES = {"bank_statement"}
INVOICE_TYPES = {
    "invoice", "purchase_invoice", "sales_invoice", "gst_invoice",
    "credit_note", "debit_note", "expense_bill", "delivery_challan",
    "purchase_order", "audit_document", "gst_report", "ledger",
    "purchase_register", "sales_register", "other",
}


class DocumentPipeline:
    def __init__(self, request: ExtractionRequest):
        self.request = request
        self.file_path = request.file_path
        self.path = Path(self.file_path)

    async def run(self) -> ExtractionResult:
        start_ms = time.time()
        logger.info(f"Pipeline START: {self.path.name}")

        result = ExtractionResult(
            original_filename=self.path.name,
        )

        # ── Step 1: Ingest Document ───────────────────────────────────────
        engine = DocumentIngestionEngine(
            file_path=self.file_path,
            ocr_enabled=self.request.ocr_enabled,
            preprocess=self.request.preprocess_image,
        )
        ingestion = await engine.ingest()

        result.page_count = ingestion.page_count
        result.is_ocr_used = ingestion.is_ocr_used
        result.image_preprocessed = ingestion.image_preprocessed
        result.raw_tables = ingestion.raw_tables
        result.raw_text_preview = ingestion.full_text[:1000]
        result.file_size_bytes = ingestion.file_size_bytes

        # ── Step 2: Classify Document Type ────────────────────────────────
        if self.request.document_type:
            doc_type = self.request.document_type
            type_confidence = 100.0
            logger.info(f"Document type manually specified: {doc_type}")
        else:
            doc_type, type_confidence = classify_document(
                ingestion.full_text, self.path.name
            )
        result.document_type = doc_type

        # ── Step 3: Parse based on document type ──────────────────────────
        if doc_type in BANK_STATEMENT_TYPES:
            bank_header, transactions, warnings, validations = parse_bank_statement(
                ingestion.full_text, ingestion.raw_tables
            )
            result.bank_header = bank_header
            result.transactions = transactions
            result.warnings = warnings
            result.validation_results = validations

        else:
            header, line_items, confidence, warnings, field_confidences, validations = parse_invoice_document(
                text=ingestion.full_text,
                raw_tables=ingestion.raw_tables,
                doc_type=doc_type,
                is_ocr=ingestion.is_ocr_used,
            )
            result.header = header
            result.line_items = line_items
            result.confidence = confidence
            result.warnings = warnings
            result.field_confidences = field_confidences
            result.validation_results = validations

            # Compute overall confidence score
            if field_confidences:
                scores = [f.confidence_score for f in field_confidences if f.confidence_score > 0]
                result.overall_confidence_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        # ── Step 4: Audit Intelligence ────────────────────────────────────
        result.audit_observations = run_audit(result)

        # ── Step 5: Build auto-filename ────────────────────────────────────
        result.output_filename = _build_output_filename(result)
        result.header.document_type_detected = doc_type

        # ── Step 6: Determine if needs manual review ───────────────────────
        result.needs_manual_review = (
            result.confidence == "low"
            or bool(result.warnings)
            or any(o.severity in ("critical", "high") for o in result.audit_observations)
        )

        elapsed = int((time.time() - start_ms) * 1000)
        result.processing_duration_ms = elapsed
        logger.info(f"Pipeline COMPLETE: {self.path.name} in {elapsed}ms | type={doc_type} | confidence={result.confidence}")

        return result


def _build_output_filename(result: ExtractionResult) -> str:
    """
    Generate standardized output filename.
    Format: VendorName_DocumentType_InvoiceNo_Date.xlsx
    Example: ABC_Cement_Invoice_INV2451_2026-07-20.xlsx
    """
    def _slug(s: str, max_len: int = 20) -> str:
        s = str(s or "Unknown").strip()
        s = s.replace(" ", "_")
        # Remove non-alphanumeric except underscore and hyphen
        s = "".join(c for c in s if c.isalnum() or c in ("_", "-"))
        return s[:max_len]

    h = result.header
    bank = result.bank_header

    if result.document_type == "bank_statement" and bank:
        vendor = _slug(bank.account_holder or bank.bank_name, 20)
        inv_no = _slug(bank.account_number[-4:] if bank.account_number else "STMT", 10)
        date_str = (bank.statement_to or bank.statement_from or "").replace("-", "")[:8] or "UnknownDate"
        doc_type = "BankStatement"
    else:
        vendor = _slug(h.vendor_name, 20)
        inv_no = _slug(h.invoice_number, 15)
        date_str = (h.invoice_date or "").replace("-", "")[:8] or "UnknownDate"
        type_map = {
            "purchase_invoice": "PurchaseInv",
            "sales_invoice": "SalesInv",
            "gst_invoice": "GSTInv",
            "credit_note": "CreditNote",
            "debit_note": "DebitNote",
            "delivery_challan": "Challan",
            "purchase_order": "PO",
            "expense_bill": "Expense",
            "gst_report": "GSTReport",
            "audit_document": "AuditDoc",
            "ledger": "Ledger",
        }
        doc_type = type_map.get(result.document_type, "Invoice")

    filename = f"{vendor}_{doc_type}_{inv_no}_{date_str}.xlsx"
    # Remove double underscores
    filename = "_".join(p for p in filename.split("_") if p)
    return filename
