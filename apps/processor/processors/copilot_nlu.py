"""
CA Copilot Natural Language Understanding (NLU) Engine.
Offline keyword-pattern based intent classification and entity extraction.
"""
import re
from typing import Optional
from loguru import logger

# ── Intent Patterns ───────────────────────────────────────────────────────────

INTENTS = [
    {
        "name": "find_duplicates",
        "patterns": [
            "duplicate invoice", "duplicate payment", "duplicate voucher",
            "double entry", "duplicate", "duplicate bill", "find duplicate",
            "check duplicate", "detect duplicate",
        ],
        "follow_up": None,
        "description": "Detect duplicate invoices, payments, or vouchers",
    },
    {
        "name": "reconcile_bank",
        "patterns": [
            "reconcile bank", "bank reconciliation", "bank statement", "match bank",
            "sbi statement", "hdfc statement", "icici statement", "axis statement",
            "bank match", "compare bank", "unmatched bank", "bank transaction",
            "reconcile sbi", "reconcile hdfc", "bank recon",
        ],
        "follow_up": None,
        "description": "Bank statement reconciliation",
    },
    {
        "name": "reconcile_gst",
        "patterns": [
            "gstr-2b", "gstr 2b", "gstr2b", "compare gstr", "gst reconciliation",
            "purchase register", "itc reconciliation", "gst mismatch", "compare gst",
            "gst comparison", "reconcile gst", "2b mismatch",
        ],
        "follow_up": None,
        "description": "GST GSTR-2B vs Purchase Register reconciliation",
    },
    {
        "name": "reconcile_ledger",
        "patterns": [
            "ledger reconciliation", "compare ledger", "ledger comparison",
            "reconcile ledger", "tally reconciliation", "general ledger",
        ],
        "follow_up": None,
        "description": "General ledger reconciliation",
    },
    {
        "name": "run_audit",
        "patterns": [
            "run audit", "ai audit", "audit scan", "suspicious transaction",
            "risk analysis", "anomaly", "fraud detection", "round number",
            "weekend transaction", "suspicious payment", "audit intelligence",
            "find risks", "risk report", "compliance scan",
        ],
        "follow_up": None,
        "description": "Run AI risk and audit intelligence scan",
    },
    {
        "name": "vendor_intelligence",
        "patterns": [
            "vendor risk", "vendor profile", "vendor intelligence", "invalid gstin vendor",
            "vendor gstin", "vendor summary", "vendor report", "vendor analysis",
            "supplier risk", "supplier profile",
        ],
        "follow_up": None,
        "description": "Vendor risk profiles and intelligence",
    },
    {
        "name": "search_invoices",
        "patterns": [
            "find invoice", "search invoice", "invoice above", "invoice over",
            "invoice from", "invoice missing", "missing gstin", "invoices above",
            "invoices over", "list invoice", "show invoice",
        ],
        "follow_up": None,
        "description": "Search and filter invoices",
    },
    {
        "name": "generate_report",
        "patterns": [
            "export to excel", "generate excel", "export excel", "download excel",
            "export pdf", "generate pdf", "export csv", "generate report",
            "download report", "export report", "create report",
        ],
        "follow_up": "What type of report would you like? (Bank Reconciliation, GST Mismatch, Audit Findings, Vendor Risk)",
        "description": "Generate and export reports",
    },
    {
        "name": "tax_knowledge",
        "patterns": [
            "what is section", "explain section", "section 16", "section 17",
            "section 40a", "section 44ab", "section 43b", "section 194",
            "what is itc", "what is rcm", "reverse charge", "blocked credit",
            "itc eligibility", "gst rule", "lut", "export of service",
            "e-way bill", "eway bill", "gstr-2b how", "gstr-3b", "annual return",
            "tds", "194c", "194j", "tax knowledge", "compliance guide",
        ],
        "follow_up": None,
        "description": "Tax knowledge and compliance guidance",
    },
    {
        "name": "show_unmatched",
        "patterns": [
            "unmatched transaction", "pending reconciliation", "show unmatched",
            "unmatched entry", "unreconciled", "outstanding transaction",
            "unmatched invoice", "unmatched bank",
        ],
        "follow_up": None,
        "description": "Show unmatched/unreconciled transactions",
    },
    {
        "name": "get_summary",
        "patterns": [
            "show summary", "client summary", "give me overview", "dashboard",
            "overview", "status report", "how many", "total invoices",
            "what is the status", "give summary",
        ],
        "follow_up": None,
        "description": "Client financial overview and summary",
    },
    {
        "name": "greet",
        "patterns": [
            "hello", "hi", "hey", "good morning", "good afternoon",
            "what can you do", "help me", "help", "capabilities",
            "what are you", "introduce yourself",
        ],
        "follow_up": None,
        "description": "Greeting and capabilities",
    },
]

# ── Entity Extractors ─────────────────────────────────────────────────────────

AMOUNT_PATTERNS = [
    (r"₹\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|lakhs)", 100_000),
    (r"₹\s*([\d,]+(?:\.\d+)?)\s*(crore|crores)", 10_000_000),
    (r"([\d,]+(?:\.\d+)?)\s*(lakh|lac|lakhs)", 100_000),
    (r"([\d,]+(?:\.\d+)?)\s*(crore|crores)", 10_000_000),
    (r"rs\.?\s*([\d,]+(?:\.\d+)?)", 1),
    (r"inr\s*([\d,]+(?:\.\d+)?)", 1),
    (r"₹\s*([\d,]+(?:\.\d+)?)", 1),
]

BANK_NAMES = [
    "sbi", "state bank", "hdfc", "icici", "axis", "kotak", "pnb",
    "punjab national", "bob", "bank of baroda", "canara", "union bank",
    "yes bank", "idfc", "indusind", "federal", "rbl",
]

REPORT_FORMATS = {
    "excel": ["excel", "xlsx", ".xlsx", "spreadsheet"],
    "pdf": ["pdf", ".pdf"],
    "csv": ["csv", ".csv"],
}

DATE_FY_PATTERN = re.compile(
    r"\b(?:fy|financial year|f\.y\.?)?\s*20(\d{2})[- ]?(\d{2})\b", re.IGNORECASE
)

GSTIN_PATTERN = re.compile(
    r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b"
)

# ── NLU Engine ────────────────────────────────────────────────────────────────

class NLUEngine:
    def classify(self, text: str) -> dict:
        """
        Classify user intent from text.
        Returns: {intent, confidence, description, follow_up}
        """
        q = text.lower().strip()
        best_intent = "unknown"
        best_score = 0
        best_meta = {}

        for intent in INTENTS:
            score = 0
            for pattern in intent["patterns"]:
                if pattern in q:
                    score += len(pattern.split())  # longer matches score higher

            if score > best_score:
                best_score = score
                best_intent = intent["name"]
                best_meta = intent

        # Confidence: normalize to 0-1 range
        raw_confidence = min(best_score * 15, 98) if best_score > 0 else 30.0

        logger.debug(f"NLU: intent={best_intent}, score={best_score}, confidence={raw_confidence}")

        return {
            "intent": best_intent,
            "confidence": raw_confidence,
            "description": best_meta.get("description", ""),
            "follow_up": best_meta.get("follow_up"),
        }

    def extract_entities(self, text: str) -> dict:
        """Extract structured entities from user text."""
        q = text.lower()
        entities = {}

        # Amount
        for pattern, multiplier in AMOUNT_PATTERNS:
            match = re.search(pattern, q, re.IGNORECASE)
            if match:
                raw_value = match.group(1).replace(",", "")
                try:
                    entities["amount"] = float(raw_value) * multiplier
                    break
                except ValueError:
                    pass

        # Bank Name
        for bank in BANK_NAMES:
            if bank in q:
                entities["bank_name"] = bank.upper()
                break

        # Report Format
        for fmt, keywords in REPORT_FORMATS.items():
            for kw in keywords:
                if kw in q:
                    entities["report_format"] = fmt
                    break
            if "report_format" in entities:
                break

        # GSTIN
        gstin_match = GSTIN_PATTERN.search(text.upper())
        if gstin_match:
            entities["gstin"] = gstin_match.group(0)

        # Financial Year
        fy_match = DATE_FY_PATTERN.search(q)
        if fy_match:
            y1 = int(fy_match.group(1))
            y2 = int(fy_match.group(2))
            entities["financial_year"] = f"20{y1}-{y2:02d}"

        # Vendor name hint (after "from" or "for")
        vendor_match = re.search(r"\b(?:from|for|vendor|supplier)\s+([A-Za-z][A-Za-z\s]{2,}?)(?:\s+(?:ltd|pvt|inc|llp|limited|industries|services|solutions))?(?:\b|$)", text, re.IGNORECASE)
        if vendor_match:
            entities["vendor_name"] = vendor_match.group(1).strip().title()

        return entities

    def needs_followup(self, intent: str, entities: dict, context: dict) -> Optional[str]:
        """
        Return a follow-up question string if critical info is missing, else None.
        Checks context before asking — don't ask what's already known.
        """
        if intent == "generate_report":
            if "report_format" not in entities:
                return "Which format would you like the report in? Excel, PDF, or CSV?"

        return None
