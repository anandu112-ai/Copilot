import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  branch: string
  is_admin: boolean
  permissions: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null        // kept in memory only — never written to localStorage
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
  setLoading: (v: boolean) => void
}

// ── Session storage helpers ────────────────────────────────────────────────
// sessionStorage is cleared when the browser/Electron window closes.
// It is NOT accessible by other origins and is harder to steal than
// localStorage, which any injected script can read synchronously.
const SESSION_KEY = 'ca-copilot-session'

function saveSession(user: AuthUser, token: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }))
  } catch {
    // storage unavailable — memory-only fallback is still fine
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    // Also clean up any legacy localStorage entry from previous builds
    localStorage.removeItem('ca-copilot-auth')
  } catch {}
}

function loadSession(): { user: AuthUser; token: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user && parsed?.token) return parsed
    return null
  } catch {
    return null
  }
}

// ── Rehydrate from sessionStorage on module load ───────────────────────────
const _stored = loadSession()

export const useAuthStore = create<AuthState>()((set) => ({
  user: _stored?.user ?? null,
  token: _stored?.token ?? null,
  isAuthenticated: !!_stored?.token,
  isLoading: false,

  setAuth: (user, token) => {
    saveSession(user, token)
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    clearSession()
    set({ user: null, token: null, isAuthenticated: false })
  },

  setLoading: (v) => set({ isLoading: v }),
}))
