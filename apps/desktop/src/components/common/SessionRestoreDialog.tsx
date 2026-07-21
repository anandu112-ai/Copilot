/**
 * SessionRestoreDialog — CA Copilot
 *
 * Shown once on startup when a previous workspace session is detected.
 * Lets the user choose to resume their previous session or start fresh.
 * Also offers access to earlier snapshot history.
 */
import { useState } from 'react'
import {
  History, Zap, Clock, FolderOpen, RotateCcw,
  ChevronDown, ChevronUp, AlertTriangle, Layers,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { WorkspaceSnapshot } from '../../stores/workspaceStore'

interface SessionRestoreDialogProps {
  onResume: () => void
  onFresh: () => void
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SessionCard({ snapshot, onRestore }: {
  snapshot: WorkspaceSnapshot
  onRestore: (id: string) => void
}) {
  const s = snapshot.session
  const tabCount = s.openTabs?.length ?? 0
  const pendingCount = s.pendingUploads?.filter((u) => u.status === 'queued').length ?? 0

  return (
    <button
      onClick={() => onRestore(snapshot.id)}
      className="w-full text-left rounded-xl border border-surface-700 bg-surface-800/50 hover:bg-surface-800 hover:border-surface-600 p-4 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
              {snapshot.label}
            </span>
          </div>
          <div className="text-sm font-medium text-surface-200 truncate">
            {s.lastClientName
              ? `Client: ${s.lastClientName}`
              : 'No client selected'}
          </div>
          <div className="text-xs text-surface-500 mt-0.5 truncate">
            {s.lastPage ?? '/dashboard'} · FY {s.selectedFinancialYear}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-surface-400">{formatRelativeTime(snapshot.takenAt)}</div>
          <div className="text-[10px] text-surface-600 mt-0.5">{formatDateTime(snapshot.takenAt)}</div>
        </div>
      </div>

      {(tabCount > 0 || pendingCount > 0) && (
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-surface-700">
          {tabCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-surface-500">
              <Layers size={10} /> {tabCount} tab{tabCount > 1 ? 's' : ''}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-500">
              <Clock size={10} /> {pendingCount} pending upload{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

export function SessionRestoreDialog({ onResume, onFresh }: SessionRestoreDialogProps) {
  const {
    snapshots,
    lastPage,
    lastClientName,
    lastSavedAt,
    selectedFinancialYear,
    openTabs,
    pendingUploads,
    crashRecoveryFlag,
    restoreSnapshot,
    clearSnapshots,
  } = useWorkspaceStore()

  const [showHistory, setShowHistory] = useState(false)

  // The most recent snapshot is shown prominently; older ones in history
  const [latestSnapshot, ...olderSnapshots] = snapshots

  const tabCount = openTabs?.length ?? 0
  const pendingCount = pendingUploads?.filter((u) => u.status === 'queued').length ?? 0
  const wasCrash = crashRecoveryFlag

  const handleRestoreSnapshot = (id: string) => {
    restoreSnapshot(id)
    onResume()
  }

  const handleFresh = () => {
    clearSnapshots()
    onFresh()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-100">Welcome back</h2>
              <p className="text-xs text-surface-500">CA Copilot found your previous session</p>
            </div>
          </div>

          {/* Crash recovery warning */}
          {wasCrash && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                The previous session ended unexpectedly. Your work has been recovered automatically.
              </p>
            </div>
          )}
        </div>

        {/* Session preview */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-surface-700 bg-surface-800/40 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
                Last Session
              </span>
              {lastSavedAt && (
                <span className="text-xs text-surface-500">
                  {formatRelativeTime(lastSavedAt)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen size={13} className="text-brand-400 flex-shrink-0" />
                <span className="text-sm text-surface-200">
                  {lastClientName ? lastClientName : 'No client selected'}
                </span>
                <span className="text-xs text-surface-600">·</span>
                <span className="text-xs text-surface-500">FY {selectedFinancialYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <History size={13} className="text-surface-500 flex-shrink-0" />
                <span className="text-xs text-surface-500">
                  Last page: <span className="text-surface-400">{lastPage ?? '/dashboard'}</span>
                </span>
              </div>
              {(tabCount > 0 || pendingCount > 0) && (
                <div className="flex items-center gap-4 pt-1">
                  {tabCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-surface-500">
                      <Layers size={11} className="text-surface-400" />
                      {tabCount} open tab{tabCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Clock size={11} />
                      {pendingCount} pending upload{pendingCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-brand-900/30"
            >
              <History size={15} />
              Resume Session
            </button>
            <button
              onClick={handleFresh}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium rounded-xl border border-surface-700 hover:border-surface-600 transition-all text-sm"
            >
              <Zap size={15} />
              Start Fresh
            </button>
          </div>

          {/* Snapshot history toggle */}
          {olderSnapshots.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors w-full"
              >
                <RotateCcw size={11} />
                {showHistory ? 'Hide' : 'Show'} snapshot history ({olderSnapshots.length} earlier session{olderSnapshots.length > 1 ? 's' : ''})
                {showHistory ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                  {olderSnapshots.map((snap) => (
                    <SessionCard
                      key={snap.id}
                      snapshot={snap}
                      onRestore={handleRestoreSnapshot}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-surface-800 bg-surface-950/50">
          <p className="text-[11px] text-surface-600 text-center">
            CA Copilot auto-saves your workspace every few seconds.
            Your data always stays on your device.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SessionRestoreDialog
