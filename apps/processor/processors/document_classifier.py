"""
Document Type Classifier — CA Copilot
Auto-detects document type from extracted text content without user selection.
Uses keyword scoring and regex heuristics.
"""
import re
from typing import Dict, Tuple
from loguru import logger
from models.schemas import DocumentType


# Keyword banks for scoring
KEYWORD_BANKS: Dict[str, list] = {
    "bank_statement": [
        "account statement", "bank statement", "opening balance", "closing balance",
        "transaction date", "value date", "chq no", "chq ref", "utr", "neft", "rtgs",
        "imps", "upi", "cr", "dr", "balance b/f", "balance c/f", "debit", "credit",
        "available balance", "account number", "ifsc", "passbook"
    ],
    "purchase_invoice": [
        "purchase invoice", "purchase bill", "purchase order",
        "vendor invoice", "supplier invoice", "bill to", "bill from",
        "received from", "bought from"
    ],
    "sales_invoice": [
        "tax invoice", "sales invoice", "proforma invoice", "sale bill",
        "sold to", "deliver to", "ship to", "customer copy"
    ],
    "credit_note": [
        "credit note", "credit memo", "credit adjustment",
        "return inward", "sales return", "debit to account"
    ],
    "debit_note": [
        "debit note", "debit memo", "debit adjustment",
        "return outward", "purchase return"
    ],
    "delivery_challan": [
        "delivery challan", "challan", "challan no", "delivery note",
        "consignment note", "goods receipt", "e-way bill", "eway"
    ],
    "purchase_order": [
        "purchase order", "p.o. no", "po number", "order confirmation",
        "order date", "indent", "order to"
    ],
    "gst_report": [
        "gstr", "gstr-1", "gstr-2", "gstr-2b", "gstr-3b", "gstr-9",
        "input tax credit", "itc", "gstin", "gst return",
        "b2b", "b2c", "hsn summary", "filing period"
    ],
    "expense_bill": [
        "expense bill", "petty cash", "reimbursement", "expense claim",
        "travel expense", "medical expense", "entertainment", "fuel bill"
    ],
    "ledger": [
        "ledger", "account ledger", "general ledger", "trial balance",
        "particulars", "folio", "journal entry", "voucher type",
        "dr amount", "cr amount"
    ],
    "audit_document": [
        "audit report", "form 3cd", "tax audit", "statutory audit",
        "internal audit", "audit observation", "auditor's report",
        "balance sheet", "profit and loss", "income statement"
    ],
    "gst_invoice": [
        "tax invoice", "gstin", "hsn", "sac", "cgst", "sgst", "igst", "cess",
        "place of supply", "reverse charge"
    ],
    "invoice": [
        "invoice", "bill", "invoice no", "invoice number", "inv no",
        "invoice date", "total amount", "subtotal", "grand total"
    ],
}

# Weight of exact phrase vs. individual word matches
EXACT_PHRASE_WEIGHT = 3
WORD_MATCH_WEIGHT = 1

# Minimum score to consider a classification confident
CONFIDENCE_THRESHOLD = 5


def classify_document(text: str, filename: str = "") -> Tuple[DocumentType, float]:
    """
    Classify document type from text content.
    Returns (document_type, confidence_score 0-100).
    """
    text_lower = text.lower()
    filename_lower = filename.lower()

    scores: Dict[str, float] = {doc_type: 0.0 for doc_type in KEYWORD_BANKS}

    for doc_type, keywords in KEYWORD_BANKS.items():
        for keyword in keywords:
            # Exact phrase match
            if keyword in text_lower:
                scores[doc_type] += EXACT_PHRASE_WEIGHT
            # Individual word matches
            for word in keyword.split():
                if word in text_lower and len(word) > 4:
                    scores[doc_type] += WORD_MATCH_WEIGHT

        # Boost from filename match
        for keyword in keywords:
            if any(w in filename_lower for w in keyword.split() if len(w) > 4):
                scores[doc_type] += 2.0

    # Special regex-based boosting
    if re.search(r"\bopening\s+balance\b", text_lower) and re.search(r"\bclosing\s+balance\b", text_lower):
        scores["bank_statement"] += 15
    if re.search(r"\bgstr[-\s]?\d", text_lower):
        scores["gst_report"] += 10
    if re.search(r"\bcredit\s+note\b", text_lower):
        scores["credit_note"] += 10
    if re.search(r"\bdebit\s+note\b", text_lower):
        scores["debit_note"] += 10
    if re.search(r"\bdelivery\s+challan\b|\be[\-]?way\s+bill\b", text_lower):
        scores["delivery_challan"] += 10
    if re.search(r"\bpurchase\s+order\b|\bp\.?o\.?\s+no\b", text_lower):
        scores["purchase_order"] += 10
    if re.search(r"\bform\s+3cd\b|\baudit\s+report\b", text_lower):
        scores["audit_document"] += 15

    # If CGST+SGST or IGST found, likely a GST invoice
    has_gst_tax = bool(
        re.search(r"\bcgst\b", text_lower) and re.search(r"\bsgst\b", text_lower)
    ) or bool(re.search(r"\bigst\b", text_lower))
    if has_gst_tax:
        scores["gst_invoice"] += 8
        scores["invoice"] += 4

    # Find the highest scoring type
    best_type = max(scores, key=lambda k: scores[k])
    best_score = scores[best_type]

    # Normalize confidence to 0-100
    total_score = sum(scores.values()) or 1
    confidence_pct = min((best_score / total_score) * 100 * 3, 100.0)

    if best_score < CONFIDENCE_THRESHOLD:
        logger.warning(f"Low classification confidence ({best_score:.1f}) — defaulting to 'invoice'")
        best_type = "invoice"
        confidence_pct = 30.0

    logger.info(f"Document classified as '{best_type}' (score={best_score:.1f}, confidence={confidence_pct:.1f}%)")
    return best_type, round(confidence_pct, 1)
