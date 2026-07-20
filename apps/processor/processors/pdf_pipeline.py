"""
Orchestrates the PDF processing pipeline: validates, inspects, extracts, parses, and normalises.
"""
import time
from pathlib import Path
from loguru import logger
import uuid

from models.schemas import ExtractionResult, InvoiceHeader, LineItem, ExtractionWarning
from processors.pdf_validator import validate_pdf, inspect_pdf
from processors.text_extractor import extract_text_pymupdf, extract_tables_pdfplumber, extract_with_ocr
from parsers.invoice_parser import parse_invoice_document

class PDFPipeline:
    def __init__(self, file_path: str, document_type: str, ocr_enabled: bool = True):
        self.file_path = file_path
        self.document_type = document_type
        self.ocr_enabled = ocr_enabled
        self.warnings = []

    async def run(self) -> ExtractionResult:
        start_time = time.time()
        
        # 1. Validate PDF
        logger.info(f"Pipeline: Validating {self.file_path}")
        validate_pdf(self.file_path)

        # 2. Inspect PDF
        logger.info(f"Pipeline: Inspecting {self.file_path}")
        metadata = inspect_pdf(self.file_path)
        page_count = metadata["page_count"]
        is_scanned = metadata["is_scanned"]
        
        # Determine extraction strategy
        is_ocr_used = False
        raw_tables = []
        full_text = ""

        if is_scanned:
            if not self.ocr_enabled:
                raise ValueError("PDF is scanned/image-based, but OCR fallback is disabled in settings.")
            
            logger.info("Pipeline: Scanned PDF detected. Triggering Tesseract OCR.")
            is_ocr_used = True
            self.warnings.append(
                ExtractionWarning(
                    message="Document is scanned. Running Tesseract OCR fallback. Results may have reduced accuracy.",
                    severity="warning"
                )
            )
            try:
                full_text, _ = extract_with_ocr(self.file_path)
            except Exception as e:
                logger.error(f"OCR Error: {e}")
                self.warnings.append(
                    ExtractionWarning(
                        message=f"OCR engine failed: {str(e)}. Attempting simple text extraction.",
                        severity="error"
                    )
                )
                full_text, _ = extract_text_pymupdf(self.file_path)
        else:
            logger.info("Pipeline: Text-based PDF detected. Using native parser.")
            try:
                # Use pdfplumber for table-heavy or structured invoice text
                full_text, raw_tables = extract_tables_pdfplumber(self.file_path)
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed: {e}. Falling back to PyMuPDF.")
                self.warnings.append(
                    ExtractionWarning(
                        message="Table-aware extraction failed. Using fallback text extractor.",
                        severity="info"
                    )
                )
                full_text, _ = extract_text_pymupdf(self.file_path)

        # 3. Parse fields based on document type
        header = InvoiceHeader()
        line_items = []
        confidence = "medium"

        if self.document_type in ["invoice", "purchase_invoice", "sales_invoice", "gst_invoice", "credit_note", "debit_note", "receipt", "expense_bill"]:
            logger.info(f"Pipeline: Parsing document as type '{self.document_type}'")
            header, line_items, confidence, parser_warnings = parse_invoice_document(full_text, raw_tables, self.document_type)
            self.warnings.extend(parser_warnings)
        else:
            logger.info(f"Pipeline: Generic or unsupported type '{self.document_type}'. Performing generic extraction.")
            # Map raw tables to generic line items
            if raw_tables:
                for table_idx, table in enumerate(raw_tables):
                    for row_idx, row in enumerate(table):
                        # Simple mapping to description/total columns for editable preview
                        if row:
                            line_items.append(
                                LineItem(
                                    id=str(uuid.uuid4()),
                                    sr_no=str(row_idx + 1),
                                    description= " | ".join([cell for cell in row if cell]),
                                    total=""
                                )
                            )
                self.warnings.append(
                    ExtractionWarning(
                        message="Generic table extraction completed. Field mapping is not supported for this type.",
                        severity="info"
                    )
                )
            else:
                self.warnings.append(
                    ExtractionWarning(
                        message="No tables or fields could be structured for this document type.",
                        severity="warning"
                    )
                )
            confidence = "low"

        # Apply general warnings if line items are empty
        if not line_items and self.document_type != "other":
            self.warnings.append(
                ExtractionWarning(
                    message="No line items could be parsed. You can add them manually in the review screen.",
                    severity="warning"
                )
            )

        duration_ms = int((time.time() - start_time) * 1000)

        return ExtractionResult(
            document_type=self.document_type,
            header=header,
            line_items=line_items,
            raw_tables=raw_tables,
            warnings=self.warnings,
            confidence=confidence,
            page_count=page_count,
            is_ocr_used=is_ocr_used,
            processing_duration_ms=duration_ms
        )
