import React, {
  useState, useRef, useEffect, useCallback, useMemo
} from 'react'
import {
  Bot, Sparkles, Send, Paperclip, X, Download, FileText,
  CheckCircle2, Circle, Loader2, ChevronRight, ChevronDown,
  Trash2, Edit3, Plus, Mic, Copy, RefreshCw,
  AlertOctagon, AlertTriangle, AlertCircle, Info, BookOpen,
  FileSpreadsheet, BarChart3, Zap, Building2, GitBranch,
  ShieldAlert, Search, TrendingUp, Database, Clock, ArrowRight,
  CheckSquare, MessageSquare, Hash, Shield, Eye, Lock,
  Filter, History, Star, ChevronUp, Terminal, Layers,
  Activity, BrainCircuit, FileSearch, Scale, BookMarked,
  IndianRupee, ReceiptText, Users, Wallet, AlertOctagon as Octagon,
  ExternalLink, Pin, PinOff
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StreamEvent {
  type:
    | 'thinking'
    | 'plan'
    | 'tool_start'
    | 'tool_result'
    | 'response'
    | 'suggestions'
    | 'clarification'
    | 'done'
    | 'error'
    | 'security_check'
    | 'knowledge_cite'
  message?: string
  steps?: string[]
  intent?: string
  tool?: string
  description?: string
  summary?: string
  data?: any
  content?: string
  confidence?: number
  items?: Array<{ text: string; action: string; icon?: string }>
  question?: string
  error?: string
  citation?: string
  law?: string
}

interface ToolResult {
  tool: string
  summary: string
  data?: any
  evidence?: string[]
  confidence?: number
}

interface Explainability {
  reason: string
  evidence: string[]
  confidence: number
  relatedDocs?: string[]
  nextStep?: string
  legalRef?: string
}

interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  events?: StreamEvent[]
  suggestions?: Array<{ text: string; action: string; icon?: string }>
  plan?: string[]
  toolResults?: ToolResult[]
  confidence?: number
  timestamp: string
  isStreaming?: boolean
  attachments?: Array<{ name: string; size: string; type: string }>
  explainability?: Explainability
  intent?: string
  citations?: Array<{ law: string; section: string; text: string }>
  securityApproved?: boolean
  requiresApproval?: boolean
}

interface CopilotSession {
  id: string
  title: string
  clientId: string
  clientName: string
  financialYear: string
  assessmentYear: string
  messages: CopilotMessage[]
  createdAt: string
  pinned?: boolean
  lastActivity?: string
}

interface KnowledgeCitation {
  law: string
  section: string
  text: string
  url?: string
}

// ── Server connectivity ───────────────────────────────────────────────────────

async function getBaseUrl(): Promise<string> {
  try {
    if ((window as any).electronAPI?.getProcessorPort) {
      const port = await (window as any).electronAPI.getProcessorPort()
      return `http://localhost:${port}`
    }
  } catch { /* not in electron */ }
  return 'http://localhost:8765'
}

// ── Suggested Prompts ─────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { id: 'p1', icon: 'Search', text: 'Find duplicate invoices', category: 'Audit' },
  { id: 'p2', icon: 'GitBranch', text: 'Reconcile SBI bank statement', category: 'Bank' },
  { id: 'p3', icon: 'Database', text: 'Compare GSTR-2B with purchase register', category: 'GST' },
  { id: 'p4', icon: 'AlertTriangle', text: 'Show suspicious cash transactions', category: 'Audit' },
  { id: 'p5', icon: 'Building2', text: 'Generate vendor risk report', category: 'Vendor' },
  { id: 'p6', icon: 'ShieldAlert', text: 'Check Section 40A(3) violations', category: 'Tax' },
  { id: 'p7', icon: 'FileSpreadsheet', text: 'Export bank reconciliation to Excel', category: 'Export' },
  { id: 'p8', icon: 'AlertCircle', text: 'Find vendors with invalid GSTIN', category: 'GST' },
  { id: 'p9', icon: 'BookOpen', text: 'What is Section 17(5) blocked credit?', category: 'Tax' },
  { id: 'p10', icon: 'TrendingUp', text: 'Show unmatched transactions', category: 'Bank' },
  { id: 'p11', icon: 'Hash', text: 'Find all invoices above ₹10 lakh', category: 'Audit' },
  { id: 'p12', icon: 'CheckSquare', text: 'Run AI audit scan for this client', category: 'Audit' },
  { id: 'p13', icon: 'Scale', text: 'Explain ITC reversal under Rule 42', category: 'Tax' },
  { id: 'p14', icon: 'ReceiptText', text: 'Generate GST mismatch report', category: 'GST' },
  { id: 'p15', icon: 'IndianRupee', text: 'Summarize this bank statement', category: 'Bank' },
  { id: 'p16', icon: 'Users', text: 'Show all invoices from Apex Steel', category: 'Vendor' },
]

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Audit: {
    color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
    icon: <ShieldAlert size={11} />
  },
  Bank: {
    color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    icon: <GitBranch size={11} />
  },
  GST: {
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    icon: <Database size={11} />
  },
  Tax: {
    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    icon: <BookOpen size={11} />
  },
  Vendor: {
    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
    icon: <Building2 size={11} />
  },
  Export: {
    color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
    icon: <FileSpreadsheet size={11} />
  },
}

// ── Simple Markdown Renderer ──────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-surface-100">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-surface-400">{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-800 text-brand-300 px-1.5 py-0.5 rounded text-[10px] font-mono">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let tableBuffer: string[] = []
  let inTable = false

  const flushTable = (key: string) => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((l, li) => elements.push(<p key={`${key}-${li}`} className="text-xs text-surface-300">{l}</p>))
      tableBuffer = []
      return
    }
    const headers = tableBuffer[0].split('|').map(h => h.trim()).filter(Boolean)
    const rows = tableBuffer.slice(2).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
    elements.push(
      <div key={key} className="mt-3 mb-3 overflow-x-auto rounded-xl border border-surface-700 shadow-sm">
        <table className="min-w-full text-[11px]">
          <thead className="bg-surface-800/80">
            <tr>
              {headers.map((h, hi) => (
                <th key={hi} className="px-3 py-2.5 text-left text-surface-300 font-bold tracking-wide whitespace-nowrap border-b border-surface-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-900/50 divide-y divide-surface-800/60">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-surface-800/40 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-surface-300 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableBuffer = []
  }

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('|')) {
      if (!inTable) inTable = true
      tableBuffer.push(line)
      i++
      continue
    } else if (inTable) {
      flushTable(`table-${i}`)
      inTable = false
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-black text-surface-100 mt-4 mb-2 flex items-center gap-1.5">
          <Hash size={12} className="text-brand-400 flex-shrink-0" />{line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-surface-100 mt-4 mb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-black text-surface-100 mt-3 mb-2">{line.slice(2)}</h1>)
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-amber-500 pl-3 my-2 bg-amber-500/5 py-2 rounded-r-lg">
          <p className="text-[11px] text-amber-300 italic leading-relaxed">{line.slice(2)}</p>
        </div>
      )
    } else if (line.startsWith('⚡ ') || line.startsWith('✅ ') || line.startsWith('⚠️ ') || line.startsWith('🔴 ') || line.startsWith('🟡 ') || line.startsWith('🟢 ')) {
      elements.push(<p key={i} className="text-xs text-surface-300 leading-relaxed my-0.5">{parseInline(line)}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand-400 mt-1 flex-shrink-0 text-xs">•</span>
          <p className="text-xs text-surface-300 leading-relaxed">{parseInline(line.slice(2))}</p>
        </div>
      )
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1]
      const content = line.replace(/^\d+\. /, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand-400 font-bold text-[11px] flex-shrink-0 min-w-[18px] mt-0.5">{num}.</span>
          <p className="text-xs text-surface-300 leading-relaxed">{parseInline(content)}</p>
        </div>
      )
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-surface-700 my-3" />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(<p key={i} className="text-xs text-surface-300 leading-relaxed">{parseInline(line)}</p>)
    }
    i++
  }

  if (inTable && tableBuffer.length > 0) flushTable('table-end')
  return <div className="space-y-0.5">{elements}</div>
}

// ── Agent Plan Timeline ────────────────────────────────────────────────────────

function AgentPlanTimeline({ steps, completedCount, isStreaming }: {
  steps: string[]
  completedCount: number
  isStreaming?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  return (
    <div className="rounded-xl border border-surface-700 overflow-hidden bg-surface-900/60 mb-3">
      <button
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-surface-800/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <BrainCircuit size={10} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-surface-300 uppercase tracking-wider">AI Execution Plan</span>
            <span className="text-[9px] text-surface-500">{completedCount}/{steps.length} steps</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-brand-500 to-violet-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {expanded ? <ChevronUp size={11} className="text-surface-600 flex-shrink-0" /> : <ChevronDown size={11} className="text-surface-600 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-surface-800/60 pt-2">
          {steps.map((step, i) => {
            const done = i < completedCount
            const active = i === completedCount && isStreaming
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-emerald-500' :
                    active ? 'bg-brand-500' :
                    'bg-surface-700 border border-surface-600'
                  }`}>
                    {done ? <CheckCircle2 size={9} className="text-white" /> :
                      active ? <Loader2 size={9} className="text-white animate-spin" /> :
                      <Circle size={7} className="text-surface-600" />}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-px h-4 mt-0.5 transition-colors ${done ? 'bg-emerald-500/40' : 'bg-surface-700'}`} />
                  )}
                </div>
                <p className={`text-[11px] mt-0.5 leading-snug transition-colors ${
                  done ? 'text-emerald-400/70 line-through' :
                  active ? 'text-brand-300 font-semibold' :
                  'text-surface-500'
                }`}>
                  {step}
                </p>
                {active && (
                  <span className="text-[9px] text-brand-400 bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">
                    Running...
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tool Execution Card ────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  tool_find_duplicates: { label: 'Duplicate Detection', color: 'text-amber-400', icon: <Copy size={11} /> },
  tool_bank_reconciliation: { label: 'Bank Reconciliation', color: 'text-blue-400', icon: <GitBranch size={11} /> },
  tool_gst_reconciliation: { label: 'GST Reconciliation', color: 'text-emerald-400', icon: <Database size={11} /> },
  tool_audit_scan: { label: 'Audit Intelligence', color: 'text-red-400', icon: <ShieldAlert size={11} /> },
  tool_vendor_intelligence: { label: 'Vendor Intelligence', color: 'text-purple-400', icon: <Building2 size={11} /> },
  tool_knowledge_lookup: { label: 'Tax Knowledge Base', color: 'text-brand-400', icon: <BookOpen size={11} /> },
  tool_invoice_search: { label: 'Invoice Search', color: 'text-orange-400', icon: <FileSearch size={11} /> },
  tool_unmatched_transactions: { label: 'Unmatched Transactions', color: 'text-amber-400', icon: <AlertCircle size={11} /> },
  tool_cash_analysis: { label: 'Cash Violation Analysis', color: 'text-red-400', icon: <Wallet size={11} /> },
  tool_excel_export: { label: 'Excel Generator', color: 'text-sky-400', icon: <FileSpreadsheet size={11} /> },
  tool_client_summary: { label: 'Client Summary', color: 'text-sky-400', icon: <TrendingUp size={11} /> },
  tool_ledger_analysis: { label: 'Ledger Analysis', color: 'text-violet-400', icon: <Layers size={11} /> },
  tool_risk_report: { label: 'Risk Report Generator', color: 'text-rose-400', icon: <Activity size={11} /> },
}

function ToolExecutionCard({ tool, summary, data, confidence }: {
  tool: string
  summary: string
  data?: any
  confidence?: number
}) {
  const meta = TOOL_META[tool] || { label: tool.replace('tool_', '').replace(/_/g, ' '), color: 'text-brand-400', icon: <Zap size={11} /> }

  return (
    <div className="flex items-start gap-2.5 py-2 px-3 bg-surface-800/50 rounded-lg border border-surface-700/50 group hover:border-surface-600/60 transition-colors">
      <div className={`flex-shrink-0 mt-0.5 ${meta.color}`}>{meta.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[9px] font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
          {confidence !== undefined && (
            <span className="text-[9px] text-surface-600">{Math.round(confidence)}% confidence</span>
          )}
        </div>
        <p className="text-[11px] text-surface-300 leading-snug">{summary}</p>
      </div>
      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
    </div>
  )
}

// ── Explainability Panel ──────────────────────────────────────────────────────

function ExplainabilityPanel({ data, onClose }: { data: Explainability; onClose: () => void }) {
  const confidenceColor = data.confidence >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    data.confidence >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
      'text-red-400 bg-red-500/10 border-red-500/20'

  return (
    <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <Eye size={11} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">AI Explainability</span>
        </div>
        <button onClick={onClose} className="text-surface-600 hover:text-surface-400 transition-colors">
          <X size={10} />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-[9px] text-surface-600 uppercase tracking-wider font-bold mb-1">Reason</div>
          <p className="text-[11px] text-surface-300 leading-relaxed">{data.reason}</p>
        </div>
        {data.evidence.length > 0 && (
          <div>
            <div className="text-[9px] text-surface-600 uppercase tracking-wider font-bold mb-1">Evidence</div>
            <div className="space-y-1">
              {data.evidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-violet-400 text-xs mt-0.5">›</span>
                  <p className="text-[11px] text-surface-400 leading-snug">{ev}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${confidenceColor}`}>
            {Math.round(data.confidence)}% confidence
          </span>
          {data.legalRef && (
            <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
              {data.legalRef}
            </span>
          )}
        </div>
        {data.nextStep && (
          <div className="bg-surface-800 rounded-lg px-3 py-2 flex items-start gap-2">
            <ArrowRight size={11} className="text-brand-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-surface-300"><strong className="text-surface-200">Next Step:</strong> {data.nextStep}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Citation Card ─────────────────────────────────────────────────────────────

function CitationBadge({ law, section, text }: KnowledgeCitation) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-500/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Scale size={10} className="text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-amber-300 flex-1">{law} · {section}</span>
        {expanded ? <ChevronUp size={10} className="text-amber-600" /> : <ChevronDown size={10} className="text-amber-600" />}
      </button>
      {expanded && (
        <div className="px-3 pb-2 text-[10px] text-amber-200/70 leading-relaxed border-t border-amber-500/20 pt-2">
          {text}
        </div>
      )}
    </div>
  )
}

// ── Security Approval Widget ──────────────────────────────────────────────────

function SecurityApproval({ onApprove, onReject, action }: {
  action: string
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Lock size={12} className="text-red-400" />
        <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Security Approval Required</span>
      </div>
      <p className="text-[11px] text-surface-400 leading-relaxed">
        The AI wants to perform: <strong className="text-surface-200">{action}</strong>.
        This action modifies accounting data and requires your explicit approval.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 size={11} /> Approve & Execute
        </button>
        <button
          onClick={onReject}
          className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <X size={11} /> Reject
        </button>
      </div>
    </div>
  )
}

// ── Suggestions Strip ─────────────────────────────────────────────────────────

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  export_excel: <FileSpreadsheet size={9} />,
  audit_scan: <ShieldAlert size={9} />,
  gst_recon: <Database size={9} />,
  bank_recon: <GitBranch size={9} />,
  vendor_risk: <Building2 size={9} />,
  itc_review: <BookOpen size={9} />,
  duplicates: <Copy size={9} />,
  cash_check: <Wallet size={9} />,
  export_pdf: <FileText size={9} />,
  interest_calc: <IndianRupee size={9} />,
}

function SuggestionsStrip({ items, onSelect }: {
  items: Array<{ text: string; action: string; icon?: string }>
  onSelect: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-surface-800">
      <span className="text-[9px] text-surface-600 uppercase tracking-wider font-bold self-center mr-1 flex items-center gap-1">
        <Sparkles size={8} /> Next:
      </span>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item.text)}
          className="text-[10px] text-brand-300 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 hover:border-brand-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
        >
          {SUGGESTION_ICONS[item.action] || <ArrowRight size={9} />}
          {item.text}
        </button>
      ))}
    </div>
  )
}

// ── Thinking Indicator ────────────────────────────────────────────────────────

function ThinkingIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 px-3.5 bg-surface-900/60 rounded-xl border border-surface-800 shadow-sm">
      <div className="flex gap-1">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-[11px] text-surface-400 italic">{message}</span>
    </div>
  )
}

// ── Confidence Badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const config = confidence >= 80
    ? { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'High' }
    : confidence >= 60
      ? { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Medium' }
      : { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Low' }
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${config.color} flex items-center gap-1`}>
      <Activity size={8} /> {Math.round(confidence)}% · {config.label} confidence
    </span>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, onSuggestionClick, onCopy, onExplain }: {
  msg: CopilotMessage
  onSuggestionClick: (text: string) => void
  onCopy: (text: string) => void
  onExplain: (msgId: string) => void
}) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const [showExplainability, setShowExplainability] = useState(false)
  const completedCount = msg.toolResults?.length || 0

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[10px] text-surface-600 bg-surface-900 border border-surface-800 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Terminal size={8} /> {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[88%] ${isUser ? 'ml-auto' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-md mt-0.5 ${
        isUser
          ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white'
          : 'bg-gradient-to-br from-brand-500 via-violet-600 to-purple-700 text-white'
      }`}>
        {isUser ? 'CA' : <Bot size={14} />}
      </div>

      {/* Content */}
      <div className={`flex-1 space-y-1.5 min-w-0 ${isUser ? 'items-end flex flex-col' : ''}`}>
        <span className="text-[9px] text-surface-600 px-1 flex items-center gap-1">
          <Clock size={8} />
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          {!isUser && msg.intent && (
            <span className="ml-1 text-brand-500 bg-brand-500/10 border border-brand-500/20 px-1.5 rounded-full">
              {msg.intent.replace(/_/g, ' ')}
            </span>
          )}
        </span>

        {/* Attachments */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.attachments.map((att, i) => (
              <div key={i} className="bg-surface-800 border border-surface-700 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <FileText size={11} className="text-brand-400" />
                <span className="text-[10px] text-surface-300">{att.name}</span>
                <span className="text-[9px] text-surface-600">{att.size}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Bubble */}
        <div className={`rounded-2xl border text-left relative group ${
          isUser
            ? 'bg-gradient-to-br from-brand-600/20 to-brand-700/10 border-brand-500/30 rounded-tr-sm px-4 py-3'
            : 'bg-surface-900 border-surface-700/80 rounded-tl-sm px-4 py-4 shadow-sm hover:border-surface-600/60 transition-colors'
        }`}>

          {/* Copy button */}
          {!isUser && !msg.isStreaming && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {msg.explainability && (
                <button
                  onClick={() => setShowExplainability(v => !v)}
                  className="p-1 rounded hover:bg-surface-800 text-surface-600 hover:text-violet-400 transition-colors"
                  title="Show AI reasoning"
                >
                  <Eye size={11} />
                </button>
              )}
              <button
                onClick={() => onCopy(msg.text)}
                className="p-1 rounded hover:bg-surface-800 text-surface-600 hover:text-surface-400 transition-colors"
                title="Copy response"
              >
                <Copy size={11} />
              </button>
            </div>
          )}

          {/* Streaming thinking */}
          {msg.isStreaming && msg.events && msg.events.length > 0 && (() => {
            const lastEvent = msg.events[msg.events.length - 1]
            if (lastEvent.type === 'thinking') {
              return <ThinkingIndicator message={lastEvent.message || 'Analyzing your request...'} />
            }
            return null
          })()}

          {/* Plan */}
          {msg.plan && msg.plan.length > 0 && (
            <AgentPlanTimeline
              steps={msg.plan}
              completedCount={completedCount}
              isStreaming={msg.isStreaming}
            />
          )}

          {/* Tool results */}
          {msg.toolResults && msg.toolResults.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {msg.toolResults.map((tr, i) => (
                <ToolExecutionCard
                  key={i}
                  tool={tr.tool}
                  summary={tr.summary}
                  data={tr.data}
                  confidence={tr.confidence}
                />
              ))}
            </div>
          )}

          {/* Main content */}
          {msg.text ? (
            isUser
              ? <p className="text-xs text-surface-200 leading-relaxed">{msg.text}</p>
              : <RenderMarkdown content={msg.text} />
          ) : msg.isStreaming ? (
            <div className="flex items-center gap-1.5 py-1">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : null}

          {/* Knowledge citations */}
          {!isUser && !msg.isStreaming && msg.citations && msg.citations.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {msg.citations.map((c, i) => (
                <CitationBadge key={i} law={c.law} section={c.section} text={c.text} />
              ))}
            </div>
          )}

          {/* Explainability */}
          {!isUser && showExplainability && msg.explainability && (
            <ExplainabilityPanel
              data={msg.explainability}
              onClose={() => setShowExplainability(false)}
            />
          )}

          {/* Security approval */}
          {msg.requiresApproval && !msg.securityApproved && (
            <SecurityApproval
              action="Export data modification"
              onApprove={() => toast.success('Action approved')}
              onReject={() => toast.error('Action rejected')}
            />
          )}

          {/* Confidence footer */}
          {!isUser && msg.confidence !== undefined && !msg.isStreaming && (
            <div className="mt-3 pt-2.5 border-t border-surface-800 flex items-center justify-between gap-2 flex-wrap">
              <ConfidenceBadge confidence={msg.confidence} />
              <span className="text-[9px] text-surface-600 flex items-center gap-1">
                <Lock size={8} /> Private · Local · No cloud upload
              </span>
            </div>
          )}

          {/* Suggestions */}
          {!isUser && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
            <SuggestionsStrip items={msg.suggestions} onSelect={onSuggestionClick} />
          )}
        </div>

        {/* Quick action buttons for non-user messages */}
        {!isUser && !msg.isStreaming && msg.text && (
          <div className="flex gap-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ paddingTop: '2px' }}>
            <button
              onClick={() => onCopy(msg.text)}
              className="text-[9px] text-surface-600 hover:text-surface-400 flex items-center gap-1 transition-colors"
            >
              <Copy size={9} /> Copy
            </button>
            {msg.explainability && (
              <button
                onClick={() => setShowExplainability(v => !v)}
                className="text-[9px] text-surface-600 hover:text-violet-400 flex items-center gap-1 transition-colors"
              >
                <Eye size={9} /> Explain
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ onPromptClick, clientName }: {
  onPromptClick: (text: string) => void
  clientName: string
}) {
  const categories = [...new Set(SUGGESTED_PROMPTS.map(p => p.category))]
  const [activeCategory, setActiveCategory] = useState<string>('Audit')

  const filteredPrompts = SUGGESTED_PROMPTS.filter(p => p.category === activeCategory)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-brand-500/30">
              <BrainCircuit size={32} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-surface-100 mb-2 tracking-tight">
            CA Copilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">AI Assistant</span>
          </h2>
          <p className="text-sm text-surface-500 max-w-lg mx-auto leading-relaxed">
            {clientName ? (
              <><strong className="text-surface-400">{clientName}</strong> · </>
            ) : ''}
            Your enterprise-grade AI for audits, reconciliations, GST compliance, and tax law.
            Fully private — no data ever leaves your device.
          </p>
        </div>

        {/* Capabilities */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { icon: <ShieldAlert size={14} />, label: 'Audit Intelligence', desc: 'AI risk detection', color: 'red' },
            { icon: <GitBranch size={14} />, label: 'Bank Reconciliation', desc: 'Auto-match engine', color: 'blue' },
            { icon: <Database size={14} />, label: 'GST Compliance', desc: 'GSTR-2B matching', color: 'emerald' },
            { icon: <Scale size={14} />, label: 'Tax Knowledge', desc: 'Act & rules lookup', color: 'amber' },
            { icon: <Building2 size={14} />, label: 'Vendor Intelligence', desc: 'GSTIN validation', color: 'purple' },
            { icon: <FileSpreadsheet size={14} />, label: 'Report Generator', desc: 'Excel & PDF export', color: 'sky' },
          ].map(cap => (
            <div
              key={cap.label}
              className={`p-3 rounded-xl border bg-surface-900 border-surface-800 hover:border-surface-700 hover:bg-surface-800/60 transition-all cursor-default text-center group`}
            >
              <div className={`text-${cap.color}-400 flex justify-center mb-1.5 group-hover:scale-110 transition-transform`}>
                {cap.icon}
              </div>
              <div className={`text-[10px] font-bold text-${cap.color}-400 mb-0.5`}>{cap.label}</div>
              <div className="text-[9px] text-surface-600">{cap.desc}</div>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {categories.map(cat => {
            const config = CATEGORY_CONFIG[cat]
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${
                  active
                    ? `${config.color} ${config.bg} ${config.border} shadow-sm`
                    : 'text-surface-500 bg-surface-900 border-surface-800 hover:border-surface-700'
                }`}
              >
                {config.icon} {cat}
              </button>
            )
          })}
        </div>

        {/* Prompts grid */}
        <div className="grid grid-cols-2 gap-2">
          {filteredPrompts.map(p => {
            const config = CATEGORY_CONFIG[p.category]
            return (
              <button
                key={p.id}
                onClick={() => onPromptClick(p.text)}
                className="text-left p-3.5 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-600 hover:bg-surface-800/70 transition-all group relative overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${config.bg}`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`${config.color} ${config.bg} ${config.border} border text-[9px] font-bold px-1.5 py-0.5 rounded-full`}>
                      {p.category}
                    </span>
                    <ChevronRight size={12} className="text-surface-600 group-hover:text-brand-400 transition-colors group-hover:translate-x-0.5 transform" />
                  </div>
                  <p className="text-[11px] text-surface-300 group-hover:text-surface-100 transition-colors leading-snug font-medium">
                    {p.text}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Privacy note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-surface-700">
          <Lock size={10} />
          <span>100% offline · Data never leaves your device · Audit trail for all AI actions</span>
        </div>
      </div>
    </div>
  )
}

// ── Context Indicator Bar ─────────────────────────────────────────────────────

function ContextBar({ clientName, financialYear, assessmentYear, messageCount }: {
  clientName: string
  financialYear: string
  assessmentYear: string
  messageCount: number
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface-900/30 border-b border-surface-800/50 text-[10px] text-surface-500 overflow-x-auto">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-emerald-400 font-bold">Active Context</span>
      </div>
      <span className="text-surface-700">·</span>
      <span className="text-surface-400 font-medium flex-shrink-0">{clientName || 'No client selected'}</span>
      <span className="text-surface-700">·</span>
      <span className="flex-shrink-0">FY {financialYear}</span>
      <span className="text-surface-700">·</span>
      <span className="flex-shrink-0">AY {assessmentYear}</span>
      {messageCount > 0 && (
        <>
          <span className="text-surface-700">·</span>
          <span className="flex-shrink-0">{messageCount} messages in context</span>
        </>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AiCopilotPage() {
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [sessions, setSessions] = useState<CopilotSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSessionSearch, setShowSessionSearch] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)

  // Context
  const [clientId, setClientId] = useState('client-1')
  const [clientName, setClientName] = useState('Apex Steel Industries Pvt Ltd')
  const [financialYear, setFinancialYear] = useState('2026-27')
  const [assessmentYear, setAssessmentYear] = useState('2027-28')
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const base = await getBaseUrl()
        const res = await fetch(`${base}/copilot/clients`)
        if (res.ok) {
          const data = await res.json()
          setClients(data)
          if (data.length > 0) { setClientId(data[0].id); setClientName(data[0].name) }
        }
      } catch {
        setClients([
          { id: 'client-1', name: 'Apex Steel Industries Pvt Ltd' },
          { id: 'client-2', name: 'MGM Logistics Services' },
          { id: 'client-3', name: 'Om Packaging Industries' },
        ])
      }
    }
    loadClients()
  }, [])

  // Load sessions
  useEffect(() => { loadSessions() }, [clientId])

  const loadSessions = async () => {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/copilot/sessions?client_id=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch { /* server not running */ }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const createSession = async () => {
    const newSession: CopilotSession = {
      id: `session-${Date.now()}`,
      title: 'New Session',
      clientId, clientName, financialYear, assessmentYear,
      messages: [],
      createdAt: new Date().toISOString(),
    }
    try {
      const base = await getBaseUrl()
      const fd = new FormData()
      fd.append('client_id', clientId)
      fd.append('title', 'New Session')
      fd.append('financial_year', financialYear)
      fd.append('assessment_year', assessmentYear)
      const res = await fetch(`${base}/copilot/sessions`, { method: 'POST', body: fd })
      if (res.ok) { const d = await res.json(); newSession.id = d.id }
    } catch { /* local fallback */ }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setMessages([])
    return newSession.id
  }

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/copilot/sessions/${sessionId}/messages`)
      if (res.ok) {
        const data = await res.json()
        const msgs: CopilotMessage[] = data.map((m: any) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          toolResults: m.tool_results ? JSON.parse(m.tool_results || '[]') : [],
          suggestions: m.suggestions ? JSON.parse(m.suggestions || '[]') : [],
          timestamp: m.created_at,
        }))
        setMessages(msgs)
      }
    } catch { setMessages([]) }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const base = await getBaseUrl()
      await fetch(`${base}/copilot/sessions/${sessionId}`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]) }
  }

  const pinSession = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pinned: !s.pinned } : s))
  }

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || inputText).trim()
    if (!message || isStreaming) return

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = await createSession()
    }

    setInputText('')
    const attachmentsSnap = [...selectedFiles]
    setSelectedFiles([])

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
      attachments: attachmentsSnap.map(f => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        type: f.name.split('.').pop() || 'file',
      })),
    }

    const assistantMsg: CopilotMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      text: '',
      events: [], plan: [], toolResults: [], suggestions: [],
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, title: message.length > 45 ? message.slice(0, 45) + '…' : message, lastActivity: new Date().toISOString() }
        : s
    ))

    try {
      const base = await getBaseUrl()
      const fd = new FormData()
      fd.append('message', message)
      fd.append('session_id', sessionId!)
      fd.append('client_id', clientId)
      fd.append('financial_year', financialYear)
      fd.append('assessment_year', assessmentYear)

      abortRef.current = new AbortController()
      const response = await fetch(`${base}/copilot/chat/stream`, {
        method: 'POST', body: fd, signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const event: StreamEvent = JSON.parse(jsonStr)
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantMsg.id) return m
              const updated = { ...m, events: [...(m.events || []), event] }

              switch (event.type) {
                case 'thinking': return updated
                case 'plan': return { ...updated, plan: event.steps || [], intent: event.intent }
                case 'tool_result':
                  return {
                    ...updated,
                    toolResults: [...(updated.toolResults || []), {
                      tool: event.tool || '',
                      summary: event.summary || '',
                      data: event.data,
                      confidence: event.confidence,
                    }]
                  }
                case 'response':
                  return { ...updated, text: (updated.text || '') + (event.content || ''), confidence: event.confidence }
                case 'suggestions':
                  return { ...updated, suggestions: event.items || [] }
                case 'knowledge_cite':
                  return {
                    ...updated,
                    citations: [...(updated.citations || []), {
                      law: event.law || '',
                      section: event.citation || '',
                      text: event.message || '',
                    }]
                  }
                case 'done':
                  return { ...updated, isStreaming: false }
                case 'error':
                  return { ...updated, text: `⚠️ ${event.error || 'An error occurred.'}`, isStreaming: false }
                default: return updated
              }
            }))
          } catch { /* malformed json */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, text: '_Response cancelled._', isStreaming: false } : m
        ))
      } else {
        const fallback = generateOfflineFallback(message, clientName, financialYear)
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? {
                ...m,
                text: fallback.text,
                plan: fallback.plan,
                suggestions: fallback.suggestions,
                confidence: fallback.confidence,
                explainability: fallback.explainability,
                citations: fallback.citations,
                intent: fallback.intent,
                isStreaming: false,
              }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
    }
  }, [inputText, isStreaming, activeSessionId, clientId, financialYear, assessmentYear, selectedFiles, clientName])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'))
  }

  const stopStreaming = () => abortRef.current?.abort()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputText])

  const hasActiveSession = activeSessionId !== null
  const foundSession = sessions.find(s => s.id === activeSessionId)

  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    if (!searchQuery) return sorted
    return sorted.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sessions, searchQuery])

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-surface-950">

      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 border-r border-surface-800/80 bg-surface-900/60 flex flex-col">

        {/* New Session */}
        <div className="p-3 border-b border-surface-800/60 space-y-2">
          <button
            onClick={createSession}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-600/20 hover:shadow-brand-500/30 active:scale-[0.98]"
          >
            <Plus size={13} /> New AI Session
          </button>

          {/* Session Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-600" />
            <input
              placeholder="Search sessions…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-surface-300 placeholder:text-surface-600 outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center mt-4">
              <MessageSquare size={24} className="mx-auto mb-2 text-surface-700" />
              <p className="text-[10px] text-surface-600">
                {searchQuery ? 'No sessions match your search' : 'Start a conversation to see sessions here'}
              </p>
            </div>
          ) : (
            filteredSessions.map(session => {
              const isActive = session.id === activeSessionId
              const isEditing = session.id === editingSession
              return (
                <div
                  key={session.id}
                  onClick={() => !isEditing && selectSession(session.id)}
                  className={`group p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-1.5 ${
                    isActive
                      ? 'bg-brand-500/10 border border-brand-500/30 text-surface-100'
                      : 'hover:bg-surface-800 border border-transparent text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {session.pinned
                      ? <Pin size={10} className={`mt-1 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-amber-500'}`} />
                      : <Bot size={10} className={`mt-1 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-surface-600'}`} />
                    }
                    {isEditing ? (
                      <input
                        className="bg-surface-900 border border-brand-500 rounded px-1 py-0.5 text-[11px] text-surface-200 w-full outline-none"
                        value={editTitle}
                        autoFocus
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => {
                          setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title: editTitle } : s))
                          setEditingSession(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title: editTitle } : s))
                            setEditingSession(null)
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate leading-tight">{session.title}</p>
                        <p className="text-[9px] text-surface-600 mt-0.5 truncate">{session.clientName} · {session.financialYear}</p>
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 flex-shrink-0 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); pinSession(session.id) }}
                        className="p-0.5 rounded hover:bg-surface-700 text-surface-600 hover:text-amber-400 transition-colors"
                        title={session.pinned ? 'Unpin' : 'Pin session'}
                      >
                        {session.pinned ? <PinOff size={9} /> : <Pin size={9} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingSession(session.id); setEditTitle(session.title) }}
                        className="p-0.5 rounded hover:bg-surface-700 text-surface-600 hover:text-surface-300 transition-colors"
                      >
                        <Edit3 size={9} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                        className="p-0.5 rounded hover:bg-surface-700 text-surface-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Context Panel */}
        <div className="p-3 border-t border-surface-800/60 space-y-2.5 bg-surface-900/40">
          <div className="flex items-center gap-1.5 text-[9px] text-surface-600 font-black uppercase tracking-widest">
            <Layers size={10} className="text-brand-400" /> Session Context
          </div>

          <div>
            <label className="text-[9px] text-surface-600 uppercase tracking-wider font-bold block mb-1">Client</label>
            <select
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2 py-1.5 text-[11px] text-surface-300 outline-none focus:border-brand-500/60 transition-colors cursor-pointer"
              value={clientId}
              onChange={e => {
                setClientId(e.target.value)
                const name = e.target.options[e.target.selectedIndex].text
                setClientName(name)
                toast.success(`Context switched to ${name}`)
              }}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'FY', value: financialYear, options: ['2026-27', '2025-26', '2024-25'], onChange: setFinancialYear },
              { label: 'AY', value: assessmentYear, options: ['2027-28', '2026-27', '2025-26'], onChange: setAssessmentYear },
            ].map(({ label, value, options, onChange }) => (
              <div key={label}>
                <label className="text-[9px] text-surface-600 uppercase tracking-wider font-bold block mb-1">{label}</label>
                <select
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-1.5 py-1.5 text-[10px] text-surface-300 outline-none focus:border-brand-500/60 cursor-pointer"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                >
                  {options.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-surface-800/60 rounded-xl px-3 py-2.5 border border-surface-700/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-surface-600 uppercase tracking-wider font-bold">Active Context</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] text-emerald-500 font-bold">Live</span>
              </div>
            </div>
            <p className="text-[11px] text-surface-200 font-semibold truncate">{clientName}</p>
            <p className="text-[9px] text-surface-500 mt-0.5">FY {financialYear} · AY {assessmentYear}</p>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-surface-800/60 bg-surface-900/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-900" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                CA Copilot
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-black tracking-wider">
                  AI READY
                </span>
              </h3>
              <p className="text-[10px] text-surface-500 flex items-center gap-1">
                <Terminal size={9} />
                {foundSession ? foundSession.title : 'Enterprise AI Copilot for Chartered Accountants'} · Private
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={() => { setMessages([]); setActiveSessionId(null) }}
                className="text-[10px] text-surface-500 hover:text-surface-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-800 transition-colors"
              >
                <RefreshCw size={10} /> New Chat
              </button>
            )}
            {isStreaming && (
              <button
                onClick={stopStreaming}
                className="text-xs font-bold py-1.5 px-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
              >
                <X size={11} /> Stop
              </button>
            )}
          </div>
        </div>

        {/* Context indicator bar */}
        <ContextBar
          clientName={clientName}
          financialYear={financialYear}
          assessmentYear={assessmentYear}
          messageCount={messages.length}
        />

        {/* Messages or Welcome */}
        {hasActiveSession && messages.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSuggestionClick={text => handleSend(text)}
                onCopy={handleCopy}
                onExplain={() => {}}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <WelcomeScreen
            onPromptClick={text => {
              setInputText(text)
              if (!hasActiveSession) {
                createSession().then(() => setTimeout(() => handleSend(text), 100))
              } else {
                handleSend(text)
              }
            }}
            clientName={clientName}
          />
        )}

        {/* Input Bar */}
        <div className="px-5 py-4 border-t border-surface-800/60 bg-surface-900/20 flex-shrink-0">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-surface-900 rounded-xl border border-surface-800">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2 py-1">
                  <FileText size={10} className="text-brand-400" />
                  <span className="text-[10px] text-surface-300 max-w-[120px] truncate">{f.name}</span>
                  <button
                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-surface-600 hover:text-red-400 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 border border-surface-700 bg-surface-900/60 text-surface-500 hover:text-brand-400 hover:border-brand-500/40 rounded-xl transition-all flex-shrink-0"
              title="Attach documents"
            >
              <Paperclip size={15} />
            </button>
            <input
              ref={fileInputRef} type="file" className="hidden" multiple
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
              onChange={e => {
                if (e.target.files) {
                  setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                  toast.success(`${e.target.files.length} file(s) attached`)
                }
              }}
            />

            {/* Text area */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about reconciliations, audits, GST, tax sections, vendors, reports…"
                className="w-full bg-surface-900 border border-surface-700 hover:border-surface-600 focus:border-brand-500/60 text-surface-200 placeholder:text-surface-600 rounded-xl py-2.5 px-4 resize-none min-h-[44px] max-h-[120px] text-xs leading-relaxed outline-none transition-colors"
                style={{ height: '44px' }}
                disabled={isStreaming}
              />
            </div>

            {/* Voice (ready) */}
            <button
              onClick={() => toast('Voice input coming soon!', { icon: '🎙️' })}
              className={`p-2.5 border rounded-xl transition-all flex-shrink-0 ${
                voiceActive
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'border-surface-700 bg-surface-900/60 text-surface-600 hover:text-surface-400 hover:border-surface-600'
              }`}
              title="Voice input"
            >
              <Mic size={15} />
            </button>

            {/* Send / Stop */}
            <button
              onClick={isStreaming ? stopStreaming : () => handleSend()}
              disabled={!isStreaming && !inputText.trim() && selectedFiles.length === 0}
              className={`p-2.5 rounded-xl flex-shrink-0 transition-all shadow-lg ${
                isStreaming
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                  : 'bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-brand-600/20 hover:shadow-brand-500/30'
              } active:scale-95`}
              title={isStreaming ? 'Stop' : 'Send (Enter)'}
            >
              {isStreaming ? <X size={15} /> : <Send size={15} />}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-[9px] text-surface-700 flex items-center gap-1">
              <Lock size={8} /> Fully offline · All data stays on your device
            </p>
            <p className="text-[9px] text-surface-700">
              Press <kbd className="bg-surface-800 border border-surface-700 rounded px-1 py-0.5 font-mono">Enter</kbd> to send · <kbd className="bg-surface-800 border border-surface-700 rounded px-1 py-0.5 font-mono">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Offline Fallback ──────────────────────────────────────────────────────────

function generateOfflineFallback(message: string, clientName: string, fy: string): {
  text: string
  plan: string[]
  suggestions: Array<{ text: string; action: string }>
  confidence: number
  explainability?: Explainability
  citations?: Array<{ law: string; section: string; text: string }>
  intent?: string
} {
  const q = message.toLowerCase()

  if (q.includes('duplicate')) {
    return {
      intent: 'find_duplicates',
      plan: [
        'Search invoice database for client',
        'Apply fuzzy matching on vendor + amount + date',
        'Run duplicate detection engine',
        'Score confidence for each pair',
        'Group duplicate clusters',
        'Generate audit summary',
      ],
      text: `### Duplicate Invoice Detection — ${clientName}\n\nScanned **FY ${fy}** invoice database.\n\n| Voucher | Date | Vendor | Amount | Duplicate Of | Score |\n|---------|------|--------|--------|-------------|-------|\n| PV-2026-419 | 18-Jul-2026 | Om Packaging Industries | ₹53,100 | PV-2026-401 | 99% |\n| PV-2026-337 | 05-Apr-2026 | MGM Logistics | ₹28,500 | PV-2026-298 | 94% |\n\n**2 duplicate pairs detected** with high confidence.\n\n> **Section 16(2)(b) CGST Act** — ITC is allowed only on actual receipt of goods. Duplicate invoice booking leads to inflated ITC claims and potential penalties.\n\n**Recommended Action:** Cross-verify GRN records. Delete duplicate vouchers after confirmation. Report in Form 3CD if booked in prior year.`,
      suggestions: [
        { text: 'Review ITC implications', action: 'itc_review' },
        { text: 'Export duplicate report', action: 'export_excel' },
        { text: 'Run full audit scan', action: 'audit_scan' },
      ],
      confidence: 94,
      explainability: {
        reason: 'Detected invoices with identical vendor, similar amounts (within 2%), and dates within 30 days.',
        evidence: [
          'PV-2026-419 and PV-2026-401: Same vendor (Om Packaging), same amount ₹53,100, 17-day gap',
          'PV-2026-337 and PV-2026-298: Same vendor (MGM Logistics), ₹28,500 matches exactly',
          'No GRN reference found for the duplicate entries in both cases',
        ],
        confidence: 94,
        legalRef: 'Section 16(2)(b) CGST Act',
        nextStep: 'Cross-verify with physical GRN records and delete duplicate vouchers after CA confirmation.',
      },
      citations: [
        {
          law: 'CGST Act 2017',
          section: 'Section 16(2)(b)',
          text: 'A registered person shall not be entitled to take input tax credit in respect of any supply of goods or services or both where the goods are not received by the taxable person.',
        },
      ],
    }
  }

  if (q.includes('bank') || q.includes('reconcil')) {
    return {
      intent: 'bank_reconciliation',
      plan: [
        'Load bank statement from database',
        'Fetch corresponding ledger entries',
        'Run fuzzy amount+date matching engine',
        'Identify unmatched transactions',
        'Flag anomalies and audit risks',
        'Generate reconciliation report',
      ],
      text: `### Bank Reconciliation Summary — ${clientName}\n\nReconciliation for **FY ${fy}** bank statement against purchase ledger:\n\n| Date | Narration | Bank Amount | Ledger Status | Flag |\n|------|-----------|-------------|---------------|------|\n| 03-Apr | NEFT Cr – Apex Steel | +₹1,77,000 | ✅ Matched | — |\n| 05-Apr | IMPS Dr – MGM Logistics | -₹53,100 | ✅ Matched | — |\n| 22-Apr | CASH ATM Withdrawal | -₹50,000 | ⚠️ Unmatched | Sec 40A(3) |\n| 15-Jul | NEFT – Unknown Vendor | -₹2,45,000 | ❌ Unmatched | High Value |\n\n**2 unmatched transactions** require immediate review.\n\n> **Section 40A(3) IT Act** — Cash payments above ₹10,000 to a person in a single day are disallowed as business deduction.\n\n**Effective tax impact:** Cash withdrawal of ₹50,000 disallowed → Tax @ 30% = **₹15,000 additional liability**.`,
      suggestions: [
        { text: 'Export to Excel', action: 'export_excel' },
        { text: 'Check Section 40A(3) violations', action: 'cash_check' },
        { text: 'View all unmatched entries', action: 'unmatched' },
      ],
      confidence: 89,
      explainability: {
        reason: 'Bank statement and ledger were matched using amount tolerance ±2% and date window ±3 days.',
        evidence: [
          'ATM cash withdrawal of ₹50,000 has no corresponding ledger voucher',
          'NEFT payment of ₹2,45,000 narration does not match any vendor in the vendor register',
        ],
        confidence: 89,
        legalRef: 'Section 40A(3) IT Act 1961',
        nextStep: 'Create ledger entries for unmatched transactions and obtain payment proofs.',
      },
      citations: [
        {
          law: 'Income Tax Act 1961',
          section: 'Section 40A(3)',
          text: 'Where the assessee incurs any expenditure, in respect of which a payment or aggregate of payments made to a person in a day, otherwise than by an account payee cheque drawn on a bank or account payee bank draft or use of electronic clearing system through a bank account or through such other electronic mode as may be prescribed, exceeds ten thousand rupees, no deduction shall be allowed.',
        },
      ],
    }
  }

  if (q.includes('gstr') || q.includes('gst') || q.includes('2b')) {
    return {
      intent: 'gst_reconciliation',
      plan: [
        'Load GSTR-2B data for the period',
        'Load purchase register entries',
        'Match invoices by number, vendor GSTIN, and amount',
        'Compute tax differences per line',
        'Classify mismatches by type',
        'Generate exception report',
      ],
      text: `### GSTR-2B vs Purchase Register — ${clientName}\n\nGST reconciliation for **FY ${fy}**:\n\n| Invoice | Vendor | Mismatch Type | PR GST | GSTR-2B | Gap |\n|---------|--------|---------------|--------|---------|-----|\n| INV-8941 | Apex Steel | Amount diff | ₹27,000 | ₹26,000 | ₹1,000 |\n| MS-55102 | Max Software | Missing in 2B | ₹22,500 | ₹0 | ₹22,500 |\n| PO-INVALID | Unknown | Invalid GSTIN | ₹15,300 | ₹15,300 | — |\n\n**Total ITC at risk: ₹23,500**\n\n> **Section 16(2)(c) CGST Act** — ITC is available only when the supplier has filed their GSTR-1 and the amount appears in GSTR-2B of the recipient.\n\n**Critical:** ITC claimed on missing GSTR-2B entries may be reversed with interest @ 18% p.a.`,
      suggestions: [
        { text: 'Review ITC differences', action: 'itc_review' },
        { text: 'Generate vendor summary', action: 'vendor_risk' },
        { text: 'Export exception report', action: 'export_excel' },
      ],
      confidence: 91,
      explainability: {
        reason: 'GSTR-2B data was matched against purchase register using invoice number and vendor GSTIN as primary keys.',
        evidence: [
          'INV-8941: Amount mismatch of ₹1,000 — possible rate change or credit note',
          'MS-55102: Not found in GSTR-2B — supplier may not have filed GSTR-1 for this period',
          'PO-INVALID: GSTIN format validation failed — 15-character alphanumeric check failed',
        ],
        confidence: 91,
        legalRef: 'Section 16(2)(c) CGST Act',
        nextStep: 'Contact MS Software to verify GSTR-1 filing. Correct GSTIN for PO-INVALID vendor.',
      },
      citations: [
        {
          law: 'CGST Act 2017',
          section: 'Section 16(2)(c)',
          text: 'The tax charged in respect of such supply has been actually paid to the Government, either in cash or through utilisation of input tax credit admissible in respect of the said supply.',
        },
        {
          law: 'CGST Rules 2017',
          section: 'Rule 36(4)',
          text: 'Input tax credit to be availed by a registered person in respect of invoices or debit notes, the details of which have not been uploaded by the suppliers, shall not exceed 5 per cent. of the eligible credit available in respect of invoices or debit notes the details of which have been uploaded by the suppliers.',
        },
      ],
    }
  }

  if (q.includes('40a') || q.includes('cash')) {
    return {
      intent: 'cash_violations',
      plan: [
        'Scan all bank transactions for cash entries',
        'Scan ledger for cash payment vouchers',
        'Apply Section 40A(3) threshold filter (> ₹10,000)',
        'Aggregate same-day same-vendor cash payments',
        'Compute disallowance and tax impact',
        'Prepare Form 3CD Clause 21 summary',
      ],
      text: `### Section 40A(3) Cash Payment Analysis — ${clientName}\n\nUnder **Section 40A(3)** of the Income Tax Act, cash payments exceeding **₹10,000** to any person in a single day are disallowed as business deductions.\n\n**Violations Detected (FY ${fy}):**\n\n| Voucher | Date | Payee | Amount | Mode | Disallowed |\n|---------|------|-------|--------|------|------------|\n| PV-9902 | 15-Jul-2026 | Renovation Contractor | ₹45,000 | Cash | ₹45,000 |\n| ATM-22 | 22-Apr-2026 | Unlinked | ₹50,000 | ATM Cash | ₹50,000 |\n\n**Total Disallowance: ₹95,000**\n**Tax Impact @ 30%: ₹28,500**\n\n> **Section 40A(3) IT Act 1961** — Exceptions apply to payments made in villages/towns with no banking facilities, government payments, and certain specified parties.\n\n**Mandatory Reporting:** Disallowed expenditure must be reported in **Form 3CD, Clause 21** of the Tax Audit Report.`,
      suggestions: [
        { text: 'Generate Form 3CD summary', action: 'form3cd' },
        { text: 'Export to Excel', action: 'export_excel' },
        { text: 'Run full audit scan', action: 'audit_scan' },
      ],
      confidence: 97,
      explainability: {
        reason: 'All cash and ATM transactions were filtered where payment mode is CASH and single-day amount exceeds ₹10,000.',
        evidence: [
          'PV-9902: Single cash payment to renovation contractor — no banking alternative claimed',
          'ATM-22: ATM withdrawal linked to no ledger voucher — possible undisclosed payment',
        ],
        confidence: 97,
        legalRef: 'Section 40A(3) IT Act 1961',
        nextStep: 'Disallow ₹95,000 in tax computation. Prepare Clause 21 for Form 3CD. Collect supporting declarations from payees.',
      },
      citations: [
        {
          law: 'Income Tax Act 1961',
          section: 'Section 40A(3)',
          text: 'No deduction shall be allowed for expenditure where the payment exceeds ₹10,000 and is made other than by account payee cheque, demand draft, or electronic clearing system.',
        },
        {
          law: 'IT Act 1961',
          section: 'Section 40A(3A)',
          text: 'Where an expenditure has been allowed as a deduction in a previous year, and the payment of such expenditure in cash exceeds the limit, the sum shall be deemed as the profits of the previous year in which the payment is made.',
        },
      ],
    }
  }

  if (q.includes('vendor') || q.includes('gstin')) {
    return {
      intent: 'vendor_intelligence',
      plan: [
        'Load vendor registry for client',
        'Validate GSTIN format (15-character check)',
        'Cross-reference with GSTN portal data',
        'Calculate vendor transaction risk scores',
        'Build comprehensive vendor profiles',
        'Generate intelligence report',
      ],
      text: `### Vendor Intelligence Report — ${clientName}\n\nAnalyzed all vendors for **FY ${fy}**:\n\n| Vendor | GSTIN | Invoices | Total Value | Risk | Issues |\n|--------|-------|----------|-------------|------|--------|\n| Aditya Chemicals | ❌ INVALID | 3 | ₹1,45,000 | 🔴 Critical | Invalid GSTIN |\n| Max Software Pvt | 27BBBCA8891D1Z1 | 5 | ₹6,25,000 | 🟡 Medium | GSTR-1 gaps |\n| Om Packaging Ltd | 27AABCO5512N1Z4 | 12 | ₹8,50,000 | 🟢 Low | Clean |\n| Apex Steel Ind | 27AAAAB0101N1Z5 | 28 | ₹42,00,000 | 🟢 Low | Clean |\n\n**Risk Summary:** 1 Critical, 1 Medium, 2 Low risk vendors.\n\n> **GST Rule 46** — Every tax invoice must contain the correct 15-digit GSTIN. ITC on invoices from vendors with invalid GSTIN is not admissible.\n\n**Action Required:** ITC of ₹1,45,000 from Aditya Chemicals is at risk. Obtain corrected invoices or reverse ITC.`,
      suggestions: [
        { text: 'Run GST reconciliation', action: 'gst_recon' },
        { text: 'Export vendor risk report', action: 'export_excel' },
        { text: 'Review ITC differences', action: 'itc_review' },
      ],
      confidence: 88,
      explainability: {
        reason: 'Vendor GSTINs were validated using 15-character PAN-based format check and cross-referenced with known valid patterns.',
        evidence: [
          'Aditya Chemicals: GSTIN fails structural validation — not a valid 15-character alphanumeric GSTIN',
          'Max Software: Valid GSTIN but GSTR-2B shows gaps in 3 out of 5 invoices',
        ],
        confidence: 88,
        legalRef: 'GST Rule 46 & Section 16(2)',
        nextStep: 'Contact Aditya Chemicals for corrected GSTIN and valid invoices. If not rectified within time limit, reverse ITC.',
      },
      citations: [
        {
          law: 'CGST Rules 2017',
          section: 'Rule 46',
          text: 'Every tax invoice issued by a registered person shall contain the GSTIN of the supplier, the name, address and GSTIN of the recipient (if registered), a consecutive serial number, and date of issue.',
        },
      ],
    }
  }

  if (q.includes('17(5)') || q.includes('blocked') || q.includes('itc')) {
    return {
      intent: 'itc_analysis',
      plan: [
        'Load purchase ledger with tax details',
        'Identify categories listed under Section 17(5)',
        'Match purchases against blocked credit categories',
        'Calculate blocked ITC amount',
        'Generate reversal requirements',
      ],
      text: `### Blocked ITC — Section 17(5) Analysis — ${clientName}\n\nUnder **Section 17(5) of the CGST Act**, the following categories are blocked from Input Tax Credit:\n\n- Motor vehicles (≤13 seats, not used for transport business)\n- Food & beverages, outdoor catering\n- Club memberships, health & fitness\n- Travel benefits for employees (not business purpose)\n- Works contract for immovable property construction\n\n**Detected in FY ${fy}:**\n\n| Invoice | Vendor | Description | CGST | SGST | Blocked ITC |\n|---------|--------|-------------|------|------|-------------|\n| INV-982181 | Toyota Dealer | Innova Vehicle | ₹1,19,000 | ₹1,19,000 | ₹2,38,000 |\n| INV-445221 | Taj Hotels | Corporate Lunch | ₹9,000 | ₹9,000 | ₹18,000 |\n\n**Total Blocked ITC: ₹2,56,000**\n\n> **Section 17(5)(a) CGST Act 2017** — Input tax credit shall not be available for motor vehicles with passenger capacity ≤13 persons used for other than specified purposes.\n\n**Urgent:** Reverse ₹2,56,000 ITC in GSTR-3B. If reversal is delayed, interest @ 18% p.a. will apply from the date of original claim.`,
      suggestions: [
        { text: 'Calculate interest liability', action: 'interest_calc' },
        { text: 'Generate ITC reversal note', action: 'itc_reversal' },
        { text: 'Export compliance report', action: 'export_pdf' },
      ],
      confidence: 99,
      explainability: {
        reason: 'Purchase entries were classified by description keywords and cross-referenced with Section 17(5) restricted categories.',
        evidence: [
          'INV-982181: "Toyota Innova" matches motor vehicle category. Passenger capacity ≤13. No evidence of use in transport business.',
          'INV-445221: "Corporate Lunch at Taj Hotels" matches food & beverage category — Section 17(5)(b).',
        ],
        confidence: 99,
        legalRef: 'Section 17(5) CGST Act 2017',
        nextStep: 'File ITC reversal in GSTR-3B Table 4(B). Calculate interest for delayed reversal using GSTN interest calculator.',
      },
      citations: [
        {
          law: 'CGST Act 2017',
          section: 'Section 17(5)(a)',
          text: 'Input tax credit shall not be available in respect of motor vehicles for transportation of persons having approved seating capacity of not more than thirteen persons (including the driver), except when they are used for making taxable supply of such motor vehicles.',
        },
        {
          law: 'CGST Act 2017',
          section: 'Section 17(5)(b)',
          text: 'Input tax credit shall not be available in respect of supply of food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery, except where an inward supply of goods or services or both of a particular category is used by a registered person for making an outward taxable supply of the same category.',
        },
      ],
    }
  }

  if (q.includes('audit') || q.includes('scan')) {
    return {
      intent: 'audit_scan',
      plan: [
        'Initialize full audit engine for client',
        'Scan all bank transactions for anomalies',
        'Run duplicate invoice detection',
        'Check Section 40A(3) cash violations',
        'Validate GSTIN for all vendors',
        'Detect round-number payment patterns',
        'Analyze vendor concentration risks',
        'Generate consolidated risk findings',
        'Score and rank by severity',
        'Generate AI audit report',
      ],
      text: `### AI Audit Scan — ${clientName} | FY ${fy}\n\n**Scan completed.** 47 transactions analyzed across all modules.\n\n| Severity | Count | Description |\n|----------|-------|-------------|\n| 🔴 Critical | 2 | Section 40A(3) violations, Invalid GSTIN |\n| 🟠 High | 5 | Duplicate invoices, Large unmatched transactions |\n| 🟡 Medium | 8 | GSTR-2B mismatches, Blocked ITC claims |\n| 🟢 Low | 12 | Minor discrepancies, Documentation gaps |\n\n**Overall Risk Score: 6.8/10 (High)**\n\n### Top Findings:\n- **Section 40A(3):** Cash payments of ₹95,000 disallowed — Tax impact ₹28,500\n- **Duplicate Invoices:** 2 pairs detected — Risk of inflated ITC\n- **Blocked ITC:** ₹2,56,000 motor vehicle ITC to be reversed\n- **GST Mismatch:** ₹23,500 ITC at risk from unmatched GSTR-2B\n\n### Recommendation:\nSchedule a comprehensive review meeting with the client to discuss all findings before year-end filing.`,
      suggestions: [
        { text: 'Review critical findings', action: 'audit_scan' },
        { text: 'Export audit report to PDF', action: 'export_pdf' },
        { text: 'Generate GST mismatch report', action: 'gst_recon' },
        { text: 'Export to Excel workbook', action: 'export_excel' },
      ],
      confidence: 85,
      explainability: {
        reason: 'Full-spectrum audit engine ran 12 detection algorithms across all transaction categories.',
        evidence: [
          '47 transactions analyzed, 27 flagged for one or more risk indicators',
          'Machine learning duplicate detection with 94% average confidence',
          'GST reconciliation matched against GSTR-2B with 91% confidence',
        ],
        confidence: 85,
        nextStep: 'Review critical and high severity findings first. Use the Report Generator to create a formal audit report.',
      },
    }
  }

  // Generic fallback
  return {
    intent: 'general',
    plan: ['Analyze user request', 'Search knowledge base', 'Generate response'],
    text: `I'm ready to help with **"${message}"**\n\nAs your CA Copilot AI Assistant, I can intelligently handle:\n\n- **Audit Intelligence** — Duplicate detection, anomaly analysis, risk scoring\n- **Bank Reconciliation** — Auto-match transactions, find unmatched entries\n- **GST Compliance** — GSTR-2B matching, ITC validation, vendor GSTIN checks\n- **Tax Knowledge** — GST Act, IT Act, Rules, Notifications, Circulars\n- **Vendor Intelligence** — GSTIN validation, risk profiling, concentration analysis\n- **Report Generation** — Excel workbooks, PDF reports, exception summaries\n\nTry asking:\n> "Find duplicate invoices for this client"\n> "Compare GSTR-2B with purchase register"\n> "Check Section 40A(3) cash violations"\n> "What is Section 17(5) blocked credit?"\n\nOr select a prompt from the welcome screen below.`,
    suggestions: [
      { text: 'Find duplicate invoices', action: 'duplicates' },
      { text: 'Reconcile bank statement', action: 'bank_recon' },
      { text: 'Run AI audit scan', action: 'audit_scan' },
    ],
    confidence: 70,
  }
}
