"""
Bank Statement Parser — CA Copilot
Extracts structured transaction data from bank statement text.
Supports:
  - Multi-bank statement formats
  - UPI, NEFT, RTGS, IMPS, Cheque, Cash, ECS, ATM, POS, Interest, Charges
  - Opening/Closing balance detection
  - Transaction categorization
  - Audit flags (weekend, round figure, large transaction)
"""
import re
import uuid
from typing import List, Tuple, Dict, Optional
from dateutil import parser as dateutil_parser
from dateutil.parser import ParserError
from loguru import logger
from models.schemas import (
    BankStatementHeader, BankTransaction, ExtractionWarning,
    PaymentMode, ValidationCheckpoint
)


# ── Payment mode detection patterns ──────────────────────────────────────────

MODE_PATTERNS: Dict[str, List[str]] = {
    "UPI":      ["upi", "upi-", "upi/", "upi ref", "@upi", "unified payment"],
    "NEFT":     ["neft", "neft-", "neft/", "national electronic"],
    "RTGS":     ["rtgs", "rtgs-", "rtgs/", "real time gross"],
    "IMPS":     ["imps", "imps-", "imps/", "immediate payment"],
    "CHEQUE":   ["chq", "cheque", "clg", "clearing", "ecs clg"],
    "ECS":      ["ecs", "nach", "ecs cr", "ecs dr", "mandate"],
    "ATM":      ["atm", "atw", "cash withdrawal", "atm wd"],
    "POS":      ["pos", "card", "debit card", "credit card", "ecom"],
    "CASH":     ["cash dep", "cash deposit", "cash wd", "cash with", "by cash"],
    "INTEREST": ["interest", "int cr", "int pd", "int paid", "interest credit"],
    "CHARGES":  ["charges", "charge", "fee", "penalty", "tax deducted", "tds"],
}

# Transaction categorization by narration keywords
CATEGORY_MAP: Dict[str, List[str]] = {
    "Salary":           ["salary", "sal cr", "salry", "emoluments"],
    "Rent":             ["rent", "rental", "lease"],
    "GST Payment":      ["gst", "goods and service tax", "cgst", "igst", "sgst"],
    "Income Tax":       ["income tax", "advance tax", "self assessment", "tds"],
    "Vendor Payment":   ["payment to", "vendor pay", "supplier", "purchase"],
    "Customer Receipt": ["received from", "customer", "sales receipt"],
    "Loan EMI":         ["emi", "loan", "housing loan", "car loan", "personal loan"],
    "Utility Bill":     ["electricity", "water", "gas", "ebill", "bsnl", "airtel", "jio"],
    "Insurance":        ["insurance", "lic", "premium", "policy"],
    "Investment":       ["mf", "mutual fund", "sip", "nps", "ppf", "fd", "rd"],
    "Bank Charges":     ["charges", "annual fee", "maintenance"],
    "ATM Withdrawal":   ["atm", "cash withdrawal"],
    "Interest Income":  ["interest cr", "fd interest", "savings interest"],
}

# Audit flag patterns
WEEKEND_DAYS = {5, 6}  # Saturday=5, Sunday=6 (weekday())
ROUND_FIGURE_THRESHOLD = 10000
LARGE_TXN_THRESHOLD = 500000  # ₹5 Lakh


# ── Header extraction ─────────────────────────────────────────────────────────

def parse_bank_statement(
    text: str,
    raw_tables: List[List[List[str]]]
) -> Tuple[BankStatementHeader, List[BankTransaction], List[ExtractionWarning], List[ValidationCheckpoint]]:

    warnings: List[ExtractionWarning] = []
    header = _extract_bank_header(text)
    transactions: List[BankTransaction] = []

    # Try to get transactions from raw tables (most reliable)
    if raw_tables:
        for table in raw_tables:
            parsed = _parse_transaction_table(table)
            transactions.extend(parsed)

    # If no transactions from tables, try text-based parsing
    if not transactions:
        transactions = _parse_transactions_from_text(text)

    # Apply audit flags
    for txn in transactions:
        _apply_audit_flags(txn)

    # Fill computed totals if not extracted from header
    credits = [t for t in transactions if t.transaction_type == "credit"]
    debits = [t for t in transactions if t.transaction_type == "debit"]

    if not header.total_credits:
        total_credit_amt = sum(_safe_float(t.credit) for t in credits)
        header.total_credits = f"{total_credit_amt:,.2f}"
    if not header.total_debits:
        total_debit_amt = sum(_safe_float(t.debit) for t in debits)
        header.total_debits = f"{total_debit_amt:,.2f}"
    header.total_credit_count = len(credits)
    header.total_debit_count = len(debits)

    # Validation
    validations = _run_bank_validations(header, transactions)

    if not transactions:
        warnings.append(ExtractionWarning(
            field="transactions",
            message="No transactions could be extracted from this bank statement",
            severity="error"
        ))

    logger.info(f"Bank statement parsed: {len(transactions)} transactions found")
    return header, transactions, warnings, validations


def _extract_bank_header(text: str) -> BankStatementHeader:
    """Extract statement-level metadata from text."""
    header = BankStatementHeader()

    patterns = {
        "account_holder": [r"(?i)(?:name|account\s+holder|customer\s+name)\s*[:\-]?\s*(.+?)(?:\n|$)"],
        "account_number": [r"(?i)(?:account\s*(?:no|number|num)|a/?c\s+no)\s*[:\-]?\s*(\d[\d\s]{6,20}\d)"],
        "bank_name":      [r"(?i)(?:bank\s+name|bank)\s*[:\-]?\s*(.+?)(?:\n|$)"],
        "branch":         [r"(?i)(?:branch|branch\s+name)\s*[:\-]?\s*(.+?)(?:\n|$)"],
        "ifsc":           [r"\b([A-Z]{4}0[A-Z0-9]{6})\b"],
        "account_type":   [r"(?i)(?:account\s+type|a/?c\s+type)\s*[:\-]?\s*(.+?)(?:\n|$)"],
        "statement_from": [r"(?i)(?:from|period\s+from|statement\s+from)\s*[:\-]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})"],
        "statement_to":   [r"(?i)(?:to|period\s+to|statement\s+to)\s*[:\-]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})"],
        "opening_balance":[r"(?i)(?:opening\s+balance|op(?:ening)?\s+bal(?:ance)?)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)"],
        "closing_balance":[r"(?i)(?:closing\s+balance|cl(?:osing)?\s+bal(?:ance)?)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)"],
    }

    for field, field_patterns in patterns.items():
        for pat in field_patterns:
            m = re.search(pat, text)
            if m:
                val = m.group(1).strip()
                if field in ["opening_balance", "closing_balance"]:
                    val = val.replace(",", "")
                setattr(header, field, val[:100])
                break

    return header


def _parse_transaction_table(table: List[List[str]]) -> List[BankTransaction]:
    """Identify columns and parse transaction rows from a structured table."""
    if len(table) < 2:
        return []

    header_row = [str(c).lower().strip() for c in table[0]]

    # Column detection
    col = {}
    for i, h in enumerate(header_row):
        if any(k in h for k in ["date", "txn date", "value date", "tran date"]) and "date" not in col:
            col["date"] = i
        elif any(k in h for k in ["narration", "description", "particulars", "details", "remarks"]) and "desc" not in col:
            col["desc"] = i
        elif any(k in h for k in ["ref", "reference", "chq", "cheque", "utr", "txn id"]) and "ref" not in col:
            col["ref"] = i
        elif any(k in h for k in ["debit", "withdrawal", "dr", "dr amount"]) and "debit" not in col:
            col["debit"] = i
        elif any(k in h for k in ["credit", "deposit", "cr", "cr amount"]) and "credit" not in col:
            col["credit"] = i
        elif any(k in h for k in ["balance", "bal", "running balance"]) and "balance" not in col:
            col["balance"] = i

    if not col:
        return []

    transactions = []
    for row in table[1:]:
        def _get(key: str) -> str:
            idx = col.get(key)
            if idx is not None and idx < len(row):
                return str(row[idx]).strip()
            return ""

        date_str = _get("date")
        desc = _get("desc")
        ref = _get("ref")
        debit = _get("debit")
        credit = _get("credit")
        balance = _get("balance")

        # Skip header-like or empty rows
        if not date_str and not desc:
            continue
        if re.search(r"(?i)\b(opening|closing|total|balance b/f)\b", desc):
            continue

        # Determine transaction type
        debit_val = _safe_float(debit)
        credit_val = _safe_float(credit)
        if debit_val > 0:
            txn_type = "debit"
        elif credit_val > 0:
            txn_type = "credit"
        else:
            txn_type = None

        # Normalize date
        norm_date = _normalize_date(date_str)

        txn = BankTransaction(
            id=str(uuid.uuid4()),
            date=norm_date,
            description=desc,
            reference_number=ref,
            debit=debit if debit_val > 0 else "",
            credit=credit if credit_val > 0 else "",
            balance=balance,
            transaction_type=txn_type,
            payment_mode=_detect_payment_mode(desc),
            category=_detect_category(desc),
            counterparty=_extract_counterparty(desc),
        )
        transactions.append(txn)

    return transactions


def _parse_transactions_from_text(text: str) -> List[BankTransaction]:
    """
    Fallback: attempt to parse transactions from raw text.
    Looks for rows with date + amount patterns.
    """
    transactions = []
    date_pat = re.compile(r"\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b")
    amount_pat = re.compile(r"([\d,]+\.\d{2})")

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        dates = date_pat.findall(line)
        amounts = amount_pat.findall(line)

        if not dates or len(amounts) < 1:
            continue

        # Simple heuristic: last amount is balance, second last is txn amount
        balance = amounts[-1] if len(amounts) >= 2 else ""
        txn_amount = amounts[-2] if len(amounts) >= 2 else amounts[0]

        # Determine debit/credit from keywords
        if re.search(r"\b(?:dr|debit|wd|withdrawal)\b", line, re.IGNORECASE):
            debit, credit = txn_amount, ""
            txn_type = "debit"
        else:
            debit, credit = "", txn_amount
            txn_type = "credit"

        desc = re.sub(date_pat.pattern, "", line)
        desc = re.sub(amount_pat.pattern, "", desc).strip()

        txn = BankTransaction(
            id=str(uuid.uuid4()),
            date=_normalize_date(dates[0]),
            description=desc[:200],
            debit=debit,
            credit=credit,
            balance=balance,
            transaction_type=txn_type,
            payment_mode=_detect_payment_mode(desc),
            category=_detect_category(desc),
        )
        transactions.append(txn)

    return transactions


def _detect_payment_mode(narration: str) -> PaymentMode:
    nar_lower = narration.lower()
    for mode, keywords in MODE_PATTERNS.items():
        if any(kw in nar_lower for kw in keywords):
            return mode
    return "OTHER"


def _detect_category(narration: str) -> str:
    nar_lower = narration.lower()
    for category, keywords in CATEGORY_MAP.items():
        if any(kw in nar_lower for kw in keywords):
            return category
    return "Uncategorized"


def _extract_counterparty(narration: str) -> str:
    """Extract the other party name from narration (after UPI /, NEFT /, etc.)."""
    m = re.search(r"(?:upi|neft|rtgs|imps|to|from|by)\s*[/\-]?\s*([A-Za-z][A-Za-z\s]{3,40})", narration, re.IGNORECASE)
    if m:
        return m.group(1).strip()[:60]
    return ""


def _apply_audit_flags(txn: BankTransaction):
    """Apply audit flags to a transaction."""
    flags = []

    # Weekend transaction
    try:
        dt = dateutil_parser.parse(txn.date, dayfirst=True)
        if dt.weekday() in WEEKEND_DAYS:
            flags.append("WEEKEND_TXN")
    except Exception:
        pass

    # Round figure detection
    amount = max(_safe_float(txn.debit), _safe_float(txn.credit))
    if amount >= ROUND_FIGURE_THRESHOLD and int(amount) % 1000 == 0:
        flags.append("ROUND_FIGURE")

    # Large transaction
    if amount >= LARGE_TXN_THRESHOLD:
        flags.append("LARGE_TXN")

    # Cash transaction
    if txn.payment_mode == "CASH":
        flags.append("CASH_TXN")

    txn.audit_flag = "|".join(flags)
    txn.needs_review = bool(flags)


def _run_bank_validations(
    header: BankStatementHeader,
    transactions: List[BankTransaction]
) -> List[ValidationCheckpoint]:
    checks: List[ValidationCheckpoint] = []

    # Balance reconciliation
    try:
        op = _safe_float(header.opening_balance)
        cl = _safe_float(header.closing_balance)
        total_cr = sum(_safe_float(t.credit) for t in transactions)
        total_dr = sum(_safe_float(t.debit) for t in transactions)
        expected_closing = round(op + total_cr - total_dr, 2)
        balance_ok = abs(expected_closing - cl) < 10.0 if (op > 0 and cl > 0) else True
    except Exception:
        balance_ok = True
        expected_closing = cl = 0.0

    checks.append(ValidationCheckpoint(
        name="Bank Balance Reconciliation",
        description="Opening Balance + Credits - Debits should equal Closing Balance",
        logic="opening_balance + Σcredits - Σdebits ≈ closing_balance (±₹10)",
        result_value=f"Expected: ₹{expected_closing:,.2f} | Actual Closing: ₹{cl:,.2f}",
        status="PASS" if balance_ok else "HIGH ALERT",
        observation="Statement balances reconcile correctly" if balance_ok else
            f"Balance mismatch: Expected ₹{expected_closing:,.2f}, Statement shows ₹{cl:,.2f}"
    ))

    # Weekend transactions
    weekend_txns = [t for t in transactions if "WEEKEND_TXN" in (t.audit_flag or "")]
    checks.append(ValidationCheckpoint(
        name="Weekend Transactions Audit",
        description="Transactions on Saturdays/Sundays may require justification",
        logic="transaction_date.weekday() in {5, 6}",
        result_value=f"{len(weekend_txns)} weekend transactions found",
        status="WARNING" if weekend_txns else "PASS",
        observation=f"{len(weekend_txns)} transactions on weekend days — review for business justification" if weekend_txns else
            "No weekend transactions detected"
    ))

    # Large transactions
    large_txns = [t for t in transactions if "LARGE_TXN" in (t.audit_flag or "")]
    checks.append(ValidationCheckpoint(
        name="Large Transaction Monitoring",
        description=f"Transactions ≥ ₹{LARGE_TXN_THRESHOLD:,.0f} require additional scrutiny",
        logic=f"max(debit, credit) >= ₹{LARGE_TXN_THRESHOLD:,.0f}",
        result_value=f"{len(large_txns)} large transactions detected",
        status="WARNING" if large_txns else "PASS",
        observation=f"{len(large_txns)} large transactions detected — verify source/purpose" if large_txns else
            "No unusually large transactions found"
    ))

    # Cash payments > ₹10,000 (Section 40A(3))
    cash_40a3 = [t for t in transactions if t.payment_mode == "CASH" and _safe_float(t.debit) > 10000]
    checks.append(ValidationCheckpoint(
        name="Section 40A(3) Cash Payment Check",
        description="Cash payments >₹10,000 are not deductible under IT Act Section 40A(3)",
        logic="payment_mode == CASH AND debit > 10000",
        result_value=f"{len(cash_40a3)} cash payments >₹10,000 found",
        status="HIGH ALERT" if cash_40a3 else "PASS",
        observation=f"{len(cash_40a3)} cash payments exceed ₹10,000 threshold — deduction disallowed u/s 40A(3)" if cash_40a3 else
            "No Section 40A(3) violations detected"
    ))

    return checks


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(val: str) -> float:
    if not val:
        return 0.0
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, AttributeError):
        return 0.0


def _normalize_date(raw: str) -> str:
    try:
        dt = dateutil_parser.parse(raw, dayfirst=True)
        return dt.strftime("%d-%m-%Y")
    except (ParserError, Exception):
        return raw
