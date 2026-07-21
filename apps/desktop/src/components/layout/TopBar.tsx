import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useLocation } from 'react-router-dom'
import { Search, Upload, Bell, Sun, Moon, Monitor, User, X } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { cn } from '../../utils/cn'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Client Management',
  '/document-ai': 'Document AI',
  '/invoice-processing': 'Invoice Processing',
  '/gst-reconciliation': 'GST Reconciliation',
  '/bank-reconciliation': 'Bank Reconciliation',
  '/ledger-reconciliation': 'Ledger Reconciliation',
  '/audit': 'AI Audit Assistant',
  '/audit-intelligence': 'AI Risk Analysis',
  '/reports': 'Financial Reports',
  '/settings': 'Settings',
  '/ai-copilot': 'AI Chat',
  '/ai-automation': 'AI Automation Hub',
  '/enterprise': 'Enterprise Platform',
  '/integrations': 'Integration Hub',
  '/compliance': 'Tax & Compliance',
  '/firm': 'Firm Control Panel',
  '/vouching': 'Vouching Assistant',
  '/pdf-to-excel': 'PDF to Excel',
  '/chat-with-documents': 'Chat with Documents',
  '/documents': 'Document Manager',
  '/help': 'Help & Support',
}

export default function TopBar() {
  const location = useLocation()
  const { theme, setTheme } = useSettingsStore()
  const { notificationCount } = useUIStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] || 'CA Copilot'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const themeIcon = theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />

  const handleQuickUpload = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.openFileDialog({
      title: 'Upload Document',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      // Navigate to PDF to Excel with the selected file
      window.location.hash = `/pdf-to-excel?file=${encodeURIComponent(result.filePaths[0])}`
    }
  }

  return (
    <header className="topbar" style={{ gridColumn: '2', gridRow: '1' }}>
      {/* Page title */}
      {!searchOpen && (
        <h1 className="text-sm font-semibold text-surface-100 flex-shrink-0">
          {pageTitle}
        </h1>
      )}

      {/* Global search */}
      <div className={cn('flex items-center flex-1', searchOpen ? 'max-w-full' : 'max-w-sm')}>
        {searchOpen ? (
          <div className="flex items-center gap-2 w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-surface-400 flex-shrink-0" />
            <input
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search documents, clients, history..."
              className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
            />
            <button onClick={() => { setSearchOpen(false); setSearchValue('') }} className="text-surface-500 hover:text-surface-300">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-500 hover:text-surface-300 hover:border-surface-600 text-sm transition-colors"
          >
            <Search size={14} />
            <span className="text-xs">Search...</span>
            <kbd className="text-xs bg-surface-700 px-1 rounded">Ctrl+K</kbd>
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Quick Upload */}
        <button
          onClick={handleQuickUpload}
          className="btn-primary text-xs px-3 py-1.5 gap-1.5"
          title="Quick Upload"
        >
          <Upload size={13} />
          Upload
        </button>

        {/* Theme switcher */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            title="Switch theme"
          >
            {themeIcon}
          </button>
          {themeMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-surface-800 border border-surface-700 rounded-lg shadow-lg z-50 py-1">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTheme(t); setThemeMenuOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-700 transition-colors capitalize',
                    theme === t ? 'text-brand-400' : 'text-surface-300'
                  )}
                >
                  {t === 'dark' ? <Moon size={14} /> : t === 'light' ? <Sun size={14} /> : <Monitor size={14} />}
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User */}
        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-800 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  )
}
