"""
CA Copilot Tax Knowledge Base — Offline curated references for GST Act, Income Tax Act,
Rules, Circulars and common compliance topics.
"""
import re
from typing import List, Dict, Any

KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    {
        "id": "gst_sec_16",
        "topic": "Input Tax Credit (ITC) Eligibility",
        "keywords": ["itc", "input tax credit", "section 16", "eligible itc", "claim itc", "avail itc"],
        "act": "CGST Act 2017",
        "section": "Section 16",
        "content": (
            "Section 16 of the CGST Act specifies the conditions for availing Input Tax Credit (ITC). "
            "A registered person is entitled to ITC on goods or services used in the course of furtherance of business, "
            "subject to these mandatory conditions: (a) Possession of a valid tax invoice or prescribed document; "
            "(b) Actual receipt of goods or services; (c) Tax charged on the supply has been paid to the Government by the supplier; "
            "(d) The recipient has filed its GSTR-3B return. ITC must be availed within the earlier of: "
            "the due date of filing GSTR-3B for October month following the financial year end, or "
            "the date of filing the Annual Return. "
            "Under Section 16(2)(b), ITC is allowed only when goods/services are actually received."
        ),
        "examples": [
            "ITC on purchase of raw materials used in manufacturing — Eligible",
            "ITC on capital goods used in business — Eligible (can be availed over time or in full)",
            "ITC on services received for business purposes — Eligible",
            "ITC on invoice not uploaded by supplier in GSTR-1 — Not eligible until appearing in GSTR-2B",
        ],
        "related": ["gst_sec_17_5", "gst_gstr2b", "gst_sec_15"],
    },
    {
        "id": "gst_sec_17_5",
        "topic": "Blocked Credits under GST",
        "keywords": ["blocked credit", "section 17(5)", "17 5", "ineligible itc", "motor vehicle", "food", "catering", "club", "health"],
        "act": "CGST Act 2017",
        "section": "Section 17(5)",
        "content": (
            "Section 17(5) of the CGST Act lists specific categories where ITC is blocked (not available): "
            "(a) Motor vehicles and other conveyances (except when used for: further supply of vehicles, transportation of passengers, "
            "imparting training on driving/flying/navigating, transportation of goods); "
            "(b) Food, beverages, outdoor catering, beauty treatment, health services, cosmetic/plastic surgery (except for further supply); "
            "(c) Membership of a club, health and fitness centre; "
            "(d) Rent-a-cab, life insurance, health insurance (unless obligatory under any law); "
            "(e) Travel benefits extended to employees on vacation (leave or home travel concession); "
            "(f) Works contract services for construction of immovable property (except for further supply of works contract); "
            "(g) Goods or services received for construction of immovable property on own account; "
            "(h) Goods or services used for personal consumption; "
            "(i) Goods lost, stolen, destroyed or written off."
        ),
        "examples": [
            "Purchase of Toyota Innova (≤13 seats) for employee transport — BLOCKED",
            "Restaurant bills / food delivery for office — BLOCKED",
            "Gym membership for employees — BLOCKED",
            "Purchase of ambulance for employee emergency use — BLOCKED",
            "Motor vehicle for transporting goods (delivery vehicle) — ELIGIBLE",
        ],
        "related": ["gst_sec_16", "gst_sec_9"],
    },
    {
        "id": "gst_sec_31",
        "topic": "Tax Invoice Requirements",
        "keywords": ["tax invoice", "section 31", "invoice format", "mandatory fields", "invoice requirements", "gstin invoice"],
        "act": "CGST Act 2017",
        "section": "Section 31 / Rule 46",
        "content": (
            "Section 31 requires a registered person making a taxable supply to issue a tax invoice. "
            "Rule 46 specifies mandatory particulars: (a) Name, address and GSTIN of the supplier; "
            "(b) A consecutive serial number unique to the financial year; (c) Date of issue; "
            "(d) Name, address and GSTIN/UIN of the recipient (where registered); "
            "(e) HSN code for goods (mandatory above ₹5 crore aggregate turnover; optional below ₹1.5 crore); "
            "(f) SAC code for services; (g) Description of goods or services; (h) Quantity; "
            "(i) Total value and taxable value; (j) Rate and amount of GST (IGST or CGST+SGST); "
            "(k) Place of supply; (l) Signature/digital signature of the supplier."
        ),
        "examples": [
            "Missing GSTIN on invoice — Non-compliance with Rule 46",
            "Wrong HSN code on invoice — Potential rate mismatch",
            "No serial number — Non-compliant invoice",
        ],
        "related": ["gst_sec_16", "gst_gstin_format"],
    },
    {
        "id": "gst_gstin_format",
        "topic": "GSTIN Format and Validation",
        "keywords": ["gstin", "gstin format", "gstin invalid", "gstin validation", "tax identification", "gst number"],
        "act": "CGST Rules 2017",
        "section": "Rule 10 / Rule 46",
        "content": (
            "GSTIN (Goods and Services Tax Identification Number) is a 15-digit alphanumeric code: "
            "Positions 1-2: State code (01-38 for Indian states/UTs); "
            "Positions 3-12: PAN of the registered person (10 characters); "
            "Position 13: Entity number for the same PAN holder in a state (1-9, A-Z); "
            "Position 14: 'Z' (default); "
            "Position 15: Checksum digit (alphanumeric). "
            "Format regex: ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$. "
            "Invalid GSTINs on purchase invoices disqualify ITC claims and expose the taxpayer to scrutiny."
        ),
        "examples": [
            "Valid GSTIN: 27AABCO5512N1Z4 (Maharashtra, company)",
            "Invalid: INVALID-GSTIN-ABC — Will be rejected in GSTR portal validation",
        ],
        "related": ["gst_sec_16", "gst_sec_31"],
    },
    {
        "id": "gst_gstr2b",
        "topic": "GSTR-2B Reconciliation",
        "keywords": ["gstr-2b", "gstr 2b", "purchase reconciliation", "itc reconciliation", "2b mismatch", "purchase register"],
        "act": "CGST Act 2017",
        "section": "Section 16(2)(aa) / Rule 36(4)",
        "content": (
            "GSTR-2B is an auto-populated monthly statement available to every registered taxpayer containing "
            "details of Input Tax Credit (ITC) available based on their suppliers' GSTR-1/IFF filings. "
            "From April 2022, Rule 36(4) requires ITC to be claimed only as reflected in GSTR-2B. "
            "Steps for reconciliation: (1) Download GSTR-2B from GST Portal; "
            "(2) Match with Purchase Register on invoice number, GSTIN, date, taxable value and GST amount; "
            "(3) Identify: (a) Invoices in Purchase Register not in GSTR-2B (supplier hasn't filed); "
            "(b) Invoices in GSTR-2B not in Purchase Register (unrecorded purchases); "
            "(c) Amount mismatches (different values). "
            "ITC can only be claimed for invoices appearing in GSTR-2B — any excess claim may attract demand with interest @18% p.a."
        ),
        "examples": [
            "Invoice MS-55102 (₹22,500 GST) in Purchase Register but absent from GSTR-2B — ITC not claimable until supplier files",
            "GSTR-2B shows ₹26,000 but Purchase Register shows ₹27,000 — Verify and use GSTR-2B figure",
        ],
        "related": ["gst_sec_16", "gst_gstr3b", "gst_annual_return"],
    },
    {
        "id": "gst_gstr3b",
        "topic": "GSTR-3B Monthly Return",
        "keywords": ["gstr-3b", "gstr 3b", "monthly return", "gst filing", "itc availment", "output tax"],
        "act": "CGST Act 2017",
        "section": "Section 39 / Rule 61",
        "content": (
            "GSTR-3B is a self-declaration summary return filed monthly (or quarterly under QRMP) by every registered taxpayer. "
            "It captures: Table 3.1 — Outward supplies (taxable, exempt, nil-rated, non-GST); "
            "Table 4 — Eligible ITC claimed (4A: As per GSTR-2B; 4B: Reversals); "
            "Table 5 — Exempt/nil-rated/non-GST outward supplies; "
            "Table 6 — Payment of taxes (IGST, CGST, SGST, Cess). "
            "Due dates: 20th of the following month (monthly); varies for QRMP. "
            "Late filing attracts penalty of ₹50/day (₹20/day for nil return) up to ₹10,000 per return, "
            "plus interest @18% p.a. on the net tax liability."
        ),
        "related": ["gst_gstr2b", "gst_sec_16"],
    },
    {
        "id": "gst_sec_9_rcm",
        "topic": "Reverse Charge Mechanism (RCM)",
        "keywords": ["rcm", "reverse charge", "section 9(3)", "section 9(4)", "reverse charge mechanism", "unregistered supplier"],
        "act": "CGST Act 2017",
        "section": "Section 9(3) and 9(4)",
        "content": (
            "Under RCM, the liability to pay GST shifts from the supplier to the recipient. "
            "Section 9(3): Notified categories of supply where recipient pays GST (e.g., legal services from advocate, "
            "sponsorship services, GTA services if recipient is a body corporate, import of services). "
            "Section 9(4): Purchases from unregistered suppliers above ₹5,000/day threshold attract RCM "
            "(currently suspended; applicable only to notified categories). "
            "Under RCM: Supplier issues a bill/challan without tax; recipient pays tax via GSTR-3B (Table 3.1.d); "
            "recipient can claim ITC on the RCM tax paid (same month) if goods/services used for business. "
            "Key compliance: Issue self-invoice for each RCM payment; pay tax in cash (no ITC offset for RCM liability)."
        ),
        "related": ["gst_sec_16", "gst_gstr3b"],
    },
    {
        "id": "gst_lut_export",
        "topic": "Export of Services and LUT",
        "keywords": ["lut", "letter of undertaking", "export of services", "zero rated", "igst refund", "export"],
        "act": "IGST Act 2017",
        "section": "Section 16 IGST / Rule 96A",
        "content": (
            "Export of goods/services is a zero-rated supply under Section 16 of the IGST Act. "
            "Exporters have two options: "
            "(Option 1 — Under LUT) File Letter of Undertaking (LUT) annually in Form RFD-11 on GST portal. "
            "Export without paying IGST. Claim refund of accumulated ITC. "
            "(Option 2 — With IGST payment) Pay IGST at the time of export. Claim refund of IGST paid. "
            "LUT Option is preferred as it avoids tax outflow. LUT must be filed before the start of FY or before first export. "
            "Eligible for: any registered person (except those convicted of tax evasion > ₹250 lakhs). "
            "Reference: Circular No. 125/44/2019-GST dated 18.11.2019."
        ),
        "related": ["gst_sec_16"],
    },
    {
        "id": "gst_eway_bill",
        "topic": "E-Way Bill Requirements",
        "keywords": ["e-way bill", "eway bill", "way bill", "transport", "movement of goods", "ewb"],
        "act": "CGST Rules 2017",
        "section": "Rule 138",
        "content": (
            "An E-Way Bill (EWB) is mandatory for movement of goods worth more than ₹50,000 (taxable value) "
            "across or within a state (intrastate threshold varies by state; some states exempt below ₹1 lakh). "
            "Generated on the GST E-Way Bill portal (ewaybillgst.gov.in). "
            "Required details: GSTIN of supplier and recipient, HSN code, invoice number and date, "
            "value of goods, place of delivery, vehicle number. "
            "Validity: Up to 100 km — 1 day; every additional 100 km — 1 additional day. "
            "Penalty for non-compliance: ₹10,000 or tax amount (whichever is higher); goods can be detained. "
            "Exceptions: Exempted goods, transport by non-motorized conveyance, customs cleared goods, etc."
        ),
        "related": ["gst_sec_31"],
    },
    {
        "id": "it_sec_40a3",
        "topic": "Cash Payment Disallowance — Section 40A(3)",
        "keywords": ["40a3", "40a(3)", "cash payment", "cash disallowance", "cash limit", "cash expense", "cash transaction"],
        "act": "Income Tax Act 1961",
        "section": "Section 40A(3)",
        "content": (
            "Section 40A(3) of the Income Tax Act 1961 disallows any expenditure exceeding ₹10,000 "
            "incurred otherwise than by an account payee cheque/demand draft/banking channel in a single day to a single person. "
            "The limit is ₹35,000 for payments to transporters. "
            "Disallowance: 100% of the amount is disallowed — not treated as a business expense. "
            "Must be reported in: Form 3CD (Tax Audit Report) Clause 21(b) — Payments contrary to Section 40A(3). "
            "Section 40A(3A): If such a payment is made in a subsequent year for an expense allowed in a prior year, "
            "it is deemed income in the year of payment. "
            "Rule 6DD lists exceptions: payments to RBI, Central/State Governments, banking institutions, "
            "payments in villages without banking facilities, certain agricultural purchases etc."
        ),
        "examples": [
            "₹45,000 cash paid to contractor — 100% disallowed (₹45,000)",
            "₹50,000 ATM cash withdrawal for vendor payment — Disallowed if no banking alternative",
            "₹8,000 cash to petty supplier — Allowed (below ₹10,000 limit)",
        ],
        "related": ["it_sec_44ab", "it_form_3cd"],
    },
    {
        "id": "it_sec_44ab",
        "topic": "Tax Audit under Section 44AB",
        "keywords": ["tax audit", "section 44ab", "44ab", "form 3cd", "tax auditor", "audit requirement", "turnover limit"],
        "act": "Income Tax Act 1961",
        "section": "Section 44AB",
        "content": (
            "Section 44AB mandates a tax audit by a Chartered Accountant if: "
            "(a) Business turnover exceeds ₹1 crore in a FY (₹10 crore if cash receipts/payments ≤5% of total); "
            "(b) Professional receipts exceed ₹50 lakh; "
            "(c) Business is declared under presumptive schemes (44AD, 44ADA, 44AE) and profit declared is lower than prescribed. "
            "The tax auditor must furnish: Form 3CA (for entities already subject to audit under other laws) or "
            "Form 3CB (for others), along with Form 3CD (tax audit report with 44 clauses of financial/compliance information). "
            "Due date: 30th September of the assessment year. "
            "Penalty for non-compliance: 0.5% of turnover or ₹1,50,000, whichever is lower."
        ),
        "related": ["it_sec_40a3", "it_form_3cd"],
    },
    {
        "id": "it_sec_43b",
        "topic": "Deductions on Actual Payment Basis — Section 43B",
        "keywords": ["43b", "section 43b", "actual payment", "provident fund", "bonus", "leave encashment", "interest on loan"],
        "act": "Income Tax Act 1961",
        "section": "Section 43B",
        "content": (
            "Section 43B specifies that certain deductions are allowed only on actual payment basis "
            "(regardless of the method of accounting — accrual or cash). Covered items: "
            "(a) Taxes/duties/levies payable to government — allowed only when paid; "
            "(b) Employer's contribution to PF/ESI/gratuity — allowed when paid; "
            "(c) Bonus/commission to employees — allowed when paid; "
            "(d) Interest on term loans from banks/financial institutions (not rescheduled) — when paid; "
            "(e) Leave encashment — when paid; "
            "(f) Payments to Indian Railways. "
            "If payment is made before the due date of filing the income tax return, the deduction is allowed for that year. "
            "Important: Section 43B does NOT override Section 40A(3) restrictions."
        ),
        "related": ["it_sec_40a3"],
    },
    {
        "id": "it_tds_194c",
        "topic": "TDS on Contractor Payments — Section 194C",
        "keywords": ["194c", "tds contractor", "tds contract", "tds deduction", "contractor tds", "subcontractor"],
        "act": "Income Tax Act 1961",
        "section": "Section 194C",
        "content": (
            "Section 194C requires TDS deduction on payments to contractors and sub-contractors. "
            "Rates: 1% for Individual/HUF contractors; 2% for other contractors (companies, firms, etc.). "
            "Threshold: No TDS if single payment ≤ ₹30,000 AND aggregate payments in FY ≤ ₹1,00,000. "
            "TDS must be deducted at the time of credit to the contractor's account or actual payment, whichever is earlier. "
            "Deposited to government by 7th of the following month (March payments — 30th April). "
            "Form 16A (TDS certificate) issued quarterly. "
            "If TDS is not deducted, 30% of the payment can be disallowed under Section 40(a)(ia)."
        ),
        "related": ["it_sec_40a3", "it_sec_44ab"],
    },
    {
        "id": "it_tds_194j",
        "topic": "TDS on Professional Fees — Section 194J",
        "keywords": ["194j", "tds professional", "professional fees tds", "technical fees", "royalty tds"],
        "act": "Income Tax Act 1961",
        "section": "Section 194J",
        "content": (
            "Section 194J requires TDS on payments for professional/technical services, royalties, and directors' fees. "
            "Rates: 10% for professional services, royalties, non-compete fees, director fees; "
            "2% for purely technical services (effective from FY 2020-21). "
            "Threshold: TDS applies if payment exceeds ₹30,000 per year. "
            "Professional services include: legal, medical, engineering, architecture, CA, CS, CMA, advertising, etc. "
            "Technical services include: managerial, technical or consultancy services. "
            "Non-deduction: 30% disallowance under Section 40(a)(ia)."
        ),
        "related": ["it_tds_194c", "it_sec_44ab"],
    },
    {
        "id": "gst_annual_return",
        "topic": "GST Annual Return (GSTR-9)",
        "keywords": ["gstr-9", "annual return", "gstr9", "gst annual", "yearly return"],
        "act": "CGST Act 2017",
        "section": "Section 44",
        "content": (
            "GSTR-9 is the annual return to be filed by every regular taxpayer (turnover > ₹2 crore; optional for lower). "
            "It consolidates all monthly/quarterly returns filed during the financial year. "
            "Due date: 31st December following the end of the financial year. "
            "Key contents: Outward supplies (GSTR-1 consolidated), inward supplies (GSTR-2B consolidated), "
            "ITC availed vs ITC reversals, payment of taxes, demands/refunds. "
            "GSTR-9C: Reconciliation statement (turnover > ₹5 crore) — self-certified (from FY 2021-22). "
            "Late fee: ₹200/day (₹100 CGST + ₹100 SGST) up to 0.5% of turnover in the state."
        ),
        "related": ["gst_gstr3b", "gst_gstr2b"],
    },
]


def search_knowledge(query: str, max_results: int = 3) -> list:
    """
    Search the knowledge base using keyword matching.
    Returns top results with relevance scores.
    """
    q = query.lower().strip()
    words = re.sub(r"[^a-z0-9()/]", " ", q).split()

    scored = []
    for entry in KNOWLEDGE_BASE:
        score = 0
        topic_lower = entry["topic"].lower()
        content_lower = entry["content"].lower()

        # Score keyword matches
        for kw in entry["keywords"]:
            if kw in q:
                score += 3  # Full keyword match
            for word in words:
                if word in kw:
                    score += 1  # Partial match

        # Score topic matches
        for word in words:
            if word in topic_lower:
                score += 2

        # Score content matches
        for word in words:
            if len(word) > 3 and word in content_lower:
                score += 1

        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, entry in scored[:max_results]:
        results.append({
            "id": entry["id"],
            "topic": entry["topic"],
            "act": entry["act"],
            "section": entry["section"],
            "content": entry["content"],
            "examples": entry.get("examples", []),
            "confidence": min(score * 10, 98),
        })
    return results
