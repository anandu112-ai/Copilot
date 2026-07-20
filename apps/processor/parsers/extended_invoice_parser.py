"""
Extended Invoice Parser — CA Copilot
Extracts all accounting fields from document text and tables.
Covers every field required by the CA Copilot specification including:
  - Core invoice identifiers
  - Transport & logistics fields (E-Way Bill, Vehicle No., LR No.)
  - Extended tax breakdown
  - Bank details (Account, IFSC, UPI, SWIFT)
  - Narration, PO number, reference number
  - Address blocks with state and PIN
  - Confidence scoring per field
"""
import re
import uuid
from typing import List, Tuple, Dict, Optional
from dateutil import parser as dateutil_parser
from loguru import logger

from models.schemas import (
    InvoiceHeader, LineItem, ExtractionWarning,
    FieldConfidence, Confidence, ValidationCheckpoint
)


# ── Regex Patterns ──────────────────────────────────────────────────────────

GSTIN_RE = re.compile(r"\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1})\b")
PAN_RE   = re.compile(r"\b([A-Z]{5}\d{4}[A-Z]{1})\b")
IFSC_RE  = re.compile(r"\b([A-Z]{4}0[A-Z0-9]{6})\b")
EWAY_RE  = re.compile(r"\b(?:e[\-\s]?way\s*(?:bill)?\s*(?:no|number|#)?\s*[:\-]?\s*)(\d{12})\b", re.IGNORECASE)
VEHICLE_RE = re.compile(r"\b(?:vehicle\s*(?:no|number|reg)?|veh\.?no\.?)\s*[:\-]?\s*([A-Z]{2}[\s\-]?\d{2}[\s\-]?[A-Z]{1,2}[\s\-]?\d{4})\b", re.IGNORECASE)
LR_RE    = re.compile(r"\b(?:lr\s*(?:no|number)?|lorry\s*receipt\s*(?:no)?)\s*[:\-]?\s*([A-Z0-9\-\/]+)\b", re.IGNORECASE)
UPI_RE   = re.compile(r"\b([a-zA-Z0-9.\-_]+@[a-zA-Z]{3,})\b")
SWIFT_RE = re.compile(r"\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b")
PIN_RE   = re.compile(r"\b(\d{6})\b")
PHONE_RE = re.compile(r"\b(?:\+91[\s\-]?)?[6-9]\d{9}\b")

DATE_PATTERNS = [
    r"\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b",
    r"\b(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})\b",
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b",
    r"\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b",
]

AMOUNT_PATTERNS = {
    "grand_total":    [r"(?i)\b(?:grand\s+)?total\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)",
                       r"(?i)\bnet\s+(?:payable|amount)\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "taxable_amount": [r"(?i)\btaxable\s+(?:value|amount)\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)",
                       r"(?i)\bsub\s*total\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "cgst":           [r"(?i)\bcgst\b(?:\s*@\s*[\d\.]+%)?[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "sgst":           [r"(?i)\bsgst\b(?:\s*@\s*[\d\.]+%)?[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "igst":           [r"(?i)\bigst\b(?:\s*@\s*[\d\.]+%)?[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "cess":           [r"(?i)\bcess\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "discount":       [r"(?i)\bdiscount\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "freight":        [r"(?i)\bfreight\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)",
                       r"(?i)\bshipping\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "tds_tcs":        [r"(?i)\btds\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)",
                       r"(?i)\btcs\b[^:]*?[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)"],
    "round_off":      [r"(?i)\bround\s*off\b[^:]*?[:\-]?\s*([+-]?\s*[\d,]+\.?\d*)"],
}

# Column header mappings for line item table parsing
COL_MAPS = {
    "description": ["description", "item", "particulars", "name", "product", "details", "goods", "services"],
    "hsn":         ["hsn", "sac", "hsn/sac", "hsn code", "sac code", "code"],
    "qty":         ["qty", "quantity", "nos", "units", "pcs", "boxes", "kg", "litre"],
    "unit":        ["unit", "uom", "measure"],
    "rate":        ["rate", "price", "unit price", "price/unit", "unit rate", "mrp"],
    "discount":    ["discount", "disc", "rebate"],
    "taxable":     ["taxable", "taxable value", "taxable amt", "assessable"],
    "cgst_rate":   ["cgst rate", "cgst%", "c.gst %"],
    "cgst_amt":    ["cgst amt", "cgst amount", "cgst"],
    "sgst_rate":   ["sgst rate", "sgst%", "s.gst %"],
    "sgst_amt":    ["sgst amt", "sgst amount", "sgst"],
    "igst_rate":   ["igst rate", "igst%", "i.gst %"],
    "igst_amt":    ["igst amt", "igst amount", "igst"],
    "total":       ["total", "amount", "value", "net", "line total", "net amount"],
}


# ── Utility helpers ─────────────────────────────────────────────────────────

def _clean_amount(val: str) -> str:
    """Strip currency symbols and commas, return numeric string."""
    if not val:
        return ""
    val = re.sub(r"(?i)\b(?:rs|inr|₹)\b\.?", "", val)
    val = re.sub(r"[^\d.\-]", "", val.replace(",", ""))
    return val.strip()


def _normalize_date(raw: str) -> str:
    """Parse various date formats to DD-MM-YYYY."""
    try:
        dt = dateutil_parser.parse(raw, dayfirst=True)
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return raw


def _find_label_value(lines: List[str], label_pattern: str) -> Optional[str]:
    """Find a value on the same line or next line after a label pattern."""
    for i, line in enumerate(lines):
        if re.search(label_pattern, line, re.IGNORECASE):
            # Try same line: Label: Value
            m = re.search(r"[:\-]\s*(.+)$", line)
            if m:
                val = m.group(1).strip()
                if val:
                    return val
            # Try next line
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line and not re.search(r"[:\-]", next_line):
                    return next_line
    return None


def _score_confidence(val: Optional[str], field_name: str, method: str) -> FieldConfidence:
    """Build a FieldConfidence object with heuristic scoring."""
    if not val:
        return FieldConfidence(
            field_name=field_name, extracted_value="",
            confidence_score=0.0, extraction_method=method, needs_review=True
        )
    score = 90.0
    # Reduce confidence for very short values (likely false positives)
    if len(val) < 2:
        score = 40.0
    elif len(val) < 5:
        score = 65.0
    return FieldConfidence(
        field_name=field_name, extracted_value=val,
        confidence_score=score, extraction_method=method, needs_review=(score < 70)
    )


# ── Main Parser ─────────────────────────────────────────────────────────────

def parse_invoice_document(
    text: str,
    raw_tables: List[List[List[str]]],
    doc_type: str,
    is_ocr: bool = False,
) -> Tuple[InvoiceHeader, List[LineItem], Confidence, List[ExtractionWarning], List[FieldConfidence], List[ValidationCheckpoint]]:

    warnings: List[ExtractionWarning] = []
    field_confidences: List[FieldConfidence] = []
    header_data: Dict[str, str] = {}
    line_items: List[LineItem] = []
    method = "ocr_tesseract" if is_ocr else "native_text"

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    # ── 1. GSTINs ────────────────────────────────────────────────────────────
    gstins = list(dict.fromkeys(GSTIN_RE.findall(text)))  # unique, ordered
    if gstins:
        header_data["vendor_gstin"] = gstins[0]
        if len(gstins) > 1:
            header_data["customer_gstin"] = gstins[1]
    field_confidences.append(_score_confidence(header_data.get("vendor_gstin"), "vendor_gstin", method))

    # ── 2. PANs ───────────────────────────────────────────────────────────────
    pans = PAN_RE.findall(text)
    # Exclude PANs embedded inside GSTINs (GSTIN chars 3-12 contain PAN)
    pans = [p for p in pans if not any(p in g for g in gstins)]
    if pans:
        header_data["vendor_pan"] = pans[0]

    # ── 3. Invoice Number ──────────────────────────────────────────────────────
    inv_patterns = [
        r"(?i)\b(?:invoice|inv|bill|tax\s+invoice)\s*(?:no|number|#|num)?\s*[:\-#]?\s*([A-Z0-9\-\/]{3,30})\b",
        r"(?i)\bvoucher\s*(?:no|number)?\s*[:\-]?\s*([A-Z0-9\-\/]+)\b",
        r"(?i)\bdoc(?:ument)?\s*(?:no|number)?\s*[:\-]?\s*([A-Z0-9\-\/]+)\b",
    ]
    for pat in inv_patterns:
        m = re.search(pat, text)
        if m:
            candidate = m.group(1).strip()
            # Reject if it looks like a GSTIN or too long
            if not GSTIN_RE.match(candidate) and len(candidate) <= 30:
                header_data["invoice_number"] = candidate
                break
    field_confidences.append(_score_confidence(header_data.get("invoice_number"), "invoice_number", method))

    # ── 4. Dates ───────────────────────────────────────────────────────────────
    all_dates = []
    for pat in DATE_PATTERNS:
        found = re.findall(pat, text, re.IGNORECASE)
        all_dates.extend(found)
    # Remove duplicates preserving order
    seen = set()
    unique_dates = [d for d in all_dates if not (d in seen or seen.add(d))]

    if unique_dates:
        header_data["invoice_date"] = _normalize_date(unique_dates[0])
        if len(unique_dates) > 1:
            header_data["due_date"] = _normalize_date(unique_dates[1])
    field_confidences.append(_score_confidence(header_data.get("invoice_date"), "invoice_date", method))

    # ── 5. Amounts ─────────────────────────────────────────────────────────────
    for field, patterns in AMOUNT_PATTERNS.items():
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                header_data[field] = _clean_amount(m.group(1))
                break
    field_confidences.append(_score_confidence(header_data.get("grand_total"), "grand_total", method))
    field_confidences.append(_score_confidence(header_data.get("taxable_amount"), "taxable_amount", method))
    field_confidences.append(_score_confidence(header_data.get("cgst"), "cgst", method))
    field_confidences.append(_score_confidence(header_data.get("sgst"), "sgst", method))
    field_confidences.append(_score_confidence(header_data.get("igst"), "igst", method))

    # ── 6. Vendor & Customer Names ─────────────────────────────────────────────
    buyer_idx = seller_idx = -1
    for i, line in enumerate(lines):
        if re.search(r"\b(?:bill\s+to|buyer|consignee|ship\s+to|deliver\s+to)\b", line, re.IGNORECASE):
            buyer_idx = i
        if re.search(r"\b(?:from|supplier|seller|vendor|billed\s+by|sold\s+by)\b", line, re.IGNORECASE):
            seller_idx = i

    if seller_idx != -1 and seller_idx + 1 < len(lines):
        header_data["vendor_name"] = lines[seller_idx + 1]
    elif lines:
        header_data["vendor_name"] = lines[0]

    if buyer_idx != -1 and buyer_idx + 1 < len(lines):
        header_data["customer_name"] = lines[buyer_idx + 1]

    field_confidences.append(_score_confidence(header_data.get("vendor_name"), "vendor_name", method))
    field_confidences.append(_score_confidence(header_data.get("customer_name"), "customer_name", method))

    # ── 7. Address & State & PIN ───────────────────────────────────────────────
    # Try to find address blocks near vendor/buyer names
    if seller_idx != -1:
        addr_lines = []
        for j in range(seller_idx + 2, min(seller_idx + 6, len(lines))):
            ln = lines[j]
            if re.search(r"\b(?:gstin|invoice|bill|date)\b", ln, re.IGNORECASE):
                break
            addr_lines.append(ln)
        header_data["vendor_address"] = ", ".join(addr_lines)

    # PIN codes
    pins = PIN_RE.findall(text)
    if pins:
        header_data["vendor_pin"] = pins[0]
        if len(pins) > 1:
            header_data["customer_pin"] = pins[1]

    # State / Place of supply
    supply_m = re.search(r"(?i)\bplace\s+of\s+supply\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if supply_m:
        header_data["place_of_supply"] = supply_m.group(1).strip()

    # ── 8. Bank Details ─────────────────────────────────────────────────────────
    bank_m = re.search(r"(?i)\b(?:bank\s+name|bank)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if bank_m:
        header_data["bank_name"] = bank_m.group(1).strip()[:60]

    acc_m = re.search(r"(?i)\b(?:a/?c|account|acc)\s*(?:no|number|num)?\s*[:\-]?\s*(\d[\d\s]{6,18}\d)\b", text)
    if acc_m:
        header_data["account_number"] = re.sub(r"\s", "", acc_m.group(1))

    ifsc_matches = IFSC_RE.findall(text)
    if ifsc_matches:
        header_data["ifsc"] = ifsc_matches[0]

    upi_matches = UPI_RE.findall(text)
    if upi_matches:
        header_data["upi"] = upi_matches[0]

    swift_matches = SWIFT_RE.findall(text)
    if swift_matches:
        header_data["swift_code"] = swift_matches[0]

    field_confidences.append(_score_confidence(header_data.get("ifsc"), "ifsc", method))

    # ── 9. Transport & Logistics ───────────────────────────────────────────────
    eway_m = EWAY_RE.search(text)
    if eway_m:
        header_data["eway_bill_number"] = eway_m.group(1)

    vehicle_m = VEHICLE_RE.search(text)
    if vehicle_m:
        header_data["vehicle_number"] = vehicle_m.group(1).upper().replace(" ", "")

    lr_m = LR_RE.search(text)
    if lr_m:
        header_data["lr_number"] = lr_m.group(1)

    transport_m = re.search(r"(?i)\b(?:transporter|transport(?:er)?\s+name|carrier)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if transport_m:
        header_data["transport_name"] = transport_m.group(1).strip()[:60]

    mode_m = re.search(r"(?i)\b(?:mode\s+of\s+transport|transport\s+mode)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if mode_m:
        header_data["transport_mode"] = mode_m.group(1).strip()

    # ── 10. Reference / PO Number ──────────────────────────────────────────────
    ref_m = re.search(r"(?i)\b(?:ref(?:erence)?\s*(?:no|number))\s*[:\-]?\s*([A-Z0-9\-\/]+)\b", text)
    if ref_m:
        header_data["reference_number"] = ref_m.group(1)

    po_m = re.search(r"(?i)\b(?:p\.?o\.?\s*(?:no|number)|purchase\s+order\s*(?:no|number|#))\s*[:\-]?\s*([A-Z0-9\-\/]+)\b", text)
    if po_m:
        header_data["purchase_order_number"] = po_m.group(1)

    # ── 11. Narration / Payment Terms ──────────────────────────────────────────
    nar_m = re.search(r"(?i)\b(?:narration|remarks|notes|description)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if nar_m:
        header_data["narration"] = nar_m.group(1).strip()[:200]

    pay_m = re.search(r"(?i)\b(?:payment\s+terms?|terms?\s+of\s+payment)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if pay_m:
        header_data["payment_terms"] = pay_m.group(1).strip()

    amt_words_m = re.search(r"(?i)\b(?:in\s+words?|rupees\s+in\s+words?)\s*[:\-]?\s*(.+?)(?:\n|$)", text)
    if amt_words_m:
        header_data["amount_in_words"] = amt_words_m.group(1).strip()

    # ── 12. Currency ────────────────────────────────────────────────────────────
    if re.search(r"\$|USD|usd", text):
        header_data["currency"] = "USD"
    elif re.search(r"€|EUR|eur", text):
        header_data["currency"] = "EUR"
    else:
        header_data["currency"] = "INR"

    # ── 13. Line Items from Tables ─────────────────────────────────────────────
    if raw_tables:
        for table in raw_tables:
            if len(table) < 2:
                continue

            header_row = [str(c).lower().strip() for c in table[0]]
            col_map = _map_columns(header_row)

            for row_idx, row in enumerate(table[1:], start=1):
                if len(row) <= max(col_map.values(), default=0):
                    continue

                def get_col(key: str) -> str:
                    idx = col_map.get(key)
                    if idx is not None and idx < len(row):
                        return str(row[idx]).strip()
                    return ""

                desc = get_col("description")
                if not desc:
                    continue
                # Skip footer/total rows
                if re.search(r"\b(total|subtotal|taxable|grand|sum)\b", desc, re.IGNORECASE):
                    continue

                total_val = get_col("total")
                taxable_val = get_col("taxable")
                qty_val = get_col("qty")
                rate_val = get_col("rate")

                # Needs review if key columns are empty
                needs_review = not (total_val or taxable_val)
                review_reason = "Total and taxable value missing" if needs_review else ""

                item = LineItem(
                    id=str(uuid.uuid4()),
                    sr_no=str(row_idx),
                    description=desc,
                    hsn_sac=get_col("hsn"),
                    quantity=qty_val,
                    unit=get_col("unit"),
                    rate=rate_val,
                    discount=get_col("discount"),
                    taxable_value=taxable_val,
                    cgst_rate=get_col("cgst_rate"),
                    cgst_amount=get_col("cgst_amt"),
                    sgst_rate=get_col("sgst_rate"),
                    sgst_amount=get_col("sgst_amt"),
                    igst_rate=get_col("igst_rate"),
                    igst_amount=get_col("igst_amt"),
                    total=total_val,
                    needs_review=needs_review,
                    review_reason=review_reason,
                )
                line_items.append(item)

    # ── 14. Confidence scoring ─────────────────────────────────────────────────
    critical_fields = ["invoice_number", "invoice_date", "vendor_name", "grand_total"]
    found_critical = sum(1 for f in critical_fields if header_data.get(f))

    if found_critical == len(critical_fields):
        confidence: Confidence = "high"
    elif found_critical >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    overall_score = (found_critical / len(critical_fields)) * 100

    # ── 15. Warnings for missing fields ────────────────────────────────────────
    for field in critical_fields:
        if not header_data.get(field):
            warnings.append(ExtractionWarning(
                field=field,
                message=f"Could not extract: {field.replace('_', ' ').title()}",
                severity="warning"
            ))
    if not header_data.get("vendor_gstin"):
        warnings.append(ExtractionWarning(
            field="vendor_gstin",
            message="Vendor GSTIN not found — ITC claim may not be valid",
            severity="error"
        ))

    # ── 16. Validation Checkpoints ─────────────────────────────────────────────
    validations = _run_validations(header_data, line_items)

    header = InvoiceHeader(**header_data)
    return header, line_items, confidence, warnings, field_confidences, validations


def _map_columns(header_row: List[str]) -> Dict[str, int]:
    """Map column names to indices using fuzzy keyword matching."""
    col_map: Dict[str, int] = {}
    for col_idx, col_name in enumerate(header_row):
        col_lower = col_name.lower().strip()
        for key, keywords in COL_MAPS.items():
            if key not in col_map:
                if any(kw == col_lower or kw in col_lower or col_lower in kw for kw in keywords):
                    col_map[key] = col_idx
    return col_map


def _run_validations(header_data: Dict, line_items: List[LineItem]) -> List[ValidationCheckpoint]:
    """Run validation checkpoints on extracted data."""
    checks: List[ValidationCheckpoint] = []
    GSTIN_PATTERN = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$")

    # Checkpoint 1: Vendor GSTIN format
    vendor_gstin = header_data.get("vendor_gstin", "")
    gst_valid = bool(GSTIN_PATTERN.match(vendor_gstin)) if vendor_gstin else False
    checks.append(ValidationCheckpoint(
        name="Vendor GSTIN Validation",
        description="Vendor GSTIN must match standard 15-character format",
        logic="Regex: /^\\d{2}[A-Z]{5}\\d{4}[A-Z][A-Z\\d]Z[A-Z\\d]$/",
        result_value=vendor_gstin or "Not Found",
        status="PASS" if gst_valid else ("WARNING" if vendor_gstin else "HIGH ALERT"),
        observation="GSTIN structure is valid" if gst_valid else (
            "Invalid GSTIN format — ITC cannot be claimed" if vendor_gstin else
            "Vendor GSTIN is missing — ITC disallowed"
        )
    ))

    # Checkpoint 2: Arithmetic balance (line items vs header)
    try:
        items_sum = sum(
            float(str(i.taxable_value or "0").replace(",", ""))
            for i in line_items if i.taxable_value
        )
        header_taxable = float(str(header_data.get("taxable_amount", "0") or "0").replace(",", ""))
        math_ok = abs(items_sum - header_taxable) < 2.0 if (items_sum > 0 and header_taxable > 0) else True
    except Exception:
        items_sum = header_taxable = 0.0
        math_ok = True

    checks.append(ValidationCheckpoint(
        name="Arithmetic Balance Check",
        description="Sum of line item taxable values must equal header taxable amount",
        logic="SUM(line_items.taxable_value) ≈ header.taxable_amount (±₹2)",
        result_value=f"Items: ₹{items_sum:,.2f} | Header: ₹{header_taxable:,.2f}",
        status="PASS" if math_ok else "HIGH ALERT",
        observation="Calculations balance correctly" if math_ok else
            f"Mismatch: Line items sum ₹{items_sum:,.2f} ≠ header taxable ₹{header_taxable:,.2f}"
    ))

    # Checkpoint 3: Tax balance
    try:
        cgst = float(str(header_data.get("cgst", "0") or "0").replace(",", ""))
        sgst = float(str(header_data.get("sgst", "0") or "0").replace(",", ""))
        igst = float(str(header_data.get("igst", "0") or "0").replace(",", ""))
        grand = float(str(header_data.get("grand_total", "0") or "0").replace(",", ""))
        tax_balance = abs((header_taxable + cgst + sgst + igst) - grand) < 5.0 if grand > 0 else True
    except Exception:
        tax_balance = True
        cgst = sgst = igst = grand = 0.0

    checks.append(ValidationCheckpoint(
        name="Tax Distribution Balance",
        description="Taxable + CGST + SGST + IGST must equal Grand Total (±₹5)",
        logic="taxable_amount + cgst + sgst + igst ≈ grand_total",
        result_value=f"Tax: ₹{cgst+sgst+igst:,.2f} | Grand: ₹{grand:,.2f}",
        status="PASS" if tax_balance else "HIGH ALERT",
        observation="Tax calculation is balanced" if tax_balance else
            "Grand total does not match sum of taxable value and taxes"
    ))

    # Checkpoint 4: Round figure detection (Section 40A(3) risk)
    try:
        grand_int = int(float(grand))
        is_round = (grand_int % 1000 == 0 and grand_int >= 10000)
    except Exception:
        is_round = False

    checks.append(ValidationCheckpoint(
        name="Round Figure Alert (Sec 40A(3) Risk)",
        description="Large round-figure cash payments are restricted under IT Act",
        logic="Amount divisible by 1000 and ≥ ₹10,000",
        result_value=f"₹{grand:,.2f}",
        status="WARNING" if is_round else "PASS",
        observation="Large round figure detected — verify payment mode (cash >₹10k restricted u/s 40A(3))" if is_round else
            "Amount not a suspicious round figure"
    ))

    # Checkpoint 5: Place of Supply vs GSTIN State Code
    pos = header_data.get("place_of_supply", "")
    vendor_gst_state = vendor_gstin[:2] if len(vendor_gstin) >= 2 else ""
    customer_gst_state = header_data.get("customer_gstin", "")[:2]
    inter_state = vendor_gst_state != customer_gst_state if (vendor_gst_state and customer_gst_state) else None
    has_igst = float(str(header_data.get("igst", "0") or "0").replace(",", "")) > 0

    if inter_state is not None:
        correct_tax = (inter_state and has_igst) or (not inter_state and not has_igst)
        checks.append(ValidationCheckpoint(
            name="IGST vs CGST/SGST Applicability",
            description="Inter-state supplies must use IGST; intra-state must use CGST+SGST",
            logic=f"Vendor State: {vendor_gst_state} | Customer State: {customer_gst_state}",
            result_value="Inter-state (IGST)" if inter_state else "Intra-state (CGST+SGST)",
            status="PASS" if correct_tax else "HIGH ALERT",
            observation="Correct tax type applied" if correct_tax else
                "Wrong tax type: Inter-state transaction should use IGST, not CGST/SGST"
        ))

    return checks
