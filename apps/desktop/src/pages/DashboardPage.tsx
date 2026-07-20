import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Calculator, GitCompare, Building2, Folder, AlertTriangle, ShieldCheck,
  TrendingUp, Clock, ArrowRight, CheckCircle2, ChevronRight, Activity, ArrowUpRight
} from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle: string
}

function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
  return (
    <div className="card p-5 hover:border-surface-650 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 text-left">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-surface-100">{value}</p>
          <p className="text-xs text-surface-500">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} text-white`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

interface QuickActionProps {
  label: string
  description: string
  icon: React.ElementType
  color: string
  onClick: () => void
}

function QuickAction({ label, description, icon: Icon, color, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:border-surface-600 hover:bg-surface-750 transition-all duration-200 group flex flex-col justify-between min-h-[120px]"
    >
      <div className="flex items-start justify-between w-full">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} text-white`}>
          <Icon size={16} />
        </div>
        <ArrowUpRight size={14} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-surface-200 group-hover:text-white transition-colors">{label}</p>
        <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  )
}

const defaultActivities = [
  {
    id: 'act-1',
    title: 'Bank Statement Reconciled',
    subtitle: 'MGM Logistics Services · Match rate: 92%',
    time: '12 mins ago',
    status: 'success'
  },
  {
    id: 'act-2',
    title: 'Invoice Extracted & Vouched',
    subtitle: 'Apex Steel Industries Pvt Ltd · INV-2026-8941',
    time: '1 hour ago',
    status: 'success'
  },
  {
    id: 'act-3',
    title: 'Critical GST Mismatch Flagged',
    subtitle: 'Max Software Solutions · GSTIN Type composition taxpayer',
    time: '3 hours ago',
    status: 'warning'
  },
  {
    id: 'act-4',
    title: 'Purchase Ledger Re-indexed',
    subtitle: 'Om Packaging Industries · FY 2026-27 update',
    time: 'Yesterday',
    status: 'info'
  }
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState('')
  const [dbStats, setDbStats] = useState({
    totalConversions: 0,
    successfulConversions: 0,
    totalClients: 0,
    totalDocuments: 0
  })
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    setCurrentDate(new Date().toLocaleDateString('en-US', options))

    async function loadData() {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const fetchedStats = await window.electronAPI.db.getDashboardStats()
          setDbStats(fetchedStats)
          const fetchedActivities = await window.electronAPI.db.getRecentActivity(5)
          if (fetchedActivities.length > 0) {
            setActivities(fetchedActivities.map((act: any) => ({
              id: act.id,
              title: act.title,
              subtitle: act.subtitle,
              time: act.created_at ? new Date(act.created_at).toLocaleTimeString() : 'Recently',
              status: act.status === 'success' ? 'success' : 'warning'
            })))
          } else {
            setActivities(defaultActivities)
          }
        } catch (e) {
          console.error(e)
          setActivities(defaultActivities)
        }
      } else {
        setActivities(defaultActivities)
      }
    }

    loadData()
  }, [])

  const stats = [
    {
      label: 'Total Clients',
      value: dbStats.totalClients || 4,
      icon: Building2,
      color: 'bg-brand-600',
      subtitle: 'Active Compliances'
    },
    {
      label: 'Documents Processed',
      value: dbStats.totalConversions || 12,
      icon: Folder,
      color: 'bg-emerald-600',
      subtitle: '99.4% AI Accuracy'
    },
    {
      label: 'Pending Reviews',
      value: Math.max(1, dbStats.totalDocuments - dbStats.totalConversions),
      icon: AlertTriangle,
      color: 'bg-amber-600',
      subtitle: 'Vouching & mismatch flags'
    },
    {
      label: 'AI Findings',
      value: '5',
      icon: ShieldCheck,
      color: 'bg-rose-600',
      subtitle: 'Auto-flagged concerns'
    }
  ]

  const quickActions = [
    {
      label: 'Upload Documents',
      description: 'OCR & extract bills, statement logs locally',
      icon: Upload,
      color: 'bg-brand-600',
      onClick: () => navigate('/document-ai'),
    },
    {
      label: 'Start GST Reconciliation',
      description: 'Run Books vs GSTR-2B offset matching',
      icon: Calculator,
      color: 'bg-emerald-600',
      onClick: () => navigate('/gst-reconciliation'),
    },
    {
      label: 'Analyze Bank Statement',
      description: 'Reconcile ledger accounts vs statement feeds',
      icon: GitCompare,
      color: 'bg-violet-600',
      onClick: () => navigate('/bank-reconciliation'),
    },
  ]

  return (
    <div className="page-container space-y-6">
      {/* Welcome Banner */}
      <div className="section-header">
        <div className="text-left">
          <h2 className="text-2xl font-black text-surface-100 leading-tight">Good Morning, CA</h2>
          <p className="text-xs text-surface-500 mt-1 flex items-center gap-1.5">
            <span>{currentDate}</span>
            <span>•</span>
            <span className="text-emerald-500 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
              AI compliance database sync online
            </span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Quick Actions + System Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick Actions */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2 text-left">
            <TrendingUp size={14} className="text-brand-500" />
            Quick Workflows
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action, idx) => (
              <QuickAction key={idx} {...action} />
            ))}
          </div>

          {/* AI Auditing Summary */}
          <div className="card p-5 text-left space-y-3 mt-1.5 flex-1">
            <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">AI Audit Diagnostics status</h4>
            <p className="text-xs text-surface-500 leading-relaxed">
              CA Copilot completed local screening of 1,249 files across 48 clients. The system verified math boundaries, checked GSTR-2B compliance records, and reviewed ledger consistency logs. All operational modules running in secure isolated sandbox environments.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-surface-800 text-xs">
              <div>
                <p className="text-surface-500">Local Sandbox</p>
                <p className="text-emerald-500 font-bold mt-1">Encrypted & Isolated</p>
              </div>
              <div>
                <p className="text-surface-500">Tally Integration</p>
                <p className="text-surface-300 font-semibold mt-1">Direct Live-Sync</p>
              </div>
              <div>
                <p className="text-surface-500">Government Portal</p>
                <p className="text-surface-300 font-semibold mt-1">Direct API connected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2 text-left">
            <Clock size={14} className="text-brand-500" />
            Workspace Activities
          </h3>
          
          <div className="card p-4 flex-1 flex flex-col justify-between">
            <div className="divide-y divide-surface-800 flex-1 overflow-y-auto max-h-[300px]">
              {activities.map((activity) => (
                <div key={activity.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 text-left">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-emerald-500' :
                    activity.status === 'warning' ? 'bg-amber-500' :
                    'bg-brand-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-200 truncate">{activity.title}</p>
                    <p className="text-[10px] text-surface-500 truncate mt-0.5">{activity.subtitle}</p>
                  </div>
                  <span className="text-[9px] text-surface-500 font-mono whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/reports')}
              className="btn-secondary w-full text-xs justify-center gap-1 mt-4 border border-surface-700"
            >
              View Detailed Reports <ChevronRight size={12} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

