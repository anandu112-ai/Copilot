import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import { useSettingsStore } from './stores/settingsStore'

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

// Legacy / Support Pages
import PdfToExcelPage from './pages/PdfToExcelPage'
import ChatWithDocumentsPage from './pages/ChatWithDocumentsPage'
import DocumentManagerPage from './pages/DocumentManagerPage'
import HelpPage from './pages/HelpPage'

export default function App() {
  const { loadSettings, theme } = useSettingsStore()

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

  return (
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
        <Route path="firm" element={<FirmManagementPage />} />
        
        {/* Support paths */}
        <Route path="pdf-to-excel" element={<PdfToExcelPage />} />
        <Route path="chat-with-documents" element={<ChatWithDocumentsPage />} />
        <Route path="documents" element={<DocumentManagerPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  )
}

