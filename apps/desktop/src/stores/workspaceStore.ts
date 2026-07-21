/**
 * Workspace Memory Store — CA Copilot
 * Persists and restores the user's complete working session.
 * Saves to localStorage every 3 seconds and on critical actions.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkspaceSession {
  lastClient: string | null
  lastClientName: string | null
  lastPage: string
  sidebarCollapsed: boolean
  theme: 'dark' | 'light' | 'system'
  selectedFinancialYear: string
  appliedFilters: Record<string, unknown>
  recentClients: Array<{ id: string; name: string; visitedAt: string }>
  recentPages: Array<{ path: string; title: string; visitedAt: string }>
  recentCommands: string[]
  recentSearches: string[]
  pinnedClients: Array<{ id: string; name: string }>
  pinnedReports: Array<{ id: string; title: string; path: string }>
  favoriteDocuments: Array<{ id: string; name: string; path: string }>
  dashboardLayout: Record<string, unknown>
  savedFilters: Record<string, unknown>
  windowBounds: { width: number; height: number; x?: number; y?: number } | null
  lastSavedAt: string | null
}

const DEFAULT_SESSION: WorkspaceSession = {
  lastClient: null,
  lastClientName: null,
  lastPage: '/dashboard',
  sidebarCollapsed: false,
  theme: 'dark',
  selectedFinancialYear: '2025-26',
  appliedFilters: {},
  recentClients: [],
  recentPages: [],
  recentCommands: [],
  recentSearches: [],
  pinnedClients: [],
  pinnedReports: [],
  favoriteDocuments: [],
  dashboardLayout: {},
  savedFilters: {},
  windowBounds: null,
  lastSavedAt: null,
}

const MAX_RECENT = 10
const MAX_COMMANDS = 20
const MAX_SEARCHES = 15

interface WorkspaceState extends WorkspaceSession {
  // Mutators
  setLastClient: (id: string, name: string) => void
  setLastPage: (path: string, title: string) => void
  setSidebarCollapsed: (v: boolean) => void
  setTheme: (t: 'dark' | 'light' | 'system') => void
  setFinancialYear: (fy: string) => void
  setAppliedFilters: (module: string, filters: unknown) => void
  addRecentCommand: (cmd: string) => void
  addRecentSearch: (q: string) => void
  pinClient: (id: string, name: string) => void
  unpinClient: (id: string) => void
  pinReport: (id: string, title: string, path: string) => void
  unpinReport: (id: string) => void
  favoriteDocument: (id: string, name: string, path: string) => void
  unfavoriteDocument: (id: string) => void
  updateDashboardLayout: (layout: Record<string, unknown>) => void
  saveFilter: (key: string, filter: unknown) => void
  touch: () => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SESSION,

      setLastClient: (id, name) => set((s) => ({
        lastClient: id,
        lastClientName: name,
        recentClients: [
          { id, name, visitedAt: new Date().toISOString() },
          ...s.recentClients.filter((c) => c.id !== id),
        ].slice(0, MAX_RECENT),
      })),

      setLastPage: (path, title) => set((s) => ({
        lastPage: path,
        recentPages: [
          { path, title, visitedAt: new Date().toISOString() },
          ...s.recentPages.filter((p) => p.path !== path),
        ].slice(0, MAX_RECENT),
      })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setTheme: (t) => set({ theme: t }),
      setFinancialYear: (fy) => set({ selectedFinancialYear: fy }),

      setAppliedFilters: (module, filters) => set((s) => ({
        appliedFilters: { ...s.appliedFilters, [module]: filters },
      })),

      addRecentCommand: (cmd) => set((s) => ({
        recentCommands: [cmd, ...s.recentCommands.filter((c) => c !== cmd)].slice(0, MAX_COMMANDS),
      })),

      addRecentSearch: (q) => set((s) => ({
        recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, MAX_SEARCHES),
      })),

      pinClient: (id, name) => set((s) => {
        if (s.pinnedClients.some((c) => c.id === id)) return {}
        return { pinnedClients: [...s.pinnedClients, { id, name }] }
      }),

      unpinClient: (id) => set((s) => ({
        pinnedClients: s.pinnedClients.filter((c) => c.id !== id),
      })),

      pinReport: (id, title, path) => set((s) => {
        if (s.pinnedReports.some((r) => r.id === id)) return {}
        return { pinnedReports: [...s.pinnedReports, { id, title, path }] }
      }),

      unpinReport: (id) => set((s) => ({
        pinnedReports: s.pinnedReports.filter((r) => r.id !== id),
      })),

      favoriteDocument: (id, name, path) => set((s) => {
        if (s.favoriteDocuments.some((d) => d.id === id)) return {}
        return { favoriteDocuments: [...s.favoriteDocuments, { id, name, path }] }
      }),

      unfavoriteDocument: (id) => set((s) => ({
        favoriteDocuments: s.favoriteDocuments.filter((d) => d.id !== id),
      })),

      updateDashboardLayout: (layout) => set({ dashboardLayout: layout }),

      saveFilter: (key, filter) => set((s) => ({
        savedFilters: { ...s.savedFilters, [key]: filter },
      })),

      touch: () => set({ lastSavedAt: new Date().toISOString() }),

      reset: () => set(DEFAULT_SESSION),
    }),
    {
      name: 'ca-copilot-workspace',
      // Persist everything
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { reset, touch, setLastClient, setLastPage, setSidebarCollapsed,
          setTheme, setFinancialYear, setAppliedFilters, addRecentCommand,
          addRecentSearch, pinClient, unpinClient, pinReport, unpinReport,
          favoriteDocument, unfavoriteDocument, updateDashboardLayout, saveFilter,
          ...persisted } = state
        return persisted
      },
    }
  )
)
