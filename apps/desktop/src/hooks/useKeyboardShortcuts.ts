import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'
import { useWorkspaceStore } from '../stores/workspaceStore'

/**
 * Global keyboard shortcuts — CA Copilot
 * Full shortcut map for keyboard-first CA workflow.
 */
export function useKeyboardShortcuts() {
  const { setGlobalSearchOpen, toggleSidebar } = useUIStore()
  const { addRecentCommand } = useWorkspaceStore()

  // navigate is only available inside Router, so we do a lazy import
  let nav: ReturnType<typeof useNavigate> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nav = useNavigate()
  } catch {
    nav = null
  }

  useEffect(() => {
    const go = (path: string, label: string) => {
      nav?.(path)
      addRecentCommand(label)
    }

    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const alt = e.altKey
      const key = e.key.toLowerCase()

      // ── Ctrl+Shift combos ──────────────────────────────────────────
      if (ctrl && shift) {
        if (key === 'p') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:command-palette')); return }
        if (key === 'f') { e.preventDefault(); setGlobalSearchOpen(true); return }
        if (key === 's') { e.preventDefault(); go('/settings', 'Open Settings'); return }
        if (key === 'r') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:refresh')); return }
        if (key === 'l') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:lock')); return }
        if (key === 'b') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:backup')); return }
        if (key === 'e') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:export-excel')); return }
      }

      // ── Ctrl only ───────────────────────────────────────────────────
      if (ctrl && !shift && !alt) {
        if (key === 'k') { e.preventDefault(); setGlobalSearchOpen(true); return }
        if (key === 'b') { e.preventDefault(); toggleSidebar(); return }
        if (key === 'n') { e.preventDefault(); go('/clients', 'New Client'); return }
        if (key === 'u') { e.preventDefault(); go('/document-ai', 'Upload Documents'); return }
        if (key === 'i') { e.preventDefault(); go('/integrations', 'Import Data'); return }
        if (key === 'e') { e.preventDefault(); go('/reports', 'Export Report'); return }
        if (key === 'r') { e.preventDefault(); go('/bank-reconciliation', 'Run Reconciliation'); return }
        if (key === 'a') { e.preventDefault(); go('/audit-intelligence', 'Audit Scan'); return }
        if (key === 'g') { e.preventDefault(); go('/gst-reconciliation', 'GST Workspace'); return }
        if (key === 'l') { e.preventDefault(); go('/ledger-reconciliation', 'Ledger Workspace'); return }
        if (key === 'd') { e.preventDefault(); go('/document-ai', 'Document AI'); return }
        if (key === 't') { e.preventDefault(); go('/firm', 'Task Manager'); return }
        if (key === 'h') { e.preventDefault(); go('/dashboard', 'Dashboard'); return }
        if (key === 'w') { e.preventDefault(); go('/reports', 'Working Papers'); return }
        if (key === 'p') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:print')); return }
        if (key === 'f') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:search-page')); return }
      }

      // ── Alt navigation ─────────────────────────────────────────────────
      if (alt && !ctrl) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); window.history.back(); return }
        if (e.key === 'ArrowRight') { e.preventDefault(); window.history.forward(); return }
      }

      // ── Function keys ───────────────────────────────────────────────
      if (e.key === 'F5') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:refresh')); return }
      if (e.key === 'F11') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ca:fullscreen')); return }

      // ── Escape ─────────────────────────────────────────────────────
      if (e.key === 'Escape') {
        setGlobalSearchOpen(false)
        window.dispatchEvent(new CustomEvent('ca:close-modal'))
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setGlobalSearchOpen, toggleSidebar, addRecentCommand, nav])
}
