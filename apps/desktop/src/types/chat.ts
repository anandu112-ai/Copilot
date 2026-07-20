// ─── Chat / AI Copilot Types ──────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'complete' | 'error' | 'thinking'

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: string
  documentId?: string
}

export interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie'
  title: string
  labels: string[]
  values: number[]
}

export interface MessageContent {
  text: string
  tableData?: TableData
  chartData?: ChartData
  exportable?: boolean
  exportType?: 'Excel' | 'PDF' | 'CSV'
  exportLabel?: string
  findings?: number
  confidence?: number
  actionButtons?: { label: string; action: string }[]
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: MessageContent
  status: MessageStatus
  timestamp: string
  attachments: MessageAttachment[]
  relatedDocuments: string[]
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  context: SessionContext
  pinned: boolean
}

export interface SessionContext {
  clientId?: string
  clientName?: string
  financialYear?: string
  assessmentYear?: string
  activeDocuments: string[]
  lastOperation?: string
  preferredExportFormat?: 'Excel' | 'PDF' | 'CSV'
}

export interface SuggestedPrompt {
  id: string
  text: string
  category: 'Document' | 'Reconciliation' | 'Audit' | 'Tax' | 'Report'
  icon: string
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: 'p1', text: 'Find duplicate invoices in my uploaded documents', category: 'Audit', icon: '🔍' },
  { id: 'p2', text: 'Reconcile SBI bank statement with sales ledger', category: 'Reconciliation', icon: '⚖️' },
  { id: 'p3', text: 'Compare GSTR-2B with purchase register and show mismatches', category: 'Reconciliation', icon: '📊' },
  { id: 'p4', text: 'Generate audit report for Apex Steel Industries', category: 'Audit', icon: '📋' },
  { id: 'p5', text: 'Find all transactions above ₹5,00,000', category: 'Document', icon: '💰' },
  { id: 'p6', text: 'Show invoices with GST calculation errors', category: 'Audit', icon: '⚠️' },
  { id: 'p7', text: 'What is the GST treatment for export of services under LUT?', category: 'Tax', icon: '⚖️' },
  { id: 'p8', text: 'Summarize audit observations for this month', category: 'Report', icon: '📝' },
  { id: 'p9', text: 'Find vendors with suspicious activity patterns', category: 'Audit', icon: '🚨' },
  { id: 'p10', text: 'Export unmatched invoices to Excel', category: 'Report', icon: '📤' },
  { id: 'p11', text: 'Identify cash payments exceeding ₹10,000 (Sec 40A(3))', category: 'Tax', icon: '💵' },
  { id: 'p12', text: 'Create monthly summary report for Q1 FY 2026-27', category: 'Report', icon: '📅' },
]
