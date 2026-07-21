import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search, Users, FileText, BarChart3, GitCompare, Calculator,
  ShieldAlert, Settings, Upload, Download, Database, RefreshCw,
  Lock, Zap, Bot, Brain, BookCheck, Building2, Receipt, History,
  Star, Clock, ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface Command {
  id: string
  label: string
  description?: string
  category: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  keywords: string[]
}

function buildCommands(navigate: ReturnType<typeof useNavigate>, addRecentCommand: (s: string) => void): Command[] {
  const go = (path: string, label: string) => () => {
    navigate(path)
    addRecentCommand(label)
  }
  const dispatch = (event: string, label: string) => () => {
    window.dispatchEvent(new CustomEvent(event))
    addRecentCommand(label)
  }

  return [
    // Navigation
    { id: 'nav-dashboard', label: 'Open Dashboard', description: 'Go to main dashboard', category: 'Navigation', icon: <Zap size={14} />, shortcut: 'Ctrl+H', action: go('/dashboard', 'Open Dashboard'), keywords: ['dashboard', 'home', 'main'] },
    { id: 'nav-clients', label: 'Open Clients', description: 'View all clients', category: 'Clients', icon: <Building2 size={14} />, shortcut: 'Ctrl+N', action: go('/clients', 'Open Clients'), keywords: ['clients', 'customer', 'firm'] },
    { id: 'nav-document-ai', label: 'Document AI', description: 'AI-powered document processing', category: 'Documents', icon: <Brain size={14} />, shortcut: 'Ctrl+D', action: go('/document-ai', 'Document AI'), keywords: ['document', 'ocr', 'extract', 'upload', 'ai'] },
    { id: 'nav-invoice', label: 'Invoice Processing', description: 'Process invoices', category: 'Documents', icon: <Receipt size={14} />, action: go('/invoice-processing', 'Invoice Processing'), keywords: ['invoice', 'bill', 'purchase'] },
    { id: 'nav-bank', label: 'Bank Reconciliation', description: 'Reconcile bank statements', category: 'Bank', icon: <GitCompare size={14} />, shortcut: 'Ctrl+R', action: go('/bank-reconciliation', 'Bank Reconciliation'), keywords: ['bank', 'reconcile', 'statement'] },
    { id: 'nav-gst', label: 'GST Reconciliation', description: 'Reconcile GST returns', category: 'GST', icon: <Calculator size={14} />, shortcut: 'Ctrl+G', action: go('/gst-reconciliation', 'GST Reconciliation'), keywords: ['gst', 'tax', 'return', 'gstr'] },
    { id: 'nav-ledger', label: 'Ledger Reconciliation', description: 'Reconcile ledger entries', category: 'Accounting', icon: <BookCheck size={14} />, shortcut: 'Ctrl+L', action: go('/ledger-reconciliation', 'Ledger Reconciliation'), keywords: ['ledger', 'accounts', 'balance'] },
    { id: 'nav-audit', label: 'Audit Assistant', description: 'Run audit checks', category: 'Audit', icon: <ShieldAlert size={14} />, shortcut: 'Ctrl+A', action: go('/audit-intelligence', 'Audit Intelligence'), keywords: ['audit', 'risk', 'finding', 'scan'] },
    { id: 'nav-ai-copilot', label: 'AI Chat', description: 'Chat with AI assistant', category: 'AI', icon: <Bot size={14} />, action: go('/ai-copilot', 'AI Chat'), keywords: ['chat', 'ai', 'copilot', 'assistant'] },
    { id: 'nav-reports', label: 'Financial Reports', description: 'Generate reports', category: 'Reports', icon: <BarChart3 size={14} />, shortcut: 'Ctrl+E', action: go('/reports', 'Financial Reports'), keywords: ['report', 'analytics', 'working papers'] },
    { id: 'nav-compliance', label: 'Compliance Calendar', description: 'Track compliance deadlines', category: 'Compliance', icon: <History size={14} />, action: go('/compliance', 'Compliance'), keywords: ['compliance', 'deadline', 'gst', 'tds', 'roc'] },
    { id: 'nav-vouching', label: 'Vouching', description: 'Voucher approval workflows', category: 'Audit', icon: <FileText size={14} />, action: go('/vouching', 'Vouching'), keywords: ['voucher', 'approve', 'vouch'] },
    { id: 'nav-firm', label: 'Firm Management', description: 'Manage users and tasks', category: 'Administration', icon: <Users size={14} />, shortcut: 'Ctrl+T', action: go('/firm', 'Firm Management'), keywords: ['firm', 'users', 'tasks', 'team'] },
    { id: 'nav-integrations', label: 'Integrations', description: 'Connect Tally, Zoho, BUSY', category: 'Administration', icon: <Zap size={14} />, shortcut: 'Ctrl+I', action: go('/integrations', 'Integrations'), keywords: ['tally', 'zoho', 'busy', 'import', 'integration'] },
    { id: 'nav-settings', label: 'Settings', description: 'Application settings', category: 'Administration', icon: <Settings size={14} />, shortcut: 'Ctrl+Shift+S', action: go('/settings', 'Settings'), keywords: ['settings', 'preferences', 'config'] },
    // Actions
    { id: 'act-upload', label: 'Upload Document', description: 'Upload a new document for processing', category: 'Documents', icon: <Upload size={14} />, shortcut: 'Ctrl+U', action: go('/document-ai', 'Upload Document'), keywords: ['upload', 'import', 'document', 'pdf'] },
    { id: 'act-backup', label: 'Backup Database', description: 'Create a database backup', category: 'Administration', icon: <Database size={14} />, shortcut: 'Ctrl+Shift+B', action: dispatch('ca:backup', 'Backup Database'), keywords: ['backup', 'save', 'database'] },
    { id: 'act-refresh', label: 'Refresh Data', description: 'Reload current page data', category: 'Utilities', icon: <RefreshCw size={14} />, shortcut: 'F5', action: dispatch('ca:refresh', 'Refresh Data'), keywords: ['refresh', 'reload'] },
    { id: 'act-lock', label: 'Lock Application', description: 'Lock and return to login', category: 'Administration', icon: <Lock size={14} />, shortcut: 'Ctrl+Shift+L', action: dispatch('ca:lock', 'Lock Application'), keywords: ['lock', 'logout', 'security'] },
    { id: 'act-export', label: 'Export to Excel', description: 'Export current data to Excel', category: 'Reports', icon: <Download size={14} />, shortcut: 'Ctrl+Shift+E', action: dispatch('ca:export-excel', 'Export Excel'), keywords: ['export', 'excel', 'download'] },
  ]
}

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.includes(q)) return true
  // character subsequence match
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti)
    if (ti === -1) return false
    ti++
  }
  return true
}

export function CommandPalette() {
  const navigate = useNavigate()
  const { recentCommands, addRecentCommand, pinnedClients } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = buildCommands(navigate, addRecentCommand)

  // Listen for global open event
  useEffect(() => {
    const handler = () => { setOpen(true); setQuery(''); setSelectedIdx(0) }
    window.addEventListener('ca:command-palette', handler)
    return () => window.removeEventListener('ca:command-palette', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const filtered = query.trim().length < 1
    ? commands.slice(0, 12)
    : commands.filter((c) =>
        fuzzyMatch(c.label, query) ||
        fuzzyMatch(c.category, query) ||
        c.keywords.some((k) => fuzzyMatch(k, query))
      ).slice(0, 16)

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  // Flatten for index tracking
  const flat = Object.values(grouped).flat()

  const execute = useCallback((cmd: Command) => {
    cmd.action()
    setOpen(false)
    setQuery('')
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && flat[selectedIdx]) { e.preventDefault(); execute(flat[selectedIdx]) }
    else if (e.key === 'Escape') { setOpen(false) }
    else setSelectedIdx(0)
  }

  if (!open) return null

  let flatIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800">
          <Search size={16} className="text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
          />
          <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[460px] overflow-y-auto py-2">
          {/* Pinned clients when no query */}
          {!query && pinnedClients.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                <Star size={10} /> Pinned Clients
              </div>
              {pinnedClients.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { navigate('/clients'); addRecentCommand(`Open ${c.name}`); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-800 text-left"
                >
                  <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400"><Building2 size={13} /></span>
                  <span className="text-sm text-surface-200">{c.name}</span>
                  <ChevronRight size={12} className="ml-auto text-surface-600" />
                </button>
              ))}
            </div>
          )}

          {/* Recent commands when no query */}
          {!query && recentCommands.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={10} /> Recent
              </div>
              {recentCommands.slice(0, 4).map((cmd) => {
                const found = commands.find((c) => c.label === cmd)
                if (!found) return null
                return (
                  <button
                    key={cmd}
                    onClick={() => execute(found)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-800 text-left"
                  >
                    <span className="p-1.5 rounded-lg bg-surface-800 text-surface-400">{found.icon}</span>
                    <span className="text-sm text-surface-300">{found.label}</span>
                    <ChevronRight size={12} className="ml-auto text-surface-600" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Grouped commands */}
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                {category}
              </div>
              {cmds.map((cmd) => {
                const isSelected = flat[selectedIdx]?.id === cmd.id
                flatIdx++
                return (
                  <button
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-surface-800' : 'hover:bg-surface-800/60'
                    )}
                  >
                    <span className={cn(
                      'p-1.5 rounded-lg flex-shrink-0',
                      isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'
                    )}>
                      {cmd.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-200 truncate">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-surface-500 truncate">{cmd.description}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700 flex-shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <ChevronRight size={12} className="text-surface-700 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          ))}

          {query && flat.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-surface-500">
              No commands found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-surface-800 flex items-center gap-4 text-[10px] text-surface-600">
          <span><kbd className="bg-surface-800 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-surface-800 px-1 rounded">Enter</kbd> execute</span>
          <span><kbd className="bg-surface-800 px-1 rounded">Esc</kbd> close</span>
          <span className="ml-auto">Ctrl+Shift+P</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
