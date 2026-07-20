// ─── Document AI Types ────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'Queued'
  | 'Processing'
  | 'Completed'
  | 'Requires Review'
  | 'Error'

export type DocumentType =
  | 'Purchase Invoice'
  | 'Sales Invoice'
  | 'Bank Statement'
  | 'GST Report'
  | 'Credit Note'
  | 'Debit Note'
  | 'Delivery Challan'
  | 'Purchase Order'
  | 'Expense Bill'
  | 'Audit Document'
  | 'Unknown'

export type ExportFormat = 'Excel' | 'CSV' | 'JSON' | 'PDF'

export interface LineItem {
  id: string
  serialNo: string
  description: string
  hsn: string
  uom: string
  quantity: number
  rate: number
  taxableValue: number
  discount: number
  gstRate: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  total: number
  needsReview?: boolean
}

export interface BankTransaction {
  id: string
  date: string
  valueDate: string
  narration: string
  referenceNo: string
  utr: string
  chequeNo: string
  debit: number
  credit: number
  balance: number
  category: string
  transactionType: string
  needsReview?: boolean
}

export interface DocumentHeader {
  // Vendor/Supplier
  vendorName: string
  vendorGstin: string
  vendorPan: string
  vendorAddress: string
  vendorState: string
  vendorPinCode: string
  vendorPhone: string
  vendorEmail: string

  // Customer/Buyer
  customerName: string
  customerGstin: string
  customerAddress: string
  customerState: string

  // Invoice Details
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  poNumber: string
  referenceNo: string

  // Supply Details
  placeOfSupply: string
  reverseCharge: boolean
  eWayBillNo: string
  vehicleNo: string
  transportMode: string
  transportName: string

  // Financials
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  discount: number
  freight: number
  roundOff: number
  grandTotal: number
  amountInWords: string
  currency: string

  // Bank Details
  bankName: string
  accountNo: string
  ifscCode: string
  branchName: string

  // Bank Statement Specific
  openingBalance?: number
  closingBalance?: number
  totalCredits?: number
  totalDebits?: number
  accountNumber?: string
  statementPeriod?: string
}

export interface ExtractionMetadata {
  engine: string
  extractedAt: string
  processingTimeMs: number
  ocrUsed: boolean
  pagesProcessed: number
  totalCharacters: number
  confidence: number
  reviewFields: string[]
}

export interface DuplicateInfo {
  isDuplicate: boolean
  duplicateOf?: string
  duplicateScore?: number
  duplicateReason?: string
}

export interface ProcessedDocument {
  id: string
  name: string
  originalName: string
  suggestedName: string
  size: string
  sizeBytes: number
  type: DocumentType
  uploadedAt: string
  processedAt?: string
  status: DocumentStatus
  confidence: number
  pageCount: number
  header: DocumentHeader
  lineItems: LineItem[]
  bankTransactions?: BankTransaction[]
  metadata: ExtractionMetadata
  duplicate: DuplicateInfo
  tags: string[]
  clientId?: string
  financialYear?: string
  errorMessage?: string
  validationWarnings: string[]
}

export interface BatchJob {
  id: string
  name: string
  totalFiles: number
  processedFiles: number
  completedFiles: number
  errorFiles: number
  status: 'Queued' | 'Processing' | 'Completed' | 'Error'
  startedAt: string
  completedAt?: string
  documents: ProcessedDocument[]
}

export interface SearchFilter {
  query: string
  documentType: DocumentType | 'All'
  status: DocumentStatus | 'All'
  dateFrom: string
  dateTo: string
  minAmount: string
  maxAmount: string
  clientId: string
}
