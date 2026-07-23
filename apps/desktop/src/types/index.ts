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

  // Authentication API
  auth: {
    register: (data: {
      fullName: string
      email: string
      mobile?: string
      firmName?: string
      password: string
      confirmPassword: string
    }) => Promise<{
      success: boolean
      user?: AuthUser
      sessionToken?: string
      error?: string
    }>

    login: (data: {
      email: string
      password: string
    }) => Promise<{
      success: boolean
      user?: AuthUser
      sessionToken?: string
      error?: string
    }>

    getCurrentUser: (sessionToken: string) => Promise<{
      success: boolean
      user?: AuthUser | null
    }>

    logout: (sessionToken: string) => Promise<{
      success: boolean
      error?: string
    }>

    logoutAll: (sessionToken: string) => Promise<{
      success: boolean
      error?: string
    }>

    updateProfile: (sessionToken: string, updates: {
      fullName?: string
      mobile?: string
      firmName?: string
    }) => Promise<{
      success: boolean
      user?: AuthUser
      error?: string
    }>

    changePassword: (sessionToken: string, data: {
      currentPassword: string
      newPassword: string
      confirmPassword: string
    }) => Promise<{
      success: boolean
      error?: string
    }>

    deleteAccount: (sessionToken: string, password: string) => Promise<{
      success: boolean
      error?: string
    }>

    isFirstRun: () => Promise<{
      success: boolean
      isFirstRun: boolean
    }>

    getUserCount: () => Promise<{
      success: boolean
      count: number
    }>
  }

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

    getFirmDetails: () => Promise<any>
    saveFirmDetails: (details: any) => Promise<{ success: boolean }>
    getUsers: () => Promise<any[]>
    insertUser: (user: any) => Promise<{ success: boolean }>
    deleteUser: (id: string) => Promise<{ success: boolean }>
    getRolePermissions: () => Promise<any[]>
    insertRolePermission: (role: string, permission: string, enabled: number) => Promise<{ success: boolean }>
    clearRolePermissions: (role: string) => Promise<{ success: boolean }>
    getTasks: () => Promise<any[]>
    insertTask: (task: any) => Promise<{ success: boolean }>
    updateTaskStatus: (id: string, status: string) => Promise<{ success: boolean }>
    deleteTask: (id: string) => Promise<{ success: boolean }>
    getTaskComments: (taskId: string) => Promise<any[]>
    insertTaskComment: (comment: any) => Promise<{ success: boolean }>
    getDocumentApprovals: (documentId: string) => Promise<any[]>
    insertDocumentApproval: (approval: any) => Promise<{ success: boolean }>
    getComplianceDeadlines: () => Promise<any[]>
    insertComplianceDeadline: (deadline: any) => Promise<{ success: boolean }>
    updateComplianceDeadline: (id: string, status: string) => Promise<{ success: boolean }>
    deleteComplianceDeadline: (id: string) => Promise<{ success: boolean }>
    getKnowledgeItems: (searchQuery?: string) => Promise<any[]>
    insertKnowledgeItem: (item: any) => Promise<{ success: boolean }>
    deleteKnowledgeItem: (id: string) => Promise<{ success: boolean }>
    getAuditTrail: (limit?: number) => Promise<any[]>
    insertAuditTrail: (log: any) => Promise<{ success: boolean }>
    getSyncLogs: (limit?: number) => Promise<any[]>
    insertSyncLog: (log: any) => Promise<{ success: boolean }>

    getAiAutomationRules: () => Promise<any[]>
    insertAiAutomationRule: (rule: any) => Promise<{ success: boolean }>
    deleteAiAutomationRule: (id: string) => Promise<{ success: boolean }>
    getAiSuggestions: () => Promise<any[]>
    insertAiSuggestion: (sug: any) => Promise<{ success: boolean }>
    updateAiSuggestionStatus: (id: string, status: string) => Promise<{ success: boolean }>
    getAiWorkingPapers: (clientId?: string) => Promise<any[]>
    insertAiWorkingPaper: (wp: any) => Promise<{ success: boolean }>
    deleteAiWorkingPaper: (id: string) => Promise<{ success: boolean }>
    getAiLearningRecords: () => Promise<any[]>
    insertAiLearningRecord: (record: any) => Promise<{ success: boolean }>
    getAiPipelineJobs: (limit?: number) => Promise<any[]>
    insertAiPipelineJob: (job: any) => Promise<{ success: boolean }>
    updateAiPipelineJob: (id: string, status: string, currentStep: number, progress: number, logs: string) => Promise<{ success: boolean }>
    getAiQaFlags: () => Promise<any[]>
    insertAiQaFlag: (flag: any) => Promise<{ success: boolean }>
    updateAiQaFlagStatus: (id: string, status: string) => Promise<{ success: boolean }>

    // Phase 8
    getBackupRecords: () => Promise<any[]>
    insertBackupRecord: (rec: any) => Promise<{ success: boolean }>
    updateBackupRecord: (id: string, status: string, completedAt?: string) => Promise<{ success: boolean }>
    deleteBackupRecord: (id: string) => Promise<{ success: boolean }>
    getLicenseInfo: () => Promise<any>
    upsertLicense: (lic: any) => Promise<{ success: boolean }>
    getPlugins: () => Promise<any[]>
    upsertPlugin: (plg: any) => Promise<{ success: boolean }>
    updatePluginStatus: (id: string, status: string) => Promise<{ success: boolean }>
    getErrorLogs: (limit?: number) => Promise<any[]>
    insertErrorLog: (log: any) => Promise<{ success: boolean }>
    resolveErrorLog: (id: string) => Promise<{ success: boolean }>
    getPerfMetrics: () => Promise<any[]>
    upsertPerfMetric: (m: any) => Promise<{ success: boolean }>
    getDocumentFingerprints: () => Promise<any[]>
    upsertDocumentFingerprint: (fp: any) => Promise<{ success: boolean }>
    appendDocumentAccessHistory: (id: string, entry: object) => Promise<{ success: boolean }>
    getUpdateHistory: () => Promise<any[]>
    insertUpdateRecord: (upd: any) => Promise<{ success: boolean }>
    getQaTestResults: () => Promise<any[]>
    insertQaTestResult: (r: any) => Promise<{ success: boolean }>
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
export interface AuthUser {
  id: number
  uuid: string
  full_name: string
  email: string
  mobile: string | null
  firm_name: string | null
  created_at: string
  updated_at: string
  last_login: string | null
  role: string
  status: string
}

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
