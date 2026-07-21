/**
 * CommandPalette — CA Copilot
 * Universal Quick Action Bar (Ctrl+Shift+P)
 *
 * Features:
 * - 25+ commands across 14 categories
 * - Natural language intent matching (nlPatterns)
 * - Frecency-sorted suggestions when idle
 * - Category sidebar + filter pills
 * - Tab autocomplete, Ctrl+Enter alternate action
 * - Arrow key navigation with left-bar highlight
 * - Pinned clients + recent commands sections
 */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  Search, Users, FileText, BarChart3, GitCompare, Calculator,
  ShieldAlert, Settings, Upload, Download, Database, RefreshCw,
  Lock, Zap, Bot, Brain, BookCheck, Building2, Receipt, History,
  Star, Clock, ChevronRight, Terminal, Layers, CheckSquare,
  AlertCircle, HelpCircle, LogOut, Plug, BrainCircuit, Rocket,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { useWorkspaceStore } from '../../stores/workspaceStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Command {
  id: string
  label: string
  description?: string
  category: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  altAction?: () => void
  altActionLabel?: string
  keywords: string[]
  nlPatterns?: string[]
}

type CategoryName =
  | 'Navigation' | 'Clients' | 'Documents' | 'Audit' | 'GST'
  | 'Bank' | 'Reports' | 'Tasks' | 'Compliance' | 'AI'
  | 'Integrations' | 'Administration' | 'Settings' | 'Utilities'

const ALL_CATEGORIES: CategoryName[] = [
  'Navigation', 'Clients', 'Documents', 'Audit', 'GST',
  'Bank', 'Reports', 'Tasks', 'Compliance', 'AI',
  'Integrations', 'Administration', 'Settings', 'Utilities',
]

// ─── Command registry factory ─────────────────────────────────────────────────

function buildCommands(
  navigate: ReturnType<typeof useNavigate>,
  addRecentCommand: (s: string) => void
): Command[] {
  const go = (path: string, label: string) => () => {
    navigate(path)
    addRecentCommand(label)
  }
  const dispatch = (event: string, label: string) => () => {
    window.dispatchEvent(new CustomEvent(event))
    addRecentCommand(label)
  }

  return [
    // ── Navigation ────────────────────────────────────────────────────────
    {
      id: 'nav-dashboard', label: 'Open Dashboard', category: 'Navigation',
      description: 'Go to main dashboard', icon: <Zap size={14} />, shortcut: 'Ctrl+H',
      action: go('/dashboard', 'Open Dashboard'),
      keywords: ['dashboard', 'home', 'main', 'overview'],
      nlPatterns: ['go to dashboard', 'open dashboard', 'show home', 'main screen'],
    },
    {
      id: 'nav-clients', label: 'Client Management', category: 'Clients',
      description: 'View and manage all clients', icon: <Building2 size={14} />, shortcut: 'Ctrl+N',
      action: go('/clients', 'Client Management'),
      keywords: ['clients', 'customer', 'firm', 'company'],
      nlPatterns: ['open clients', 'show clients', 'view clients', 'manage clients', 'new client'],
    },
    {
      id: 'nav-document-ai', label: 'Document AI', category: 'Documents',
      description: 'AI-powered document processing', icon: <Brain size={14} />, shortcut: 'Ctrl+D',
      action: go('/document-ai', 'Document AI'),
      keywords: ['document', 'ocr', 'extract', 'upload', 'pdf', 'ai'],
      nlPatterns: ['upload document', 'process document', 'open document ai', 'ocr scan'],
    },
    {
      id: 'nav-invoice', label: 'Invoice Processing', category: 'Documents',
      description: 'Process and extract invoice data', icon: <Receipt size={14} />,
      action: go('/invoice-processing', 'Invoice Processing'),
      keywords: ['invoice', 'bill', 'purchase', 'vendor'],
      nlPatterns: ['process invoice', 'open invoices', 'invoice extraction'],
    },
    {
      id: 'nav-bank', label: 'Bank Reconciliation', category: 'Bank',
      description: 'Reconcile bank statements', icon: <GitCompare size={14} />, shortcut: 'Ctrl+R',
      action: go('/bank-reconciliation', 'Bank Reconciliation'),
      keywords: ['bank', 'reconcile', 'statement', 'account'],
      nlPatterns: ['run bank reconciliation', 'reconcile bank', 'open bank', 'bank statement'],
    },
    {
      id: 'nav-gst', label: 'GST Reconciliation', category: 'GST',
      description: 'Reconcile GST returns', icon: <Calculator size={14} />, shortcut: 'Ctrl+G',
      action: go('/gst-reconciliation', 'GST Reconciliation'),
      keywords: ['gst', 'tax', 'return', 'gstr', 'reconcile'],
      nlPatterns: ['run gst reconciliation', 'gst mismatch', 'open gst', 'show pending gst returns'],
    },
    {
      id: 'nav-ledger', label: 'Ledger Reconciliation', category: 'Bank',
      description: 'Reconcile ledger entries', icon: <BookCheck size={14} />, shortcut: 'Ctrl+L',
      action: go('/ledger-reconciliation', 'Ledger Reconciliation'),
      keywords: ['ledger', 'accounts', 'balance', 'reconcile'],
      nlPatterns: ['reconcile ledger', 'open ledger', 'ledger entries'],
    },
    {
      id: 'nav-audit', label: 'Audit Intelligence', category: 'Audit',
      description: 'AI-powered risk analysis', icon: <ShieldAlert size={14} />, shortcut: 'Ctrl+A',
      action: go('/audit-intelligence', 'Audit Intelligence'),
      keywords: ['audit', 'risk', 'finding', 'scan', 'ai'],
      nlPatterns: ['start audit scan', 'run audit', 'audit risk', 'open audit'],
    },
    {
      id: 'nav-audit-assistant', label: 'Audit Assistant', category: 'Audit',
      description: 'Traditional audit tools', icon: <ShieldAlert size={14} />,
      action: go('/audit', 'Audit Assistant'),
      keywords: ['audit', 'assistant', 'vouching', 'working papers'],
      nlPatterns: ['open audit assistant', 'audit findings', 'generate working papers'],
    },
    {
      id: 'nav-vouching', label: 'Vouching', category: 'Audit',
      description: 'Voucher approval workflows', icon: <CheckSquare size={14} />,
      action: go('/vouching', 'Vouching'),
      keywords: ['voucher', 'approve', 'vouch', 'payment'],
      nlPatterns: ['open vouching', 'approve vouchers', 'vouching workflow'],
    },
    {
      id: 'nav-ai-copilot', label: 'AI Chat', category: 'AI',
      description: 'Chat with the AI assistant', icon: <Bot size={14} />,
      action: go('/ai-copilot', 'AI Chat'),
      keywords: ['chat', 'ai', 'copilot', 'assistant', 'ask'],
      nlPatterns: ['open ai chat', 'chat with ai', 'ask ai', 'ai assistant'],
    },
    {
      id: 'nav-ai-automation', label: 'AI Automation Hub', category: 'AI',
      description: 'Configure AI workflows', icon: <BrainCircuit size={14} />,
      action: go('/ai-automation', 'AI Automation Hub'),
      keywords: ['automation', 'workflow', 'ai', 'pipeline'],
      nlPatterns: ['open automation', 'ai automation', 'workflow automation'],
    },
    {
      id: 'nav-reports', label: 'Financial Reports', category: 'Reports',
      description: 'Generate and view reports', icon: <BarChart3 size={14} />, shortcut: 'Ctrl+E',
      action: go('/reports', 'Financial Reports'),
      keywords: ['report', 'analytics', 'working papers', 'export'],
      nlPatterns: ['generate report', 'open reports', 'financial reports', 'export audit findings'],
    },
    {
      id: 'nav-compliance', label: 'Compliance Calendar', category: 'Compliance',
      description: 'Track compliance deadlines', icon: <History size={14} />,
      action: go('/compliance', 'Compliance'),
      keywords: ['compliance', 'deadline', 'gst', 'tds', 'roc', 'calendar'],
      nlPatterns: ['open compliance', 'due dates', 'compliance calendar', 'show pending filings'],
    },
    {
      id: 'nav-firm', label: 'Firm Management', category: 'Tasks',
      description: 'Manage users, tasks and team', icon: <Users size={14} />, shortcut: 'Ctrl+T',
      action: go('/firm', 'Firm Management'),
      keywords: ['firm', 'users', 'tasks', 'team', 'staff'],
      nlPatterns: ['open firm', 'manage team', 'view tasks', 'assign task', 'show today tasks'],
    },
    {
      id: 'nav-integrations', label: 'Integration Hub', category: 'Integrations',
      description: 'Connect Tally, Zoho, BUSY', icon: <Plug size={14} />, shortcut: 'Ctrl+I',
      action: go('/integrations', 'Integration Hub'),
      keywords: ['tally', 'zoho', 'busy', 'import', 'integration', 'sync'],
      nlPatterns: ['open integrations', 'connect tally', 'import from tally', 'sync zoho'],
    },
    {
      id: 'nav-enterprise', label: 'Enterprise Platform', category: 'Administration',
      description: 'Multi-firm admin, RBAC, audit logs', icon: <Rocket size={14} />,
      action: go('/enterprise', 'Enterprise Platform'),
      keywords: ['enterprise', 'admin', 'rbac', 'roles', 'audit log'],
      nlPatterns: ['open enterprise', 'admin panel', 'manage roles'],
    },
    {
      id: 'nav-settings', label: 'Settings', category: 'Settings',
      description: 'Application settings & preferences', icon: <Settings size={14} />, shortcut: 'Ctrl+Shift+S',
      action: go('/settings', 'Settings'),
      keywords: ['settings', 'preferences', 'config', 'theme', 'ocr'],
      nlPatterns: ['open settings', 'change settings', 'configure app', 'switch theme'],
    },
    {
      id: 'nav-help', label: 'Help & Support', category: 'Utilities',
      description: 'Docs, shortcuts, and support', icon: <HelpCircle size={14} />,
      action: go('/help', 'Help & Support'),
      keywords: ['help', 'support', 'docs', 'shortcuts', 'faq'],
      nlPatterns: ['open help', 'show shortcuts', 'documentation'],
    },
    // ── Actions ───────────────────────────────────────────────────────────
    {
      id: 'act-upload', label: 'Upload Document', category: 'Documents',
      description: 'Upload a new document for processing', icon: <Upload size={14} />, shortcut: 'Ctrl+U',
      action: go('/document-ai', 'Upload Document'),
      altAction: go('/invoice-processing', 'Upload Invoice'),
      altActionLabel: 'Upload as Invoice',
      keywords: ['upload', 'import', 'document', 'pdf'],
      nlPatterns: ['upload document', 'import document', 'upload pdf', 'add document'],
    },
    {
      id: 'act-backup', label: 'Backup Database', category: 'Administration',
      description: 'Create a database backup now', icon: <Database size={14} />, shortcut: 'Ctrl+Shift+B',
      action: dispatch('ca:backup', 'Backup Database'),
      keywords: ['backup', 'save', 'database', 'export'],
      nlPatterns: ['backup database', 'create backup', 'save backup'],
    },
    {
      id: 'act-refresh', label: 'Refresh Data', category: 'Utilities',
      description: 'Reload current page data', icon: <RefreshCw size={14} />, shortcut: 'F5',
      action: dispatch('ca:refresh', 'Refresh Data'),
      keywords: ['refresh', 'reload', 'update'],
      nlPatterns: ['refresh data', 'reload page'],
    },
    {
      id: 'act-lock', label: 'Lock Application', category: 'Administration',
      description: 'Lock and return to login screen', icon: <Lock size={14} />, shortcut: 'Ctrl+Shift+L',
      action: dispatch('ca:lock', 'Lock Application'),
      keywords: ['lock', 'logout', 'security', 'sign out'],
      nlPatterns: ['lock app', 'lock application', 'sign out', 'logout'],
    },
    {
      id: 'act-export', label: 'Export to Excel', category: 'Reports',
      description: 'Export current data to Excel', icon: <Download size={14} />, shortcut: 'Ctrl+Shift+E',
      action: dispatch('ca:export-excel', 'Export Excel'),
      keywords: ['export', 'excel', 'download', 'xlsx'],
      nlPatterns: ['export excel', 'download excel', 'export to excel', 'generate excel'],
    },
    {
      id: 'act-find-duplicates', label: 'Find Duplicate Invoices', category: 'Audit',
      description: 'Scan for duplicate invoices across clients', icon: <AlertCircle size={14} />,
      action: go('/audit-intelligence', 'Find Duplicate Invoices'),
      keywords: ['duplicate', 'invoice', 'find', 'detect'],
      nlPatterns: ['find duplicate invoices', 'detect duplicates', 'check for duplicates', 'duplicate detection'],
    },
    {
      id: 'act-working-papers', label: 'Generate Working Papers', category: 'Audit',
      description: 'Auto-generate audit working papers', icon: <FileText size={14} />,
      action: go('/audit', 'Generate Working Papers'),
      keywords: ['working papers', 'audit', 'generate', 'template'],
      nlPatterns: ['generate working papers', 'prepare working papers', 'create working papers'],
    },
  ]
}

// ─── Matching utilities ───────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return true
  if (t.includes(q)) return true
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti)
    if (ti === -1) return false
    ti++
  }
  return true
}

function nlMatch(cmd: Command, query: string): boolean {
  if (!cmd.nlPatterns?.length) return false
  const q = query.toLowerCase().trim()
  return cmd.nlPatterns.some((p) => p.includes(q) || q.includes(p.split(' ')[0]))
}

interface MatchedCommand {
  cmd: Command
  isNL: boolean
}

function matchCommands(commands: Command[], query: string, categoryFilter: string | null): MatchedCommand[] {
  const q = query.trim()
  if (!q) {
    const cmds = categoryFilter
      ? commands.filter((c) => c.category === categoryFilter)
      : commands
    return cmds.slice(0, 14).map((cmd) => ({ cmd, isNL: false }))
  }

  const results: MatchedCommand[] = []
  const seen = new Set<string>()

  for (const cmd of commands) {
    if (categoryFilter && cmd.category !== categoryFilter) continue
    const isNL = nlMatch(cmd, q)
    const isFuzzy =
      fuzzyMatch(cmd.label, q) ||
      fuzzyMatch(cmd.category, q) ||
      cmd.keywords.some((k) => fuzzyMatch(k, q))
    if ((isNL || isFuzzy) && !seen.has(cmd.id)) {
      seen.add(cmd.id)
      results.push({ cmd, isNL })
    }
  }

  // NL matches first
  results.sort((a, b) => (b.isNL ? 1 : 0) - (a.isNL ? 1 : 0))
  return results.slice(0, 18)
}

// ─── Category sidebar item ────────────────────────────────────────────────────

function CategorySidebar({
  categories,
  counts,
  active,
  onSelect,
}: {
  categories: string[]
  counts: Record<string, number>
  active: string | null
  onSelect: (cat: string | null) => void
}) {
  return (
    <div className="w-36 flex-shrink-0 border-r border-surface-800 py-2 overflow-y-auto">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between',
          active === null
            ? 'text-brand-400 bg-brand-500/10 font-semibold'
            : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
        )}
      >
        <span>All</span>
        <span className="text-[10px] opacity-60">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
      </button>
      {categories.map((cat) => (
        counts[cat] > 0 && (
          <button
            key={cat}
            onClick={() => onSelect(cat === active ? null : cat)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between',
              active === cat
                ? 'text-brand-400 bg-brand-500/10 font-semibold'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
            )}
          >
            <span className="truncate">{cat}</span>
            <span className="text-[10px] opacity-60 flex-shrink-0 ml-1">{counts[cat]}</span>
          </button>
        )
      ))}
    </div>
  )
}

// ─── Main CommandPalette component ────────────────────────────────────────────

export function CommandPalette() {
  const navigate = useNavigate()
  const { recentCommands, commandFrecency, addRecentCommand, pinnedClients, recentClients } =
    useWorkspaceStore()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const commands = useMemo(
    () => buildCommands(navigate, addRecentCommand),
    // navigate and addRecentCommand are stable — only rebuild once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Listen for global open event (Ctrl+Shift+P)
  useEffect(() => {
    const handler = () => {
      setOpen(true)
      setQuery('')
      setSelectedIdx(0)
      setCategoryFilter(null)
    }
    window.addEventListener('ca:command-palette', handler)
    return () => window.removeEventListener('ca:command-palette', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  // ── Frecency-sorted idle suggestions ────────────────────────────────────
  const idleSuggestions = useMemo(() => {
    if (query.trim()) return []
    const scored = commands.map((cmd) => {
      const fe = commandFrecency.find((f) => f.key === cmd.label)
      return { cmd, score: fe?.score ?? 0 }
    })
    scored.sort((a, b) => b.score - a.score)
    const filtered = categoryFilter
      ? scored.filter((s) => s.cmd.category === categoryFilter)
      : scored
    return filtered.slice(0, 12).map((s) => s.cmd)
  }, [query, commands, commandFrecency, categoryFilter])

  // ── Matched results when typing ──────────────────────────────────────────
  const matchedResults = useMemo(
    () => (query.trim() ? matchCommands(commands, query, categoryFilter) : []),
    [query, commands, categoryFilter]
  )

  // Flat list of commands for keyboard navigation
  const flat: Command[] = query.trim()
    ? matchedResults.map((r) => r.cmd)
    : idleSuggestions

  // Category counts for sidebar
  const categoryCounts = useMemo(() => {
    const base = query.trim() ? matchedResults.map((r) => r.cmd) : commands
    const counts: Record<string, number> = {}
    for (const cmd of base) {
      counts[cmd.category] = (counts[cmd.category] ?? 0) + 1
    }
    return counts
  }, [query, commands, matchedResults])

  // Grouped results for display
  const grouped = useMemo(() => {
    const list = query.trim() ? matchedResults.map((r) => r.cmd) : idleSuggestions
    return list.reduce<Record<string, { cmds: Command[]; hasNL: boolean }>>((acc, cmd) => {
      const isNL = matchedResults.find((r) => r.cmd.id === cmd.id)?.isNL ?? false
      if (!acc[cmd.category]) acc[cmd.category] = { cmds: [], hasNL: false }
      acc[cmd.category].cmds.push(cmd)
      if (isNL) acc[cmd.category].hasNL = true
      return acc
    }, {})
  }, [query, matchedResults, idleSuggestions])

  // Keep selected item scrolled into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const execute = useCallback(
    (cmd: Command, alt = false) => {
      if (alt && cmd.altAction) {
        cmd.altAction()
      } else {
        cmd.action()
      }
      addRecentCommand(cmd.label)
      setOpen(false)
      setQuery('')
    },
    [addRecentCommand]
  )

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (flat[selectedIdx]) setQuery(flat[selectedIdx].label)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[selectedIdx]) execute(flat[selectedIdx], e.ctrlKey || e.metaKey)
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else {
      setSelectedIdx(0)
    }
  }

  if (!open) return null

  const recentCmds = recentCommands
    .slice(0, 5)
    .map((label) => commands.find((c) => c.label === label))
    .filter(Boolean) as Command[]

  const showNLSuggestion =
    query.trim().length >= 3 && flat.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh]">

        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800 flex-shrink-0">
          <Terminal size={15} className="text-surface-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKey}
            placeholder="Type a command or describe what you want to do..."
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedIdx(0) }}
              className="text-xs text-surface-600 hover:text-surface-400 px-1.5 py-0.5 rounded border border-surface-700 hover:border-surface-600"
            >
              Clear
            </button>
          )}
          <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700 flex-shrink-0">Esc</kbd>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-surface-800 overflow-x-auto flex-shrink-0 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors border',
              categoryFilter === null
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'text-surface-500 border-surface-700 hover:border-surface-600 hover:text-surface-300'
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
              className={cn(
                'flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors border',
                categoryFilter === cat
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'text-surface-500 border-surface-700 hover:border-surface-600 hover:text-surface-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Body: sidebar + results */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Category sidebar */}
          <CategorySidebar
            categories={ALL_CATEGORIES}
            counts={categoryCounts}
            active={categoryFilter}
            onSelect={setCategoryFilter}
          />

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-2">

            {/* Pinned clients (idle, no query) */}
            {!query && pinnedClients.length > 0 && (
              <div className="mb-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Star size={9} /> Pinned Clients
                </div>
                {pinnedClients.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate('/clients'); addRecentCommand(`Open ${c.name}`); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-800 text-left transition-colors"
                  >
                    <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 flex-shrink-0">
                      <Building2 size={12} />
                    </span>
                    <span className="text-sm text-surface-200 flex-1 truncate">{c.name}</span>
                    {c.gstin && <span className="text-[10px] text-surface-600">{c.gstin}</span>}
                    <ChevronRight size={11} className="text-surface-700 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Recent commands (idle, no query) */}
            {!query && recentCmds.length > 0 && (
              <div className="mb-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={9} /> Recent
                </div>
                {recentCmds.map((cmd, i) => {
                  const isSelected = flat[selectedIdx]?.id === cmd.id
                  return (
                    <button
                      key={cmd.id}
                      ref={isSelected ? selectedRef : undefined}
                      onClick={() => execute(cmd)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors border-l-2',
                        isSelected
                          ? 'bg-surface-800 border-brand-500'
                          : 'border-transparent hover:bg-surface-800/70'
                      )}
                    >
                      <span className={cn('p-1.5 rounded-lg flex-shrink-0',
                        isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'
                      )}>
                        {cmd.icon}
                      </span>
                      <span className="text-sm text-surface-300 flex-1 truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700 flex-shrink-0">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Grouped command results */}
            {Object.entries(grouped).map(([category, { cmds, hasNL }]) => (
              <div key={category} className="mb-1">
                <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                  {hasNL && query && <span className="text-brand-500">~</span>}
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const flatIdx = flat.indexOf(cmd)
                  const isSelected = flat[selectedIdx]?.id === cmd.id
                  const isNL = matchedResults.find((r) => r.cmd.id === cmd.id)?.isNL ?? false
                  return (
                    <button
                      key={cmd.id}
                      ref={isSelected ? selectedRef : undefined}
                      onClick={() => execute(cmd)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2 group',
                        isSelected
                          ? 'bg-surface-800 border-brand-500'
                          : 'border-transparent hover:bg-surface-800/60'
                      )}
                    >
                      <span className={cn(
                        'p-1.5 rounded-lg flex-shrink-0 transition-colors',
                        isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-400'
                      )}>
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-surface-200 truncate">
                          {cmd.label}
                          {isNL && (
                            <span className="ml-1.5 text-[10px] text-brand-500 font-normal">AI match</span>
                          )}
                        </div>
                        {cmd.description && (
                          <div className="text-xs text-surface-500 truncate">{cmd.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {cmd.shortcut && (
                          <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {cmd.altAction && isSelected && (
                          <span
                            title={cmd.altActionLabel ?? 'Alternate action'}
                            className="text-[10px] bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded border border-surface-600"
                          >
                            Ctrl+↵
                          </span>
                        )}
                      </div>
                      <ChevronRight size={11} className="text-surface-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            ))}

            {/* NL suggestion when no matches */}
            {showNLSuggestion && (
              <div className="px-4 py-6 text-center">
                <Search size={20} className="mx-auto text-surface-700 mb-2" />
                <p className="text-sm text-surface-500 mb-1">No commands found for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-surface-600">
                  Try: &ldquo;open [client name]&rdquo; or &ldquo;run [action]&rdquo;
                </p>
              </div>
            )}

            {/* Empty state for category filter */}
            {!showNLSuggestion && flat.length === 0 && query && (
              <div className="px-4 py-8 text-center text-sm text-surface-500">
                No results in {categoryFilter ?? 'any category'}
              </div>
            )}
          </div>
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-surface-800 flex items-center gap-3 text-[10px] text-surface-600 flex-shrink-0 bg-surface-950/40">
          <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">↑↓</kbd> navigate</span>
          <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">Enter</kbd> execute</span>
          <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">Tab</kbd> complete</span>
          <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">Ctrl+↵</kbd> alternate</span>
          <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">Esc</kbd> close</span>
          <span className="ml-auto opacity-60">Ctrl+Shift+P</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
