"""
Pydantic schemas for request/response models.
"""
from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Enums / Literals ───────────────────────────────────────────────────────

DocumentType = Literal[
    "invoice", "purchase_invoice", "sales_invoice", "gst_invoice",
    "bank_statement", "ledger", "purchase_register", "sales_register",
    "credit_note", "debit_note", "receipt", "expense_bill", "other"
]

Warningseverity = Literal["info", "warning", "error"]
Confidence = Literal["high", "medium", "low"]


# ── Sub-models ─────────────────────────────────────────────────────────────

class ExtractionWarning(BaseModel):
    field: Optional[str] = None
    message: str
    severity: Warningseverity = "info"


class InvoiceHeader(BaseModel):
    invoice_number: str = ""
    invoice_date: str = ""
    due_date: str = ""
    vendor_name: str = ""
    vendor_address: str = ""
    vendor_gstin: str = ""
    vendor_pan: str = ""
    customer_name: str = ""
    customer_address: str = ""
    customer_gstin: str = ""
    place_of_supply: str = ""
    state: str = ""
    currency: str = "INR"
    payment_terms: str = ""
    subtotal: str = ""
    discount: str = ""
    freight: str = ""
    other_charges: str = ""
    taxable_amount: str = ""
    cgst: str = ""
    sgst: str = ""
    igst: str = ""
    cess: str = ""
    round_off: str = ""
    grand_total: str = ""
    amount_in_words: str = ""
    bank_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    upi: str = ""


class LineItem(BaseModel):
    id: str
    sr_no: str = ""
    description: str = ""
    hsn_sac: str = ""
    quantity: str = ""
    unit: str = ""
    rate: str = ""
    discount: str = ""
    taxable_value: str = ""
    cgst_rate: str = ""
    cgst_amount: str = ""
    sgst_rate: str = ""
    sgst_amount: str = ""
    igst_rate: str = ""
    igst_amount: str = ""
    cess: str = ""
    total: str = ""


# ── Request models ─────────────────────────────────────────────────────────

class ExtractionRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to the PDF file")
    document_type: DocumentType = Field(..., description="Type of document")
    ocr_enabled: bool = Field(default=True, description="Enable OCR for scanned documents")


class ExcelGenerationRequest(BaseModel):
    result: "ExtractionResult"
    output_path: str = Field(..., description="Absolute path for the output Excel file")
    document_type: DocumentType


# ── Response models ────────────────────────────────────────────────────────

class ExtractionResult(BaseModel):
    document_type: DocumentType
    header: InvoiceHeader = Field(default_factory=InvoiceHeader)
    line_items: List[LineItem] = Field(default_factory=list)
    raw_tables: List[List[List[str]]] = Field(default_factory=list)
    warnings: List[ExtractionWarning] = Field(default_factory=list)
    confidence: Confidence = "low"
    page_count: int = 0
    is_ocr_used: bool = False
    processing_duration_ms: int = 0


class ExcelGenerationResult(BaseModel):
    success: bool
    path: str
    error: Optional[str] = None


# Allow forward reference
ExcelGenerationRequest.model_rebuild()
