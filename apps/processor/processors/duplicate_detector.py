"""
Duplicate Detection Engine — CA Copilot
Detects:
  - Exact duplicate invoice numbers
  - Duplicate amounts from same vendor
  - Same GSTIN with different vendor names (potential fraud)
  - Fuzzy-matched invoice numbers (slight variations)
  - Duplicate transactions in bank statements

Uses RapidFuzz for fuzzy string matching.
"""
import re
from typing import List, Dict, Tuple
from collections import defaultdict
from loguru import logger

from models.schemas import (
    ExtractionResult, DuplicateMatch, DuplicateRiskLevel
)


def _safe_float(val: str) -> float:
    try:
        return float(str(val or "0").replace(",", "").strip())
    except Exception:
        return 0.0


def _normalize_str(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip().upper())


def detect_duplicates(results: List[ExtractionResult]) -> List[DuplicateMatch]:
    """
    Cross-compare all extraction results to find duplicates.
    Returns a list of DuplicateMatch objects.
    """
    try:
        from rapidfuzz import fuzz
    except ImportError:
        logger.warning("rapidfuzz not installed — skipping fuzzy duplicate detection")
        return _detect_exact_duplicates(results)

    matches: List[DuplicateMatch] = []
    n = len(results)

    for i in range(n):
        for j in range(i + 1, n):
            r1, r2 = results[i], results[j]
            match = _compare_two_results(r1, r2, fuzz)
            if match:
                matches.append(match)

    logger.info(f"Duplicate detection: {len(matches)} potential duplicates found from {n} documents")
    return matches


def _compare_two_results(r1: ExtractionResult, r2: ExtractionResult, fuzz) -> DuplicateMatch | None:
    """Compare two extraction results and return a DuplicateMatch if suspicious."""
    h1, h2 = r1.header, r2.header
    reasons = []
    total_score = 0.0
    max_possible = 0.0

    # ── Invoice Number Match (highest weight) ──────────────────────────────
    inv1 = _normalize_str(h1.invoice_number)
    inv2 = _normalize_str(h2.invoice_number)
    if inv1 and inv2:
        max_possible += 40
        if inv1 == inv2:
            total_score += 40
            reasons.append("exact_invoice_number")
        else:
            ratio = fuzz.ratio(inv1, inv2)
            if ratio >= 85:
                total_score += ratio * 0.35
                reasons.append(f"similar_invoice_number ({ratio:.0f}%)")

    # ── Vendor GSTIN Match (high weight) ──────────────────────────────────
    gst1 = _normalize_str(h1.vendor_gstin)
    gst2 = _normalize_str(h2.vendor_gstin)
    if gst1 and gst2:
        max_possible += 25
        if gst1 == gst2:
            total_score += 25
            reasons.append("same_vendor_gstin")

    # ── Amount Match ──────────────────────────────────────────────────────
    amt1 = _safe_float(h1.grand_total)
    amt2 = _safe_float(h2.grand_total)
    if amt1 > 0 and amt2 > 0:
        max_possible += 20
        if abs(amt1 - amt2) < 1.0:
            total_score += 20
            reasons.append("exact_amount_match")
        elif abs(amt1 - amt2) / max(amt1, amt2) < 0.02:
            total_score += 10
            reasons.append(f"near_identical_amount ({amt1:.2f} vs {amt2:.2f})")

    # ── Vendor Name Fuzzy Match ────────────────────────────────────────────
    ven1 = _normalize_str(h1.vendor_name)
    ven2 = _normalize_str(h2.vendor_name)
    if ven1 and ven2:
        max_possible += 15
        name_ratio = fuzz.token_sort_ratio(ven1, ven2)
        if name_ratio >= 80:
            total_score += name_ratio * 0.15
            reasons.append(f"similar_vendor_name ({name_ratio:.0f}%)")

    # ── Date Match (same date + same vendor = suspicious) ─────────────────
    if h1.invoice_date and h2.invoice_date and h1.invoice_date == h2.invoice_date:
        if reasons:  # Only flag date if other signals present
            reasons.append("same_invoice_date")
            total_score += 5
        max_possible += 5

    if not reasons:
        return None

    # Normalize score to 0-100
    score = min((total_score / max(max_possible, 1)) * 100, 100.0)

    # Determine risk level
    if score >= 90:
        risk: DuplicateRiskLevel = "exact"
    elif score >= 70:
        risk = "high"
    elif score >= 50:
        risk = "medium"
    elif score >= 30:
        risk = "low"
    else:
        return None  # Not suspicious enough

    return DuplicateMatch(
        source_file=r1.original_filename,
        matched_file=r2.original_filename,
        source_invoice_number=h1.invoice_number,
        matched_invoice_number=h2.invoice_number,
        source_vendor=h1.vendor_name,
        matched_vendor=h2.vendor_name,
        source_amount=h1.grand_total,
        matched_amount=h2.grand_total,
        match_score=round(score, 1),
        risk_level=risk,
        match_reasons=reasons,
        is_confirmed_duplicate=(score >= 90 and "exact_invoice_number" in reasons and "same_vendor_gstin" in reasons),
    )


def _detect_exact_duplicates(results: List[ExtractionResult]) -> List[DuplicateMatch]:
    """Fallback exact-match duplicate detection without rapidfuzz."""
    seen: Dict[str, ExtractionResult] = {}
    matches: List[DuplicateMatch] = []

    for r in results:
        key = f"{_normalize_str(r.header.vendor_gstin)}|{_normalize_str(r.header.invoice_number)}"
        if key in seen:
            prev = seen[key]
            matches.append(DuplicateMatch(
                source_file=prev.original_filename,
                matched_file=r.original_filename,
                source_invoice_number=prev.header.invoice_number,
                matched_invoice_number=r.header.invoice_number,
                source_vendor=prev.header.vendor_name,
                matched_vendor=r.header.vendor_name,
                source_amount=prev.header.grand_total,
                matched_amount=r.header.grand_total,
                match_score=100.0,
                risk_level="exact",
                match_reasons=["exact_invoice_number", "same_vendor_gstin"],
                is_confirmed_duplicate=True,
            ))
        else:
            seen[key] = r

    return matches


def detect_bank_statement_duplicates(transactions) -> List[dict]:
    """
    Detect duplicate transactions within a single bank statement.
    Returns list of duplicate groups with indices.
    """
    seen: Dict[Tuple, List[int]] = defaultdict(list)
    duplicates = []

    for i, txn in enumerate(transactions):
        key = (
            txn.date,
            re.sub(r"\s+", "", str(txn.debit or "0")),
            re.sub(r"\s+", "", str(txn.credit or "0")),
        )
        seen[key].append(i)

    for key, indices in seen.items():
        if len(indices) > 1:
            duplicates.append({
                "date": key[0],
                "debit": key[1],
                "credit": key[2],
                "occurrences": len(indices),
                "transaction_indices": indices,
            })

    return duplicates
