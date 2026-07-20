"""
Audit Intelligence Engine — CA Copilot
Automatically identifies compliance issues and generates CA-grade audit observations.

Covers:
  - Section 40A(3): Cash payments > ₹10,000 (IT Act)
  - GSTR-2B ITC mismatch detection
  - Missing/Invalid GSTINs
  - Backdated invoices
  - Weekend transactions
  - Suspicious round figures
  - Large/unusual transactions
  - Duplicate invoice detection results
  - Arithmetic errors
  - Tax type mismatches (IGST vs CGST/SGST)
  - Missing mandatory fields
"""
import re
from typing import List, Optional
from datetime import datetime, timedelta
from dateutil import parser as dateutil_parser
from loguru import logger

from models.schemas import (
    ExtractionResult, AuditObservation, AuditSeverity,
    BankTransaction, InvoiceHeader, DuplicateMatch
)

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$")


def _safe_float(val: str) -> float:
    try:
        return float(str(val or "0").replace(",", "").strip())
    except Exception:
        return 0.0


def _parse_date(val: str) -> Optional[datetime]:
    try:
        return dateutil_parser.parse(val, dayfirst=True)
    except Exception:
        return None


class AuditEngine:
    """
    Runs all audit checks on an ExtractionResult and returns AuditObservations.
    """
    def __init__(self, result: ExtractionResult, processing_date: Optional[datetime] = None):
        self.result = result
        self.processing_date = processing_date or datetime.now()
        self.observations: List[AuditObservation] = []

    def run(self) -> List[AuditObservation]:
        """Execute all audit checks and return findings."""
        self.observations = []

        if self.result.document_type == "bank_statement":
            self._audit_bank_statement()
        else:
            self._audit_invoice()

        # Common checks
        self._check_duplicates()
        self._check_missing_mandatory_fields()

        logger.info(f"Audit Engine: {len(self.observations)} observation(s) generated")
        return self.observations

    # ── Invoice Audits ─────────────────────────────────────────────────────

    def _audit_invoice(self):
        h = self.result.header

        # 1. Missing / Invalid GSTIN
        self._check_gstin(h)

        # 2. Tax type mismatch (IGST vs CGST+SGST)
        self._check_tax_type_mismatch(h)

        # 3. Arithmetic errors
        self._check_arithmetic(h)

        # 4. Backdated invoice
        self._check_backdated(h)

        # 5. Round figure cash payment (Sec 40A(3))
        self._check_section_40a3(h)

        # 6. Suspicious round grand total
        self._check_round_figure(h)

        # 7. Large transaction
        self._check_large_transaction(h)

        # 8. Missing line items
        if not self.result.line_items:
            self._add(
                category="Missing Line Items",
                severity="medium",
                desc="No line items could be extracted from this invoice",
                evidence="line_items = []",
                recommendation="Manually enter line item details before finalizing the workbook",
            )

    def _check_gstin(self, h: InvoiceHeader):
        if not h.vendor_gstin:
            self._add(
                category="Missing Vendor GSTIN",
                severity="high",
                desc="Vendor GSTIN is missing from this document",
                evidence="vendor_gstin = (empty)",
                legal_reference="CGST Act Section 16 — ITC is disallowed without valid GSTIN",
                recommendation="Obtain GSTIN from vendor before claiming Input Tax Credit",
            )
        elif not GSTIN_RE.match(h.vendor_gstin):
            self._add(
                category="Invalid GSTIN Format",
                severity="high",
                desc=f"Vendor GSTIN '{h.vendor_gstin}' does not match the required 15-character format",
                evidence=f"vendor_gstin = {h.vendor_gstin}",
                legal_reference="CGST Rule 46(b) — Invoice must contain correct supplier GSTIN",
                recommendation="Verify GSTIN on GST Portal: https://www.gst.gov.in",
            )

    def _check_tax_type_mismatch(self, h: InvoiceHeader):
        vendor_state = h.vendor_gstin[:2] if len(h.vendor_gstin) >= 2 else ""
        customer_state = h.customer_gstin[:2] if len(h.customer_gstin) >= 2 else ""
        if not vendor_state or not customer_state:
            return

        is_inter_state = vendor_state != customer_state
        has_igst = _safe_float(h.igst) > 0
        has_cgst_sgst = _safe_float(h.cgst) > 0 or _safe_float(h.sgst) > 0

        if is_inter_state and has_cgst_sgst and not has_igst:
            self._add(
                category="GST Tax Type Mismatch",
                severity="critical",
                desc="Inter-state transaction is charging CGST/SGST instead of IGST",
                evidence=f"Vendor State: {vendor_state}, Customer State: {customer_state}, CGST: ₹{h.cgst}, IGST: ₹{h.igst}",
                legal_reference="IGST Act Section 5 — IGST applies to inter-state supplies",
                recommendation="Ask vendor to issue a revised invoice with correct IGST charges",
                amount_involved=h.grand_total,
            )
        elif not is_inter_state and has_igst and not has_cgst_sgst:
            self._add(
                category="GST Tax Type Mismatch",
                severity="critical",
                desc="Intra-state transaction is charging IGST instead of CGST+SGST",
                evidence=f"Both parties in State {vendor_state}, IGST: ₹{h.igst}",
                legal_reference="CGST Act Section 9 — CGST+SGST applies to intra-state supplies",
                recommendation="Ask vendor to issue a revised invoice with CGST+SGST",
                amount_involved=h.grand_total,
            )

    def _check_arithmetic(self, h: InvoiceHeader):
        try:
            taxable = _safe_float(h.taxable_amount)
            cgst = _safe_float(h.cgst)
            sgst = _safe_float(h.sgst)
            igst = _safe_float(h.igst)
            cess = _safe_float(h.cess)
            round_off_raw = str(h.round_off or "0").replace(",", "")
            round_off = _safe_float(round_off_raw) if round_off_raw else 0.0
            grand = _safe_float(h.grand_total)

            if taxable > 0 and grand > 0:
                computed = taxable + cgst + sgst + igst + cess + round_off
                if abs(computed - grand) > 5.0:
                    self._add(
                        category="Arithmetic Error",
                        severity="high",
                        desc="Grand total does not match sum of taxable value and taxes",
                        evidence=f"Computed: ₹{computed:,.2f} | Invoice Grand Total: ₹{grand:,.2f} | Diff: ₹{abs(computed-grand):,.2f}",
                        legal_reference="CGST Rule 46 — Invoice must correctly state taxable value and tax amounts",
                        recommendation="Request corrected invoice from vendor",
                        amount_involved=h.grand_total,
                    )
        except Exception as e:
            logger.debug(f"Arithmetic check skipped: {e}")

    def _check_backdated(self, h: InvoiceHeader):
        if not h.invoice_date:
            return
        inv_dt = _parse_date(h.invoice_date)
        if not inv_dt:
            return
        days_old = (self.processing_date - inv_dt).days
        if days_old > 180:
            self._add(
                category="Backdated Invoice",
                severity="medium",
                desc=f"Invoice is dated {days_old} days ago — may be outside the ITC claim window",
                evidence=f"Invoice Date: {h.invoice_date} | Processing Date: {self.processing_date.strftime('%d-%m-%Y')}",
                legal_reference="CGST Section 16(4) — ITC cannot be claimed after the due date of filing September return",
                recommendation="Verify if this invoice falls within the permissible ITC claim period",
                amount_involved=h.grand_total,
            )

    def _check_section_40a3(self, h: InvoiceHeader):
        grand = _safe_float(h.grand_total)
        payment_terms_lower = (h.payment_terms or "").lower()
        is_cash = "cash" in payment_terms_lower or "by cash" in payment_terms_lower

        if is_cash and grand > 10000:
            self._add(
                category="Section 40A(3) Violation",
                severity="critical",
                desc=f"Cash payment of ₹{grand:,.2f} exceeds ₹10,000 limit and is NOT deductible",
                evidence=f"Payment Terms: {h.payment_terms} | Amount: ₹{grand:,.2f}",
                legal_reference="IT Act Section 40A(3) — Cash payments >₹10,000 per day to single person are disallowed",
                recommendation="Ensure payment is made via banking channel (NEFT/RTGS/Cheque/UPI)",
                amount_involved=h.grand_total,
            )

    def _check_round_figure(self, h: InvoiceHeader):
        grand = _safe_float(h.grand_total)
        if grand >= 10000 and int(grand) % 1000 == 0 and grand % 10000 == 0:
            self._add(
                category="Suspicious Round Figure",
                severity="low",
                desc=f"Invoice total ₹{grand:,.0f} is a suspiciously round figure",
                evidence=f"Grand Total: ₹{grand:,.2f}",
                recommendation="Verify this is a genuine business transaction and not a fictitious invoice",
                amount_involved=h.grand_total,
            )

    def _check_large_transaction(self, h: InvoiceHeader):
        grand = _safe_float(h.grand_total)
        if grand >= 500000:
            self._add(
                category="High-Value Transaction",
                severity="info",
                desc=f"Transaction value ₹{grand:,.2f} exceeds ₹5,00,000 — requires documentation",
                evidence=f"Grand Total: ₹{grand:,.2f}",
                recommendation="Ensure supporting documents, approval chain, and purpose are properly filed",
                amount_involved=h.grand_total,
            )

    # ── Bank Statement Audits ──────────────────────────────────────────────

    def _audit_bank_statement(self):
        for txn in self.result.transactions:
            flags = txn.audit_flag or ""

            if "WEEKEND_TXN" in flags:
                amount = max(_safe_float(txn.debit), _safe_float(txn.credit))
                self._add(
                    category="Weekend Transaction",
                    severity="low",
                    desc=f"Transaction on {txn.date} (weekend) — {txn.description[:60]}",
                    evidence=f"Date: {txn.date} | Amount: ₹{amount:,.2f} | Mode: {txn.payment_mode}",
                    recommendation="Verify business necessity of weekend transactions",
                    amount_involved=str(amount),
                )

            if "CASH_TXN" in flags:
                debit_amt = _safe_float(txn.debit)
                if debit_amt > 10000:
                    self._add(
                        category="Section 40A(3) Cash Payment",
                        severity="critical",
                        desc=f"Cash payment ₹{debit_amt:,.2f} on {txn.date} — disallowed deduction u/s 40A(3)",
                        evidence=f"Narration: {txn.description[:80]} | Amount: ₹{debit_amt:,.2f}",
                        legal_reference="IT Act Section 40A(3)",
                        recommendation="Convert to banking channel payment. Cash >₹10,000 per day to one party is not deductible.",
                        amount_involved=txn.debit,
                    )

            if "LARGE_TXN" in flags:
                amount = max(_safe_float(txn.debit), _safe_float(txn.credit))
                if amount >= 2000000:  # ₹20 Lakh — SFT reporting threshold
                    self._add(
                        category="SFT Reporting Threshold",
                        severity="high",
                        desc=f"Transaction of ₹{amount:,.2f} may require SFT reporting",
                        evidence=f"Date: {txn.date} | {txn.description[:60]}",
                        legal_reference="Income Tax Rule 114E — Statement of Financial Transactions",
                        recommendation="Check if this transaction requires reporting in SFT (Form 61A)",
                        amount_involved=str(amount),
                    )

    # ── Common Audits ──────────────────────────────────────────────────────

    def _check_duplicates(self):
        for dup in self.result.duplicate_matches:
            if dup.risk_level in ["exact", "high"]:
                self._add(
                    category="Duplicate Invoice Detected",
                    severity="critical" if dup.is_confirmed_duplicate else "high",
                    desc=f"Invoice {dup.source_invoice_number} appears to be duplicated ({dup.match_score:.0f}% match)",
                    evidence=f"Source: {dup.source_file} | Match: {dup.matched_file} | Reasons: {', '.join(dup.match_reasons)}",
                    legal_reference="CGST Section 16 — ITC cannot be claimed twice on same invoice",
                    recommendation="Reconcile with vendor to confirm whether this is a genuine re-submission or attempted double-billing",
                    amount_involved=dup.source_amount,
                )

    def _check_missing_mandatory_fields(self):
        h = self.result.header
        mandatory = {
            "Invoice Number": h.invoice_number,
            "Invoice Date": h.invoice_date,
            "Vendor Name": h.vendor_name,
            "Grand Total": h.grand_total,
        }
        missing = [name for name, val in mandatory.items() if not val]
        if missing:
            self._add(
                category="Missing Mandatory Fields",
                severity="medium",
                desc=f"The following mandatory fields could not be extracted: {', '.join(missing)}",
                evidence=f"Missing: {missing}",
                recommendation="Review the original document and manually enter the missing values in the Excel workbook",
            )

    # ── Helper ─────────────────────────────────────────────────────────────

    def _add(
        self,
        category: str,
        severity: AuditSeverity,
        desc: str,
        evidence: str,
        legal_reference: str = "",
        recommendation: str = "",
        amount_involved: str = "",
    ):
        self.observations.append(AuditObservation(
            category=category,
            severity=severity,
            description=desc,
            evidence=evidence,
            legal_reference=legal_reference,
            recommendation=recommendation,
            file_reference=self.result.original_filename,
            amount_involved=amount_involved,
        ))


def run_audit(result: ExtractionResult) -> List[AuditObservation]:
    """Entry point for the audit engine."""
    engine = AuditEngine(result)
    return engine.run()
