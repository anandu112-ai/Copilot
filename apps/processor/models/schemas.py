"""
Comprehensive Pydantic schemas for CA Copilot document processing engine.
Covers invoices, bank statements, audit findings, duplicate detection, batch jobs, and search.
"""
from __future__ import annotations
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
import uuid


# ── Literals ───────────────────────────────────────────────────────────────

DocumentType = Literal[
    "invoice", "purchase_invoice", "sales_invoice", "gst_invoice",
    "bank_statement", "ledger", "purchase_register", "sales_register",
    "credit_note", "debit_note", "receipt", "expense_bill",
    "delivery_challan", "purchase_order", "audit_document",
    "gst_report", "other"
]

WarningSeverity = Literal["info", "warning", "error"]
Confidence = Literal["high", "medium", "low"]
DuplicateRiskLevel = Literal["exact", "high", "medium", "low", "none"]
AuditSeverity = Literal["critical", "high", "medium", "low", "info"]
TransactionType = Literal["credit", "debit"]
PaymentMode = Literal["UPI", "NEFT", "RTGS", "IMPS", "CHEQUE", "CASH", "ECS", "ATM", "POS", "INTEREST", "CHARGES", "OTHER"]
BatchStatus = Literal["queued", "processing", "completed", "failed", "partial"]


# ── Warning & Validation ───────────────────────────────────────────────────

class ExtractionWarning(BaseModel):
    field: Optional[str] = None
    message: str
    severity: WarningSeverity = "info"


class ValidationCheckpoint(BaseModel):
    name: str
    description: str
    logic: str
    result_value: str
    status: Literal["PASS", "WARNING", "HIGH ALERT", "INFO"]
    observation: str


# ── Invoice Fields ─────────────────────────────────────────────────────────

class InvoiceHeader(BaseModel):
    # Core identifiers
    invoice_number: str = ""
    invoice_date: str = ""
    due_date: str = ""
    reference_number: str = ""
    purchase_order_number: str = ""
    
    # Vendor details
    vendor_name: str = ""
    vendor_address: str = ""
    vendor_gstin: str = ""
    vendor_pan: str = ""
    vendor_state: str = ""
    vendor_pin: str = ""
    
    # Customer details
    customer_name: str = ""
    customer_address: str = ""
    customer_gstin: str = ""
    customer_state: str = ""
    customer_pin: str = ""
    
    # Document location details
    place_of_supply: str = ""
    state: str = ""
    currency: str = "INR"
    payment_terms: str = ""
    narration: str = ""
    
    # Transport & logistics
    vehicle_number: str = ""
    eway_bill_number: str = ""
    transport_name: str = ""
    transport_mode: str = ""
    lr_number: str = ""                # Lorry Receipt number
    
    # Financial amounts
    subtotal: str = ""
    discount: str = ""
    freight: str = ""
    other_charges: str = ""
    taxable_amount: str = ""
    cgst: str = ""
    sgst: str = ""
    igst: str = ""
    cess: str = ""
    tds_tcs: str = ""
    round_off: str = ""
    grand_total: str = ""
    amount_in_words: str = ""
    advance_paid: str = ""
    balance_due: str = ""
    
    # Payment details
    bank_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    upi: str = ""
    swift_code: str = ""
    
    # Document metadata
    page_count: int = 0
    is_multi_page: bool = False
    document_type_detected: str = ""
    qr_code_data: str = ""
    eway_qr_data: str = ""


class LineItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sr_no: str = ""
    description: str = ""
    hsn_sac: str = ""
    quantity: str = ""
    unit: str = ""
    rate: str = ""
    discount: str = ""
    discount_percent: str = ""
    taxable_value: str = ""
    cgst_rate: str = ""
    cgst_amount: str = ""
    sgst_rate: str = ""
    sgst_amount: str = ""
    igst_rate: str = ""
    igst_amount: str = ""
    cess: str = ""
    total: str = ""
    needs_review: bool = False
    review_reason: str = ""


# ── Bank Statement ─────────────────────────────────────────────────────────

class BankTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str = ""
    value_date: str = ""
    description: str = ""
    narration: str = ""
    reference_number: str = ""
    chq_ref: str = ""
    debit: str = ""
    credit: str = ""
    balance: str = ""
    transaction_type: Optional[TransactionType] = None
    payment_mode: Optional[PaymentMode] = "OTHER"
    category: str = ""         # Auto-classified: Salary, Rent, Vendor Payment, etc.
    counterparty: str = ""
    needs_review: bool = False
    audit_flag: str = ""       # "WEEKEND", "ROUND_FIGURE", "LARGE_TXN", etc.


class BankStatementHeader(BaseModel):
    account_holder: str = ""
    account_number: str = ""
    bank_name: str = ""
    branch: str = ""
    ifsc: str = ""
    account_type: str = ""
    statement_from: str = ""
    statement_to: str = ""
    opening_balance: str = ""
    closing_balance: str = ""
    total_credits: str = ""
    total_debits: str = ""
    total_credit_count: int = 0
    total_debit_count: int = 0
    currency: str = "INR"


# ── Duplicate Detection ────────────────────────────────────────────────────

class DuplicateMatch(BaseModel):
    source_file: str
    matched_file: str
    source_invoice_number: str
    matched_invoice_number: str
    source_vendor: str
    matched_vendor: str
    source_amount: str
    matched_amount: str
    match_score: float          # 0.0 – 100.0
    risk_level: DuplicateRiskLevel
    match_reasons: List[str]    # ["same_invoice_number", "same_amount", "same_vendor"]
    is_confirmed_duplicate: bool = False


# ── Audit Intelligence ─────────────────────────────────────────────────────

class AuditObservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str       # "GST Mismatch", "Section 40A(3)", "Duplicate", "Weekend TXN", etc.
    severity: AuditSeverity
    description: str
    evidence: str       # The actual value that triggered this
    legal_reference: str = ""   # "IT Act Section 40A(3)", "CGST Rule 36(4)", etc.
    recommendation: str = ""
    file_reference: str = ""
    amount_involved: str = ""


# ── Field Confidence ───────────────────────────────────────────────────────

class FieldConfidence(BaseModel):
    field_name: str
    extracted_value: str
    confidence_score: float     # 0.0 – 100.0
    extraction_method: str      # "native_text", "ocr_tesseract", "table_parse", "regex"
    needs_review: bool = False


# ── Processing Result ──────────────────────────────────────────────────────

class ExtractionResult(BaseModel):
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_filename: str = ""
    output_filename: str = ""       # Auto-generated: VendorName_Type_InvoiceNo_Date.xlsx
    document_type: DocumentType = "other"
    
    # Invoice extraction
    header: InvoiceHeader = Field(default_factory=InvoiceHeader)
    line_items: List[LineItem] = Field(default_factory=list)
    
    # Bank statement extraction
    bank_header: Optional[BankStatementHeader] = None
    transactions: List[BankTransaction] = Field(default_factory=list)
    
    # Validation & intelligence
    validation_results: List[ValidationCheckpoint] = Field(default_factory=list)
    audit_observations: List[AuditObservation] = Field(default_factory=list)
    duplicate_matches: List[DuplicateMatch] = Field(default_factory=list)
    field_confidences: List[FieldConfidence] = Field(default_factory=list)
    
    # Raw data
    raw_tables: List[List[List[str]]] = Field(default_factory=list)
    raw_text_preview: str = ""    # First 1000 chars for search indexing
    
    # Warnings & quality
    warnings: List[ExtractionWarning] = Field(default_factory=list)
    confidence: Confidence = "low"
    overall_confidence_score: float = 0.0
    
    # Processing metadata
    page_count: int = 0
    is_ocr_used: bool = False
    ocr_language: str = "eng"
    processing_duration_ms: int = 0
    file_size_bytes: int = 0
    image_preprocessed: bool = False
    needs_manual_review: bool = False


# ── Batch Processing ───────────────────────────────────────────────────────

class BatchJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    files: List[str]
    output_dir: str
    status: BatchStatus = "queued"
    total_files: int = 0
    processed_files: int = 0
    failed_files: int = 0
    results: List[ExtractionResult] = Field(default_factory=list)
    errors: Dict[str, str] = Field(default_factory=dict)
    started_at: str = ""
    completed_at: str = ""


class BatchJobStatus(BaseModel):
    job_id: str
    status: BatchStatus
    total_files: int
    processed_files: int
    failed_files: int
    progress_percent: float
    current_file: str = ""
    started_at: str = ""
    completed_at: str = ""


# ── Search ─────────────────────────────────────────────────────────────────

class SearchQuery(BaseModel):
    query: str
    filters: Dict[str, str] = Field(default_factory=dict)
    limit: int = 50
    offset: int = 0


class SearchResult(BaseModel):
    document_id: str
    filename: str
    document_type: str
    vendor_name: str
    invoice_number: str
    invoice_date: str
    amount: str
    gstin: str
    score: float


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query_time_ms: int


# ── Request models ─────────────────────────────────────────────────────────

class ExtractionRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to the document file")
    document_type: Optional[DocumentType] = Field(
        default=None,
        description="Document type — if None, auto-detected"
    )
    ocr_enabled: bool = Field(default=True)
    preprocess_image: bool = Field(default=True, description="Auto-straighten, deskew, denoise")
    output_dir: Optional[str] = Field(default=None, description="Output folder for Excel file")
    client_name: Optional[str] = Field(default=None, description="Client name for naming/indexing")


class BatchExtractionRequest(BaseModel):
    file_paths: List[str]
    output_dir: str
    client_name: Optional[str] = None
    generate_consolidated: bool = Field(default=True)


class ExcelGenerationRequest(BaseModel):
    result: "ExtractionResult"
    output_path: str
    document_type: DocumentType


class ExcelGenerationResult(BaseModel):
    success: bool
    path: str
    filename: str = ""
    error: Optional[str] = None


# Allow forward reference
ExcelGenerationRequest.model_rebuild()
