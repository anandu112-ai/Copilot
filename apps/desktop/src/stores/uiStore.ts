import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  currentPage: string
  globalSearchOpen: boolean
  notificationCount: number

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentPage: (page: string) => void
  setGlobalSearchOpen: (open: boolean) => void
  setNotificationCount: (count: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'Dashboard',
  globalSearchOpen: false,
  notificationCount: 0,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setNotificationCount: (count) => set({ notificationCount: count }),
}))
