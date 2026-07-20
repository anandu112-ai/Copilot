"""
CA Copilot AI Audit Intelligence & Risk Analysis Engine.
Analyzes transactions, ledgers, bank statements, and GST records to generate explainable findings.
Supports custom user-defined rules.
"""
import uuid
import json
import sqlite3
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from loguru import logger
from database.db import get_db_connection
from processors.reconciliation_engine import normalize_ref, parse_date

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$")

class AuditIntelligenceEngine:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.findings = []
        self.rules = []
        self._load_rules()

    def _load_rules(self):
        """Load enabled custom rules from DB."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_rules WHERE is_enabled = 1")
        self.rules = [dict(row) for row in cursor.fetchall()]
        conn.close()

    def run_all_audits(self) -> int:
        """
        Run the complete AI audit suite.
        Clears old findings for the client and regenerates.
        """
        logger.info(f"Running full AI Audit Intelligence for client: {self.client_id}")
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Clear old audit findings for client
        cursor.execute("DELETE FROM audit_findings WHERE client_id = ?", (self.client_id,))
        conn.commit()

        self.findings = []

        # 2. Run core audit intelligence modules
        self._audit_transaction_anomalies(conn)
        self._audit_gst_compliance(conn)
        self._audit_bank_vouchers(conn)
        self._audit_ledger_consistency(conn)
        self._audit_custom_learning_rules(conn)

        # 3. Save findings to DB
        inserted = 0
        for f in self.findings:
            f_id = f.get("id") or str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO audit_findings (
                    id, client_id, title, category, severity, status, description,
                    evidence, legal_reference, recommended_action, impact_amount, risk_score
                ) VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?)
            """, (
                f_id, self.client_id, f["title"], f["category"], f["severity"],
                f["description"], f["evidence"], f["legal_reference"],
                f["recommended_action"], f["impact_amount"], f["risk_score"]
            ))
            inserted += 1

        conn.commit()
        conn.close()
        logger.info(f"Audit Intelligence run complete. Generated {inserted} findings.")
        return inserted

    # ── Module 3: Transaction Anomaly Detection ──────────────────────────────────

    def _audit_transaction_anomalies(self, conn: sqlite3.Connection):
        cursor = conn.cursor()

        # Fetch bank transactions for anomaly checks
        cursor.execute("""
            SELECT id, date, narration, debit, credit, payment_mode, reference_number
            FROM bank_transactions
            WHERE client_id = ?
        """, (self.client_id,))
        bank_txns = cursor.fetchall()

        # Fetch ledger entries
        cursor.execute("""
            SELECT id, date, description, debit, credit, invoice_number, reference_number
            FROM ledger_entries
            WHERE client_id = ?
        """, (self.client_id,))
        ledger_entries = cursor.fetchall()

        # 1. Weekend Transactions
        for row in bank_txns:
            dt = parse_date(row["date"])
            if dt and dt.weekday() in (5, 6): # Saturday/Sunday
                day_name = "Saturday" if dt.weekday() == 5 else "Sunday"
                amt = row["debit"] if row["debit"] > 0 else row["credit"]
                if amt > 25000: # Threshold for anomalies
                    self.findings.append({
                        "title": f"High Value Weekend Transaction ({day_name})",
                        "category": "Transaction Anomaly",
                        "severity": "Low",
                        "description": f"A bank transaction of ₹{amt:,.2f} was posted on {row['date']} ({day_name}). Weekend banking activities are unusual for core operations.",
                        "evidence": f"Narration: {row['narration']} | Mode: {row['payment_mode']}",
                        "legal_reference": "Standard Audit Practice (Anomalous Activity Monitoring)",
                        "recommended_action": "Verify if the business was open and if this transaction matches operational records.",
                        "impact_amount": amt,
                        "risk_score": 40.0
                    })

        # 2. Round Number Transactions
        for row in ledger_entries:
            amt = row["debit"] if row["debit"] > 0 else row["credit"]
            # Flag round numbers > 10,000 ending in triple zeros
            if amt >= 10000 and amt % 1000 == 0:
                self.findings.append({
                    "title": "Suspicious Round Number Booking",
                    "category": "Transaction Anomaly",
                    "severity": "Medium",
                    "description": f"Voucher recorded with an exact round amount of ₹{amt:,.2f} on {row['date']}. Round numbers often indicate estimations or lack of supporting invoices.",
                    "evidence": f"Description: {row['description']} | Invoice Ref: {row['invoice_number'] or row['reference_number']}",
                    "legal_reference": "Clause 21 of Form 3CD (Verification of expenditure credentials)",
                    "recommended_action": "Examine the original vendor bill to verify if the actual taxable + tax total matches this exact round amount.",
                    "impact_amount": amt,
                    "risk_score": 60.0
                })

        # 3. Large Cash Transactions (Section 40A(3) Income Tax Act)
        # Checks if single payment in cash exceeds 10,000 INR
        for row in ledger_entries:
            desc = str(row["description"]).upper()
            amt = row["debit"] if row["debit"] > 0 else row["credit"]
            if amt > 10000 and ("CASH" in desc or "PETTY CASH" in desc):
                self.findings.append({
                    "title": "Section 40A(3) Cash Payment Violation",
                    "category": "Compliance Risk",
                    "severity": "Critical",
                    "description": f"Cash booking of ₹{amt:,.2f} recorded for contractor/vendor payment. Payments exceeding ₹10,000 in cash are disallowed under Section 40A(3).",
                    "evidence": f"Description: {row['description']} | Date: {row['date']}",
                    "legal_reference": "Section 40A(3) of the Income Tax Act 1961",
                    "recommended_action": "Disallow this expense in Form 3CD (Tax Audit Report). Ensure future transactions use UPI/NEFT.",
                    "impact_amount": amt,
                    "risk_score": 95.0
                })

        # 4. Split Transactions (Avoid Section 40A(3) by splitting vouchers)
        # Group ledger entries by date + description/invoice and sum
        cursor.execute("""
            SELECT date, description, sum(debit) as tot_debit, count(*) as cnt
            FROM ledger_entries
            WHERE client_id = ? AND debit > 0
            GROUP BY date, description
            HAVING cnt > 1 AND tot_debit > 10000
        """, (self.client_id,))
        for row in cursor.fetchall():
            self.findings.append({
                "title": "Potential Split Transaction Discovered",
                "category": "Transaction Anomaly",
                "severity": "High",
                "description": f"Discovered {row['cnt']} separate debit entries under the description '{row['description']}' on the same day ({row['date']}) totaling ₹{row['tot_debit']:,.2f}. This may indicate an attempt to bypass cash thresholds.",
                "evidence": f"Total Split Amount: ₹{row['tot_debit']:,.2f} across {row['cnt']} vouchers",
                "legal_reference": "Anti-avoidance provisions of Section 40A(3)",
                "recommended_action": "Review voucher details to see if these represent separate business transactions or a single split invoice.",
                "impact_amount": row["tot_debit"],
                "risk_score": 80.0
            })

    # ── Module 4: GST Audit Intelligence ──────────────────────────────────────────

    def _audit_gst_compliance(self, conn: sqlite3.Connection):
        cursor = conn.cursor()

        # Fetch GST invoices
        cursor.execute("""
            SELECT id, gstin, vendor_name, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, total_amount, source_type
            FROM gst_invoices
            WHERE client_id = ?
        """, (self.client_id,))
        gst_invoices = cursor.fetchall()

        for row in gst_invoices:
            # 1. Invalid GSTIN Format
            gstin = str(row["gstin"] or "").strip()
            if gstin and not GSTIN_RE.match(gstin):
                self.findings.append({
                    "title": f"Invalid GSTIN Format: {gstin}",
                    "category": "GST Audit",
                    "severity": "High",
                    "description": f"GSTIN '{gstin}' for vendor '{row['vendor_name']}' does not match the 15-character statutory GSTIN format.",
                    "evidence": f"Invoice: {row['invoice_number']} | Date: {row['invoice_date']}",
                    "legal_reference": "GST Rule 46 — Mandatory Invoice Specifications",
                    "recommended_action": "Request correct GSTIN from the counterparty and verify on the GST Portal.",
                    "impact_amount": row["total_amount"],
                    "risk_score": 85.0
                })

            # 2. Tax Calculation / Mismatch Checks
            taxable = row["taxable_value"]
            calc_tax = row["cgst"] + row["sgst"] + row["igst"]
            grand_total = row["total_amount"]
            
            # Warn if arithmetic does not add up
            if abs((taxable + calc_tax) - grand_total) > 5.0: # allow rounding
                self.findings.append({
                    "title": "GST Invoice Arithmetic Mismatch",
                    "category": "GST Audit",
                    "severity": "Medium",
                    "description": f"Sum of Taxable Value (₹{taxable:,.2f}) and GST tax components (₹{calc_tax:,.2f}) does not match the Grand Total (₹{grand_total:,.2f}).",
                    "evidence": f"Invoice: {row['invoice_number']} | CGST: {row['cgst']} | SGST: {row['sgst']} | IGST: {row['igst']}",
                    "legal_reference": "GST Section 33 — Duty to indicate tax in invoice",
                    "recommended_action": "Confirm calculation with vendor. Verify details in physical bill.",
                    "impact_amount": abs((taxable + calc_tax) - grand_total),
                    "risk_score": 55.0
                })

        # 3. Blocked ITC Indicators (Section 17(5))
        # Search GSTR-2B or purchase register for keywords like "Car", "Vehicle", "Hotel", "Food", "Catering", "Gym"
        cursor.execute("""
            SELECT id, description, debit, credit, total_amount, invoice_number
            FROM ledger_entries
            WHERE client_id = ? AND ledger_type = 'purchase'
        """, (self.client_id,))
        purchases = cursor.fetchall()
        
        blocked_keywords = ["MOTOR VEHICLE", "CAR", "RESTAURANT", "CATERING", "FOOD", "CLUB", "GYM", "INSURANCE MOTOR", "CAB"]
        for p in purchases:
            desc = str(p["description"]).upper()
            found_kw = next((kw for kw in blocked_keywords if kw in desc), None)
            if found_kw:
                amt = p["total_amount"] or p["debit"] or p["credit"]
                self.findings.append({
                    "title": f"Blocked ITC Claim Indicator ({found_kw})",
                    "category": "GST Audit",
                    "severity": "Critical",
                    "description": f"Discovered purchase voucher for '{p['description']}' yielding a potential blocked credit claim under Section 17(5).",
                    "evidence": f"Voucher: {p['id'][:8]}... | Value: ₹{amt:,.2f}",
                    "legal_reference": "Section 17(5) of the CGST Act 2017 (Blocked Credits list)",
                    "recommended_action": "Exclude this entry from the eligible ITC pool in GSTR-3B filings to avoid audits and interest penalties.",
                    "impact_amount": amt,
                    "risk_score": 90.0
                })

    # ── Module 5: Bank Audit ──────────────────────────────────────────────────────

    def _audit_bank_vouchers(self, conn: sqlite3.Connection):
        cursor = conn.cursor()

        # 1. Unmatched Bank statement Entries
        cursor.execute("""
            SELECT count(*), sum(case when debit > 0 then debit else credit end)
            FROM bank_transactions
            WHERE client_id = ? AND status = 'unmatched'
        """, (self.client_id,))
        unmatched_cnt, unmatched_sum = cursor.fetchone()
        if unmatched_cnt and unmatched_cnt > 0:
            self.findings.append({
                "title": f"Unmatched Bank Transactions ({unmatched_cnt} items)",
                "category": "Bank Audit",
                "severity": "Medium",
                "description": f"There are {unmatched_cnt} unmatched withdrawals/deposits in the bank statement totaling ₹{unmatched_sum or 0:,.2f} with no matching entry in Tally general ledgers.",
                "evidence": f"Pending bank reconciliations: {unmatched_cnt} vouchers outstanding",
                "legal_reference": "Standard Internal Control Guidelines (Bank Reconciliations)",
                "recommended_action": "Reconcile these transactions in the bank review workspace or pass adjustment journal entries in the ledger.",
                "impact_amount": unmatched_sum or 0.0,
                "risk_score": 65.0
            })

        # 2. Suspicious Cash Deposits / Withdrawals (> ₹50,000 standard cash audit)
        cursor.execute("""
            SELECT id, date, narration, debit, credit
            FROM bank_transactions
            WHERE client_id = ? AND (debit > 50000 OR credit > 50000) AND (narration LIKE '%CASH%' OR narration LIKE '%DEP%')
        """, (self.client_id,))
        for row in cursor.fetchall():
            amt = row["debit"] if row["debit"] > 0 else row["credit"]
            is_dep = row["credit"] > 0
            self.findings.append({
                "title": f"Suspicious Cash {'Deposit' if is_dep else 'Withdrawal'} (> ₹50,000)",
                "category": "Bank Audit",
                "severity": "High",
                "description": f"Cash txn of ₹{amt:,.2f} posted on {row['date']}. Transactions above ₹50,000 trigger PAN/regulatory flags.",
                "evidence": f"Narration: {row['narration']}",
                "legal_reference": "Income Tax Rules (High Value Cash reporting mandates)",
                "recommended_action": "Verify bank pay-in slip, cash registers, and identify the depositor or beneficiary details.",
                "impact_amount": amt,
                "risk_score": 75.0
            })

    # ── Module 6: Ledger Audit ────────────────────────────────────────────────────

    def _audit_ledger_consistency(self, conn: sqlite3.Connection):
        cursor = conn.cursor()

        # 1. Suspense Account Activity
        cursor.execute("""
            SELECT id, description, debit, credit, date, ledger_type
            FROM ledger_entries
            WHERE client_id = ? AND (description LIKE '%SUSPENSE%' OR description LIKE '%UNCLASSIFIED%')
        """, (self.client_id,))
        for row in cursor.fetchall():
            amt = row["debit"] if row["debit"] > 0 else row["credit"]
            self.findings.append({
                "title": "Suspense Account Posting Alert",
                "category": "Ledger Audit",
                "severity": "High",
                "description": f"Voucher posted to 'Suspense Account' on {row['date']} for ₹{amt:,.2f}. Suspense bookings hide balance sheet imbalances or unclassified expenses.",
                "evidence": f"Entry Description: {row['description']}",
                "legal_reference": "Companies Act Schedule III (Disclosure compliance)",
                "recommended_action": "Identify the actual party ledger and re-allocate this suspense balance before closing books.",
                "impact_amount": amt,
                "risk_score": 80.0
            })

        # 2. Negative Balances
        cursor.execute("""
            SELECT ledger_type, sum(credit - debit) as bal
            FROM ledger_entries
            WHERE client_id = ?
            GROUP BY ledger_type
            HAVING (ledger_type = 'cash' AND bal < 0) OR (ledger_type = 'bank' AND bal < 0)
        """, (self.client_id,))
        for row in cursor.fetchall():
            self.findings.append({
                "title": f"Negative Ledger Balance: {row['ledger_type'].upper()}",
                "category": "Ledger Audit",
                "severity": "Critical",
                "description": f"The cash/bank ledger book has calculated a negative closing balance of ₹{abs(row['bal']):,.2f}. Offline cash balances cannot legally drop below zero.",
                "evidence": f"Calculated balance: ₹{row['bal']:,.2f}",
                "legal_reference": "Accounting Standard 1 — Prudence & Consistency",
                "recommended_action": "Examine cash registers for missing receipts or incorrect duplicate payments.",
                "impact_amount": abs(row["bal"]),
                "risk_score": 90.0
            })

    # ── Module 12: Learning Rules (Custom rules engine) ──────────────────────────

    def _audit_custom_learning_rules(self, conn: sqlite3.Connection):
        cursor = conn.cursor()

        for rule in self.rules:
            operator = rule["condition_operator"]
            val_str = rule["condition_value"]
            target = rule["target_field"]
            sev = rule["severity"]

            # Implement dynamic rule operators
            if target == "debit" and operator == ">":
                threshold = float(val_str)
                cursor.execute("""
                    SELECT id, date, description, debit, credit
                    FROM ledger_entries
                    WHERE client_id = ? AND debit > ?
                """, (self.client_id, threshold))
                for row in cursor.fetchall():
                    self.findings.append({
                        "title": f"Rule Triggered: {rule['name']}",
                        "category": "Custom Rule Audit",
                        "severity": sev,
                        "description": f"expenditure exceeding ₹{threshold:,.2f} discovered. Triggered by custom rule rule config.",
                        "evidence": f"Voucher: {row['description']} | Amount: ₹{row['debit']:,.2f} on {row['date']}",
                        "legal_reference": "Firm-defined custom compliance threshold",
                        "recommended_action": "Review according to internal corporate governance guidelines.",
                        "impact_amount": row["debit"],
                        "risk_score": 70.0
                    })
                    
            elif target == "daily_payment_count" and operator == ">":
                limit = int(val_str)
                # Find days where a client paid the same description/vendor more than limit times
                cursor.execute("""
                    SELECT date, description, count(*) as cnt, sum(debit) as tot
                    FROM ledger_entries
                    WHERE client_id = ? AND debit > 0
                    GROUP BY date, description
                    HAVING cnt > ?
                """, (self.client_id, limit))
                for row in cursor.fetchall():
                    self.findings.append({
                        "title": f"Rule Triggered: {rule['name']}",
                        "category": "Custom Rule Audit",
                        "severity": sev,
                        "description": f"Discovered {row['cnt']} payments to vendor '{row['description']}' on the same day ({row['date']}). Flagged by custom rules.",
                        "evidence": f"Count: {row['cnt']} (Rule limit: {limit}) | Total value: ₹{row['tot']:,.2f}",
                        "legal_reference": "Corporate Governance Custom Rule",
                        "recommended_action": "Verify if these payments are valid separate supplies or split invoices.",
                        "impact_amount": row["tot"],
                        "risk_score": 75.0
                    })

# ── Module 7: Vendor & Customer Profiles Builder ─────────────────────────────

def get_vendor_profiles(client_id: str) -> List[Dict[str, Any]]:
    """Build profiles dynamically aggregating data for each vendor."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT vendor_name, count(*) as count, sum(taxable_value) as taxable, sum(total_amount) as total, gstin
        FROM gst_invoices
        WHERE client_id = ?
        GROUP BY vendor_name
    """, (client_id,))
    rows = cursor.fetchall()
    
    profiles = []
    for r in rows:
        name = r["vendor_name"] or "Unknown Vendor"
        cnt = r["count"]
        tot = r["total"] or 0.0
        gstin = r["gstin"]
        
        # Calculate risk score
        risk = 30.0
        reasons = []
        
        if cnt > 10:
            risk += 10
            reasons.append("High volume of invoices")
        if tot > 500000:
            risk += 15
            reasons.append("High value vendor")
        if gstin and not GSTIN_RE.match(gstin):
            risk += 40
            reasons.append("Invalid GSTIN format")

        profiles.append({
            "vendor_name": name,
            "gstin": gstin,
            "invoice_count": cnt,
            "average_value": tot / cnt if cnt > 0 else 0,
            "total_value": tot,
            "risk_score": min(risk, 100.0),
            "risk_level": "High" if risk >= 70 else "Medium" if risk > 40 else "Low",
            "risk_reasons": reasons
        })
        
    conn.close()
    return profiles

def get_customer_profiles(client_id: str) -> List[Dict[str, Any]]:
    """Build customer profiles dynamically."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT description, count(*) as count, sum(credit) as total
        FROM ledger_entries
        WHERE client_id = ? AND ledger_type = 'sales'
        GROUP BY description
    """, (client_id,))
    rows = cursor.fetchall()
    
    profiles = []
    for r in rows:
        name = r["description"] or "Unknown Customer"
        cnt = r["count"]
        tot = r["total"] or 0.0
        
        profiles.append({
            "customer_name": name,
            "invoice_count": cnt,
            "average_value": tot / cnt if cnt > 0 else 0,
            "total_value": tot,
            "risk_score": 30.0,
            "risk_level": "Low"
        })
        
    conn.close()
    return profiles
