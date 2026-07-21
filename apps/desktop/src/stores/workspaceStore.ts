/**
 * Workspace Memory Store — CA Copilot
 *
 * Persists and restores the user's complete working session.
 * Features:
 * - Full session persistence (localStorage via zustand/persist)
 * - Session snapshots for restore history (up to 5 snapshots)
 * - Frecency scoring for commands and searches (frequency × recency)
 * - Pending uploads / background job state
 * - Split-panel layout persistence
 * - AI chat history reference
 * - Crash recovery via a dirty-flag sentinel
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecentItem {
  id: string
  name: string
  visitedAt: string
}

export interface RecentPage {
  path: string
  title: string
  visitedAt: string
  scrollY?: number
}

export interface FrecencyEntry {
  key: string            // label or id
  score: number          // composite score (higher = shown first)
  count: number          // usage count
  lastUsed: string       // ISO string
}

export interface PinnedClient {
  id: string
  name: string
  gstin?: string
  avatarColor?: string
}

export interface PinnedReport {
  id: string
  title: string
  path: string
}

export interface FavoriteDocument {
  id: string
  name: string
  path: string
  type?: string
}

export interface PendingUpload {
  id: string
  fileName: string
  filePath: string
  documentType: string
  clientId?: string
  addedAt: string
  status: 'queued' | 'processing' | 'failed'
  error?: string
}

export interface BackgroundJob {
  id: string
  type: string           // 'reconciliation' | 'audit-scan' | 'ocr' | 'export'
  label: string
  clientId?: string
  startedAt: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  progress?: number      // 0–100
}

export interface SplitPanelLayout {
  enabled: boolean
  leftPane: string       // route path or panel id
  rightPane: string
  splitRatio: number     // 0.0–1.0, default 0.5
  orientation: 'horizontal' | 'vertical'
}

export interface OpenTab {
  id: string
  path: string
  title: string
  clientId?: string
  openedAt: string
  scrollY?: number
  params?: Record<string, string>
}

export interface AIConversationRef {
  id: string
  clientId?: string
  title: string
  lastMessage: string
  lastMessageAt: string
  messageCount: number
}

/** Full workspace session snapshot — stored for restore history */
export interface WorkspaceSnapshot {
  id: string
  takenAt: string
  label: string          // e.g. "Auto-save · 06:32" or "Manual save"
  session: WorkspaceSession
}

/** The core persisted session payload */
export interface WorkspaceSession {
  // Context
  lastClient: string | null
  lastClientName: string | null
  lastPage: string
  selectedFinancialYear: string
  selectedAssessmentYear: string

  // Tabs / navigation
  openTabs: OpenTab[]
  activeTabId: string | null
  recentPages: RecentPage[]

  // Layout
  sidebarCollapsed: boolean
  splitPanel: SplitPanelLayout
  dashboardLayout: Record<string, unknown>
  theme: 'dark' | 'light' | 'system'

  // Filters & search
  appliedFilters: Record<string, unknown>
  savedFilters: Record<string, unknown>
  recentSearches: string[]
  favoriteSearches: string[]

  // Commands (with frecency)
  recentCommands: string[]
  commandFrecency: FrecencyEntry[]
  searchFrecency: FrecencyEntry[]

  // Pinned / favorites
  pinnedClients: PinnedClient[]
  pinnedReports: PinnedReport[]
  favoriteDocuments: FavoriteDocument[]
  recentClients: RecentItem[]

  // AI chat
  recentAIConversations: AIConversationRef[]
  lastAIConversationId: string | null

  // Background work
  pendingUploads: PendingUpload[]
  backgroundJobs: BackgroundJob[]

  // Window
  windowBounds: { width: number; height: number; x?: number; y?: number } | null

  // Meta
  lastSavedAt: string | null
  sessionStartedAt: string | null
  crashRecoveryFlag: boolean   // true while app is running; cleared on clean exit
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SPLIT_PANEL: SplitPanelLayout = {
  enabled: false,
  leftPane: '',
  rightPane: '',
  splitRatio: 0.5,
  orientation: 'horizontal',
}

export const DEFAULT_SESSION: WorkspaceSession = {
  lastClient: null,
  lastClientName: null,
  lastPage: '/dashboard',
  selectedFinancialYear: '2025-26',
  selectedAssessmentYear: 'AY 2026-27',

  openTabs: [],
  activeTabId: null,
  recentPages: [],

  sidebarCollapsed: false,
  splitPanel: DEFAULT_SPLIT_PANEL,
  dashboardLayout: {},
  theme: 'dark',

  appliedFilters: {},
  savedFilters: {},
  recentSearches: [],
  favoriteSearches: [],

  recentCommands: [],
  commandFrecency: [],
  searchFrecency: [],

  pinnedClients: [],
  pinnedReports: [],
  favoriteDocuments: [],
  recentClients: [],

  recentAIConversations: [],
  lastAIConversationId: null,

  pendingUploads: [],
  backgroundJobs: [],

  windowBounds: null,
  lastSavedAt: null,
  sessionStartedAt: null,
  crashRecoveryFlag: false,
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECENT = 12
const MAX_COMMANDS = 25
const MAX_SEARCHES = 20
const MAX_TABS = 15
const MAX_FRECENCY = 50
const MAX_SNAPSHOTS = 5

// Frecency weight: frequency contributes 60%, recency 40%
// Recency score decays by half every 7 days
function frecencyScore(count: number, lastUsed: string): number {
  const ageMs = Date.now() - new Date(lastUsed).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyScore = Math.pow(0.5, ageDays / 7) * 100
  return count * 0.6 + recencyScore * 0.4
}

function updateFrecency(entries: FrecencyEntry[], key: string): FrecencyEntry[] {
  const now = new Date().toISOString()
  const existing = entries.find((e) => e.key === key)
  let updated: FrecencyEntry[]
  if (existing) {
    updated = entries.map((e) =>
      e.key === key
        ? { ...e, count: e.count + 1, lastUsed: now, score: frecencyScore(e.count + 1, now) }
        : e
    )
  } else {
    updated = [
      ...entries,
      { key, count: 1, lastUsed: now, score: frecencyScore(1, now) },
    ]
  }
  return updated
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FRECENCY)
}

// ─── Store interface ───────────────────────────────────────────────────────────

interface WorkspaceState extends WorkspaceSession {
  // Snapshot management
  snapshots: WorkspaceSnapshot[]
  hasPreviousSession: boolean
  sessionRestored: boolean

  // ── Mutators ────────────────────────────────────────────────────────────────

  // Client / page
  setLastClient: (id: string, name: string, gstin?: string) => void
  setLastPage: (path: string, title: string, scrollY?: number) => void
  setSidebarCollapsed: (v: boolean) => void
  setTheme: (t: 'dark' | 'light' | 'system') => void
  setFinancialYear: (fy: string) => void
  setAssessmentYear: (ay: string) => void
  setAppliedFilters: (module: string, filters: unknown) => void
  setWindowBounds: (bounds: WorkspaceSession['windowBounds']) => void

  // Tabs
  openTab: (tab: Omit<OpenTab, 'openedAt'>) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabScroll: (id: string, scrollY: number) => void

  // Commands & searches with frecency
  addRecentCommand: (cmd: string) => void
  addRecentSearch: (q: string) => void
  favoriteSearch: (q: string) => void
  unfavoriteSearch: (q: string) => void

  // Pinned / favorites
  pinClient: (client: PinnedClient) => void
  unpinClient: (id: string) => void
  pinReport: (id: string, title: string, path: string) => void
  unpinReport: (id: string) => void
  favoriteDocument: (doc: FavoriteDocument) => void
  unfavoriteDocument: (id: string) => void

  // Dashboard layout
  updateDashboardLayout: (layout: Record<string, unknown>) => void
  saveFilter: (key: string, filter: unknown) => void

  // Split panel
  setSplitPanel: (config: Partial<SplitPanelLayout>) => void
  closeSplitPanel: () => void

  // AI conversations
  trackAIConversation: (ref: AIConversationRef) => void
  setLastAIConversation: (id: string) => void

  // Pending uploads & background jobs
  addPendingUpload: (upload: Omit<PendingUpload, 'addedAt' | 'status'>) => void
  updateUploadStatus: (id: string, status: PendingUpload['status'], error?: string) => void
  removePendingUpload: (id: string) => void
  addBackgroundJob: (job: Omit<BackgroundJob, 'startedAt' | 'status'>) => void
  updateJobStatus: (id: string, status: BackgroundJob['status'], progress?: number) => void
  removeBackgroundJob: (id: string) => void

  // Snapshot management
  takeSnapshot: (label?: string) => void
  restoreSnapshot: (snapshotId: string) => void
  clearSnapshots: () => void

  // Session lifecycle
  markSessionStart: () => void
  markSessionEnd: () => void
  acknowledgeRestore: () => void
  touch: () => void
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SESSION,
      snapshots: [],
      hasPreviousSession: false,
      sessionRestored: false,

      // ── Client / page ──────────────────────────────────────────────────────

      setLastClient: (id, name, gstin) =>
        set((s) => ({
          lastClient: id,
          lastClientName: name,
          recentClients: [
            { id, name, visitedAt: new Date().toISOString() },
            ...s.recentClients.filter((c) => c.id !== id),
          ].slice(0, MAX_RECENT),
        })),

      setLastPage: (path, title, scrollY) =>
        set((s) => ({
          lastPage: path,
          recentPages: [
            { path, title, visitedAt: new Date().toISOString(), scrollY: scrollY ?? 0 },
            ...s.recentPages.filter((p) => p.path !== path),
          ].slice(0, MAX_RECENT),
        })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setTheme: (t) => set({ theme: t }),
      setFinancialYear: (fy) => set({ selectedFinancialYear: fy }),
      setAssessmentYear: (ay) => set({ selectedAssessmentYear: ay }),

      setAppliedFilters: (module, filters) =>
        set((s) => ({ appliedFilters: { ...s.appliedFilters, [module]: filters } })),

      setWindowBounds: (bounds) => set({ windowBounds: bounds }),

      // ── Tabs ──────────────────────────────────────────────────────────────

      openTab: (tab) =>
        set((s) => {
          const exists = s.openTabs.find((t) => t.id === tab.id)
          if (exists) return { activeTabId: tab.id }
          const newTab: OpenTab = { ...tab, openedAt: new Date().toISOString() }
          const tabs = [...s.openTabs, newTab].slice(-MAX_TABS)
          return { openTabs: tabs, activeTabId: tab.id }
        }),

      closeTab: (id) =>
        set((s) => {
          const tabs = s.openTabs.filter((t) => t.id !== id)
          const activeTabId =
            s.activeTabId === id
              ? tabs[tabs.length - 1]?.id ?? null
              : s.activeTabId
          return { openTabs: tabs, activeTabId }
        }),

      setActiveTab: (id) => set({ activeTabId: id }),

      updateTabScroll: (id, scrollY) =>
        set((s) => ({
          openTabs: s.openTabs.map((t) => (t.id === id ? { ...t, scrollY } : t)),
        })),

      // ── Commands & frecency ───────────────────────────────────────────────

      addRecentCommand: (cmd) =>
        set((s) => ({
          recentCommands: [cmd, ...s.recentCommands.filter((c) => c !== cmd)].slice(0, MAX_COMMANDS),
          commandFrecency: updateFrecency(s.commandFrecency, cmd),
        })),

      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, MAX_SEARCHES),
          searchFrecency: updateFrecency(s.searchFrecency, q),
        })),

      favoriteSearch: (q) =>
        set((s) =>
          s.favoriteSearches.includes(q)
            ? {}
            : { favoriteSearches: [q, ...s.favoriteSearches].slice(0, 20) }
        ),

      unfavoriteSearch: (q) =>
        set((s) => ({ favoriteSearches: s.favoriteSearches.filter((r) => r !== q) })),

      // ── Pinned / favorites ────────────────────────────────────────────────

      pinClient: (client) =>
        set((s) => {
          if (s.pinnedClients.some((c) => c.id === client.id)) return {}
          return { pinnedClients: [...s.pinnedClients, client] }
        }),

      unpinClient: (id) =>
        set((s) => ({ pinnedClients: s.pinnedClients.filter((c) => c.id !== id) })),

      pinReport: (id, title, path) =>
        set((s) => {
          if (s.pinnedReports.some((r) => r.id === id)) return {}
          return { pinnedReports: [...s.pinnedReports, { id, title, path }] }
        }),

      unpinReport: (id) =>
        set((s) => ({ pinnedReports: s.pinnedReports.filter((r) => r.id !== id) })),

      favoriteDocument: (doc) =>
        set((s) => {
          if (s.favoriteDocuments.some((d) => d.id === doc.id)) return {}
          return { favoriteDocuments: [...s.favoriteDocuments, doc] }
        }),

      unfavoriteDocument: (id) =>
        set((s) => ({ favoriteDocuments: s.favoriteDocuments.filter((d) => d.id !== id) })),

      // ── Layout ────────────────────────────────────────────────────────────

      updateDashboardLayout: (layout) => set({ dashboardLayout: layout }),

      saveFilter: (key, filter) =>
        set((s) => ({ savedFilters: { ...s.savedFilters, [key]: filter } })),

      setSplitPanel: (config) =>
        set((s) => ({ splitPanel: { ...s.splitPanel, ...config, enabled: true } })),

      closeSplitPanel: () =>
        set((s) => ({ splitPanel: { ...s.splitPanel, enabled: false } })),

      // ── AI conversations ──────────────────────────────────────────────────

      trackAIConversation: (ref) =>
        set((s) => ({
          recentAIConversations: [
            ref,
            ...s.recentAIConversations.filter((c) => c.id !== ref.id),
          ].slice(0, 10),
        })),

      setLastAIConversation: (id) => set({ lastAIConversationId: id }),

      // ── Pending uploads & background jobs ────────────────────────────────

      addPendingUpload: (upload) =>
        set((s) => ({
          pendingUploads: [
            ...s.pendingUploads,
            { ...upload, addedAt: new Date().toISOString(), status: 'queued' as const },
          ],
        })),

      updateUploadStatus: (id, status, error) =>
        set((s) => ({
          pendingUploads: s.pendingUploads.map((u) =>
            u.id === id ? { ...u, status, error } : u
          ),
        })),

      removePendingUpload: (id) =>
        set((s) => ({ pendingUploads: s.pendingUploads.filter((u) => u.id !== id) })),

      addBackgroundJob: (job) =>
        set((s) => ({
          backgroundJobs: [
            ...s.backgroundJobs,
            { ...job, startedAt: new Date().toISOString(), status: 'running' as const },
          ],
        })),

      updateJobStatus: (id, status, progress) =>
        set((s) => ({
          backgroundJobs: s.backgroundJobs.map((j) =>
            j.id === id ? { ...j, status, progress: progress ?? j.progress } : j
          ),
        })),

      removeBackgroundJob: (id) =>
        set((s) => ({ backgroundJobs: s.backgroundJobs.filter((j) => j.id !== id) })),

      // ── Snapshot management ───────────────────────────────────────────────

      takeSnapshot: (label) => {
        const s = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        const snapshot: WorkspaceSnapshot = {
          id: `snap-${Date.now()}`,
          takenAt: now.toISOString(),
          label: label ?? `Auto-save · ${timeStr}`,
          session: {
            lastClient: s.lastClient,
            lastClientName: s.lastClientName,
            lastPage: s.lastPage,
            selectedFinancialYear: s.selectedFinancialYear,
            selectedAssessmentYear: s.selectedAssessmentYear,
            openTabs: s.openTabs,
            activeTabId: s.activeTabId,
            recentPages: s.recentPages,
            sidebarCollapsed: s.sidebarCollapsed,
            splitPanel: s.splitPanel,
            dashboardLayout: s.dashboardLayout,
            theme: s.theme,
            appliedFilters: s.appliedFilters,
            savedFilters: s.savedFilters,
            recentSearches: s.recentSearches,
            favoriteSearches: s.favoriteSearches,
            recentCommands: s.recentCommands,
            commandFrecency: s.commandFrecency,
            searchFrecency: s.searchFrecency,
            pinnedClients: s.pinnedClients,
            pinnedReports: s.pinnedReports,
            favoriteDocuments: s.favoriteDocuments,
            recentClients: s.recentClients,
            recentAIConversations: s.recentAIConversations,
            lastAIConversationId: s.lastAIConversationId,
            pendingUploads: s.pendingUploads.filter((u) => u.status === 'queued'),
            backgroundJobs: s.backgroundJobs.filter((j) => j.status === 'running'),
            windowBounds: s.windowBounds,
            lastSavedAt: now.toISOString(),
            sessionStartedAt: s.sessionStartedAt,
            crashRecoveryFlag: false,
          },
        }
        set((prev) => ({
          snapshots: [snapshot, ...prev.snapshots].slice(0, MAX_SNAPSHOTS),
          hasPreviousSession: true,
        }))
      },

      restoreSnapshot: (snapshotId) => {
        const { snapshots } = get()
        const snap = snapshots.find((s) => s.id === snapshotId)
        if (!snap) return
        set({ ...snap.session, snapshots, hasPreviousSession: true, sessionRestored: true })
      },

      clearSnapshots: () => set({ snapshots: [], hasPreviousSession: false }),

      // ── Session lifecycle ─────────────────────────────────────────────────

      markSessionStart: () =>
        set((s) => ({
          sessionStartedAt: new Date().toISOString(),
          // If crashRecoveryFlag was true, a previous session crashed
          hasPreviousSession: s.lastSavedAt != null,
          crashRecoveryFlag: true,
        })),

      markSessionEnd: () => {
        get().takeSnapshot('Session end')
        set({ crashRecoveryFlag: false, lastSavedAt: new Date().toISOString() })
      },

      acknowledgeRestore: () => set({ sessionRestored: false }),

      touch: () => set({ lastSavedAt: new Date().toISOString() }),

      reset: () =>
        set({
          ...DEFAULT_SESSION,
          snapshots: [],
          hasPreviousSession: false,
          sessionRestored: false,
        }),
    }),
    {
      name: 'ca-copilot-workspace-v2',
      // Persist everything except runtime-only derived flags
      partialize: (state) => {
        // Omit all action functions — only keep plain data
        const {
          setLastClient, setLastPage, setSidebarCollapsed, setTheme,
          setFinancialYear, setAssessmentYear, setAppliedFilters, setWindowBounds,
          openTab, closeTab, setActiveTab, updateTabScroll,
          addRecentCommand, addRecentSearch, favoriteSearch, unfavoriteSearch,
          pinClient, unpinClient, pinReport, unpinReport,
          favoriteDocument, unfavoriteDocument,
          updateDashboardLayout, saveFilter,
          setSplitPanel, closeSplitPanel,
          trackAIConversation, setLastAIConversation,
          addPendingUpload, updateUploadStatus, removePendingUpload,
          addBackgroundJob, updateJobStatus, removeBackgroundJob,
          takeSnapshot, restoreSnapshot, clearSnapshots,
          markSessionStart, markSessionEnd, acknowledgeRestore,
          touch, reset,
          sessionRestored, // don't persist — recalculated on start
          ...persisted
        } = state
        return persisted
      },
    }
  )
)
