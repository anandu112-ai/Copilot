/**
 * GlobalSearchModal — CA Copilot
 * Ctrl+K universal search across all data
 *
 * Features:
 * - Fuzzy highlight on matched text
 * - Arrow-key navigation across all results
 * - Recent searches panel with favorites
 * - Type filter tabs (All / Clients / Tasks / Audit / Compliance / Vouchers)
 * - Inline result actions (Open, View, Copy)
 * - Skeleton loaders while fetching
 * - Saves searches to workspace frecency store
 */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import type { JSX } from 'react'
import {
  Search, X, Users, FileText, ShieldAlert, Calendar,
  User, Receipt, Loader2, Star, Clock, Copy, ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { processorApi } from '../../services/processorApi'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  name: string
  type: string
  status?: string
  [key: string]: unknown
}

type TypeFilter = 'all' | 'client' | 'task' | 'audit_finding' | 'compliance' | 'voucher'

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'client', label: 'Clients' },
  { key: 'task', label: 'Tasks' },
  { key: 'audit_finding', label: 'Audit' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'voucher', label: 'Vouchers' },
]

const TYPE_ICONS: Record<string, JSX.Element> = {
  client: <Users size={13} />,
  task: <FileText size={13} />,
  audit_finding: <ShieldAlert size={13} />,
  compliance: <Calendar size={13} />,
  user: <User size={13} />,
  voucher: <Receipt size={13} />,
}

const TYPE_LABELS: Record<string, string> = {
  client: 'Clients',
  task: 'Tasks',
  audit_finding: 'Audit Findings',
  compliance: 'Compliance',
  user: 'Users',
  voucher: 'Vouchers',
}

const TYPE_COLORS: Record<string, string> = {
  audit_finding: 'bg-red-500/10 text-red-400',
  compliance: 'bg-amber-500/10 text-amber-400',
  client: 'bg-brand-500/10 text-brand-400',
  task: 'bg-blue-500/10 text-blue-400',
  voucher: 'bg-purple-500/10 text-purple-400',
  user: 'bg-surface-800 text-surface-400',
}

// ─── Fuzzy highlight ──────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const q = query.trim().toLowerCase()
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-500/30 text-brand-300 rounded-sm not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-surface-800 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-surface-800 rounded w-2/3" />
        <div className="h-2.5 bg-surface-800 rounded w-1/3" />
      </div>
    </div>
  )
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  item,
  query,
  isSelected,
  onSelect,
  rowRef,
}: {
  item: SearchResult
  query: string
  isSelected: boolean
  onSelect: () => void
  rowRef?: React.Ref<HTMLButtonElement>
}) {
  const navigate = useNavigate()

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.type === 'client') navigate('/clients')
    else if (item.type === 'audit_finding') navigate('/audit-intelligence')
    else if (item.type === 'task') navigate('/firm')
    else if (item.type === 'compliance') navigate('/compliance')
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(item.name).catch(() => {})
  }

  return (
    <button
      ref={rowRef}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2 group',
        isSelected
          ? 'bg-surface-800 border-brand-500'
          : 'border-transparent hover:bg-surface-800/60'
      )}
    >
      <span className={cn(
        'flex-shrink-0 p-1.5 rounded-lg transition-colors',
        TYPE_COLORS[item.type] ?? 'bg-surface-800 text-surface-400'
      )}>
        {TYPE_ICONS[item.type] ?? <FileText size={13} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-surface-200 truncate">
          {highlightMatch(item.name, query)}
        </div>
        {item.status != null && (
          <div className="text-xs text-surface-500 truncate">{String(item.status)}</div>
        )}
      </div>

      {/* Inline actions (visible on hover / selection) */}
      <div className={cn(
        'flex items-center gap-1 flex-shrink-0 transition-opacity',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <button
          onClick={handleAction}
          title="Open"
          className="p-1.5 rounded-md bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-colors"
        >
          <ExternalLink size={11} />
        </button>
        <button
          onClick={handleCopy}
          title="Copy name"
          className="p-1.5 rounded-md bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-colors"
        >
          <Copy size={11} />
        </button>
      </div>

      <ChevronRight size={11} className={cn(
        'flex-shrink-0 transition-opacity text-surface-700',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
      )} />
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalSearchModal() {
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore()
  const {
    recentSearches, favoriteSearches,
    addRecentSearch, favoriteSearch, unfavoriteSearch,
  } = useWorkspaceStore()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, SearchResult[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [selectedIdx, setSelectedIdx] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Reset on open
  useEffect(() => {
    if (globalSearchOpen) {
      setQuery('')
      setResults({})
      setError(null)
      setTotal(0)
      setTypeFilter('all')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [globalSearchOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setResults({})
      setTotal(0)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await processorApi.globalSearch(query.trim())
        setResults(res.results as Record<string, SearchResult[]>)
        setTotal(res.total)
        if (res.total > 0) addRecentSearch(query.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults({})
      } finally {
        setLoading(false)
        setSelectedIdx(0)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, addRecentSearch])

  // Filtered result groups based on typeFilter
  const filteredGroups = useMemo(() => {
    if (typeFilter === 'all') return Object.entries(results)
    return Object.entries(results).filter(([type]) => type === typeFilter)
  }, [results, typeFilter])

  // Flat list for keyboard nav
  const flatResults = useMemo(
    () => filteredGroups.flatMap(([, items]) => items),
    [filteredGroups]
  )

  // Keep selected in view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const navigate = useNavigate()

  const handleSelectItem = useCallback((item: SearchResult) => {
    if (item.type === 'client') navigate('/clients')
    else if (item.type === 'audit_finding') navigate('/audit-intelligence')
    else if (item.type === 'task') navigate('/firm')
    else if (item.type === 'compliance') navigate('/compliance')
    setGlobalSearchOpen(false)
  }, [navigate, setGlobalSearchOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatResults[selectedIdx]) handleSelectItem(flatResults[selectedIdx])
    } else if (e.key === 'Escape') {
      setGlobalSearchOpen(false)
    }
  }

  const runSearch = (q: string) => {
    setQuery(q)
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  if (!globalSearchOpen) return null

  const hasResults = filteredGroups.some(([, items]) => items.length > 0)
  const showEmpty = query.length >= 2 && !loading && !hasResults && !error

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[13vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setGlobalSearchOpen(false) }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative w-full max-w-xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[72vh]">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800 flex-shrink-0">
          {loading
            ? <Loader2 size={15} className="text-brand-400 animate-spin flex-shrink-0" />
            : <Search size={15} className="text-surface-400 flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, tasks, findings, compliance..."
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults({}); setTotal(0) }}
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {/* Favorite current search */}
          {query.trim().length >= 2 && (
            <button
              onClick={() =>
                favoriteSearches.includes(query.trim())
                  ? unfavoriteSearch(query.trim())
                  : favoriteSearch(query.trim())
              }
              title={favoriteSearches.includes(query.trim()) ? 'Remove from favorites' : 'Save as favorite'}
              className={cn(
                'transition-colors',
                favoriteSearches.includes(query.trim())
                  ? 'text-amber-400'
                  : 'text-surface-600 hover:text-surface-400'
              )}
            >
              <Star size={13} />
            </button>
          )}
          <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700 flex-shrink-0">Esc</kbd>
        </div>

        {/* Type filter tabs */}
        {(hasResults || query.length >= 2) && (
          <div className="flex items-center gap-1 px-4 py-1.5 border-b border-surface-800 overflow-x-auto flex-shrink-0">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setTypeFilter(f.key); setSelectedIdx(0) }}
                className={cn(
                  'flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors border',
                  typeFilter === f.key
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                    : 'text-surface-500 border-surface-700 hover:border-surface-600 hover:text-surface-300'
                )}
              >
                {f.label}
                {f.key !== 'all' && results[f.key]?.length > 0 && (
                  <span className="ml-1 opacity-60">{results[f.key].length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Recent + favorite searches (no query) */}
          {!query && (
            <div className="py-2">
              {favoriteSearches.length > 0 && (
                <div className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={9} className="text-amber-400" /> Favorites
                  </div>
                  {favoriteSearches.slice(0, 6).map((q) => (
                    <div key={q} className="flex items-center group">
                      <button
                        onClick={() => runSearch(q)}
                        className="flex-1 flex items-center gap-3 px-4 py-2 hover:bg-surface-800 text-left transition-colors"
                      >
                        <Star size={12} className="text-amber-400 flex-shrink-0" />
                        <span className="text-sm text-surface-300">{q}</span>
                      </button>
                      <button
                        onClick={() => unfavoriteSearch(q)}
                        className="pr-4 text-surface-700 hover:text-surface-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {recentSearches.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={9} /> Recent
                  </div>
                  {recentSearches.slice(0, 8).map((q) => (
                    <div key={q} className="flex items-center group">
                      <button
                        onClick={() => runSearch(q)}
                        className="flex-1 flex items-center gap-3 px-4 py-2 hover:bg-surface-800 text-left transition-colors"
                      >
                        <Clock size={12} className="text-surface-600 flex-shrink-0" />
                        <span className="text-sm text-surface-400">{q}</span>
                      </button>
                      <button
                        onClick={() => favoriteSearch(q)}
                        title="Save as favorite"
                        className="pr-1 text-surface-700 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Star size={11} />
                      </button>
                      <button
                        className="pr-4 text-surface-700 hover:text-surface-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {favoriteSearches.length === 0 && recentSearches.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Search size={20} className="mx-auto text-surface-700 mb-2" />
                  <p className="text-sm text-surface-500">Type at least 2 characters to search</p>
                  <p className="text-xs text-surface-600 mt-1">Searches across all clients, tasks, findings, and more</p>
                </div>
              )}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="py-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <Search size={20} className="mx-auto text-surface-700 mb-2" />
              <p className="text-sm text-surface-500">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {/* Results */}
          {!loading && hasResults && (
            <div className="py-2">
              {filteredGroups.map(([type, items]) => {
                if (!items.length) return null
                return (
                  <div key={type} className="mb-1">
                    <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2">
                      <span>{TYPE_LABELS[type] ?? type}</span>
                      <span className="bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded-full text-[9px]">
                        {items.length}
                      </span>
                    </div>
                    {items.map((item) => {
                      const flatIdx = flatResults.indexOf(item)
                      const isSelected = flatIdx === selectedIdx
                      return (
                        <ResultRow
                          key={item.id}
                          item={item}
                          query={query}
                          isSelected={isSelected}
                          onSelect={() => handleSelectItem(item)}
                          rowRef={isSelected ? selectedRef : undefined}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {(hasResults || query.length >= 2) && (
          <div className="px-4 py-2 border-t border-surface-800 flex items-center justify-between text-[10px] text-surface-600 flex-shrink-0 bg-surface-950/40">
            <span className="flex items-center gap-2">
              <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">↑↓</kbd> navigate</span>
              <span><kbd className="bg-surface-800 px-1 rounded border border-surface-700">Enter</kbd> open</span>
            </span>
            {total > 0 && (
              <span>{total} result{total !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GlobalSearchModal
