import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import AppLayout from './components/layout/AppLayout'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { useSettingsStore } from './stores/settingsStore'
import { useAuthStore } from './stores/authStore'
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

export default function App() {
  const { loadSettings, theme } = useSettingsStore()
  const { isAuthenticated, token, setAuth, logout } = useAuthStore()

  const [serviceStatus, setServiceStatus] = useState<'checking' | 'ready' | 'failed'>('checking')

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    if (theme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Session restore — verify persisted token is still valid on app boot
  useEffect(() => {
    if (token && isAuthenticated) {
      processorApi.getMe().catch(() => {
        // Token expired or invalid — force logout
        logout()
      })
    }
  }, []) // runs once on mount

  // Python service health-check with retry
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 20  // 20 × 1.5s = 30s max wait

    async function poll() {
      try {
        const ok = await processorApi.checkHealth()
        if (cancelled) return
        if (ok) {
          setServiceStatus('ready')
          return
        }
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

  // ── If not authenticated, show login screen ──────────────────────────────
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <ErrorBoundary context="the application">
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
