import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import { useSettingsStore } from './stores/settingsStore'

// Pages
import DashboardPage from './pages/DashboardPage'
import PdfToExcelPage from './pages/PdfToExcelPage'
import DocumentIntelligencePage from './pages/DocumentIntelligencePage'
import ChatWithDocumentsPage from './pages/ChatWithDocumentsPage'
import DocumentManagerPage from './pages/DocumentManagerPage'
import ClientsPage from './pages/ClientsPage'
import AuditAssistantPage from './pages/AuditAssistantPage'
import VouchingPage from './pages/VouchingPage'
import ReconciliationPage from './pages/ReconciliationPage'
import GstAssistantPage from './pages/GstAssistantPage'
import TaxAssistantPage from './pages/TaxAssistantPage'
import AiCopilotPage from './pages/AiCopilotPage'
import ReportsPage from './pages/ReportsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import HistoryPage from './pages/HistoryPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
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
        <Route path="pdf-to-excel" element={<PdfToExcelPage />} />
        <Route path="document-intelligence" element={<DocumentIntelligencePage />} />
        <Route path="chat-with-documents" element={<ChatWithDocumentsPage />} />
        <Route path="documents" element={<DocumentManagerPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="audit" element={<AuditAssistantPage />} />
        <Route path="vouching" element={<VouchingPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="gst" element={<GstAssistantPage />} />
        <Route path="tax" element={<TaxAssistantPage />} />
        <Route path="ai-copilot" element={<AiCopilotPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  )
}
