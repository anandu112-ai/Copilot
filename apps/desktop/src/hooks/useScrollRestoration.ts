/**
 * useScrollRestoration — CA Copilot
 *
 * Saves and restores the scroll position of a specific scrollable container.
 * Returns a ref to attach to the container element.
 *
 * Usage:
 *   const containerRef = useScrollRestoration('bank-reconciliation-list')
 *   return <div ref={containerRef} className="overflow-y-auto">...</div>
 */
import { useRef, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'ca-scroll-'
const RESTORE_DELAY_MS = 100

export function useScrollRestoration(key: string): React.RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null)

  // Save position when the component unmounts or key changes
  const saveScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, String(el.scrollTop))
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, [key])

  // Restore position after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      try {
        const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
        if (saved) {
          el.scrollTop = parseInt(saved, 10)
        }
      } catch {
        // ignore
      }
    }, RESTORE_DELAY_MS)

    return () => {
      clearTimeout(timer)
      saveScroll()
    }
  }, [key, saveScroll])

  return containerRef
}

export default useScrollRestoration
