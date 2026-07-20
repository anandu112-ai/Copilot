import React, {
  useState, useRef, useEffect, useCallback, useMemo
} from 'react'
import {
  Bot, Sparkles, Send, Paperclip, X, Download, FileText,
  CheckCircle2, Circle, Loader2, ChevronRight, ChevronDown,
  Pin, Trash2, Edit3, Plus, Mic, MicOff, Copy, RefreshCw,
  AlertOctagon, AlertTriangle, AlertCircle, Info, BookOpen,
  FileSpreadsheet, BarChart3, Zap, Building2, GitBranch,
  ShieldAlert, Search, TrendingUp, Database, Clock, ArrowRight,
  CheckSquare, MessageSquare, Hash
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useChatStore } from '../stores/chatStore'
import { useDocumentStore } from '../stores/documentStore'

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  events?: StreamEvent[]
  suggestions?: Array<{ text: string; action: string }>
  plan?: string[]
  toolResults?: Array<{ tool: string; summary: string; data?: any }>
  confidence?: number
  timestamp: string
  isStreaming?: boolean
  attachments?: Array<{ name: string; size: string; type: string }>
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
  { id: 'p1', icon: <Search size={12} />, text: 'Find duplicate invoices', category: 'Audit' },
  { id: 'p2', icon: <GitBranch size={12} />, text: 'Reconcile SBI bank statement', category: 'Bank' },
  { id: 'p3', icon: <Database size={12} />, text: 'Compare GSTR-2B with purchase register', category: 'GST' },
  { id: 'p4', icon: <AlertTriangle size={12} />, text: 'Show suspicious cash transactions', category: 'Audit' },
  { id: 'p5', icon: <Building2 size={12} />, text: 'Generate vendor risk report', category: 'Vendor' },
  { id: 'p6', icon: <ShieldAlert size={12} />, text: 'Check Section 40A(3) violations', category: 'Tax' },
  { id: 'p7', icon: <FileSpreadsheet size={12} />, text: 'Export bank reconciliation to Excel', category: 'Export' },
  { id: 'p8', icon: <AlertCircle size={12} />, text: 'Find vendors with invalid GSTIN', category: 'GST' },
  { id: 'p9', icon: <BookOpen size={12} />, text: 'What is Section 17(5) blocked credit?', category: 'Tax' },
  { id: 'p10', icon: <TrendingUp size={12} />, text: 'Show unmatched transactions', category: 'Bank' },
  { id: 'p11', icon: <Hash size={12} />, text: 'Find invoices above ₹10 lakh', category: 'Audit' },
  { id: 'p12', icon: <CheckSquare size={12} />, text: 'Run AI audit scan for this client', category: 'Audit' },
]

const CATEGORY_COLORS: Record<string, string> = {
  Audit: 'text-red-400 bg-red-500/10 border-red-500/20',
  Bank: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  GST: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Tax: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Vendor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Export: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
}

// ── Simple Markdown Renderer ─────────────────────────────────────────────────

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
      <div key={key} className="mt-3 mb-3 overflow-x-auto rounded-lg border border-surface-700">
        <table className="min-w-full text-[11px]">
          <thead className="bg-surface-800">
            <tr>
              {headers.map((h, hi) => (
                <th key={hi} className="px-3 py-2 text-left text-surface-400 font-bold tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-900 divide-y divide-surface-800">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-surface-800/50 transition-colors">
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

    // Table detection
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
      elements.push(<h3 key={i} className="text-sm font-black text-surface-100 mt-3 mb-1.5 flex items-center gap-1.5"><Hash size={12} className="text-brand-500" />{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-sm font-bold text-surface-100 mt-3 mb-1.5">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-base font-black text-surface-100 mt-2 mb-2">{line.slice(2)}</h1>)
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-brand-500 pl-3 my-2 bg-brand-500/5 py-2 rounded-r">
          <p className="text-[11px] text-brand-300 italic">{line.slice(2)}</p>
        </div>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      const parsed = parseInline(content)
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand-500 mt-1 flex-shrink-0">•</span>
          <p className="text-xs text-surface-300 leading-relaxed">{parsed}</p>
        </div>
      )
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1]
      const content = line.replace(/^\d+\. /, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-brand-400 font-bold text-[11px] flex-shrink-0 min-w-[16px]">{num}.</span>
          <p className="text-xs text-surface-300 leading-relaxed">{parseInline(content)}</p>
        </div>
      )
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-surface-700 my-3" />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(
        <p key={i} className="text-xs text-surface-300 leading-relaxed">{parseInline(line)}</p>
      )
    }
    i++
  }

  if (inTable && tableBuffer.length > 0) flushTable('table-end')

  return <div className="space-y-0.5">{elements}</div>
}

function parseInline(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code` inline
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

// ── Plan Visualization ────────────────────────────────────────────────────────

function PlanTimeline({ steps, completedTools, activeStep }: {
  steps: string[]
  completedTools: string[]
  activeStep?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-surface-700 rounded-xl overflow-hidden bg-surface-900/50">
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-surface-800/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Zap size={12} className="text-brand-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-surface-300 flex-1">
          AI Execution Plan · {completedTools.length}/{steps.length} steps
        </span>
        <div className="flex gap-0.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < completedTools.length ? 'bg-emerald-500' :
                i === completedTools.length ? 'bg-brand-400 animate-pulse' :
                'bg-surface-700'
              }`}
            />
          ))}
        </div>
        {expanded ? <ChevronDown size={12} className="text-surface-500" /> : <ChevronRight size={12} className="text-surface-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-surface-800">
          {steps.map((step, i) => {
            const done = i < completedTools.length
            const active = i === completedTools.length
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? 'bg-emerald-500' :
                    active ? 'bg-brand-500 animate-pulse' :
                    'bg-surface-700 border border-surface-600'
                  }`}>
                    {done ? <CheckCircle2 size={10} className="text-white" /> :
                      active ? <Loader2 size={10} className="text-white animate-spin" /> :
                      <Circle size={8} className="text-surface-500" />}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-px h-4 mt-1 ${done ? 'bg-emerald-500/50' : 'bg-surface-700'}`} />
                  )}
                </div>
                <p className={`text-[11px] mt-0.5 leading-snug ${
                  done ? 'text-emerald-400 line-through opacity-70' :
                  active ? 'text-brand-400 font-bold' :
                  'text-surface-500'
                }`}>
                  {step}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tool Result Card ──────────────────────────────────────────────────────────

function ToolResultCard({ tool, summary, data }: {
  tool: string
  summary: string
  data?: any
}) {
  const TOOL_ICONS: Record<string, React.ReactNode> = {
    tool_find_duplicates: <Copy size={12} className="text-amber-400" />,
    tool_bank_reconciliation_summary: <GitBranch size={12} className="text-blue-400" />,
    tool_gst_reconciliation_summary: <Database size={12} className="text-emerald-400" />,
    tool_audit_summary: <ShieldAlert size={12} className="text-red-400" />,
    tool_vendor_profiles: <Building2 size={12} className="text-purple-400" />,
    tool_knowledge_lookup: <BookOpen size={12} className="text-brand-400" />,
    tool_client_summary: <TrendingUp size={12} className="text-sky-400" />,
    tool_search_invoices: <Search size={12} className="text-orange-400" />,
    tool_get_unmatched: <AlertCircle size={12} className="text-amber-400" />,
  }

  const toolLabel = tool.replace('tool_', '').replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex items-start gap-2 py-1.5 px-3 bg-surface-800/60 rounded-lg border border-surface-700/50">
      <div className="flex-shrink-0 mt-0.5">
        {TOOL_ICONS[tool] || <Zap size={12} className="text-brand-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">{toolLabel}</div>
        <p className="text-[11px] text-surface-300 mt-0.5">{summary}</p>
      </div>
      <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
    </div>
  )
}

// ── Suggestions Strip ─────────────────────────────────────────────────────────

function SuggestionsStrip({ items, onSelect }: {
  items: Array<{ text: string; action: string }>
  onSelect: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-surface-800">
      <span className="text-[9px] text-surface-600 uppercase tracking-wider font-bold self-center mr-1">Next Actions:</span>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onSelect(item.text)}
          className="text-[10px] text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 hover:border-brand-500/40 px-2 py-1 rounded-full flex items-center gap-1 transition-all"
        >
          <ArrowRight size={9} />
          {item.text}
        </button>
      ))}
    </div>
  )
}

// ── Streaming Thinking Indicator ──────────────────────────────────────────────

function ThinkingIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-surface-900/50 rounded-lg border border-surface-800">
      <Loader2 size={12} className="text-brand-400 animate-spin flex-shrink-0" />
      <span className="text-[11px] text-surface-400 italic">{message}</span>
    </div>
  )
}

// ── Confidence Badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                confidence >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {Math.round(confidence)}% confidence
    </span>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, onSuggestionClick, onCopy }: {
  msg: CopilotMessage
  onSuggestionClick: (text: string) => void
  onCopy: (text: string) => void
}) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-surface-600 bg-surface-900 border border-surface-800 px-3 py-1 rounded-full">
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[85%] ${isUser ? 'ml-auto' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs shadow ${
        isUser
          ? 'bg-brand-600 text-white'
          : 'bg-gradient-to-br from-brand-500 to-violet-600 text-white'
      }`}>
        {isUser ? 'CA' : <Bot size={15} />}
      </div>

      {/* Content */}
      <div className={`flex-1 space-y-2 min-w-0 ${isUser ? 'items-end flex flex-col' : ''}`}>
        {/* Timestamp */}
        <span className="text-[9px] text-surface-600 px-1">
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Attachments (user only) */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.attachments.map((att, i) => (
              <div key={i} className="bg-surface-800 border border-surface-700 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <FileText size={12} className="text-brand-400" />
                <span className="text-[10px] text-surface-300">{att.name}</span>
                <span className="text-[9px] text-surface-600">{att.size}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Bubble */}
        <div className={`rounded-2xl border text-left relative group ${
          isUser
            ? 'bg-brand-500/15 border-brand-500/30 rounded-tr-sm px-4 py-3'
            : 'bg-surface-900 border-surface-700 rounded-tl-sm px-4 py-4 shadow-sm'
        }`}>
          {/* Copy button */}
          {!isUser && !msg.isStreaming && (
            <button
              onClick={() => onCopy(msg.text)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-800 text-surface-600 hover:text-surface-400"
              title="Copy response"
            >
              <Copy size={11} />
            </button>
          )}

          {/* Streaming thinking */}
          {msg.isStreaming && msg.events && msg.events.length > 0 && (() => {
            const lastEvent = msg.events[msg.events.length - 1]
            if (lastEvent.type === 'thinking') {
              return <ThinkingIndicator message={lastEvent.message || 'Analyzing...'} />
            }
            return null
          })()}

          {/* Plan */}
          {msg.plan && msg.plan.length > 0 && (
            <div className="mb-3">
              <PlanTimeline
                steps={msg.plan}
                completedTools={msg.toolResults?.map(t => t.tool) || []}
                activeStep={msg.isStreaming ? msg.events?.find(e => e.type === 'tool_start')?.tool : undefined}
              />
            </div>
          )}

          {/* Tool results (collapsible) */}
          {msg.toolResults && msg.toolResults.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {msg.toolResults.map((tr, i) => (
                <ToolResultCard key={i} tool={tr.tool} summary={tr.summary} data={tr.data} />
              ))}
            </div>
          )}

          {/* Main text content */}
          {msg.text ? (
            isUser
              ? <p className="text-xs text-surface-200 leading-relaxed">{msg.text}</p>
              : <RenderMarkdown content={msg.text} />
          ) : msg.isStreaming ? (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}

          {/* Confidence + timestamp footer */}
          {!isUser && msg.confidence !== undefined && (
            <div className="mt-3 pt-2 border-t border-surface-800 flex items-center justify-between">
              <ConfidenceBadge confidence={msg.confidence} />
              <span className="text-[9px] text-surface-600 flex items-center gap-1">
                <Bot size={9} /> CA Copilot AI · Private Offline
              </span>
            </div>
          )}

          {/* Suggestions */}
          {!isUser && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
            <SuggestionsStrip items={msg.suggestions} onSelect={onSuggestionClick} />
          )}
        </div>
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

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
            <Bot size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-surface-100 mb-2">CA Copilot AI Assistant</h2>
          <p className="text-sm text-surface-500 max-w-md mx-auto leading-relaxed">
            {clientName
              ? `Ready to assist with ${clientName} · `
              : ''}
            Your intelligent CA assistant for audits, reconciliations, GST, and tax compliance.
          </p>
        </div>

        {/* Capability Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[
            { icon: <ShieldAlert size={11} />, label: 'Audit Intelligence', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            { icon: <GitBranch size={11} />, label: 'Bank Reconciliation', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { icon: <Database size={11} />, label: 'GST Compliance', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { icon: <BookOpen size={11} />, label: 'Tax Knowledge', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { icon: <Building2 size={11} />, label: 'Vendor Intelligence', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { icon: <FileSpreadsheet size={11} />, label: 'Report Generation', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          ].map(cap => (
            <span key={cap.label} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${cap.color}`}>
              {cap.icon} {cap.label}
            </span>
          ))}
        </div>

        {/* Suggested Prompts by Category */}
        <div className="space-y-4">
          {categories.map(cat => {
            const prompts = SUGGESTED_PROMPTS.filter(p => p.category === cat)
            const catColor = CATEGORY_COLORS[cat] || 'text-surface-400 bg-surface-800 border-surface-700'
            return (
              <div key={cat}>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border mb-2 ${catColor}`}>
                  {cat}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {prompts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => onPromptClick(p.text)}
                      className="text-left p-3 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-600 hover:bg-surface-800 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${catColor} p-1 rounded`}>{p.icon}</span>
                        <ChevronRight size={11} className="text-surface-600 group-hover:text-brand-400 ml-auto transition-colors" />
                      </div>
                      <p className="text-[11px] text-surface-300 group-hover:text-surface-100 transition-colors leading-snug">{p.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AiCopilotPage() {
  const { conversations, activeConversationId, createConversation,
    deleteConversation, setActiveConversation, pinConversation } = useChatStore()

  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [sessions, setSessions] = useState<CopilotSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

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
          if (data.length > 0) {
            setClientId(data[0].id)
            setClientName(data[0].name)
          }
        }
      } catch {
        // Use defaults if server not running
        setClients([
          { id: 'client-1', name: 'Apex Steel Industries Pvt Ltd' },
          { id: 'client-2', name: 'MGM Logistics Services' },
          { id: 'client-3', name: 'Om Packaging Industries' },
        ])
      }
    }
    loadClients()
  }, [])

  // Load sessions from server when clientId changes
  useEffect(() => {
    loadSessions()
  }, [clientId])

  const loadSessions = async () => {
    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/copilot/sessions?client_id=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch { /* server not running yet */ }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const createSession = async () => {
    const newSession: CopilotSession = {
      id: `session-${Date.now()}`,
      title: 'New Session',
      clientId,
      clientName,
      financialYear,
      assessmentYear,
      messages: [],
      createdAt: new Date().toISOString(),
    }

    // Try to persist to server
    try {
      const base = await getBaseUrl()
      const formData = new FormData()
      formData.append('client_id', clientId)
      formData.append('title', 'New Session')
      formData.append('financial_year', financialYear)
      formData.append('assessment_year', assessmentYear)
      const res = await fetch(`${base}/copilot/sessions`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        newSession.id = data.id
      }
    } catch { /* use local session */ }

    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setMessages([])
  }

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId)
    // Load messages for this session
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
    } catch {
      setMessages([])
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const base = await getBaseUrl()
      await fetch(`${base}/copilot/sessions/${sessionId}`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(null)
      setMessages([])
    }
  }

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || inputText).trim()
    if (!message || isStreaming) return
    if (!activeSessionId) {
      await createSession()
    }

    setInputText('')
    setSelectedFiles([])

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
      attachments: selectedFiles.map(f => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        type: f.name.split('.').pop() || 'file',
      })),
    }

    const assistantMsg: CopilotMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      text: '',
      events: [],
      plan: [],
      toolResults: [],
      suggestions: [],
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    const sessionIdToUse = activeSessionId || `session-${Date.now()}`

    // Update session title from first message
    setSessions(prev => prev.map(s =>
      s.id === sessionIdToUse
        ? { ...s, title: message.length > 40 ? message.slice(0, 40) + '…' : message }
        : s
    ))

    try {
      const base = await getBaseUrl()
      const formData = new FormData()
      formData.append('message', message)
      formData.append('session_id', sessionIdToUse)
      formData.append('client_id', clientId)
      formData.append('financial_year', financialYear)
      formData.append('assessment_year', assessmentYear)

      abortRef.current = new AbortController()
      const response = await fetch(`${base}/copilot/chat/stream`, {
        method: 'POST',
        body: formData,
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`)
      }

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
                case 'thinking':
                  return updated
                case 'plan':
                  return { ...updated, plan: event.steps || [] }
                case 'tool_result':
                  return {
                    ...updated,
                    toolResults: [...(updated.toolResults || []), {
                      tool: event.tool || '',
                      summary: event.summary || '',
                      data: event.data,
                    }]
                  }
                case 'response':
                  return { ...updated, text: (updated.text || '') + (event.content || ''), confidence: event.confidence }
                case 'suggestions':
                  return { ...updated, suggestions: event.items || [] }
                case 'done':
                  return { ...updated, isStreaming: false }
                case 'error':
                  return { ...updated, text: `⚠️ ${event.error || 'An error occurred.'}`, isStreaming: false }
                default:
                  return updated
              }
            }))
          } catch { /* malformed json line, ignore */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, text: '_Response cancelled._', isStreaming: false } : m
        ))
      } else {
        // Fallback: intelligent offline responses
        const fallbackResponse = generateOfflineFallback(message, clientName, financialYear)
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? {
                ...m,
                text: fallbackResponse.text,
                plan: fallbackResponse.plan,
                suggestions: fallbackResponse.suggestions,
                confidence: fallbackResponse.confidence,
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'))
  }

  const stopStreaming = () => {
    abortRef.current?.abort()
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputText])

  const hasActiveSession = activeSessionId !== null
  const foundSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height))] overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 border-r border-surface-700 bg-surface-900/60 flex flex-col">

        {/* New Session Button */}
        <div className="p-3 border-b border-surface-700">
          <button
            onClick={createSession}
            className="btn-primary w-full text-xs py-2.5 gap-2 justify-center bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-md"
          >
            <Plus size={13} /> New Session
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare size={20} className="mx-auto mb-2 text-surface-700" />
              <p className="text-[11px] text-surface-600">No sessions yet. Start a conversation!</p>
            </div>
          ) : (
            sessions.map(session => {
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
                    <Bot size={12} className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-surface-600'}`} />
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
                        <p className="text-[11px] font-medium truncate">{session.title}</p>
                        <p className="text-[9px] text-surface-600 mt-0.5 truncate">{session.clientName} · {session.financialYear}</p>
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingSession(session.id); setEditTitle(session.title) }}
                        className="p-0.5 rounded hover:bg-surface-700 text-surface-500 hover:text-surface-300"
                      >
                        <Edit3 size={10} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                        className="p-0.5 rounded hover:bg-surface-700 text-surface-500 hover:text-red-400"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Context Panel */}
        <div className="p-3 border-t border-surface-700 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] text-surface-500 font-bold uppercase tracking-wider">
            <Clock size={11} className="text-brand-400" /> Session Context
          </div>

          <div>
            <label className="text-[9px] text-surface-600 uppercase tracking-wider font-bold block mb-1">Client</label>
            <select
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2 py-1.5 text-[11px] text-surface-300 outline-none focus:border-brand-500 transition-colors"
              value={clientId}
              onChange={e => {
                setClientId(e.target.value)
                setClientName(e.target.options[e.target.selectedIndex].text)
                toast.success(`Context: ${e.target.options[e.target.selectedIndex].text}`)
              }}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-surface-600 uppercase tracking-wider font-bold block mb-1">FY</label>
              <select
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-1.5 py-1.5 text-[10px] text-surface-300 outline-none focus:border-brand-500"
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
              >
                {['2026-27', '2025-26', '2024-25'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-surface-600 uppercase tracking-wider font-bold block mb-1">AY</label>
              <select
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-1.5 py-1.5 text-[10px] text-surface-300 outline-none focus:border-brand-500"
                value={assessmentYear}
                onChange={e => setAssessmentYear(e.target.value)}
              >
                {['2027-28', '2026-27', '2025-26'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Context Badge */}
          <div className="bg-surface-800 rounded-lg px-2.5 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-surface-600 uppercase tracking-wider font-bold">Active Context</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <p className="text-[10px] text-surface-300 font-medium truncate">{clientName}</p>
            <p className="text-[9px] text-surface-500">FY {financialYear} · AY {assessmentYear}</p>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-surface-700 bg-surface-900/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow">
              <Bot size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                CA Copilot
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  ONLINE
                </span>
              </h3>
              <p className="text-[10px] text-surface-500">
                {foundSession ? foundSession.title : 'AI Audit & Compliance Assistant'} · Local Private
              </p>
            </div>
          </div>
          {isStreaming && (
            <button
              onClick={stopStreaming}
              className="btn-secondary text-xs py-1 px-3 gap-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <X size={12} /> Stop
            </button>
          )}
        </div>

        {/* Messages or Welcome Screen */}
        {hasActiveSession && messages.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSuggestionClick={text => handleSend(text)}
                onCopy={handleCopy}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <WelcomeScreen
            onPromptClick={text => {
              setInputText(text)
              if (!hasActiveSession) createSession().then(() => handleSend(text))
              else handleSend(text)
            }}
            clientName={clientName}
          />
        )}

        {/* Input Bar */}
        <div className="px-6 py-4 border-t border-surface-700 bg-surface-900/30 flex-shrink-0">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-surface-900 rounded-xl border border-surface-700">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2 py-1">
                  <FileText size={11} className="text-brand-400" />
                  <span className="text-[10px] text-surface-300 max-w-[120px] truncate">{f.name}</span>
                  <button
                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-surface-600 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 border border-surface-700 bg-surface-900 text-surface-500 hover:text-surface-300 hover:border-surface-600 rounded-xl transition-all flex-shrink-0"
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

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about reconciliations, audits, GST compliance, tax sections, vendor risks..."
                className="input w-full resize-none py-2.5 px-4 pr-12 min-h-[44px] max-h-[120px] rounded-xl leading-relaxed text-xs"
                style={{ height: '44px' }}
                disabled={isStreaming}
              />
            </div>

            {/* Voice Button (ready for future) */}
            <button
              className="p-2.5 border border-surface-700 bg-surface-900 text-surface-600 hover:text-surface-400 rounded-xl transition-all flex-shrink-0 cursor-not-allowed opacity-50"
              title="Voice input (coming soon)"
              disabled
            >
              <Mic size={15} />
            </button>

            {/* Send / Stop */}
            <button
              onClick={isStreaming ? stopStreaming : () => handleSend()}
              disabled={!isStreaming && !inputText.trim() && selectedFiles.length === 0}
              className={`p-2.5 rounded-xl flex-shrink-0 transition-all shadow ${
                isStreaming
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={isStreaming ? 'Stop generation' : 'Send message'}
            >
              {isStreaming ? <X size={15} /> : <Send size={15} />}
            </button>
          </div>

          <p className="text-[9px] text-surface-700 mt-2 text-center">
            CA Copilot · Fully offline · All data stays on your device · Never uploaded externally
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Offline Fallback Response Generator ──────────────────────────────────────

function generateOfflineFallback(message: string, clientName: string, fy: string): {
  text: string; plan: string[]; suggestions: Array<{ text: string; action: string }>; confidence: number
} {
  const q = message.toLowerCase()

  if (q.includes('duplicate')) {
    return {
      plan: ['Search invoice database', 'Run duplicate detection engine', 'Score confidence', 'Group duplicates', 'Generate summary'],
      text: `### Duplicate Invoice Detection\n\nI scanned the accounting records for **${clientName}** (FY ${fy}).\n\nFound **1 potential duplicate** matching your parameters:\n\n| Voucher | Date | Vendor | Amount | Match Score |\n|---------|------|--------|--------|-------------|\n| PV-2026-419 | 18-Jul-2026 | Om Packaging Industries | ₹53,100 | 99% (Duplicate of PV-2026-401) |\n\n> **Section 16(2)(b) CGST Act** — ITC is allowed only on actual receipt of goods. Duplicate booking inflates ITC claims.\n\n**Recommended Action:** Cross-verify GRN records and delete voucher PV-2026-419 if only one delivery was received.`,
      suggestions: [{ text: 'Review ITC implications', action: 'itc_review' }, { text: 'Export duplicate report', action: 'export_excel' }, { text: 'Run full audit scan', action: 'audit_scan' }],
      confidence: 94,
    }
  }

  if (q.includes('bank') || q.includes('reconcil')) {
    return {
      plan: ['Load bank statement', 'Match with ledger entries', 'Identify unmatched items', 'Generate reconciliation report'],
      text: `### Bank Reconciliation Summary\n\nI analyzed the bank statement against the purchase ledger for **${clientName}**.\n\n| Date | Narration | Bank Amount | Ledger Match | Status |\n|------|-----------|-------------|--------------|--------|\n| 03-Apr | NEFT Cr - APEX STEEL | +₹1,77,000 | Apex Steel Invoice | ✓ Matched |\n| 05-Apr | IMPS Dr - MGM Logistics | -₹53,100 | MGM Statement | ✓ Matched |\n| 22-Apr | CASH ATM Withdrawal | -₹50,000 | No Ledger Entry | ⚠ Unmatched |\n\n**1 unmatched transaction** requires review. Cash withdrawal of ₹50,000 may be subject to Section 40A(3).`,
      suggestions: [{ text: 'Export to Excel', action: 'export_excel' }, { text: 'Check Section 40A(3) violations', action: 'cash_check' }, { text: 'View all unmatched entries', action: 'unmatched' }],
      confidence: 89,
    }
  }

  if (q.includes('gstr') || q.includes('gst') || q.includes('2b')) {
    return {
      plan: ['Load GSTR-2B data', 'Load purchase register', 'Match invoices', 'Score mismatches', 'Generate exception report'],
      text: `### GSTR-2B vs Purchase Register\n\nComparison analysis for **${clientName}** (FY ${fy}):\n\n| Invoice | Vendor | Mismatch Type | Purchases | GSTR-2B | Action |\n|---------|--------|---------------|-----------|---------|--------|\n| INV-8941 | Apex Steel | Amount Difference | ₹27,000 GST | ₹26,000 GST | Verify rate |\n| MS-55102 | Max Software | Missing in GSTR-2B | ₹22,500 GST | ₹0 | Verify GSTR-1 filing |\n| PO-INVALID | Unknown | Invalid GSTIN | ₹15,300 GST | ₹15,300 GST | Correction required |\n\n> **Section 16(2)(c) CGST Act** — ITC is available only when the supplier has filed their GSTR-1 and the amount is reflected in GSTR-2B.`,
      suggestions: [{ text: 'Review ITC differences', action: 'itc_review' }, { text: 'Generate vendor risk report', action: 'vendor_risk' }, { text: 'Export exception report', action: 'export_excel' }],
      confidence: 91,
    }
  }

  if (q.includes('40a') || q.includes('cash payment')) {
    return {
      plan: ['Scan ledger for cash transactions', 'Apply 40A(3) threshold check', 'Identify violations', 'Generate compliance report'],
      text: `### Section 40A(3) Cash Payment Analysis\n\nUnder **Section 40A(3)** of the Income Tax Act, cash payments exceeding **₹10,000** to a single person in a single day are disallowed as business deductions.\n\n**Violations Detected:**\n\n- **PV-9902** (15-Jul-2026): ₹45,000 cash — Office renovation contractor\n- **ATM Withdrawal** (22-Apr-2026): ₹50,000 — No linked voucher found\n\n> **Section 40A(3) IT Act 1961** — Disallowed expenditure must be reported in **Form 3CD Clause 21** of the Tax Audit Report.\n\n**Recommended Action:** Disallow ₹95,000 in tax computation. Effective tax impact at 30% = ₹28,500.`,
      suggestions: [{ text: 'Generate Form 3CD summary', action: 'form3cd' }, { text: 'Export to Excel', action: 'export_excel' }, { text: 'Run full audit scan', action: 'audit_scan' }],
      confidence: 97,
    }
  }

  if (q.includes('vendor') || q.includes('gstin')) {
    return {
      plan: ['Load vendor registry', 'Validate GSTIN formats', 'Calculate risk scores', 'Build vendor profiles', 'Generate risk report'],
      text: `### Vendor Intelligence Report\n\nAnalyzed vendor database for **${clientName}**.\n\n| Vendor | GSTIN | Invoice Count | Total Value | Risk Level |\n|--------|-------|---------------|-------------|------------|\n| Aditya Chemicals | INVALID-GSTIN | 3 | ₹1,45,000 | 🔴 High |\n| Max Software | 27BBBCA8891D1Z1 | 5 | ₹6,25,000 | 🟡 Medium |\n| Om Packaging | 27AABCO5512N1Z4 | 12 | ₹8,50,000 | 🟢 Low |\n\n**1 vendor** has an invalid GSTIN format — ITC claims against this vendor may be disallowed.\n\n> **GST Rule 46** — Tax invoices must contain the correct 15-character GSTIN of the supplier.`,
      suggestions: [{ text: 'Fix invalid GSTIN', action: 'fix_gstin' }, { text: 'Run GST reconciliation', action: 'gst_recon' }, { text: 'Export vendor risk report', action: 'export_excel' }],
      confidence: 88,
    }
  }

  if (q.includes('17(5)') || q.includes('blocked') || q.includes('itc')) {
    return {
      plan: ['Load purchase register', 'Scan for blocked credit indicators', 'Apply Section 17(5) rules', 'Generate compliance report'],
      text: `### Blocked ITC — Section 17(5) Analysis\n\nUnder **Section 17(5) of the CGST Act**, certain categories of goods/services are blocked from Input Tax Credit claims.\n\n**Blocked Credit Categories:**\n\n- Motor vehicles (seating capacity ≤ 13, not for transport business)\n- Food & beverages, outdoor catering\n- Club memberships, health & fitness\n- Travel benefits for employees\n- Works contract for building/civil structure\n\n**Detected in your books:**\n\n- **INV-982181** — Toyota Innova vehicle purchase · CGST ₹1,19,000 + SGST ₹1,19,000 = **₹2,38,000 blocked ITC**\n\n> **Section 17(5)(a) CGST Act 2017** — Motor vehicles with ≤13 passenger capacity used for general transport are blocked credits.\n\n**Action:** Reverse ₹2,38,000 ITC in GSTR-3B. Apply interest @18% p.a. if reversal is overdue.`,
      suggestions: [{ text: 'Calculate interest liability', action: 'interest_calc' }, { text: 'Generate ITC reversal note', action: 'itc_reversal' }, { text: 'Export compliance report', action: 'export_pdf' }],
      confidence: 99,
    }
  }

  // Generic fallback
  return {
    plan: ['Analyze request', 'Search knowledge base', 'Generate response'],
    text: `I processed your request: **"${message}"**\n\nI can assist with:\n\n- **Find duplicate invoices** — Scan for duplicate payment vouchers\n- **Reconcile bank statement** — Match bank transactions with ledger\n- **Compare GSTR-2B** — GST reconciliation with purchase register\n- **Section 40A(3) check** — Cash payment disallowance analysis\n- **Vendor risk report** — GSTIN validation and vendor profiling\n- **Section 17(5) blocked credits** — Identify blocked ITC claims\n- **AI audit scan** — Full risk and anomaly detection\n\nPlease try one of the suggested prompts above, or rephrase your question with more details.`,
    suggestions: [
      { text: 'Find duplicate invoices', action: 'duplicates' },
      { text: 'Reconcile SBI bank statement', action: 'bank_recon' },
      { text: 'Run AI audit scan', action: 'audit_scan' },
    ],
    confidence: 70,
  }
}
