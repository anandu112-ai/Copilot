import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SettingsState {
  theme: 'dark' | 'light' | 'system'
  defaultExportFolder: string
  ocrEnabled: boolean
  ocrLanguage: string
  logLevel: string
  appVersion: string
  isLoaded: boolean

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

  loadSettings: async () => {
    try {
      if (window.electronAPI) {
        const settings = await window.electronAPI.db.getSettings()
        set({
          theme: (settings.theme as 'dark' | 'light' | 'system') || 'dark',
          defaultExportFolder: settings.defaultExportFolder || '',
          ocrEnabled: settings.ocrEnabled !== 'false',
          ocrLanguage: settings.ocrLanguage || 'eng',
          logLevel: settings.logLevel || 'info',
          appVersion: settings.appVersion || '1.0.0',
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
    set(updates)
  },

  setTheme: async (theme: 'dark' | 'light' | 'system') => {
    await get().setSetting('theme', theme)
  },
}))
