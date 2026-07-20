// ─── Audit Types ─────────────────────────────────────────────────────────────

export type AuditSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type AuditCategory =
  | 'Fraud Detection'
  | 'GST Mismatch'
  | 'Duplicate Entry'
  | 'Unusual Transaction'
  | 'ITC Issue'
  | 'Bank Anomaly'
  | 'Arithmetic Error'
  | 'Missing Document'
  | 'Compliance Risk'

export type AuditStatus = 'Open' | 'Under Review' | 'Resolved' | 'Dismissed'

export interface AuditFinding {
  id: string
  title: string
  category: AuditCategory
  severity: AuditSeverity
  status: AuditStatus
  description: string
  evidence: string[]
  recommendedAction: string
  legalReference?: string
  potentialImpact: string
  impactAmount?: number
  affectedDocuments: string[]
  client: string
  clientId?: string
  detectedAt: string
  resolvedAt?: string
  notes: string
  riskScore: number
}

export interface GstMismatch {
  id: string
  invoiceNo: string
  vendorGstin: string
  vendorName: string
  gstr1Taxable: number
  gstr2bTaxable: number
  differenceTaxable: number
  gstr1Gst: number
  gstr2bGst: number
  differenceGst: number
  mismatchType: 'Missing in GSTR-2B' | 'Missing in Purchase Register' | 'Amount Mismatch' | 'Date Mismatch' | 'Invalid GSTIN'
  severity: AuditSeverity
}

export interface DuplicateInvoice {
  id: string
  invoiceNo: string
  vendorName: string
  vendorGstin: string
  invoiceDate: string
  amount: number
  duplicateOf: string
  duplicateScore: number
  reason: string
  status: 'Confirmed' | 'Suspected' | 'False Positive'
}

export interface SuspiciousTransaction {
  id: string
  transactionId: string
  date: string
  narration: string
  amount: number
  type: 'Debit' | 'Credit'
  reason: string
  riskLevel: AuditSeverity
  flags: string[]
}

export interface AuditStats {
  complianceScore: number
  totalFindings: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  resolvedCount: number
  openCount: number
  totalImpactAmount: number
  gstMismatchCount: number
  duplicateCount: number
  suspiciousCount: number
}

export interface GstReconciliationResult {
  matchedInvoices: number
  totalInvoices: number
  matchPercentage: number
  mismatches: GstMismatch[]
  itcDifference: number
  taxLiabilityDifference: number
  missingInPurchaseRegister: number
  missingInGstr2b: number
}

export interface BankReconciliationResult {
  matchedTransactions: number
  totalTransactions: number
  matchPercentage: number
  unmatchedInBank: number
  unmatchedInBooks: number
  partialMatches: number
  duplicates: number
  suspiciousTransactions: SuspiciousTransaction[]
}

export type AuditReportType =
  | 'Full Audit Report'
  | 'GST Reconciliation'
  | 'Bank Reconciliation'
  | 'Duplicate Analysis'
  | 'Exception Report'
  | 'Risk Summary'
