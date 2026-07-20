// ── Electron API Types ─────────────────────────────────────────────────────
export interface ElectronAPI {
  getPythonPort: () => Promise<number>
  checkPythonHealth: () => Promise<boolean>

  openFileDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>
  saveFileDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>
  openFolder: (folderPath: string) => Promise<ShellResult>
  revealInExplorer: (filePath: string) => Promise<ShellResult>
  openFile: (filePath: string) => Promise<ShellResult>

  getAppVersion: () => Promise<string>
  getAppPath: (name: string) => Promise<string>

  db: {
    getSettings: () => Promise<Record<string, string>>
    setSetting: (key: string, value: string) => Promise<{ success: boolean }>
    getConversionHistory: (limit?: number) => Promise<ConversionHistoryRecord[]>
    insertConversion: (record: InsertConversionRecord) => Promise<{ success: boolean }>
    deleteConversion: (id: string) => Promise<{ success: boolean }>
    getDashboardStats: () => Promise<DashboardStats>
    getRecentActivity: (limit?: number) => Promise<RecentActivityItem[]>
    getClients: () => Promise<ClientRecord[]>
    insertClient: (client: Omit<ClientRecord, 'created_at' | 'updated_at'>) => Promise<{ success: boolean }>
    deleteClient: (id: string) => Promise<{ success: boolean }>
  }


  getNativeTheme: () => Promise<string>
  onThemeChange: (callback: (theme: string) => void) => () => void
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[]
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

export interface ShellResult {
  success: boolean
  error?: string
}

// ── Database Records ───────────────────────────────────────────────────────
export interface ConversionHistoryRecord {
  id: string
  original_file_name: string
  original_file_path: string
  document_type: string
  status: 'success' | 'partial' | 'failed'
  output_path: string
  warnings: string // JSON string
  processing_duration_ms: number
  page_count: number
  created_at: string
}

export interface InsertConversionRecord {
  id: string
  originalFileName: string
  originalFilePath: string
  documentType: string
  status: 'success' | 'partial' | 'failed'
  outputPath: string
  warnings: string[]
  processingDurationMs: number
  pageCount: number
}

export interface DashboardStats {
  totalConversions: number
  successfulConversions: number
  totalClients: number
  totalDocuments: number
}

export interface RecentActivityItem {
  id: string
  activity_type: string
  title: string
  subtitle: string
  status: string
  created_at: string
}

export interface ClientRecord {
  id: string
  clientName: string
  businessName?: string
  clientType?: string
  pan?: string
  gstin?: string
  email?: string
  phone?: string
  financialYear?: string
  assignedStaff?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}



// ── PDF Processing Types ───────────────────────────────────────────────────
export type DocumentType =
  | 'invoice'
  | 'purchase_invoice'
  | 'sales_invoice'
  | 'gst_invoice'
  | 'bank_statement'
  | 'ledger'
  | 'purchase_register'
  | 'sales_register'
  | 'credit_note'
  | 'debit_note'
  | 'receipt'
  | 'expense_bill'
  | 'other'

export interface DocumentTypeOption {
  value: DocumentType
  label: string
  description: string
  icon: string
  extractionSupport: 'full' | 'partial' | 'generic'
}

export interface PDFInspectionResult {
  pageCount: number
  isTextBased: boolean
  isScanned: boolean
  hasTablesDetected: boolean
  fileSizeMb: number
  isEncrypted: boolean
}

export interface ExtractionWarning {
  field?: string
  message: string
  severity: 'info' | 'warning' | 'error'
}

export interface InvoiceHeader {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  vendorName: string
  vendorAddress: string
  vendorGstin: string
  vendorPan: string
  customerName: string
  customerAddress: string
  customerGstin: string
  placeOfSupply: string
  state: string
  currency: string
  paymentTerms: string
  subtotal: string
  discount: string
  freight: string
  otherCharges: string
  taxableAmount: string
  cgst: string
  sgst: string
  igst: string
  cess: string
  roundOff: string
  grandTotal: string
  amountInWords: string
  bankName: string
  accountNumber: string
  ifsc: string
  upi: string
}

export interface LineItem {
  id: string
  srNo: string
  description: string
  hsnSac: string
  quantity: string
  unit: string
  rate: string
  discount: string
  taxableValue: string
  cgstRate: string
  cgstAmount: string
  sgstRate: string
  sgstAmount: string
  igstRate: string
  igstAmount: string
  cess: string
  total: string
}

export interface ExtractionResult {
  documentType: DocumentType
  header: Partial<InvoiceHeader>
  lineItems: LineItem[]
  rawTables: string[][][]
  warnings: ExtractionWarning[]
  confidence: 'high' | 'medium' | 'low'
  pageCount: number
  isOcrUsed: boolean
  processingDurationMs: number
}

// ── App Settings ───────────────────────────────────────────────────────────
export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  defaultExportFolder: string
  ocrEnabled: string
  ocrLanguage: string
  logLevel: string
  appVersion: string
}

// ── Navigation ─────────────────────────────────────────────────────────────
export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  group: string
  badge?: string
  isAvailable: boolean
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
