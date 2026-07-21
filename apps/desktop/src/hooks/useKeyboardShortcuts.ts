import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

/**
 * Global keyboard shortcuts for CA Copilot.
 * Register once at App level.
 */
export function useKeyboardShortcuts() {
  const { setGlobalSearchOpen, toggleSidebar } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+K — open global search
      if (ctrl && e.key === 'k') {
        e.preventDefault()
        setGlobalSearchOpen(true)
        return
      }

      // Ctrl+B — toggle sidebar
      if (ctrl && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // Escape — close modals/search (handled by individual components, but broadcast)
      if (e.key === 'Escape') {
        setGlobalSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setGlobalSearchOpen, toggleSidebar])
}
