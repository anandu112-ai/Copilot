import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSpreadsheet, Users, Shield, AlertTriangle, Clock, Upload,
  Bot, Plus, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, Activity, Folder
} from 'lucide-react'
import type { DashboardStats, RecentActivityItem } from '../types'
import { formatDistanceToNow } from 'date-fns'

function StatCard({
  label, value, icon: Icon, color, subtitle
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-surface-100">{value}</p>
          {subtitle && <p className="text-xs text-surface-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  label, description, icon: Icon, color, onClick
}: {
  label: string
  description: string
  icon: React.ElementType
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:border-surface-600 transition-all duration-200 group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-sm font-semibold text-surface-200 group-hover:text-white transition-colors">{label}</p>
      <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{description}</p>
    </button>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 size={14} className="text-emerald-400" />
  if (status === 'failed') return <XCircle size={14} className="text-red-400" />
  return <AlertCircle size={14} className="text-amber-400" />
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
        <Icon size={20} className="text-surface-500" />
      </div>
      <p className="text-sm text-surface-500">{message}</p>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    totalConversions: 0,
    successfulConversions: 0,
    totalClients: 0,
    totalDocuments: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    loadDashboardData()
    checkServiceStatus()
  }, [])

  const loadDashboardData = async () => {
    if (!window.electronAPI) return
    const [statsData, activityData] = await Promise.all([
      window.electronAPI.db.getDashboardStats(),
      window.electronAPI.db.getRecentActivity(8),
    ])
    setStats(statsData)
    setRecentActivity(activityData)
  }

  const checkServiceStatus = async () => {
    if (!window.electronAPI) {
      setServiceStatus('offline')
      return
    }
    const healthy = await window.electronAPI.checkPythonHealth()
    setServiceStatus(healthy ? 'online' : 'offline')
  }

  const quickActions = [
    {
      label: 'Upload Document',
      description: 'Upload a PDF to process or convert',
      icon: Upload,
      color: 'bg-brand-600',
      onClick: () => navigate('/pdf-to-excel'),
    },
    {
      label: 'Convert PDF to Excel',
      description: 'Extract data from invoices, statements and more',
      icon: FileSpreadsheet,
      color: 'bg-emerald-600',
      onClick: () => navigate('/pdf-to-excel'),
    },
    {
      label: 'Open AI Copilot',
      description: 'Ask accounting and tax questions',
      icon: Bot,
      color: 'bg-violet-600',
      onClick: () => navigate('/ai-copilot'),
    },
    {
      label: 'Add Client',
      description: 'Register a new client in the system',
      icon: Plus,
      color: 'bg-amber-600',
      onClick: () => navigate('/clients'),
    },
    {
      label: 'Start Audit Review',
      description: 'Begin an audit engagement workflow',
      icon: Shield,
      color: 'bg-red-600',
      onClick: () => navigate('/audit'),
    },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100">Welcome to CA Copilot</h2>
          <p className="text-sm text-surface-400 mt-0.5">Your local, private AI workspace for accounting and audit work</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full ${
            serviceStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
            serviceStatus === 'offline' ? 'bg-red-500/10 text-red-400' :
            'bg-amber-500/10 text-amber-400'
          }`}>
            <Activity size={12} />
            Processing Engine: {serviceStatus === 'checking' ? 'Starting...' : serviceStatus === 'online' ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Documents Processed"
          value={stats.totalDocuments}
          icon={Folder}
          color="bg-brand-600"
          subtitle={stats.totalDocuments === 0 ? 'No documents yet' : 'Total'}
        />
        <StatCard
          label="PDFs Converted"
          value={stats.totalConversions}
          icon={FileSpreadsheet}
          color="bg-emerald-600"
          subtitle={stats.successfulConversions > 0 ? `${stats.successfulConversions} successful` : 'None yet'}
        />
        <StatCard
          label="Clients"
          value={stats.totalClients}
          icon={Users}
          color="bg-amber-600"
          subtitle="Client management coming soon"
        />
        <StatCard
          label="Pending Reviews"
          value={0}
          icon={AlertTriangle}
          color="bg-red-600"
          subtitle="Audit module coming soon"
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
        </div>

        {/* System Status */}
        <div>
          <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
            <Activity size={14} className="text-brand-400" />
            System Status
          </h3>
          <div className="card p-4 space-y-3">
            {[
              { label: 'Document Engine', available: true },
              { label: 'PDF Extraction', available: serviceStatus === 'online' },
              { label: 'OCR Service', available: serviceStatus === 'online' },
              { label: 'Local Database', available: true },
              { label: 'AI Provider', available: false, note: 'Not configured' },
              { label: 'Cloud Sync', available: false, note: 'MVP: Local only' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-surface-400">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  {item.note && <span className="text-xs text-surface-600">{item.note}</span>}
                  <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-emerald-400' : 'bg-surface-600'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
            <Clock size={14} className="text-brand-400" />
            Recent Activity
          </h3>
          {recentActivity.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          )}
        </div>
        <div className="card overflow-hidden">
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              message="No recent activity. Upload a PDF to get started."
            />
          ) : (
            <div className="divide-y divide-surface-800">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/50 transition-colors">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200 truncate">{item.title}</p>
                    <p className="text-xs text-surface-500 capitalize">{item.subtitle.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xs text-surface-600 flex-shrink-0">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
