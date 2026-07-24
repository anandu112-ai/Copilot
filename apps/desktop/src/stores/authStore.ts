import { create } from 'zustand'
import type { AuthUser } from '../types'
import { isSupabaseConfigured } from '../services/supabase/supabaseClient'
import { supabaseAuthService } from '../services/auth/supabaseAuthService'

interface AuthState {
  user: AuthUser | null
  sessionToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser, sessionToken: string) => void
  login: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>
  register: (data: {
    fullName: string
    email: string
    mobile?: string
    firmName?: string
    password: string
    confirmPassword: string
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setLoading: (v: boolean) => void
  updateUser: (user: AuthUser) => void
}

// ── Session storage helpers ────────────────────────────────────────────────
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

const _stored = loadSession()

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: _stored?.user ?? null,
  sessionToken: _stored?.sessionToken ?? null,
  isAuthenticated: !!_stored?.sessionToken,
  isLoading: false,

  setAuth: (user, sessionToken) => {
    saveSession(user, sessionToken)
    set({ user, sessionToken, isAuthenticated: true, isLoading: false })
  },

  login: async (data) => {
    set({ isLoading: true })
    try {
      // 1. Try Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const result = await supabaseAuthService.login(data)
          if (result.success && result.user && result.sessionToken) {
            get().setAuth(result.user, result.sessionToken)
            return { success: true }
          }
          if (result.error && !result.error.includes('fetch') && !result.error.includes('network')) {
            // Authentic credential failure on cloud -> don't bypass with local
            return { success: false, error: result.error }
          }
        } catch (supabaseErr: any) {
          console.warn('Supabase auth failed/offline, trying local fallback...', supabaseErr)
        }
      }

      // 2. Local SQLite Auth fallback
      const localResult = await window.electronAPI.auth.login(data)
      if (localResult.success && localResult.user && localResult.sessionToken) {
        get().setAuth(localResult.user, localResult.sessionToken)
        return { success: true }
      }
      return { success: false, error: localResult.error || 'Authentication failed.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' }
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      // 1. Try Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const result = await supabaseAuthService.register(data)
          if (result.success && result.user && result.sessionToken) {
            get().setAuth(result.user, result.sessionToken)
            return { success: true }
          }
          if (result.error && !result.error.includes('fetch') && !result.error.includes('network')) {
            return { success: false, error: result.error }
          }
        } catch (supabaseErr: any) {
          console.warn('Supabase signup failed/offline, trying local fallback...', supabaseErr)
        }
      }

      // 2. Local SQLite Auth fallback
      const localResult = await window.electronAPI.auth.register(data)
      if (localResult.success && localResult.user && localResult.sessionToken) {
        get().setAuth(localResult.user, localResult.sessionToken)
        return { success: true }
      }
      return { success: false, error: localResult.error || 'Registration failed.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    const state = useAuthStore.getState()
    
    // Sign out from Supabase if configured
    if (isSupabaseConfigured()) {
      await supabaseAuthService.logout().catch(console.error)
    }

    // Call IPC logout to invalidate session locally
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

