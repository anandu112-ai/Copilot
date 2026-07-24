import { create } from 'zustand'
import type { AppSettings } from '../types'
import { setSupabaseCredentials } from '../services/supabase/supabaseClient'

interface SettingsState {
  theme: 'dark' | 'light' | 'system'
  defaultExportFolder: string
  ocrEnabled: boolean
  ocrLanguage: string
  logLevel: string
  appVersion: string
  isLoaded: boolean
  
  // Cloud & Supabase Sync settings
  supabaseUrl: string
  supabaseAnonKey: string
  syncInterval: string
  offlineCacheSize: string
  backupFrequency: string
  syncEnabled: boolean

  loadSettings: () => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  defaultExportFolder: '',
  ocrEnabled: true,
  ocrLanguage: 'eng',
  logLevel: 'info',
  appVersion: '1.0.0',
  isLoaded: false,
  
  // Cloud Sync defaults
  supabaseUrl: '',
  supabaseAnonKey: '',
  syncInterval: '15',
  offlineCacheSize: '500',
  backupFrequency: 'weekly',
  syncEnabled: false,

  loadSettings: async () => {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.db.getSettings()
        
        const supUrl = settings.supabaseUrl || ''
        const supKey = settings.supabaseAnonKey || ''
        
        // Sync to active local storage client config
        setSupabaseCredentials(supUrl, supKey)

        set({
          theme: (settings.theme as 'dark' | 'light' | 'system') || 'dark',
          defaultExportFolder: settings.defaultExportFolder || '',
          ocrEnabled: settings.ocrEnabled !== 'false',
          ocrLanguage: settings.ocrLanguage || 'eng',
          logLevel: settings.logLevel || 'info',
          appVersion: settings.appVersion || '1.0.0',
          
          supabaseUrl: supUrl,
          supabaseAnonKey: supKey,
          syncInterval: settings.syncInterval || '15',
          offlineCacheSize: settings.offlineCacheSize || '500',
          backupFrequency: settings.backupFrequency || 'weekly',
          syncEnabled: settings.syncEnabled === 'true',

          isLoaded: true,
        })
      } else {
        // Running in browser without Electron
        set({ isLoaded: true })
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      set({ isLoaded: true })
    }
  },

  setSetting: async (key: string, value: string) => {
    if (window.electronAPI) {
      await window.electronAPI.db.setSetting(key, value)
    }
    
    // Update local state
    const updates: Partial<SettingsState> = {}
    if (key === 'theme') updates.theme = value as 'dark' | 'light' | 'system'
    if (key === 'defaultExportFolder') updates.defaultExportFolder = value
    if (key === 'ocrEnabled') updates.ocrEnabled = value !== 'false'
    if (key === 'ocrLanguage') updates.ocrLanguage = value
    
    if (key === 'supabaseUrl') {
      updates.supabaseUrl = value
      setSupabaseCredentials(value, get().supabaseAnonKey)
    }
    if (key === 'supabaseAnonKey') {
      updates.supabaseAnonKey = value
      setSupabaseCredentials(get().supabaseUrl, value)
    }
    if (key === 'syncInterval') updates.syncInterval = value
    if (key === 'offlineCacheSize') updates.offlineCacheSize = value
    if (key === 'backupFrequency') updates.backupFrequency = value
    if (key === 'syncEnabled') updates.syncEnabled = value === 'true'
    
    set(updates)
  },

  setTheme: async (theme: 'dark' | 'light' | 'system') => {
    await get().setSetting('theme', theme)
  },
}))
