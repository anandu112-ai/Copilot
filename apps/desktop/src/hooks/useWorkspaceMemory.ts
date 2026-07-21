/**
 * useWorkspaceMemory — CA Copilot
 *
 * Central hook for full workspace persistence:
 * - Auto-saves state every 3 seconds
 * - Saves on app close / Electron before-quit
 * - Tracks page changes with scroll position
 * - Restores scroll position after navigation
 * - Tracks window bounds on resize
 * - Sets crash-recovery sentinel on mount, clears on clean exit
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'

const AUTO_SAVE_INTERVAL_MS = 3_000
const SCROLL_RESTORE_DELAY_MS = 120   // DOM needs time to render before scrolling
const WINDOW_BOUNDS_DEBOUNCE_MS = 500
const SNAPSHOT_INTERVAL_SAVES = 10   // take a snapshot every N auto-saves

interface WorkspaceMemoryResult {
  isSaving: boolean
  lastSavedAt: string | null
  takeSnapshot: (label?: string) => void
}

export function useWorkspaceMemory(
  pathname: string,
  pageTitle: string
): WorkspaceMemoryResult {
  const {
    recentPages,
    lastSavedAt,
    touch,
    takeSnapshot,
    markSessionStart,
    markSessionEnd,
    setLastPage,
    setWindowBounds,
  } = useWorkspaceStore()

  const [isSaving, setIsSaving] = useState(false)
  const saveCountRef = useRef(0)
  const prevPathnameRef = useRef<string | null>(null)
  const windowDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mark session start once on mount ──────────────────────────────────────
  useEffect(() => {
    markSessionStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-save every 3 seconds ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSaving(true)
      touch()
      saveCountRef.current += 1

      // Take a full snapshot every N saves
      if (saveCountRef.current % SNAPSHOT_INTERVAL_SAVES === 0) {
        takeSnapshot()
      }

      // Brief visual indicator
      setTimeout(() => setIsSaving(false), 300)
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [touch, takeSnapshot])

  // ── Save before close ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      markSessionEnd()
    }

    const handleElectronClose = () => {
      markSessionEnd()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('ca:before-close', handleElectronClose)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('ca:before-close', handleElectronClose)
    }
  }, [markSessionEnd])

  // ── Track page changes + save scroll position ─────────────────────────────
  useEffect(() => {
    // Save scroll position of the page we're LEAVING before we store the new page
    if (prevPathnameRef.current && prevPathnameRef.current !== pathname) {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const prevTitle = recentPages.find((p) => p.path === prevPathnameRef.current)?.title ?? ''
      setLastPage(prevPathnameRef.current, prevTitle, scrollY)
    }

    // Now record the new page
    setLastPage(pathname, pageTitle, window.scrollY)
    prevPathnameRef.current = pathname
  }, [pathname, pageTitle, setLastPage, recentPages])

  // ── Restore scroll position after navigation ──────────────────────────────
  useEffect(() => {
    const saved = recentPages.find((p) => p.path === pathname)
    if (saved?.scrollY && saved.scrollY > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: saved.scrollY, behavior: 'instant' })
      }, SCROLL_RESTORE_DELAY_MS)
      return () => clearTimeout(timer)
    }
  // Only run when pathname changes — not on every recentPages update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // ── Track window bounds on resize ─────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (windowDebounceRef.current) clearTimeout(windowDebounceRef.current)
      windowDebounceRef.current = setTimeout(() => {
        setWindowBounds({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }, WINDOW_BOUNDS_DEBOUNCE_MS)
    }

    window.addEventListener('resize', handleResize)
    // Capture initial bounds
    setWindowBounds({ width: window.innerWidth, height: window.innerHeight })

    return () => {
      window.removeEventListener('resize', handleResize)
      if (windowDebounceRef.current) clearTimeout(windowDebounceRef.current)
    }
  }, [setWindowBounds])

  const handleTakeSnapshot = useCallback(
    (label?: string) => {
      takeSnapshot(label)
    },
    [takeSnapshot]
  )

  return {
    isSaving,
    lastSavedAt,
    takeSnapshot: handleTakeSnapshot,
  }
}

export default useWorkspaceMemory
