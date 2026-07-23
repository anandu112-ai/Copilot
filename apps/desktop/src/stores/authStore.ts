import { create } from 'zustand'
import type { AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  sessionToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser, sessionToken: string) => void
  logout: () => void
  setLoading: (v: boolean) => void
  updateUser: (user: AuthUser) => void
}

// ── Session storage helpers ────────────────────────────────────────────────
// Using localStorage for cross-session persistence (survives app restarts)
// This is appropriate for a local desktop app where security is managed by OS
const SESSION_KEY = 'ca-copilot-auth-session'

function saveSession(user: AuthUser, sessionToken: string) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, sessionToken }))
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    // Clean up legacy session storage entries
    sessionStorage.removeItem('ca-copilot-session')
  } catch {}
}

function loadSession(): { user: AuthUser; sessionToken: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user && parsed?.sessionToken) return parsed
    return null
  } catch {
    return null
  }
}

// ── Rehydrate from localStorage on module load ─────────────────────────────
const _stored = loadSession()

export const useAuthStore = create<AuthState>()((set) => ({
  user: _stored?.user ?? null,
  sessionToken: _stored?.sessionToken ?? null,
  isAuthenticated: !!_stored?.sessionToken,
  isLoading: false,

  setAuth: (user, sessionToken) => {
    saveSession(user, sessionToken)
    set({ user, sessionToken, isAuthenticated: true, isLoading: false })
  },

  logout: async () => {
    const state = useAuthStore.getState()
    // Call IPC logout to invalidate session on backend
    if (state.sessionToken && window.electronAPI?.auth) {
      try {
        await window.electronAPI.auth.logout(state.sessionToken)
      } catch (err) {
        console.error('Logout IPC error:', err)
      }
    }
    clearSession()
    set({ user: null, sessionToken: null, isAuthenticated: false })
  },

  setLoading: (v) => set({ isLoading: v }),

  updateUser: (user) => {
    const state = useAuthStore.getState()
    if (state.sessionToken) {
      saveSession(user, state.sessionToken)
    }
    set({ user })
  },
}))
