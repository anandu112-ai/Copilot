import { getSupabaseClient, isSupabaseConfigured } from '../supabase/supabaseClient'
import type { AuthUser } from '../../types'

export interface SupabaseProfile {
  id: string
  organization_id: string | null
  full_name: string
  email: string
  mobile: string | null
  firm_name: string | null
  role: string
  status: string
  created_at: string
}

export const supabaseAuthService = {
  /**
   * Register a new user in Supabase (Cloud) and sync to local SQLite
   */
  async register(data: {
    fullName: string
    email: string
    mobile?: string
    firmName?: string
    password: string
    confirmPassword: string
  }): Promise<{ success: boolean; user?: AuthUser; sessionToken?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured. Setup cloud sync in Settings.' }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return { success: false, error: 'Failed to initialize Supabase client.' }
    }

    try {
      // 1. Sign up user in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            fullName: data.fullName,
            mobile: data.mobile || '',
            firmName: data.firmName || 'My Firm',
          }
        }
      })

      if (signUpError) {
        return { success: false, error: signUpError.message }
      }

      if (!signUpData.user) {
        return { success: false, error: 'Registration failed. No user returned from Supabase.' }
      }

      // 2. Fetch the newly created profile from public.profiles
      // (The public.profiles row is created automatically by the database trigger)
      let profile: SupabaseProfile | null = null
      let attempts = 0
      const maxAttempts = 5

      while (attempts < maxAttempts && !profile) {
        // Wait 500ms for trigger to finish creating the profile
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signUpData.user.id)
          .single()

        if (!profileError && profileData) {
          profile = profileData as SupabaseProfile
        }
        attempts++
      }

      if (!profile) {
        return {
          success: false,
          error: 'User created in Auth, but failed to retrieve profile. Please try logging in.'
        }
      }

      // 3. Sync to local SQLite db so user can work offline
      const localResult = await window.electronAPI.auth.register({
        fullName: profile.full_name,
        email: profile.email,
        mobile: profile.mobile || undefined,
        firmName: profile.firm_name || undefined,
        password: data.password,
        confirmPassword: data.confirmPassword,
      })

      if (!localResult.success) {
        console.warn('Failed to sync registered user to local database:', localResult.error)
      }

      // Map Supabase profile to AuthUser
      const mappedUser: AuthUser = {
        id: localResult.user?.id || Date.now(),
        uuid: signUpData.user.id, // Use Supabase UUID
        full_name: profile.full_name,
        email: profile.email,
        mobile: profile.mobile,
        firm_name: profile.firm_name,
        created_at: profile.created_at,
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        role: profile.role,
        status: profile.status,
      }

      return {
        success: true,
        user: mappedUser,
        sessionToken: signUpData.session?.access_token || localResult.sessionToken || 'supabase-offline-session',
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Supabase registration failed.' }
    }
  },

  /**
   * Login using Supabase Auth (Cloud) and update local SQLite cache
   */
  async login(data: { email: string; password: string }): Promise<{
    success: boolean
    user?: AuthUser
    sessionToken?: string
    error?: string
  }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured. Setup cloud sync in Settings.' }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return { success: false, error: 'Failed to initialize Supabase client.' }
    }

    try {
      // 1. Sign in with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        return { success: false, error: signInError.message }
      }

      if (!signInData.user || !signInData.session) {
        return { success: false, error: 'Login failed. No session returned from Supabase.' }
      }

      // 2. Fetch profile details
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single()

      if (profileError || !profile) {
        return { success: false, error: 'Failed to fetch user profile from Supabase.' }
      }

      // 3. Sync/cache user in local SQLite for offline access
      // Try login locally first to see if local account exists.
      let localUserResult = await window.electronAPI.auth.login({
        email: data.email,
        password: data.password,
      })

      if (!localUserResult.success) {
        // If not found locally, register them locally with the same password so they can log in offline next time.
        localUserResult = await window.electronAPI.auth.register({
          fullName: profile.full_name,
          email: profile.email,
          mobile: profile.mobile || undefined,
          firmName: profile.firm_name || undefined,
          password: data.password,
          confirmPassword: data.password,
        })
      }

      const mappedUser: AuthUser = {
        id: localUserResult.user?.id || Date.now(),
        uuid: signInData.user.id,
        full_name: profile.full_name,
        email: profile.email,
        mobile: profile.mobile,
        firm_name: profile.firm_name,
        created_at: profile.created_at,
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        role: profile.role,
        status: profile.status,
      }

      return {
        success: true,
        user: mappedUser,
        sessionToken: signInData.session.access_token,
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Supabase login failed.' }
    }
  },

  /**
   * Sign out from Supabase Auth
   */
  async logout(): Promise<void> {
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut().catch(console.error)
  },

  /**
   * Update profile on Supabase and sync locally
   */
  async updateProfile(updates: {
    fullName?: string
    mobile?: string
    firmName?: string
  }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return { success: false, error: 'Failed to initialize Supabase client.' }
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { success: false, error: 'Unauthorized.' }
      }

      // Update public.profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          mobile: updates.mobile,
          firm_name: updates.firmName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (profileError || !profile) {
        return { success: false, error: profileError?.message || 'Failed to update Supabase profile.' }
      }

      // Update user metadata in Supabase Auth
      await supabase.auth.updateUser({
        data: {
          fullName: updates.fullName,
          mobile: updates.mobile,
          firmName: updates.firmName,
        }
      })

      // Sync local profile (if active local session exists)
      const activeSession = localStorage.getItem('ca-copilot-auth-session')
      if (activeSession) {
        const parsed = JSON.parse(activeSession)
        if (parsed.sessionToken) {
          await window.electronAPI.auth.updateProfile(parsed.sessionToken, updates).catch(console.error)
        }
      }

      const mappedUser: AuthUser = {
        id: Date.now(),
        uuid: user.id,
        full_name: profile.full_name,
        email: profile.email,
        mobile: profile.mobile,
        firm_name: profile.firm_name,
        created_at: profile.created_at,
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        role: profile.role,
        status: profile.status,
      }

      return {
        success: true,
        user: mappedUser,
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Profile update failed.' }
    }
  },

  /**
   * Change password in Supabase
   */
  async changePassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return { success: false, error: 'Failed to initialize Supabase client.' }
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Change password failed.' }
    }
  }
}
