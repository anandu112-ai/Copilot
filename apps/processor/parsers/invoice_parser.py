"""
Extracts fields and line items from unstructured text and raw tables of an invoice.
"""
import re
import uuid
from typing import List, Tuple, Dict
from models.schemas import InvoiceHeader, LineItem, ExtractionWarning, Confidence

# Common field patterns
GSTIN_REGEX = r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b"
PAN_REGEX = r"\b[A-Z]{5}\d{4}[A-Z]{1}\b"
DATE_REGEXS = [
    r"\b\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}\b",
    r"\b\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}\b",
    r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b"
]

def clean_amount(val: str) -> str:
    if not val:
        return ""
    # Remove currency symbols and indicators first, supporting optional trailing dot when word boundary is used
    val = re.sub(r"(?i)\b(?:rs|inr|usd|eur|gbp)\b\.?", "", val)
    # Strip everything except digits, dots, and minus signs
    cleaned = re.sub(r"[^\d\.\-]", "", val)
    return cleaned

def parse_invoice_document(
    text: str, 
    raw_tables: List[List[List[str]]], 
    doc_type: str
) -> Tuple[InvoiceHeader, List[LineItem], Confidence, List[ExtractionWarning]]:
    
    warnings = []
    header_data = {}
    line_items = []
    confidence = "medium"

    # --- 1. Header Fields Extraction via Regex on Full Text ---
    
    # Invoice Number (restrict separators to horizontal space/tabs and punctuation only on the same line, enforce word boundaries)
    inv_num_patterns = [
        r"(?i)\b(?:invoice|inv)\b(?:[ \t]*(?:no|number|\#))?[ \t]*[:\-\#]*[ \t]*([a-zA-Z0-9\-\/]+)",
        r"(?i)\b(?:bill)\b(?:[ \t]*(?:no|number|\#))?[ \t]*[:\-\#]*[ \t]*([a-zA-Z0-9\-\/]+)",
        r"(?i)\bdoc\b(?:[ \t]*(?:no))?[ \t]*[:\-]*[ \t]*([a-zA-Z0-9\-\/]+)"
    ]
    for p in inv_num_patterns:
        match = re.search(p, text)
        if match:
            header_data["invoice_number"] = match.group(1).strip()
            break
            
    # Dates
    dates = []
    for reg in DATE_REGEXS:
        found = re.findall(reg, text, re.IGNORECASE)
        if found:
            dates.extend(found)
            
    if dates:
        header_data["invoice_date"] = dates[0]
        if len(dates) > 1:
            header_data["due_date"] = dates[1]

    # GSTINs
    gstins = re.findall(GSTIN_REGEX, text)
    if gstins:
        # Assuming the first one is the Seller (Vendor) and second one is the Customer (Buyer)
        header_data["vendor_gstin"] = gstins[0]
        if len(gstins) > 1:
            header_data["customer_gstin"] = gstins[1]
            
    # PANs
    pans = re.findall(PAN_REGEX, text)
    if pans:
        header_data["vendor_pan"] = pans[0]

    # Vendor & Customer Name (Simple line checks as heuristics)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # Look for "bill to" or "buyer" or "consignee"
    buyer_idx = -1
    seller_idx = -1
    for idx, line in enumerate(lines):
        if re.search(r"\b(?:bill\s+to|buyer|consignee|to)\b", line, re.IGNORECASE):
            buyer_idx = idx
        if re.search(r"\b(?:from|supplier|seller|vendor)\b", line, re.IGNORECASE):
            seller_idx = idx

    if seller_idx != -1 and seller_idx + 1 < len(lines):
        header_data["vendor_name"] = lines[seller_idx + 1]
    elif lines:
        # Default fallback to first non-empty line as vendor
        header_data["vendor_name"] = lines[0]
        
    if buyer_idx != -1 and buyer_idx + 1 < len(lines):
        header_data["customer_name"] = lines[buyer_idx + 1]
        
    # Totals and Taxes (using word boundaries to prevent matching 'subtotal' as 'total')
    amount_patterns = {
        "grand_total": [r"(?i)\b(?:grand\s+)?total\b[ \t]*[:\-\#]*[ \t]*(?:rs\.?|inr)?[ \t]*([\d,]+\.?\d*)", r"(?i)\bnet\s+payable\b[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
        "taxable_amount": [r"(?i)\btaxable\s+(?:amount|value)\b[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)", r"(?i)\bsub\s*total\b[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
        "cgst": [r"(?i)\bcgst\b(?:[ \t]*(?:amt|amount))?[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
        "sgst": [r"(?i)\bsgst\b(?:[ \t]*(?:amt|amount))?[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
        "igst": [r"(?i)\bigst\b(?:[ \t]*(?:amt|amount))?[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
        "discount": [r"(?i)\bdiscount\b[ \t]*[:\-\#]*[ \t]*([\d,]+\.?\d*)"],
    }
    
    for field, patterns in amount_patterns.items():
        for p in patterns:
            match = re.search(p, text, re.IGNORECASE)
            if match:
                header_data[field] = clean_amount(match.group(1))
                break

    # --- 2. Table / Line Items Parsing ---
    # Normalization mappings for table headers
    desc_headers = ["description", "item", "particulars", "name", "product", "details"]
    hsn_headers = ["hsn", "sac", "hsn/sac", "code"]
    qty_headers = ["qty", "quantity", "quantity/unit", "nos", "units"]
    rate_headers = ["rate", "price", "unit price", "price/unit"]
    total_headers = ["total", "amount", "value", "net", "line total"]
    taxable_headers = ["taxable", "taxable value", "taxable amt"]

    if raw_tables:
        for table in raw_tables:
            if len(table) < 2:
                continue
                
            # Try to identify column indices
            header_row = table[0]
            col_map = {}
            for col_idx, col_name in enumerate(header_row):
                col_name_lower = str(col_name).lower().strip()
                if any(x in col_name_lower for x in desc_headers):
                    col_map["description"] = col_idx
                elif any(x == col_name_lower or col_name_lower.startswith(x) for x in hsn_headers):
                    col_map["hsn"] = col_idx
                elif any(x in col_name_lower for x in qty_headers):
                    col_map["qty"] = col_idx
                elif any(x in col_name_lower for x in rate_headers):
                    col_map["rate"] = col_idx
                elif any(x in col_name_lower for x in total_headers) and not any(x in col_name_lower for x in rate_headers):
                    col_map["total"] = col_idx
                elif any(x in col_name_lower for x in taxable_headers):
                    col_map["taxable"] = col_idx

            # If description column wasn't identified, guess column 1
            if "description" not in col_map and len(header_row) > 1:
                col_map["description"] = 1 if len(header_row) > 1 else 0

            # Extract lines
            for row in table[1:]:
                # Ensure row has enough columns
                if len(row) <= max(col_map.values(), default=0):
                    continue

                desc_val = row[col_map.get("description", 0)] if "description" in col_map else ""
                
                # Skip empty lines or subtotal summary lines in the table
                if not desc_val or any(x in desc_val.lower() for x in ["total", "subtotal", "taxable"]):
                    continue

                line_items.append(
                    LineItem(
                        id=str(uuid.uuid4()),
                        sr_no=str(len(line_items) + 1),
                        description=desc_val,
                        hsn_sac=row[col_map.get("hsn")] if "hsn" in col_map else "",
                        quantity=row[col_map.get("qty")] if "qty" in col_map else "",
                        unit="",
                        rate=row[col_map.get("rate")] if "rate" in col_map else "",
                        discount="",
                        taxable_value=row[col_map.get("taxable")] if "taxable" in col_map else "",
                        total=row[col_map.get("total")] if "total" in col_map else ""
                    )
                )
                
    # Normalize confidence based on header fields found
    important_fields = ["invoice_number", "invoice_date", "vendor_name", "grand_total"]
    found_count = sum(1 for f in important_fields if header_data.get(f))
    if found_count == len(important_fields):
        confidence = "high"
    elif found_count >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    # Add warnings for missing fields
    for field in important_fields:
        if not header_data.get(field):
            warnings.append(
                ExtractionWarning(
                    field=field,
                    message=f"Could not extract crucial field: {field.replace('_', ' ').capitalize()}",
                    severity="warning"
                )
            )

    header = InvoiceHeader(**header_data)
    return header, line_items, confidence, warnings
