import { useState } from 'react'
import { Settings, Sun, Moon, Monitor, Folder, Info, Database, RefreshCcw, Cloud, Wifi, Check, AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { cn } from '../utils/cn'
import { testSupabaseConnection } from '../services/supabase/supabaseClient'
import toast from 'react-hot-toast'

type ThemeValue = 'dark' | 'light' | 'system'

export default function SettingsPage() {
  const { 
    theme, 
    setTheme, 
    defaultExportFolder, 
    ocrEnabled, 
    setSetting,
    supabaseUrl,
    supabaseAnonKey,
    syncInterval,
    offlineCacheSize,
    backupFrequency,
    syncEnabled
  } = useSettingsStore()
  
  const [activeSection, setActiveSection] = useState('appearance')
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle')
  const [connectionError, setConnectionError] = useState('')
  const [showAnonKey, setShowAnonKey] = useState(false)

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'processing', label: 'Processing', icon: RefreshCcw },
    { id: 'storage', label: 'Storage & Data', icon: Database },
    { id: 'cloud', label: 'Cloud & Supabase', icon: Cloud },
    { id: 'about', label: 'About', icon: Info },
  ]

  const handleSelectExportFolder = async () => {
    if (!window.electronAPI) {
      toast.error('File dialog requires the desktop app')
      return
    }
    const result = await window.electronAPI.openFileDialog({
      title: 'Select Default Export Folder',
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      await setSetting('defaultExportFolder', result.filePaths[0])
      toast.success('Default export folder updated')
    }
  }

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error('Please enter both Supabase URL and Anon Key')
      return
    }
    setTestingConnection(true)
    setConnectionStatus('idle')
    setConnectionError('')
    
    try {
      const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey)
      if (result.success) {
        setConnectionStatus('success')
        toast.success('Successfully connected to Supabase!')
      } else {
        setConnectionStatus('failed')
        setConnectionError(result.error || 'Failed to connect. Verify your credentials.')
        toast.error('Connection failed')
      }
    } catch (err: any) {
      setConnectionStatus('failed')
      setConnectionError(err.message || 'An unexpected error occurred.')
      toast.error('Connection failed')
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Settings size={18} className="text-brand-400" />
            Settings
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Configure your CA Copilot workspace</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <nav className="space-y-0.5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'nav-item w-full text-left',
                  activeSection === section.id && 'active'
                )}
              >
                <section.icon size={15} />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-3 space-y-4">
          {activeSection === 'appearance' && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as { value: ThemeValue; label: string; icon: React.ElementType }[]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      theme === option.value
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-surface-700 bg-surface-800 hover:border-surface-600'
                    )}
                  >
                    <option.icon size={20} className={theme === option.value ? 'text-brand-400' : 'text-surface-400'} />
                    <span className={cn('text-sm font-medium', theme === option.value ? 'text-brand-300' : 'text-surface-300')}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'processing' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-surface-200 mb-1">Default Export Folder</h3>
                <p className="text-xs text-surface-500 mb-3">Where converted Excel files are saved by default</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={defaultExportFolder || 'Not set — you will be prompted each time'}
                    className="input flex-1 text-xs"
                  />
                  <button onClick={handleSelectExportFolder} className="btn-secondary gap-1.5 text-xs">
                    <Folder size={13} />
                    Browse
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-200">OCR Processing</h3>
                    <p className="text-xs text-surface-500 mt-0.5">Enable OCR fallback for scanned PDFs (requires Tesseract)</p>
                  </div>
                  <button
                    onClick={() => setSetting('ocrEnabled', ocrEnabled ? 'false' : 'true')}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      ocrEnabled ? 'bg-brand-600' : 'bg-surface-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      ocrEnabled ? 'translate-x-5' : 'translate-x-1'
                    )} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'storage' && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-1">Local Database</h3>
              <p className="text-xs text-surface-500 mb-4">All data is stored locally on this machine</p>
              <div className="space-y-2 text-xs text-surface-400">
                <div className="flex justify-between py-2 border-b border-surface-800">
                  <span>Database engine</span>
                  <span className="text-surface-300">SQLite (WAL mode)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-800">
                  <span>Data location</span>
                  <span className="text-surface-300 font-mono text-xs">%AppData%/ca-copilot</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-800">
                  <span>Cloud sync</span>
                  <span className={cn(syncEnabled ? "text-green-400" : "text-amber-400")}>
                    {syncEnabled ? "Enabled (Hybrid Mode)" : "Not active (Local-only)"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Encryption</span>
                  <span className="text-surface-300">AES-256 for local passwords</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'cloud' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-200">Supabase Cloud Sync</h3>
                    <p className="text-xs text-surface-500 mt-0.5">Enable dynamic data sync and hybrid authentication with Supabase</p>
                  </div>
                  <button
                    onClick={() => setSetting('syncEnabled', syncEnabled ? 'false' : 'true')}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      syncEnabled ? 'bg-brand-600' : 'bg-surface-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                      syncEnabled ? 'translate-x-5' : 'translate-x-1'
                    )} />
                  </button>
                </div>

                <div className="space-y-4 border-t border-surface-800 pt-4">
                  {/* Supabase URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSetting('supabaseUrl', e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="input w-full text-xs"
                    />
                  </div>

                  {/* Supabase Anon Key */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                      Supabase Anon Key
                    </label>
                    <div className="relative">
                      <input
                        type={showAnonKey ? 'text' : 'password'}
                        value={supabaseAnonKey}
                        onChange={(e) => setSetting('supabaseAnonKey', e.target.value)}
                        placeholder="your-supabase-anon-key"
                        className="input w-full pr-10 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnonKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                      >
                        {showAnonKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Test Connection Button */}
                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection || !supabaseUrl || !supabaseAnonKey}
                      className="btn-secondary gap-1.5 text-xs py-2 px-4"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Testing…
                        </>
                      ) : (
                        <>
                          <Wifi size={13} />
                          Test Connection
                        </>
                      )}
                    </button>

                    {connectionStatus === 'success' && (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <Check size={13} className="border border-green-400/30 rounded-full p-0.5" />
                        Connected successfully
                      </div>
                    )}

                    {connectionStatus === 'failed' && (
                      <div className="flex items-center gap-1.5 text-xs text-red-400 max-w-[280px]">
                        <AlertCircle size={13} className="flex-shrink-0" />
                        <span className="truncate">{connectionError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-surface-200">Sync Configurations</h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Sync Interval */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                      Sync Interval
                    </label>
                    <select
                      value={syncInterval}
                      onChange={(e) => setSetting('syncInterval', e.target.value)}
                      className="input w-full text-xs bg-surface-900 border-surface-700"
                    >
                      <option value="5">Every 5 minutes</option>
                      <option value="15">Every 15 minutes</option>
                      <option value="30">Every 30 minutes</option>
                      <option value="60">Every 60 minutes</option>
                    </select>
                  </div>

                  {/* Backup Frequency */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                      Cloud Backup Frequency
                    </label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setSetting('backupFrequency', e.target.value)}
                      className="input w-full text-xs bg-surface-900 border-surface-700"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Offline Cache Size */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                      Offline Document Cache Limit
                    </label>
                    <span className="text-brand-400 font-semibold">{offlineCacheSize} MB</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={offlineCacheSize}
                    onChange={(e) => setSetting('offlineCacheSize', e.target.value)}
                    className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <Settings size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-100">CA Copilot</h3>
                  <p className="text-xs text-surface-500">Version 1.0.0 — MVP</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-surface-400">
                {[
                  ['Purpose', 'AI-powered productivity for CA professionals'],
                  ['Platform', 'Electron + React + Python'],
                  ['Processing', 'Fully local — no cloud required'],
                  ['Database', 'SQLite'],
                  ['License', 'Proprietary'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-surface-800">
                    <span>{k}</span>
                    <span className="text-surface-300">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-surface-600 mt-3">
                CA Copilot is a decision support tool. All professional tax, audit, and accounting decisions must be made by a qualified Chartered Accountant.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
