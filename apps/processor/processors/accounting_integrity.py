"""
Accounting Data Integrity Validators — CA Copilot
Provides double-entry validation, trial balance checks, duplicate voucher
prevention, voucher numbering validation, and ledger balance reconciliation.
"""
from __future__ import annotations
import re
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from loguru import logger
from database.db import get_db_connection

ROUNDING = Decimal('0.01')
TOLERANCE = Decimal('0.02')   # 2-paisa rounding tolerance


def _d(val) -> Decimal:
    """Safe conversion to Decimal."""
    try:
        return Decimal(str(val or 0)).quantize(ROUNDING, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal('0')


# ── 1. Double-Entry Validation ────────────────────────────────────────────

class DoubleEntryResult:
    def __init__(self):
        self.valid: bool = True
        self.total_debit: Decimal = Decimal('0')
        self.total_credit: Decimal = Decimal('0')
        self.difference: Decimal = Decimal('0')
        self.errors: List[str] = []
        self.warnings: List[str] = []


def validate_double_entry(entries: List[Dict[str, Any]]) -> DoubleEntryResult:
    """
    Validate that debits == credits for a set of journal entries.
    Each entry must have 'debit' and 'credit' numeric fields.
    """
    result = DoubleEntryResult()
    for i, entry in enumerate(entries):
        dr = _d(entry.get('debit', 0))
        cr = _d(entry.get('credit', 0))
        if dr > 0 and cr > 0:
            result.warnings.append(
                f"Entry {i+1}: both debit ({dr}) and credit ({cr}) are non-zero — "
                "split into separate lines for clarity."
            )
        result.total_debit += dr
        result.total_credit += cr

    result.difference = abs(result.total_debit - result.total_credit)
    if result.difference > TOLERANCE:
        result.valid = False
        result.errors.append(
            f"Double-entry imbalance: Total Debit ₹{result.total_debit} ≠ "
            f"Total Credit ₹{result.total_credit} (difference ₹{result.difference})"
        )
    logger.debug(
        f"Double-entry check: Dr={result.total_debit} Cr={result.total_credit} "
        f"Diff={result.difference} Valid={result.valid}"
    )
    return result


# ── 2. Trial Balance Verification ────────────────────────────────────────

class TrialBalanceResult:
    def __init__(self):
        self.balanced: bool = True
        self.total_debit: Decimal = Decimal('0')
        self.total_credit: Decimal = Decimal('0')
        self.difference: Decimal = Decimal('0')
        self.ledger_balances: Dict[str, Dict[str, Decimal]] = {}
        self.errors: List[str] = []


def verify_trial_balance(client_id: str) -> TrialBalanceResult:
    """
    Compute trial balance from ledger_entries for a client.
    Returns per-ledger balances and overall balance status.
    """
    result = TrialBalanceResult()
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT ledger_type, SUM(debit) as total_dr, SUM(credit) as total_cr "
            "FROM ledger_entries WHERE client_id = ? GROUP BY ledger_type",
            (client_id,)
        ).fetchall()
        for row in rows:
            dr = _d(row['total_dr'] or 0)
            cr = _d(row['total_cr'] or 0)
            result.total_debit += dr
            result.total_credit += cr
            result.ledger_balances[row['ledger_type']] = {'debit': dr, 'credit': cr}

        result.difference = abs(result.total_debit - result.total_credit)
        if result.difference > TOLERANCE:
            result.balanced = False
            result.errors.append(
                f"Trial balance out of balance by ₹{result.difference}: "
                f"Dr ₹{result.total_debit} vs Cr ₹{result.total_credit}"
            )
    except Exception as e:
        result.balanced = False
        result.errors.append(f"Trial balance query failed: {e}")
        logger.error(f"Trial balance error for client {client_id}: {e}")
    finally:
        conn.close()
    return result


# ── 3. Duplicate Voucher Prevention ──────────────────────────────────────

class DuplicateVoucherResult:
    def __init__(self):
        self.is_duplicate: bool = False
        self.duplicate_ids: List[str] = []
        self.match_reason: str = ""


def check_duplicate_voucher(
    client_id: str,
    voucher_number: str,
    voucher_type: str,
    date: str,
    amount: float,
    exclude_id: Optional[str] = None,
) -> DuplicateVoucherResult:
    """
    Check if a voucher with the same number/type/amount/date already exists.
    Returns duplicate information if found.
    """
    result = DuplicateVoucherResult()
    conn = get_db_connection()
    try:
        # Exact voucher number match
        params: List[Any] = [client_id, voucher_type, voucher_number]
        sql = (
            "SELECT id, voucher_number, date, amount FROM vouchers "
            "WHERE client_id=? AND voucher_type=? AND voucher_number=?"
        )
        if exclude_id:
            sql += " AND id != ?"
            params.append(exclude_id)
        rows = conn.execute(sql, params).fetchall()
        if rows:
            result.is_duplicate = True
            result.duplicate_ids = [r['id'] for r in rows]
            result.match_reason = (
                f"Voucher number '{voucher_number}' already exists for "
                f"{voucher_type} on {rows[0]['date']}"
            )
            return result

        # Fuzzy duplicate: same date + same amount + same type (different number)
        amt = _d(amount)
        tol = TOLERANCE
        rows2 = conn.execute(
            "SELECT id, voucher_number FROM vouchers "
            "WHERE client_id=? AND voucher_type=? AND date=? "
            "AND ABS(CAST(amount AS REAL) - ?) <= ?",
            (client_id, voucher_type, date, float(amt), float(tol))
        ).fetchall()
        if rows2:
            result.is_duplicate = True
            result.duplicate_ids = [r['id'] for r in rows2]
            result.match_reason = (
                f"A {voucher_type} for ₹{amount} on {date} already exists "
                f"(voucher: {rows2[0]['voucher_number']}). Possible duplicate."
            )
    except Exception as e:
        logger.error(f"Duplicate voucher check failed: {e}")
    finally:
        conn.close()
    return result


# ── 4. Voucher Numbering Sequence Validation ─────────────────────────────

class VoucherSequenceResult:
    def __init__(self):
        self.valid: bool = True
        self.gaps: List[str] = []
        self.duplicates: List[str] = []
        self.errors: List[str] = []


def validate_voucher_sequence(client_id: str, voucher_type: str) -> VoucherSequenceResult:
    """
    Check for gaps or duplicates in voucher numbering for a given type.
    Works on purely numeric voucher numbers; skips alphanumeric ones.
    """
    result = VoucherSequenceResult()
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT voucher_number FROM vouchers "
            "WHERE client_id=? AND voucher_type=? ORDER BY voucher_number",
            (client_id, voucher_type)
        ).fetchall()
        numbers = [r['voucher_number'] for r in rows if r['voucher_number']]

        # Extract numeric parts
        numeric = []
        for n in numbers:
            m = re.search(r'(\d+)$', str(n))
            if m:
                numeric.append(int(m.group(1)))

        if len(numeric) < 2:
            return result

        numeric.sort()
        # Check duplicates
        seen = set()
        for n in numeric:
            if n in seen:
                result.duplicates.append(str(n))
                result.valid = False
            seen.add(n)

        # Check gaps
        for i in range(len(numeric) - 1):
            gap = numeric[i+1] - numeric[i]
            if gap > 1:
                result.gaps.append(f"{numeric[i]+1}–{numeric[i+1]-1}")
                result.valid = False

        if result.gaps:
            result.errors.append(
                f"Missing voucher numbers in sequence: {', '.join(result.gaps)}"
            )
        if result.duplicates:
            result.errors.append(
                f"Duplicate voucher numbers: {', '.join(result.duplicates)}"
            )
    except Exception as e:
        result.errors.append(f"Sequence check failed: {e}")
        logger.error(f"Voucher sequence check error: {e}")
    finally:
        conn.close()
    return result


# ── 5. Financial Statement Consistency ───────────────────────────────────

class FinancialConsistencyResult:
    def __init__(self):
        self.consistent: bool = True
        self.checks: List[Dict[str, Any]] = []

    def add_check(self, name: str, passed: bool, detail: str):
        self.checks.append({'name': name, 'passed': passed, 'detail': detail})
        if not passed:
            self.consistent = False


def check_financial_consistency(header_data: Dict[str, Any]) -> FinancialConsistencyResult:
    """
    Validate financial statement arithmetic consistency from invoice/document header.
    Checks: subtotal + tax = grand total, CGST == SGST for intra-state, etc.
    """
    result = FinancialConsistencyResult()

    subtotal = _d(header_data.get('subtotal', 0) or header_data.get('taxable_amount', 0))
    cgst = _d(header_data.get('cgst', 0))
    sgst = _d(header_data.get('sgst', 0))
    igst = _d(header_data.get('igst', 0))
    cess = _d(header_data.get('cess', 0))
    grand_total = _d(header_data.get('grand_total', 0))
    discount = _d(header_data.get('discount', 0))
    freight = _d(header_data.get('freight', 0))
    other = _d(header_data.get('other_charges', 0))

    if grand_total == 0:
        result.add_check('Grand Total Present', False, 'Grand total is missing or zero')
        return result

    # Check: taxable + cgst + sgst + igst + cess + freight + other - discount ≈ grand_total
    computed = subtotal + cgst + sgst + igst + cess + freight + other - discount
    diff = abs(computed - grand_total)
    result.add_check(
        'Arithmetic Consistency',
        diff <= TOLERANCE,
        f'Computed ₹{computed} vs stated ₹{grand_total} (diff ₹{diff})'
    )

    # CGST must equal SGST for intra-state supply
    if cgst > 0 or sgst > 0:
        cgst_sgst_diff = abs(cgst - sgst)
        result.add_check(
            'CGST equals SGST',
            cgst_sgst_diff <= TOLERANCE,
            f'CGST ₹{cgst} vs SGST ₹{sgst} (diff ₹{cgst_sgst_diff})'
        )

    # IGST and CGST/SGST should not both be non-zero
    if igst > 0 and (cgst > 0 or sgst > 0):
        result.add_check(
            'No IGST+CGST/SGST mix',
            False,
            f'Both IGST (₹{igst}) and CGST/SGST (₹{cgst}/₹{sgst}) are non-zero — invalid tax structure'
        )

    return result


# ── 6. Ledger Balance Reconciliation ─────────────────────────────────────

def reconcile_ledger_balance(client_id: str, ledger_type: str) -> Dict[str, Any]:
    """
    Compute running balance for a ledger and flag any discrepancies.
    Returns summary with opening, closing, computed balance, and status.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT date, debit, credit, balance FROM ledger_entries "
            "WHERE client_id=? AND ledger_type=? ORDER BY date, rowid",
            (client_id, ledger_type)
        ).fetchall()

        if not rows:
            return {'status': 'no_data', 'ledger_type': ledger_type}

        discrepancies = []
        running = _d(0)
        for i, row in enumerate(rows):
            dr = _d(row['debit'] or 0)
            cr = _d(row['credit'] or 0)
            stated = _d(row['balance'] or 0)
            running = running + dr - cr
            if stated != 0:
                diff = abs(running - stated)
                if diff > TOLERANCE:
                    discrepancies.append({
                        'row': i + 1,
                        'date': row['date'],
                        'computed_balance': float(running),
                        'stated_balance': float(stated),
                        'difference': float(diff),
                    })

        return {
            'ledger_type': ledger_type,
            'total_rows': len(rows),
            'computed_closing_balance': float(running),
            'discrepancies': discrepancies,
            'status': 'ok' if not discrepancies else 'discrepancies_found',
        }
    except Exception as e:
        logger.error(f"Ledger balance reconciliation failed: {e}")
        return {'status': 'error', 'error': str(e)}
    finally:
        conn.close()
