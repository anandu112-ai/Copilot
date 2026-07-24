import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, FileText, FolderUp, ListChecks, Sparkles, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AiAlerts, RecentClients, RecentDocuments } from '../../components/dashboard/DashboardDataLists'
import { DashboardMetricCard } from '../../components/dashboard/DashboardMetricCard'
import { DashboardSection } from '../../components/dashboard/DashboardSection'
import { QuickActions, RecentActivity } from '../../components/dashboard/DashboardActionAndActivity'
import type { DashboardActivity, DashboardAlert, DashboardClient, DashboardDocument, DashboardMetric } from '../../components/dashboard/DashboardTypes'
import { useAuthStore } from '../../stores/authStore'

const fallbackClients: DashboardClient[] = [
  { id: '1', name: 'Apex Trading Company', initials: 'AT', entityType: 'Private Limited', status: 'success', statusLabel: 'Active', updatedAt: '2h ago' },
  { id: '2', name: 'Mehta & Associates', initials: 'MA', entityType: 'Partnership Firm', status: 'warning', statusLabel: 'Review due', updatedAt: 'Yesterday' },
  { id: '3', name: 'Sapphire Retail Pvt. Ltd.', initials: 'SR', entityType: 'Private Limited', status: 'success', statusLabel: 'Active', updatedAt: '2d ago' },
]

const fallbackDocuments: DashboardDocument[] = [
  { id: '1', name: 'GSTR-2B – June 2026', clientName: 'Apex Trading', type: 'GST return', updatedAt: '12 min ago', status: 'success', statusLabel: 'Processed' },
  { id: '2', name: 'Bank Statement – Q1 FY26', clientName: 'Mehta & Associates', type: 'Bank statement', updatedAt: '1h ago', status: 'warning', statusLabel: 'Needs review' },
  { id: '3', name: 'Purchase Invoices – June', clientName: 'Sapphire Retail', type: 'Invoices', updatedAt: '3h ago', status: 'info', statusLabel: 'Processing' },
]

const alerts: DashboardAlert[] = [
  { id: '1', title: 'GST reconciliation needs attention', description: '12 invoices have a mismatch between purchase register and GSTR-2B.', status: 'warning', statusLabel: '12 items', actionLabel: 'Review mismatches' },
  { id: '2', title: 'Two compliance deadlines are approaching', description: 'TDS return and advance tax payment are due within the next seven days.', status: 'danger', statusLabel: 'Due soon', actionLabel: 'View calendar' },
  { id: '3', title: 'AI found duplicate invoice candidates', description: 'Three new invoice pairs look like potential duplicates with high confidence.', status: 'info', statusLabel: '96% confident', actionLabel: 'Review suggestions' },
]

const quickActions = [
  { label: 'Upload documents', description: 'Extract and classify financial files', icon: FolderUp, to: '/document-ai', tone: 'brand' },
  { label: 'Add client', description: 'Create a client workspace', icon: UserPlus, to: '/clients', tone: 'emerald' },
  { label: 'Start reconciliation', description: 'Match books and statements', icon: ListChecks, to: '/bank-reconciliation', tone: 'violet' },
  { label: 'Ask CA Copilot', description: 'Get an AI-assisted answer', icon: Sparkles, to: '/ai-copilot', tone: 'amber' },
] as const

const activities: DashboardActivity[] = [
  { id: '1', title: 'GSTR-2B was processed', description: 'Apex Trading Company · 248 records extracted successfully', timestamp: '12 minutes ago', icon: CheckCircle2, tone: 'success' },
  { id: '2', title: 'New client added', description: 'Sapphire Retail Pvt. Ltd. was added to the workspace', timestamp: '1 hour ago', icon: Users, tone: 'info' },
  { id: '3', title: 'Bank reconciliation needs review', description: '8 transactions remain unmatched for Mehta & Associates', timestamp: '3 hours ago', icon: AlertTriangle, tone: 'warning' },
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [clients, setClients] = useState<DashboardClient[]>(fallbackClients)
  const [documents, setDocuments] = useState<DashboardDocument[]>(fallbackDocuments)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadDashboard() {
      if (!window.electronAPI) { setIsLoading(false); return }
      try {
        const [savedClients, conversions] = await Promise.all([
          window.electronAPI.db.getClients(),
          window.electronAPI.db.getConversionHistory(3),
        ])
        if (!mounted) return
        if (savedClients.length) {
          setClients(savedClients.slice(0, 3).map((client) => ({
            id: client.id,
            name: client.clientName,
            initials: client.clientName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
            entityType: client.clientType || 'Client workspace',
            status: client.status?.toLowerCase() === 'active' ? 'success' : 'warning',
            statusLabel: client.status || 'Review due',
            updatedAt: 'Recently',
          })))
        }
        if (conversions.length) {
          setDocuments(conversions.map((document) => ({
            id: document.id,
            name: document.original_file_name,
            clientName: 'Document workspace',
            type: document.document_type || 'Document',
            updatedAt: 'Recently',
            status: document.status === 'success' ? 'success' : document.status === 'failed' ? 'danger' : 'info',
            statusLabel: document.status === 'success' ? 'Processed' : document.status === 'failed' ? 'Failed' : 'Processing',
          })))
        }
      } catch (error) { console.error('Unable to load dashboard data', error) }
      finally { if (mounted) setIsLoading(false) }
    }
    loadDashboard()
    return () => { mounted = false }
  }, [])

  const metrics = useMemo<DashboardMetric[]>(() => [
    { label: 'Active clients', value: clients.length, change: '+8.2%', changeDirection: 'up', description: 'from last month', icon: Building2, tone: 'brand' },
    { label: 'Documents processed', value: documents.length, change: '+14.6%', changeDirection: 'up', description: 'this month', icon: FileText, tone: 'emerald' },
    { label: 'Tasks requiring review', value: 12, change: '3 new', changeDirection: 'down', description: 'since yesterday', icon: ListChecks, tone: 'amber' },
    { label: 'AI automation rate', value: 94, change: '+2.4%', changeDirection: 'up', description: 'processing accuracy', icon: Sparkles, tone: 'violet' },
  ], [clients.length, documents.length])

  return <div className="page-container mx-auto w-full max-w-[1600px] space-y-7 pb-10">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium text-brand-500">{greeting()}, {user?.full_name?.split(' ')[0] || 'there'}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-100">Your firm at a glance</h1><p className="mt-2 text-sm text-surface-500">Monitor clients, documents, and AI-assisted work from one place.</p></div>
      <button onClick={() => navigate('/document-ai')} className="btn-primary shrink-0 gap-2 px-4 py-2.5 text-sm"><FolderUp size={16} />Upload documents</button>
    </header>

    <section aria-label="Key statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <DashboardMetricCard key={metric.label} metric={metric} />)}</section>

    <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
      <div className="space-y-7 xl:col-span-8">
        <DashboardSection title="Recent clients" description="Clients with the latest changes" action={<button onClick={() => navigate('/clients')} className="text-xs font-semibold text-brand-500 hover:text-brand-400">View all</button>}><RecentClients clients={clients} /></DashboardSection>
        <DashboardSection title="Recent documents" description="Latest files across all client workspaces" action={<button onClick={() => navigate('/documents')} className="text-xs font-semibold text-brand-500 hover:text-brand-400">View all</button>}><RecentDocuments documents={documents} /></DashboardSection>
        <DashboardSection title="Quick actions" description="Jump straight into your most common workflows"><QuickActions actions={[...quickActions]} /></DashboardSection>
      </div>
      <aside className="space-y-7 xl:col-span-4">
        <DashboardSection title="AI alerts" description="Prioritised recommendations from CA Copilot"><AiAlerts alerts={alerts} /></DashboardSection>
        <DashboardSection title="Recent activity" description={isLoading ? 'Loading workspace activity…' : 'Latest updates from your workspace'}><RecentActivity activities={activities} /></DashboardSection>
      </aside>
    </div>
  </div>
}
