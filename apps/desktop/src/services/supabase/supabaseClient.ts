import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let currentUrl: string | null = null
let currentKey: string | null = null

/**
 * Get or initialize the Supabase client using settings
 * If credentials are not provided or empty, returns null.
 */
export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  // If explicitly passed, use those (e.g. during test connection)
  if (url && anonKey) {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  }

  // Otherwise, load from localStorage/settings if available
  const savedUrl = localStorage.getItem('supabase_url') || ''
  const savedKey = localStorage.getItem('supabase_anon_key') || ''

  if (!savedUrl || !savedKey) {
    supabaseInstance = null
    currentUrl = null
    currentKey = null
    return null
  }

  // Reuse instance if credentials haven't changed
  if (supabaseInstance && currentUrl === savedUrl && currentKey === savedKey) {
    return supabaseInstance
  }

  try {
    currentUrl = savedUrl
    currentKey = savedKey
    supabaseInstance = createClient(savedUrl, savedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
    return supabaseInstance
  } catch (err) {
    console.error('Failed to create Supabase client:', err)
    return null
  }
}

/**
 * Set Supabase credentials in local cache/storage
 */
export function setSupabaseCredentials(url: string, anonKey: string) {
  if (url) {
    localStorage.setItem('supabase_url', url)
  } else {
    localStorage.removeItem('supabase_url')
  }

  if (anonKey) {
    localStorage.setItem('supabase_anon_key', anonKey)
  } else {
    localStorage.removeItem('supabase_anon_key')
  }

  // Force reinitialization on next call
  supabaseInstance = null
  currentUrl = null
  currentKey = null
}

/**
 * Check if Supabase client is configured
 */
export function isSupabaseConfigured(): boolean {
  const url = localStorage.getItem('supabase_url')
  const key = localStorage.getItem('supabase_anon_key')
  return !!(url && key)
}

/**
 * Test connectivity to Supabase
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url, anonKey)
    // Try a simple operation to check connection
    const { error } = await client.from('organizations').select('count', { count: 'exact', head: true }).limit(1)
    
    // If table doesn't exist yet, that's okay, but an auth or request error means connection failed
    if (error && error.code !== 'PGRST116' && error.message.includes('Fetch')) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' }
  }
}
