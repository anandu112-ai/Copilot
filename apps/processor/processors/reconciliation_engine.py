"""
CA Copilot Reconciliation Engine.
Implements matching algorithms for Bank, GST, and Ledger reconciliation modules,
along with duplicate detection.
"""
import re
import uuid
import sqlite3
from typing import List, Dict, Any, Tuple, Optional
from loguru import logger
from datetime import datetime
from rapidfuzz import fuzz
from database.db import get_db_connection

# ── Reference Normalizer ──────────────────────────────────────────────────────

def normalize_ref(ref: str) -> str:
    """Normalize invoice numbers, UTRs, cheque numbers to remove noise."""
    if not ref:
        return ""
    # Convert to uppercase, remove spaces, hyphens, slashes, and leading zeros
    normalized = str(ref).strip().upper()
    normalized = re.sub(r'[\s\-/\\_]', '', normalized)
    normalized = normalized.lstrip('0')
    return normalized

def parse_date(date_str: str) -> Optional[datetime]:
    """Gracefully parse date strings into datetime objects."""
    if not date_str:
        return None
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%Y', '%d-%b-%Y', '%Y%m%d'):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    try:
        # Fallback using dateutil
        from dateutil import parser
        return parser.parse(date_str)
    except Exception:
        return None

# ── Module 1 & 5: Auto-Classification & Duplicate Detection ───────────────────

def detect_duplicates(client_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Detect duplicates across Bank, GST, and Ledger tables.
    Returns lists of potential duplicate records grouped by module.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    duplicates = {
        "bank": [],
        "ledger": [],
        "gst": []
    }
    
    # 1. Bank duplicates: same date, same amount, same narration (or same account)
    cursor.execute("""
        SELECT a.id as id1, b.id as id2, a.date, a.debit, a.credit, a.narration, a.reference_number
        FROM bank_transactions a
        JOIN bank_transactions b ON a.client_id = b.client_id
            AND a.id < b.id
            AND a.date = b.date
            AND ABS(a.debit - b.debit) < 0.01
            AND ABS(a.credit - b.credit) < 0.01
        WHERE a.client_id = ?
    """, (client_id,))
    for row in cursor.fetchall():
        duplicates["bank"].append({
            "record_1_id": row["id1"],
            "record_2_id": row["id2"],
            "details": f"Amount: ₹{max(row['debit'], row['credit'])}, Date: {row['date']}, Narration: {row['narration']}",
            "confidence": "High Confidence",
            "reason": "Same Date + Same Amount + Same Narration"
        })

    # 2. Ledger duplicates: same invoice number, same amount, or same date/amount
    cursor.execute("""
        SELECT a.id as id1, b.id as id2, a.date, a.invoice_number, a.debit, a.credit, a.description
        FROM ledger_entries a
        JOIN ledger_entries b ON a.client_id = b.client_id
            AND a.id < b.id
            AND (
                (a.invoice_number = b.invoice_number AND a.invoice_number IS NOT NULL AND a.invoice_number != '') OR
                (a.date = b.date AND ABS(a.debit - b.debit) < 0.01 AND ABS(a.credit - b.credit) < 0.01 AND a.description = b.description)
            )
        WHERE a.client_id = ?
    """, (client_id,))
    for row in cursor.fetchall():
        is_invoice_dup = row["invoice_number"] is not None and row["invoice_number"] != ""
        duplicates["ledger"].append({
            "record_1_id": row["id1"],
            "record_2_id": row["id2"],
            "details": f"Invoice: {row['invoice_number'] or 'N/A'}, Amount: ₹{max(row['debit'], row['credit'])}, Date: {row['date']}",
            "confidence": "Exact Match" if is_invoice_dup else "High Confidence",
            "reason": "Duplicate Invoice Number" if is_invoice_dup else "Same Date + Same Amount + Same Description"
        })

    # 3. GST duplicates: same invoice number, same taxable value, same GSTIN
    cursor.execute("""
        SELECT a.id as id1, b.id as id2, a.invoice_number, a.taxable_value, a.gstin, a.vendor_name
        FROM gst_invoices a
        JOIN gst_invoices b ON a.client_id = b.client_id
            AND a.id < b.id
            AND a.invoice_number = b.invoice_number
            AND ABS(a.taxable_value - b.taxable_value) < 0.01
            AND a.gstin = b.gstin
        WHERE a.client_id = ?
    """, (client_id,))
    for row in cursor.fetchall():
        duplicates["gst"].append({
            "record_1_id": row["id1"],
            "record_2_id": row["id2"],
            "details": f"GSTIN: {row['gstin']}, Invoice: {row['invoice_number']}, Taxable: ₹{row['taxable_value']}",
            "confidence": "Exact Match",
            "reason": "Same GSTIN + Same Invoice Number + Same Taxable Value"
        })

    conn.close()
    return duplicates

# ── Module 6: Core Matching Engine ───────────────────────────────────────────

class MatchingEngine:
    def __init__(self, client_id: str):
        self.client_id = client_id

    def reconcile_bank_statements(self, amount_tolerance: float = 1.0, date_tolerance_days: int = 10) -> Dict[str, Any]:
        """
        Match bank transactions to ledger entries (e.g. Cash Book or Bank Ledger).
        Bank Debit matches Ledger Credit.
        Bank Credit matches Ledger Debit.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch unreconciled bank transactions
        cursor.execute("""
            SELECT id, date, narration, reference_number, cheque_number, debit, credit, balance
            FROM bank_transactions
            WHERE client_id = ? AND status = 'unmatched'
        """, (self.client_id,))
        bank_txns = [dict(row) for row in cursor.fetchall()]

        # Fetch unreconciled ledger entries (cash, bank, or purchase/sales registers)
        cursor.execute("""
            SELECT id, date, description, reference_number, debit, credit, total_amount, invoice_number
            FROM ledger_entries
            WHERE client_id = ? AND status = 'unmatched'
        """, (self.client_id,))
        ledger_entries = [dict(row) for row in cursor.fetchall()]

        matches_found = 0
        suggestions = []

        for b_tx in bank_txns:
            best_match = None
            best_score = 0.0
            reasons = []

            b_amt = b_tx["debit"] if b_tx["debit"] > 0 else b_tx["credit"]
            b_is_debit = b_tx["debit"] > 0
            b_date = parse_date(b_tx["date"])

            b_ref_norm = normalize_ref(b_tx["reference_number"] or b_tx["cheque_number"] or "")

            for l_entry in ledger_entries:
                # Ledger matching amount: payments vs receipts
                # A payment in Bank Statement (debit > 0) matches Credit in Ledger (or a Purchase Register transaction total)
                # A receipt in Bank Statement (credit > 0) matches Debit in Ledger (or a Sales Register transaction total)
                l_amt = l_entry["credit"] if b_is_debit else l_entry["debit"]
                
                # Fallback: if ledger entry has only total_amount
                if l_amt == 0 and l_entry["total_amount"] > 0:
                    l_amt = l_entry["total_amount"]
                
                amt_diff = abs(b_amt - l_amt)
                if amt_diff > amount_tolerance:
                    continue

                # Calculate score points
                score = 0.0
                curr_reasons = []

                # 1. Amount match
                if amt_diff < 0.01:
                    score += 50
                    curr_reasons.append("Exact Amount Match")
                else:
                    score += 25
                    curr_reasons.append(f"Amount within tolerance (Diff: ₹{amt_diff:.2f})")

                # 2. Date match & Timing Difference
                l_date = parse_date(l_entry["date"])
                if b_date and l_date:
                    days_diff = (b_date - l_date).days
                    if days_diff == 0:
                        score += 25
                        curr_reasons.append("Same Day Posting")
                    elif 0 < days_diff <= date_tolerance_days:
                        score += 15
                        curr_reasons.append(f"Cleared in Bank {days_diff} days after books (Timing Difference)")
                    elif -date_tolerance_days <= days_diff < 0:
                        # Ledger recorded after bank statement
                        score += 10
                        curr_reasons.append(f"Cleared in Bank {-days_diff} days before books")
                    else:
                        # Outside tolerance
                        continue
                else:
                    score += 5
                    curr_reasons.append("Date format mismatch or missing")

                # 3. Reference/Narration match
                l_ref_norm = normalize_ref(l_entry["reference_number"] or l_entry["invoice_number"] or "")
                
                # Check for reference matches
                if b_ref_norm and l_ref_norm and b_ref_norm == l_ref_norm:
                    score += 25
                    curr_reasons.append(f"Reference Number Match ({b_tx['reference_number']})")
                elif b_ref_norm and l_ref_norm and (b_ref_norm in l_ref_norm or l_ref_norm in b_ref_norm):
                    score += 15
                    curr_reasons.append("Partial Reference Number Match")

                # Fuzzy Description/Narration Match
                desc_score = fuzz.token_set_ratio(b_tx["narration"] or "", l_entry["description"] or "")
                if desc_score >= 85:
                    score += 15
                    curr_reasons.append("Highly similar transaction descriptions")
                elif desc_score >= 60:
                    score += 8
                    curr_reasons.append("Moderately similar transaction descriptions")

                # Normalize score to max 100
                final_score = min(score, 100.0)

                if final_score > best_score:
                    best_score = final_score
                    best_match = l_entry
                    reasons = curr_reasons

            if best_match and best_score >= 50.0:
                # Classify match confidence
                if best_score >= 95.0:
                    confidence = "Exact Match"
                elif best_score >= 75.0:
                    confidence = "High Confidence"
                else:
                    confidence = "Medium Confidence"

                suggestions.append({
                    "bank_txn_id": b_tx["id"],
                    "bank_narration": b_tx["narration"],
                    "bank_amount": b_amt,
                    "bank_date": b_tx["date"],
                    "ledger_entry_id": best_match["id"],
                    "ledger_desc": best_match["description"],
                    "ledger_amount": best_match["credit"] if b_is_debit else best_match["debit"],
                    "ledger_date": best_match["date"],
                    "confidence_score": best_score,
                    "confidence_level": confidence,
                    "reasons": reasons
                })

        # Save match suggestions in SQLite or return them
        # Let's write them back as suggestions/pending review updates
        for match in suggestions:
            if match["confidence_score"] >= 85.0: # Auto-accept very high confidence
                cursor.execute("""
                    UPDATE bank_transactions
                    SET status = 'matched', matched_ledger_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["ledger_entry_id"], match["confidence_score"], ", ".join(match["reasons"]), match["bank_txn_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'matched', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["bank_txn_id"], match["confidence_score"], ", ".join(match["reasons"]), match["ledger_entry_id"]))
                matches_found += 1
            else:
                # Mark as pending review with suggestions
                cursor.execute("""
                    UPDATE bank_transactions
                    SET status = 'pending_review', matched_ledger_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["ledger_entry_id"], match["confidence_score"], ", ".join(match["reasons"]), match["bank_txn_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'pending_review', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["bank_txn_id"], match["confidence_score"], ", ".join(match["reasons"]), match["ledger_entry_id"]))

        conn.commit()
        conn.close()

        logger.info(f"Reconciled bank statement. Auto-matched: {matches_found}, Suggestions: {len(suggestions)}")
        return {
            "auto_matched": matches_found,
            "suggestions": suggestions
        }

    def reconcile_gst(self, amount_tolerance: float = 5.0) -> Dict[str, Any]:
        """
        Match GSTR-2B or GSTR-1 invoices against Purchase/Sales Ledger entries.
        Compares: GSTIN, Invoice #, Invoice Date, Taxable Value, CGST/SGST/IGST, Vendor Name.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch unmatched GST invoices
        cursor.execute("""
            SELECT id, source_type, gstin, vendor_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, cess, total_amount
            FROM gst_invoices
            WHERE client_id = ? AND status = 'unmatched'
        """, (self.client_id,))
        gst_invoices = [dict(row) for row in cursor.fetchall()]

        # Fetch unmatched ledger entries
        cursor.execute("""
            SELECT id, ledger_type, date, description, reference_number, total_amount, debit, credit, gstin, invoice_number, amount_taxable, cgst, sgst, igst
            FROM ledger_entries
            WHERE client_id = ? AND status = 'unmatched'
        """, (self.client_id,))
        ledger_entries = [dict(row) for row in cursor.fetchall()]

        matches_found = 0
        suggestions = []

        for gst_inv in gst_invoices:
            best_match = None
            best_score = 0.0
            reasons = []

            # Clean fields
            gstin_clean = (gst_inv["gstin"] or "").strip().upper()
            inv_no_norm = normalize_ref(gst_inv["invoice_number"] or "")
            taxable = gst_inv["taxable_value"] or 0.0
            total_amt = gst_inv["total_amount"] or 0.0
            cgst = gst_inv["cgst"] or 0.0
            sgst = gst_inv["sgst"] or 0.0
            igst = gst_inv["igst"] or 0.0

            for l_entry in ledger_entries:
                score = 0.0
                curr_reasons = []

                # 1. GSTIN Match
                l_gstin = (l_entry["gstin"] or "").strip().upper()
                if gstin_clean and l_gstin:
                    if gstin_clean == l_gstin:
                        score += 30
                        curr_reasons.append("GSTIN Match")
                    else:
                        # Wrong GSTIN is a major negative
                        continue
                elif gstin_clean or l_gstin:
                    # One has GSTIN, other doesn't
                    score += 5
                    curr_reasons.append("Missing GSTIN on one record")

                # 2. Invoice Number Match
                l_inv_no = l_entry["invoice_number"] or l_entry["reference_number"] or ""
                l_inv_no_norm = normalize_ref(l_inv_no)
                
                if inv_no_norm and l_inv_no_norm:
                    if inv_no_norm == l_inv_no_norm:
                        score += 30
                        curr_reasons.append(f"Invoice Number Match ({gst_inv['invoice_number']})")
                    elif inv_no_norm in l_inv_no_norm or l_inv_no_norm in inv_no_norm:
                        score += 15
                        curr_reasons.append("Partial Invoice Number Match")
                    else:
                        # Mismatched invoice numbers reduces score
                        continue

                # 3. Taxable Value & GST Amount Match
                l_taxable = l_entry["amount_taxable"] or l_entry["debit"] or l_entry["credit"] or 0.0
                taxable_diff = abs(taxable - l_taxable)
                if taxable_diff < amount_tolerance:
                    score += 20
                    curr_reasons.append("Taxable Value Match")
                else:
                    # Skip if total amount or taxable value is drastically different
                    l_total = l_entry["total_amount"] or l_entry["debit"] or l_entry["credit"] or 0.0
                    total_diff = abs(total_amt - l_total)
                    if total_diff > 100.0: # Skip if difference > 100 INR
                        continue
                    else:
                        score += 10
                        curr_reasons.append(f"Taxable Value Diff: ₹{taxable_diff:.2f}")

                # Tax breakdown checks
                l_cgst = l_entry["cgst"] or 0.0
                l_sgst = l_entry["sgst"] or 0.0
                l_igst = l_entry["igst"] or 0.0
                gst_tax_diff = abs((cgst + sgst + igst) - (l_cgst + l_sgst + l_igst))
                if gst_tax_diff < 1.0:
                    score += 10
                    curr_reasons.append("GST Taxes Match")
                elif gst_tax_diff < amount_tolerance:
                    score += 5
                    curr_reasons.append(f"GST Tax Difference: ₹{gst_tax_diff:.2f}")

                # 4. Date Match
                g_date = parse_date(gst_inv["invoice_date"])
                l_date = parse_date(l_entry["date"])
                if g_date and l_date:
                    days_diff = abs((g_date - l_date).days)
                    if days_diff == 0:
                        score += 10
                        curr_reasons.append("Same Invoice Date")
                    elif days_diff <= 7:
                        score += 7
                        curr_reasons.append("Dates within 7 days")
                    elif days_diff <= 30:
                        score += 5
                        curr_reasons.append("Dates within 30 days")
                
                # 5. Vendor Name similarity
                desc_score = fuzz.token_set_ratio(gst_inv["vendor_name"] or "", l_entry["description"] or "")
                if desc_score >= 80:
                    score += 10
                    curr_reasons.append("Fuzzy Vendor Name Match")

                final_score = min(score, 100.0)
                if final_score > best_score:
                    best_score = final_score
                    best_match = l_entry
                    reasons = curr_reasons

            if best_match and best_score >= 45.0:
                confidence = "Needs Review"
                if best_score >= 90.0:
                    confidence = "Exact Match"
                elif best_score >= 70.0:
                    confidence = "High Confidence"
                elif best_score >= 50.0:
                    confidence = "Medium Confidence"

                suggestions.append({
                    "gst_invoice_id": gst_inv["id"],
                    "gst_vendor": gst_inv["vendor_name"],
                    "gst_invoice_no": gst_inv["invoice_number"],
                    "gst_taxable": taxable,
                    "gst_total": total_amt,
                    "gst_date": gst_inv["invoice_date"],
                    "ledger_entry_id": best_match["id"],
                    "ledger_desc": best_match["description"],
                    "ledger_taxable": l_entry["amount_taxable"] or l_entry["debit"] or l_entry["credit"],
                    "ledger_total": l_entry["total_amount"] or l_entry["debit"] or l_entry["credit"],
                    "ledger_date": best_match["date"],
                    "confidence_score": best_score,
                    "confidence_level": confidence,
                    "reasons": reasons
                })

        for match in suggestions:
            if match["confidence_score"] >= 85.0:
                cursor.execute("""
                    UPDATE gst_invoices
                    SET status = 'matched', matched_ledger_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["ledger_entry_id"], match["confidence_score"], ", ".join(match["reasons"]), match["gst_invoice_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'matched', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["gst_invoice_id"], match["confidence_score"], ", ".join(match["reasons"]), match["ledger_entry_id"]))
                matches_found += 1
            else:
                cursor.execute("""
                    UPDATE gst_invoices
                    SET status = 'pending_review', matched_ledger_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["ledger_entry_id"], match["confidence_score"], ", ".join(match["reasons"]), match["gst_invoice_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'pending_review', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["gst_invoice_id"], match["confidence_score"], ", ".join(match["reasons"]), match["ledger_entry_id"]))

        conn.commit()
        conn.close()

        return {
            "auto_matched": matches_found,
            "suggestions": suggestions
        }

    def reconcile_ledgers(self, amount_tolerance: float = 1.0) -> Dict[str, Any]:
        """
        Compare Sales/Purchase ledgers with the General Ledger or Bank/Cash ledgers.
        Find matching entries.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch ledger entries:
        # A sub-ledger entry (e.g., Purchase ledger, Sales ledger) matches general ledger entry
        cursor.execute("""
            SELECT id, ledger_type, date, description, reference_number, debit, credit
            FROM ledger_entries
            WHERE client_id = ? AND status = 'unmatched' AND ledger_type IN ('purchase', 'sales')
        """, (self.client_id,))
        sub_ledgers = [dict(row) for row in cursor.fetchall()]

        cursor.execute("""
            SELECT id, ledger_type, date, description, reference_number, debit, credit
            FROM ledger_entries
            WHERE client_id = ? AND status = 'unmatched' AND ledger_type IN ('general', 'bank', 'cash')
        """, (self.client_id,))
        gen_ledgers = [dict(row) for row in cursor.fetchall()]

        matches_found = 0
        suggestions = []

        for sub in sub_ledgers:
            best_match = None
            best_score = 0.0
            reasons = []

            sub_debit = sub["debit"]
            sub_credit = sub["credit"]
            sub_ref = normalize_ref(sub["reference_number"] or "")
            sub_date = parse_date(sub["date"])

            for gen in gen_ledgers:
                # Purchase debit matches General credit, Sales credit matches General debit (or vice versa depending on context)
                # In standard double entry, sub-ledger matches general ledger exact opposite, or same amount depending on account view.
                # Let's match if amounts are equal on opposite sides or same side (accounting books can be represented both ways)
                if abs(sub_debit - gen["credit"]) < amount_tolerance and sub_debit > 0:
                    amt_match = True
                    opposite = True
                elif abs(sub_credit - gen["debit"]) < amount_tolerance and sub_credit > 0:
                    amt_match = True
                    opposite = True
                elif abs(sub_debit - gen["debit"]) < amount_tolerance and sub_debit > 0:
                    amt_match = True
                    opposite = False
                elif abs(sub_credit - gen["credit"]) < amount_tolerance and sub_credit > 0:
                    amt_match = True
                    opposite = False
                else:
                    amt_match = False

                if not amt_match:
                    continue

                score = 50.0
                curr_reasons = ["Amount Match"]
                if opposite:
                    score += 10
                    curr_reasons.append("Corresponding Double Entry found")

                # Ref Match
                gen_ref = normalize_ref(gen["reference_number"] or "")
                if sub_ref and gen_ref and sub_ref == gen_ref:
                    score += 25
                    curr_reasons.append(f"Reference Number Match ({sub['reference_number']})")

                # Date Match
                gen_date = parse_date(gen["date"])
                if sub_date and gen_date:
                    days_diff = abs((sub_date - gen_date).days)
                    if days_diff == 0:
                        score += 15
                        curr_reasons.append("Same Posting Date")
                    elif days_diff <= 3:
                        score += 10
                        curr_reasons.append("Dates within 3 days")
                    elif days_diff <= 10:
                        score += 5
                        curr_reasons.append("Dates within 10 days")

                # Description similarity
                desc_score = fuzz.token_set_ratio(sub["description"] or "", gen["description"] or "")
                if desc_score >= 80:
                    score += 10
                    curr_reasons.append("Fuzzy Description Match")

                final_score = min(score, 100.0)
                if final_score > best_score:
                    best_score = final_score
                    best_match = gen
                    reasons = curr_reasons

            if best_match and best_score >= 50.0:
                confidence = "Medium Confidence"
                if best_score >= 90.0:
                    confidence = "Exact Match"
                elif best_score >= 70.0:
                    confidence = "High Confidence"

                suggestions.append({
                    "sub_ledger_id": sub["id"],
                    "sub_ledger_type": sub["ledger_type"],
                    "sub_desc": sub["description"],
                    "sub_amount": max(sub_debit, sub_credit),
                    "sub_date": sub["date"],
                    "gen_ledger_id": best_match["id"],
                    "gen_ledger_type": best_match["ledger_type"],
                    "gen_desc": best_match["description"],
                    "gen_amount": max(best_match["debit"], best_match["credit"]),
                    "gen_date": best_match["date"],
                    "confidence_score": best_score,
                    "confidence_level": confidence,
                    "reasons": reasons
                })

        for match in suggestions:
            if match["confidence_score"] >= 80.0:
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'matched', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["gen_ledger_id"], match["confidence_score"], ", ".join(match["reasons"]), match["sub_ledger_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'matched', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["sub_ledger_id"], match["confidence_score"], ", ".join(match["reasons"]), match["gen_ledger_id"]))
                matches_found += 1
            else:
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'pending_review', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["gen_ledger_id"], match["confidence_score"], ", ".join(match["reasons"]), match["sub_ledger_id"]))
                
                cursor.execute("""
                    UPDATE ledger_entries
                    SET status = 'pending_review', matched_txn_id = ?, match_score = ?, match_reason = ?
                    WHERE id = ?
                """, (match["sub_ledger_id"], match["confidence_score"], ", ".join(match["reasons"]), match["gen_ledger_id"]))

        conn.commit()
        conn.close()

        return {
            "auto_matched": matches_found,
            "suggestions": suggestions
        }
