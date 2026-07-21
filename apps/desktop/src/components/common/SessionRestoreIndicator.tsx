/**
 * SessionRestoreIndicator — CA Copilot
 *
 * A non-intrusive toast that appears when a previous workspace session
 * has been automatically restored. Shows what was restored and allows
 * the user to undo (start fresh) or dismiss.
 *
 * Auto-dismisses after 6 seconds.
 */
import { useEffect, useState } from 'react'
import { RotateCcw, X, Zap } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useWorkspaceStore } from '../../stores/workspaceStore'

export function SessionRestoreIndicator() {
  const {
    sessionRestored,
    lastClientName,
    lastPage,
    acknowledgeRestore,
    reset,
  } = useWorkspaceStore()

  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (sessionRestored) {
      setVisible(true)
      setLeaving(false)
      const timer = setTimeout(() => dismiss(), 6_000)
      return () => clearTimeout(timer)
    }
  }, [sessionRestored])

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => {
      setVisible(false)
      acknowledgeRestore()
    }, 250)
  }

  const handleUndo = () => {
    reset()
    dismiss()
  }

  if (!visible) return null

  const pageLabel = lastPage
    ? lastPage.replace('/', '').replace(/-/g, ' ') || 'Dashboard'
    : 'Dashboard'

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-40 flex items-start gap-3 p-4 rounded-xl',
        'bg-surface-800 border border-surface-700 shadow-xl shadow-black/40',
        'max-w-xs w-full transition-all duration-250',
        leaving
          ? 'opacity-0 translate-y-2 pointer-events-none'
          : 'opacity-100 translate-y-0 animate-fade-in'
      )}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <RotateCcw size={15} className="text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-100 leading-snug">
          Session restored
        </p>
        <p className="text-xs text-surface-500 mt-0.5 truncate">
          {lastClientName
            ? `${lastClientName} · ${pageLabel}`
            : pageLabel}
        </p>

        {/* Undo action */}
        <button
          onClick={handleUndo}
          className="mt-2 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          <Zap size={10} />
          Start fresh instead
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-surface-600 hover:text-surface-300 transition-colors mt-0.5"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default SessionRestoreIndicator
