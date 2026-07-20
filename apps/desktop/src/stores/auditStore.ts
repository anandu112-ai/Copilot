import { create } from 'zustand'
import type {
  AuditFinding, AuditStats, GstMismatch, DuplicateInvoice,
  SuspiciousTransaction, AuditCategory, AuditSeverity
} from '../types/audit'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockFindings: AuditFinding[] = [
  {
    id: 'f-1',
    title: 'Blocked ITC Claim on Motor Vehicle (Sec 17(5))',
    category: 'ITC Issue',
    severity: 'Critical',
    status: 'Open',
    description: 'ITC claimed on purchase of Toyota Innova motor vehicle (INV-982181) for business staff transport. Under Section 17(5)(a) of the CGST Act 2017, motor vehicles with seating capacity ≤ 13 passengers used for general transport of employees are blocked credits and cannot be claimed as Input Tax Credit.',
    evidence: [
      'Invoice INV-982181 dated 14-Jul-2026 from Toyota Kirloskar Motors Pvt Ltd',
      'CGST ₹1,19,000 + SGST ₹1,19,000 (14% each on base ₹8,50,000)',
      'ITC claimed in GSTR-3B July 2026 — Table 4A(5)',
    ],
    recommendedAction: 'Reverse the claimed ITC of ₹2,38,000 in the upcoming GSTR-3B filing. Apply penal interest @18% p.a. from date of availment if not reversed by due date. Consult Section 17(5) for full list of blocked credits.',
    legalReference: 'Section 17(5)(a) CGST Act 2017 — Blocked Credits',
    potentialImpact: 'Wrongful ITC reversal with 18% interest and possible 100% penalty',
    impactAmount: 238000,
    affectedDocuments: ['doc-1', 'doc-4'],
    client: 'Apex Steel Industries Pvt Ltd',
    clientId: 'client-1',
    detectedAt: '2026-07-20T10:00:00Z',
    notes: '',
    riskScore: 98,
  },
  {
    id: 'f-2',
    title: 'Composition Vendor Illegally Collecting GST',
    category: 'GST Mismatch',
    severity: 'High',
    status: 'Open',
    description: 'Vendor Max Software Solutions (GSTIN: 27BBBCA8891D1Z1) is registered under the GST Composition Scheme and is legally prohibited from collecting GST from customers. However, Invoice MS-55102 shows GST of ₹22,500 charged at 18% on services amounting to ₹1,25,000.',
    evidence: [
      'Invoice MS-55102 dated 10-Jul-2026 showing 18% GST — total ₹1,47,500',
      'GSTR-2B records indicate vendor is a Composition Taxpayer (TaxpayerType: C)',
      'Composition dealers must issue Bill of Supply — NOT Tax Invoice',
    ],
    recommendedAction: 'Contact Max Software Solutions to reissue a Bill of Supply (without GST). Reverse the ITC claim of ₹22,500 from purchase register. Report to GST authorities if vendor refuses to correct.',
    legalReference: 'Section 10(4) CGST Act — Composition taxpayer cannot collect tax',
    potentialImpact: 'Invalid ITC claim of ₹22,500 — recoverable with interest',
    impactAmount: 22500,
    affectedDocuments: ['doc-2'],
    client: 'MGM Logistics Services',
    clientId: 'client-2',
    detectedAt: '2026-07-20T09:30:00Z',
    notes: '',
    riskScore: 85,
  },
  {
    id: 'f-3',
    title: 'Identical Duplicate Purchase Invoice (INV-441028)',
    category: 'Duplicate Entry',
    severity: 'High',
    status: 'Open',
    description: 'Two identical purchase vouchers recorded for the same invoice number INV-441028 from Om Packaging Industries, with identical taxable value of ₹45,000 and GST of ₹8,100. Both entries are within 4 days of each other and appear to be an administrative double-entry.',
    evidence: [
      'Voucher PV-2026-401 — Dated 14-Jul-2026 — ₹53,100 — Invoice INV-441028',
      'Voucher PV-2026-419 — Dated 18-Jul-2026 — ₹53,100 — Invoice INV-441028',
      'Both entries under Account: Purchase Account — Om Packaging',
    ],
    recommendedAction: 'Compare physical stock register against goods received note (GRN). If only one delivery was received, delete voucher PV-2026-419 from Tally ERP. Also reverse duplicate ITC claim of ₹8,100.',
    legalReference: 'Section 16(2)(b) CGST Act — ITC allowed only if goods received',
    potentialImpact: 'Duplicate purchase booking ₹53,100 and duplicate ITC ₹8,100',
    impactAmount: 53100,
    affectedDocuments: [],
    client: 'Om Packaging Industries',
    clientId: 'client-3',
    detectedAt: '2026-07-20T09:00:00Z',
    notes: '',
    riskScore: 78,
  },
  {
    id: 'f-4',
    title: 'Cash Payment Violation — Section 40A(3) IT Act',
    category: 'Compliance Risk',
    severity: 'Medium',
    status: 'Open',
    description: 'Single cash payment of ₹45,000 recorded on 15-Jul-2026 for office renovation contractor charges. Under Section 40A(3) of the Income Tax Act 1961, any business expenditure exceeding ₹10,000 paid in cash in a single day to a single person is fully disallowed as a deduction.',
    evidence: [
      'Payment Voucher PV-9902 dated 15-Jul-2026 — Cash Mode',
      'Debit: Office Renovation Maintenance Ledger — ₹45,000',
      'Narration: "Paid contractor settlement — cash"',
    ],
    recommendedAction: 'Disallow this ₹45,000 expenditure in tax computation (3CD Clause 21). Request contractor to provide bank receipt for alternate payment or accept reduced deduction. Report in Form 3CD.',
    legalReference: 'Section 40A(3) Income Tax Act 1961',
    potentialImpact: 'Tax disallowance ₹45,000 — additional tax @30% = ₹13,500',
    impactAmount: 13500,
    affectedDocuments: ['doc-3'],
    client: 'Om Packaging Industries',
    clientId: 'client-3',
    detectedAt: '2026-07-20T08:30:00Z',
    notes: '',
    riskScore: 62,
  },
  {
    id: 'f-5',
    title: 'Unusual ATM Cash Withdrawal ₹50,000',
    category: 'Bank Anomaly',
    severity: 'Medium',
    status: 'Under Review',
    description: 'A large ATM cash withdrawal of ₹50,000 was detected in the bank statement on 22-Apr-2026. Cash withdrawals of this magnitude without corresponding petty cash expense documentation are a common audit red flag.',
    evidence: [
      'SBI Statement — 22-Apr-2026 — ATM WDL ₹50,000',
      'No corresponding petty cash vouchers found in April books',
      'Cash ledger shows unexplained opening shortfall of ₹48,200 in May',
    ],
    recommendedAction: 'Obtain petty cash vouchers or expense receipts for April. Reconcile cash ledger opening balance for May. If unaccountable, treat as unexplained investment under Section 69 IT Act.',
    legalReference: 'Section 69 Income Tax Act — Unexplained Investments',
    potentialImpact: 'Unexplained cash — may be treated as undisclosed income',
    impactAmount: 50000,
    affectedDocuments: ['doc-3'],
    client: 'Om Packaging Industries',
    clientId: 'client-3',
    detectedAt: '2026-07-20T08:00:00Z',
    notes: 'Under review — petty cash vouchers requested from client',
    riskScore: 55,
  },
  {
    id: 'f-6',
    title: 'High Volume Miscellaneous Write-offs',
    category: 'Unusual Transaction',
    severity: 'Low',
    status: 'Resolved',
    description: 'Unusually high volume of miscellaneous low-value credit journal entries written off without valid expense bills. Miscellaneous expense ledger increased by 148% month-on-month in June 2026.',
    evidence: [
      '14 journal vouchers in June 2026 totaling ₹1,20,000',
      'All debited to Miscellaneous Expenses — narration "settled balance amount"',
      'No supporting expense vouchers found for any entry',
    ],
    recommendedAction: 'Conduct random sampling of vouchers under ₹5,000. Ensure staff are not submitting non-business expense receipts. Implement voucher approval workflow.',
    potentialImpact: 'Potential disallowance up to ₹1,20,000 if expenses unverifiable',
    impactAmount: 120000,
    affectedDocuments: [],
    client: 'Apex Steel Industries Pvt Ltd',
    clientId: 'client-1',
    detectedAt: '2026-07-19T15:00:00Z',
    resolvedAt: '2026-07-20T11:00:00Z',
    notes: 'Client confirmed and provided supporting bills — resolved.',
    riskScore: 28,
  },
]

const mockGstMismatches: GstMismatch[] = [
  {
    id: 'gm-1',
    invoiceNo: 'INV-2026-8941',
    vendorGstin: '27AAACA9928R1Z5',
    vendorName: 'Apex Steel Industries Pvt Ltd',
    gstr1Taxable: 150000,
    gstr2bTaxable: 150000,
    differenceTaxable: 0,
    gstr1Gst: 27000,
    gstr2bGst: 26000,
    differenceGst: 1000,
    mismatchType: 'Amount Mismatch',
    severity: 'Medium',
  },
  {
    id: 'gm-2',
    invoiceNo: 'MS-55102',
    vendorGstin: '27BBBCA8891D1Z1',
    vendorName: 'Max Software Solutions',
    gstr1Taxable: 125000,
    gstr2bTaxable: 0,
    differenceTaxable: 125000,
    gstr1Gst: 22500,
    gstr2bGst: 0,
    differenceGst: 22500,
    mismatchType: 'Missing in GSTR-2B',
    severity: 'High',
  },
  {
    id: 'gm-3',
    invoiceNo: 'PO-INVALID-929',
    vendorGstin: '99INVALID0000X1Z9',
    vendorName: 'Unknown Vendor',
    gstr1Taxable: 85000,
    gstr2bTaxable: 85000,
    differenceTaxable: 0,
    gstr1Gst: 15300,
    gstr2bGst: 15300,
    differenceGst: 0,
    mismatchType: 'Invalid GSTIN',
    severity: 'Critical',
  },
]

const mockDuplicates: DuplicateInvoice[] = [
  {
    id: 'dup-1',
    invoiceNo: 'INV-441028',
    vendorName: 'Om Packaging Industries',
    vendorGstin: '27AABCO5512N1Z4',
    invoiceDate: '2026-07-14',
    amount: 53100,
    duplicateOf: 'PV-2026-401',
    duplicateScore: 99,
    reason: 'Exact match — same invoice number, amount, vendor, and date range (4 days)',
    status: 'Confirmed',
  },
  {
    id: 'dup-2',
    invoiceNo: 'TSPL-2026-882',
    vendorName: 'TechSpark Solutions',
    vendorGstin: '07AABCT8822N1Z1',
    invoiceDate: '2026-07-08',
    amount: 21240,
    duplicateOf: 'TSPL-2026-882-R',
    duplicateScore: 87,
    reason: 'Same vendor, same amount within 15 days — possible reissued invoice',
    status: 'Suspected',
  },
]

const mockSuspiciousTransactions: SuspiciousTransaction[] = [
  {
    id: 'st-1',
    transactionId: 'SBIN126093028291',
    date: '2026-04-22',
    narration: 'ATM WDL — CASH WITHDRAWAL',
    amount: 50000,
    type: 'Debit',
    reason: 'Large cash withdrawal without corresponding petty cash documentation',
    riskLevel: 'Medium',
    flags: ['Large Cash', 'No Voucher'],
  },
  {
    id: 'st-2',
    transactionId: 'SBIN126112028391',
    date: '2026-06-28',
    narration: 'RTGS Dr - DORMANT VENDOR REACTIVATION',
    amount: 850000,
    type: 'Debit',
    reason: 'Payment to vendor inactive for 14 months suddenly reactivated',
    riskLevel: 'High',
    flags: ['Dormant Vendor', 'High Value', 'Weekend'],
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuditStore {
  findings: AuditFinding[]
  gstMismatches: GstMismatch[]
  duplicates: DuplicateInvoice[]
  suspiciousTransactions: SuspiciousTransaction[]
  selectedFindingId: string | null
  activeSeverity: AuditSeverity | 'All'
  activeCategory: AuditCategory | 'All'
  activeClient: string
  isScanning: boolean

  // Actions
  setFindings: (findings: AuditFinding[]) => void
  updateFinding: (id: string, updates: Partial<AuditFinding>) => void
  selectFinding: (id: string | null) => void
  setActiveSeverity: (s: AuditSeverity | 'All') => void
  setActiveCategory: (c: AuditCategory | 'All') => void
  setActiveClient: (client: string) => void
  setIsScanning: (v: boolean) => void
  addFinding: (f: AuditFinding) => void

  // Derived
  getFilteredFindings: () => AuditFinding[]
  getStats: () => AuditStats
  getSelectedFinding: () => AuditFinding | undefined
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  findings: mockFindings,
  gstMismatches: mockGstMismatches,
  duplicates: mockDuplicates,
  suspiciousTransactions: mockSuspiciousTransactions,
  selectedFindingId: 'f-1',
  activeSeverity: 'All',
  activeCategory: 'All',
  activeClient: 'All',
  isScanning: false,

  setFindings: (findings) => set({ findings }),
  updateFinding: (id, updates) =>
    set((state) => ({
      findings: state.findings.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  selectFinding: (id) => set({ selectedFindingId: id }),
  setActiveSeverity: (s) => set({ activeSeverity: s }),
  setActiveCategory: (c) => set({ activeCategory: c }),
  setActiveClient: (client) => set({ activeClient: client }),
  setIsScanning: (v) => set({ isScanning: v }),
  addFinding: (f) => set((state) => ({ findings: [f, ...state.findings] })),

  getFilteredFindings: () => {
    const { findings, activeSeverity, activeCategory, activeClient } = get()
    return findings.filter((f) => {
      if (activeSeverity !== 'All' && f.severity !== activeSeverity) return false
      if (activeCategory !== 'All' && f.category !== activeCategory) return false
      if (activeClient !== 'All' && f.client !== activeClient) return false
      return true
    })
  },

  getStats: () => {
    const { findings, gstMismatches, duplicates } = get()
    const openFindings = findings.filter((f) => f.status !== 'Resolved' && f.status !== 'Dismissed')
    const impactTotal = findings
      .filter((f) => f.status === 'Open')
      .reduce((sum, f) => sum + (f.impactAmount || 0), 0)
    return {
      complianceScore: Math.max(0, 100 - openFindings.length * 8 - (findings.filter(f => f.severity === 'Critical' && f.status === 'Open').length * 15)),
      totalFindings: findings.length,
      criticalCount: openFindings.filter((f) => f.severity === 'Critical').length,
      highCount: openFindings.filter((f) => f.severity === 'High').length,
      mediumCount: openFindings.filter((f) => f.severity === 'Medium').length,
      lowCount: openFindings.filter((f) => f.severity === 'Low').length,
      resolvedCount: findings.filter((f) => f.status === 'Resolved').length,
      openCount: openFindings.length,
      totalImpactAmount: impactTotal,
      gstMismatchCount: gstMismatches.length,
      duplicateCount: duplicates.filter((d) => d.status === 'Confirmed').length,
      suspiciousCount: get().suspiciousTransactions.filter((t) => t.riskLevel === 'High' || t.riskLevel === 'Critical').length,
    }
  },

  getSelectedFinding: () => {
    const { findings, selectedFindingId } = get()
    return findings.find((f) => f.id === selectedFindingId)
  },
}))
