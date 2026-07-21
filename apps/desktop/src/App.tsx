import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { SessionRestoreDialog } from './components/common/SessionRestoreDialog'
import { GlobalSearchModal } from './components/common/GlobalSearchModal'
import { CommandPalette } from './components/common/CommandPalette'
import { useSettingsStore } from './stores/settingsStore'
import { useAuthStore } from './stores/authStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useWorkspaceMemory } from './hooks/useWorkspaceMemory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { processorApi } from './services/processorApi'

// Auth
import LoginPage from './pages/LoginPage'

// Pages
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import DocumentAiPage from './pages/DocumentAiPage'
import InvoiceProcessingPage from './pages/InvoiceProcessingPage'
import GstReconciliationPage from './pages/GstReconciliationPage'
import BankReconciliationPage from './pages/BankReconciliationPage'
import LedgerReconciliationPage from './pages/LedgerReconciliationPage'
import AuditAssistantPage from './pages/AuditAssistantPage'
import AuditIntelligencePage from './pages/AuditIntelligencePage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AiCopilotPage from './pages/AiCopilotPage'
import FirmManagementPage from './pages/FirmManagementPage'
import AiAutomationPage from './pages/AiAutomationPage'
import EnterprisePage from './pages/EnterprisePage'
import IntegrationsPage from './pages/IntegrationsPage'
import CompliancePage from './pages/CompliancePage'
import VouchingPage from './pages/VouchingPage'

// Legacy / Support Pages
import PdfToExcelPage from './pages/PdfToExcelPage'
import ChatWithDocumentsPage from './pages/ChatWithDocumentsPage'
import DocumentManagerPage from './pages/DocumentManagerPage'
import HelpPage from './pages/HelpPage'

// ── Page title map (mirrors TopBar and used by workspace memory) ─────────────
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

// ── Inner component — has Router context so it can use useLocation ────────────
function AppInner() {
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'CA Copilot'

  const { hasPreviousSession, acknowledgeRestore, reset } = useWorkspaceStore()

  // Workspace auto-save + page tracking
  useWorkspaceMemory(location.pathname, pageTitle)

  // Keyboard shortcuts
  useKeyboardShortcuts()

  // Show restore dialog only on first render if there is a previous session
  const [showRestoreDialog, setShowRestoreDialog] = useState(hasPreviousSession)

  const handleResume = () => {
    setShowRestoreDialog(false)
    acknowledgeRestore()
  }

  const handleFresh = () => {
    reset()
    setShowRestoreDialog(false)
  }

  return (
    <ErrorBoundary context="the application">
      {/* Modals rendered outside the layout tree so they're always on top */}
      <GlobalSearchModal />
      <CommandPalette />

      {/* Session restore dialog — shown once on startup if previous session exists */}
      {showRestoreDialog && (
        <SessionRestoreDialog onResume={handleResume} onFresh={handleFresh} />
      )}

      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="document-ai" element={<DocumentAiPage />} />
          <Route path="invoice-processing" element={<InvoiceProcessingPage />} />
          <Route path="gst-reconciliation" element={<GstReconciliationPage />} />
          <Route path="bank-reconciliation" element={<BankReconciliationPage />} />
          <Route path="ledger-reconciliation" element={<LedgerReconciliationPage />} />
          <Route path="audit" element={<AuditAssistantPage />} />
          <Route path="audit-intelligence" element={<AuditIntelligencePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="ai-copilot" element={<AiCopilotPage />} />
          <Route path="ai-automation" element={<AiAutomationPage />} />
          <Route path="enterprise" element={<EnterprisePage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="firm" element={<FirmManagementPage />} />
          <Route path="vouching" element={<VouchingPage />} />
          {/* Support paths */}
          <Route path="pdf-to-excel" element={<PdfToExcelPage />} />
          <Route path="chat-with-documents" element={<ChatWithDocumentsPage />} />
          <Route path="documents" element={<DocumentManagerPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

// ── Root App component ────────────────────────────────────────────────────────
export default function App() {
  const { loadSettings, theme } = useSettingsStore()
  const { isAuthenticated, token, logout } = useAuthStore()

  const [serviceStatus, setServiceStatus] = useState<'checking' | 'ready' | 'failed'>('checking')

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Apply theme to <html>
  useEffect(() => {
    const applyTheme = (t: typeof theme) => {
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      if (t === 'system') {
        root.classList.add(
          window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        )
      } else {
        root.classList.add(t)
      }
    }
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => { if (theme === 'system') applyTheme('system') }
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [theme])

  // Verify persisted token on boot
  useEffect(() => {
    if (token && isAuthenticated) {
      processorApi.getMe().catch(() => logout())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Python service health-check with retry
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 20

    async function poll() {
      try {
        const ok = await processorApi.checkHealth()
        if (cancelled) return
        if (ok) { setServiceStatus('ready'); return }
      } catch {}
      attempts++
      if (attempts >= maxAttempts) {
        if (!cancelled) setServiceStatus('failed')
        return
      }
      setTimeout(poll, 1500)
    }
    poll()
    return () => { cancelled = true }
  }, [])

  if (!isAuthenticated) return <LoginPage />

  return <AppInner />
}
