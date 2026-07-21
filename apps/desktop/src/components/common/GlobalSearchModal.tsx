import { useEffect, useState, useRef } from 'react'
import type { JSX } from 'react'
import { Search, X, Users, FileText, ShieldAlert, Calendar, User, Receipt, Loader2 } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { processorApi } from '../../services/processorApi'
import { cn } from '../../utils/cn'

interface SearchResult {
  id: string
  name: string
  type: string
  [key: string]: unknown
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  client: <Users size={14} />,
  task: <FileText size={14} />,
  audit_finding: <ShieldAlert size={14} />,
  compliance: <Calendar size={14} />,
  user: <User size={14} />,
  voucher: <Receipt size={14} />,
}

const TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  task: 'Task',
  audit_finding: 'Audit Finding',
  compliance: 'Compliance',
  user: 'User',
  voucher: 'Voucher',
}

export function GlobalSearchModal() {
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, SearchResult[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (globalSearchOpen) {
      setQuery('')
      setResults({})
      setError(null)
      setTotal(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [globalSearchOpen])

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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults({})
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  if (!globalSearchOpen) return null

  const allGroups = Object.entries(results)
  const hasResults = allGroups.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setGlobalSearchOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800">
          {loading
            ? <Loader2 size={16} className="text-brand-400 animate-spin flex-shrink-0" />
            : <Search size={16} className="text-surface-400 flex-shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, tasks, findings, compliance..."
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
            onKeyDown={(e) => e.key === 'Escape' && setGlobalSearchOpen(false)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-surface-500 hover:text-surface-300">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded border border-surface-700">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          {!loading && query.length >= 2 && !hasResults && !error && (
            <div className="px-4 py-8 text-center text-sm text-surface-500">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query && (
            <div className="px-4 py-6 text-center text-sm text-surface-500">
              Type at least 2 characters to search across all data
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {allGroups.map(([type, items]) => (
                <div key={type} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                    {TYPE_LABELS[type] ?? type} ({items.length})
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-800 text-left transition-colors"
                      onClick={() => setGlobalSearchOpen(false)}
                    >
                      <span className={cn('flex-shrink-0 p-1.5 rounded-lg',
                        type === 'audit_finding' ? 'bg-red-500/10 text-red-400' :
                        type === 'compliance' ? 'bg-amber-500/10 text-amber-400' :
                        type === 'client' ? 'bg-brand-500/10 text-brand-400' :
                        'bg-surface-800 text-surface-400'
                      )}>
                        {TYPE_ICONS[type] ?? <FileText size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-surface-200 truncate">{item.name}</div>
                        {item.status != null && (
                          <div className="text-xs text-surface-500 truncate">{String(item.status as string)}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {hasResults && (
            <div className="px-4 py-2 border-t border-surface-800 text-[11px] text-surface-600">
              {total} result{total !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalSearchModal
