import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, FileText, AlertCircle, Calendar, Upload, Calculator,
  GitCompare, Sparkles, Users, TrendingUp, Clock, Activity,
  CheckCircle2, AlertTriangle, Info, XCircle, Database, Cpu,
  HardDrive, Eye, ChevronRight, ArrowUpRight
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { processorApi } from '../services/processorApi'
import { cn } from '../utils/cn'

interface KPICardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle: string
  trend?: string
  loading?: boolean
}

function KPICard({ label, value, icon: Icon, color, subtitle, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 bg-surface-800 rounded animate-pulse" />
            <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
            <div className="h-3 w-32 bg-surface-800 rounded animate-pulse" />
          </div>
          <div className="w-12 h-12 bg-surface-800 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 hover:border-surface-600 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 text-left flex-1">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-surface-100">{value}</p>
            {trend && (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp size={12} />
                {trend}
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500">{subtitle}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110', color)}>
          <Icon size={20} />
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
      className="card p-5 text-left hover:border-surface-600 hover:bg-surface-750 transition-all duration-200 group flex items-start gap-4"
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-110', color)}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-surface-100 group-hover:text-white transition-colors">{label}</p>
          <ArrowUpRight size={16} className="text-surface-500 group-hover:text-surface-300 transition-colors flex-shrink-0" />
        </div>
        <p className="text-xs text-surface-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  )
}

interface ActivityItemProps {
  title: string
  subtitle: string
  time: string
  status: 'success' | 'warning' | 'error' | 'info'
}

function ActivityItem({ title, subtitle, time, status }: ActivityItemProps) {
  const statusColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500'
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-800 last:border-0">
      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', statusColors[status])} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200 truncate">{title}</p>
        <p className="text-[10px] text-surface-500 truncate mt-0.5">{subtitle}</p>
      </div>
      <span className="text-[9px] text-surface-500 font-mono whitespace-nowrap">{time}</span>
    </div>
  )
}

interface DeadlineItemProps {
  title: string
  date: string
  category: string
  daysRemaining: number
}

function DeadlineItem({ title, date, category, daysRemaining }: DeadlineItemProps) {
  const getUrgencyColor = () => {
    if (daysRemaining < 7) return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    if (daysRemaining < 15) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      GST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      IT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      Audit: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      ROC: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      TDS: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }
    return colors[category] || 'bg-surface-700/50 text-surface-400 border-surface-600'
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-800 last:border-0">
      <Calendar size={14} className={cn('mt-0.5 flex-shrink-0', daysRemaining < 7 ? 'text-rose-500' : daysRemaining < 15 ? 'text-amber-500' : 'text-emerald-500')} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200 truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider', getCategoryColor())}>
            {category}
          </span>
          <span className="text-[10px] text-surface-500">{date}</span>
        </div>
      </div>
      <div className={cn('text-[10px] font-bold px-2 py-1 rounded border', getUrgencyColor())}>
        {daysRemaining}d
      </div>
    </div>
  )
}

interface AISuggestionItemProps {
  itemType: string
  originalValue: string
  suggestedValue: string
  confidence: number
  onAccept: () => void
  onReject: () => void
}

function AISuggestionItem({ itemType, originalValue, suggestedValue, confidence, onAccept, onReject }: AISuggestionItemProps) {
  return (
    <div className="p-3 bg-surface-900 rounded-lg border border-surface-800">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[9px] uppercase font-bold text-brand-400 tracking-wider">{itemType}</span>
        <span className="text-[9px] text-surface-500 font-mono">{confidence}% confidence</span>
      </div>
      <div className="space-y-1 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-surface-500 font-semibold w-12 flex-shrink-0">From:</span>
          <span className="text-[10px] text-surface-300 line-through">{originalValue}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-surface-500 font-semibold w-12 flex-shrink-0">To:</span>
          <span className="text-[10px] text-emerald-400 font-semibold">{suggestedValue}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 text-[10px] px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20 font-semibold transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="flex-1 text-[10px] px-2 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-400 rounded border border-surface-700 font-semibold transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  )
}

interface SystemStatusItemProps {
  label: string
  status: 'online' | 'offline' | 'warning'
  icon: React.ElementType
  details: string
}

function SystemStatusItem({ label, status, icon: Icon, details }: SystemStatusItemProps) {
  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-rose-500',
    warning: 'bg-amber-500'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-900 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-surface-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200">{label}</p>
        <p className="text-[10px] text-surface-500">{details}</p>
      </div>
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[status])} />
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  if (hour < 21) return 'Good Evening'
  return 'Good Night'
}

function formatDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  return new Date().toLocaleDateString('en-IN', options)
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function calculateDaysRemaining(deadlineDate: string): number {
  const deadline = new Date(deadlineDate)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  return Math.ceil(diffMs / 86400000)
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [pythonStatus, setPythonStatus] = useState<'online' | 'offline' | 'warning'>('offline')
  const [ocrStatus, setOcrStatus] = useState<'online' | 'offline' | 'warning'>('offline')

  // Data states
  const [activeClients, setActiveClients] = useState(0)
  const [documentsProcessed, setDocumentsProcessed] = useState(0)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0)
  const [activities, setActivities] = useState<ActivityItemProps[]>([])
  const [deadlines, setDeadlines] = useState<DeadlineItemProps[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
    checkSystemHealth()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      // Load KPI data
      const [clientsData, conversionHistory, tasksData, deadlinesData] = await Promise.all([
        window.electronAPI.db.getClients(),
        window.electronAPI.db.getConversionHistory(100),
        window.electronAPI.db.getTasks(),
        window.electronAPI.db.getComplianceDeadlines()
      ])

      // Calculate KPIs
      const activeClientsCount = clientsData.filter(c => c.status?.toLowerCase() === 'active').length
      setActiveClients(activeClientsCount)

      setDocumentsProcessed(conversionHistory.length)

      const pendingTasksCount = tasksData.filter(
        t => t.status === 'pending' || t.status === 'in_progress'
      ).length
      setPendingTasks(pendingTasksCount)

      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const upcomingDeadlinesCount = deadlinesData.filter(d => {
        if (d.status !== 'upcoming') return false
        const deadline = new Date(d.deadline_date)
        return deadline >= now && deadline <= thirtyDaysFromNow
      }).length
      setUpcomingDeadlines(upcomingDeadlinesCount)

      // Load activity feed
      const recentActivity = await window.electronAPI.db.getRecentActivity(8)
      const formattedActivities: ActivityItemProps[] = recentActivity.map(act => ({
        title: act.title || 'Activity',
        subtitle: act.subtitle || '',
        time: getRelativeTime(act.created_at),
        status: (act.status as any) || 'info'
      }))
      setActivities(formattedActivities)

      // Load compliance deadlines
      const upcomingDeadlinesList = deadlinesData
        .filter(d => {
          const deadline = new Date(d.deadline_date)
          return deadline >= now
        })
        .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
        .slice(0, 5)
        .map(d => ({
          title: d.title,
          date: new Date(d.deadline_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          category: d.category || 'Other',
          daysRemaining: calculateDaysRemaining(d.deadline_date)
        }))
      setDeadlines(upcomingDeadlinesList)

      // Load AI suggestions
      const suggestions = await window.electronAPI.db.getAiSuggestions()
      const pendingSuggestions = suggestions.filter(s => s.status === 'pending').slice(0, 3)
      setAiSuggestions(pendingSuggestions)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkSystemHealth() {
    try {
      const health = await processorApi.checkHealth()
      setPythonStatus(health ? 'online' : 'offline')
      
      // Check OCR configuration
      const settings = await window.electronAPI.db.getSettings()
      const ocrEnabled = settings.ocrEnabled === 'true'
      setOcrStatus(ocrEnabled ? 'online' : 'warning')
    } catch (error) {
      setPythonStatus('offline')
      setOcrStatus('warning')
    }
  }

  async function handleAcceptSuggestion(suggestionId: string) {
    try {
      await window.electronAPI.db.updateAiSuggestionStatus(suggestionId, 'accepted')
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch (error) {
      console.error('Failed to accept suggestion:', error)
    }
  }

  async function handleRejectSuggestion(suggestionId: string) {
    try {
      await window.electronAPI.db.updateAiSuggestionStatus(suggestionId, 'rejected')
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch (error) {
      console.error('Failed to reject suggestion:', error)
    }
  }

  const quickActions = [
    {
      label: 'Upload & Convert PDF',
      description: 'Extract data from invoices, statements & ledgers',
      icon: Upload,
      color: 'bg-brand-600',
      onClick: () => navigate('/pdf-to-excel')
    },
    {
      label: 'GST Reconciliation',
      description: 'Match books vs GSTR-2B ITC claims',
      icon: Calculator,
      color: 'bg-emerald-600',
      onClick: () => navigate('/gst-reconciliation')
    },
    {
      label: 'Bank Reconciliation',
      description: 'Reconcile ledger with bank statements',
      icon: GitCompare,
      color: 'bg-violet-600',
      onClick: () => navigate('/bank-reconciliation')
    },
    {
      label: 'AI Copilot',
      description: 'Smart vouching & compliance assistant',
      icon: Sparkles,
      color: 'bg-amber-600',
      onClick: () => navigate('/ai-copilot')
    },
    {
      label: 'Manage Clients',
      description: 'View & manage client registry',
      icon: Users,
      color: 'bg-blue-600',
      onClick: () => navigate('/clients')
    }
  ]

  return (
    <div className="page-container space-y-6">
      {/* Welcome Header */}
      <div className="section-header">
        <div className="text-left">
          <h2 className="text-2xl font-black text-surface-100 leading-tight">
            {getGreeting()}, {user?.full_name || 'Professional'}
          </h2>
          <p className="text-xs text-surface-500 mt-1.5 flex items-center gap-2">
            <span>{formatDate()}</span>
            <span>•</span>
            <span className="text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
              System operational
            </span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active Clients"
          value={activeClients}
          icon={Building2}
          color="bg-brand-600"
          subtitle="Under active management"
          trend="+12%"
          loading={loading}
        />
        <KPICard
          label="Documents Processed"
          value={documentsProcessed}
          icon={FileText}
          color="bg-emerald-600"
          subtitle="Total conversions"
          trend="+8%"
          loading={loading}
        />
        <KPICard
          label="Pending Tasks"
          value={pendingTasks}
          icon={AlertCircle}
          color="bg-amber-600"
          subtitle="Requires attention"
          loading={loading}
        />
        <KPICard
          label="Upcoming Deadlines"
          value={upcomingDeadlines}
          icon={Calendar}
          color="bg-rose-600"
          subtitle="Next 30 days"
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Quick Actions & Compliance */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-brand-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action, idx) => (
                <QuickAction key={idx} {...action} />
              ))}
            </div>
          </div>

          {/* Compliance Deadlines */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-brand-500" />
              Compliance Deadlines
            </h3>
            <div className="card p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-surface-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : deadlines.length > 0 ? (
                <div className="space-y-0">
                  {deadlines.map((deadline, idx) => (
                    <DeadlineItem key={idx} {...deadline} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-surface-500">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs font-semibold">No upcoming deadlines</p>
                  <p className="text-[10px] mt-1">All compliance tasks are up to date</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-brand-500" />
              AI Recommendations
            </h3>
            <div className="card p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-24 bg-surface-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion) => (
                    <AISuggestionItem
                      key={suggestion.id}
                      itemType={suggestion.item_type || 'Suggestion'}
                      originalValue={suggestion.original_value || 'N/A'}
                      suggestedValue={suggestion.suggested_value || 'N/A'}
                      confidence={suggestion.confidence || 0}
                      onAccept={() => handleAcceptSuggestion(suggestion.id)}
                      onReject={() => handleRejectSuggestion(suggestion.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-surface-500">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs font-semibold">All clear!</p>
                  <p className="text-[10px] mt-1">No pending AI suggestions at the moment</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Activity Feed & System Status */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Activity Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-brand-500" />
              Recent Activity
            </h3>
            <div className="card p-4 flex flex-col">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 bg-surface-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <>
                  <div className="max-h-[400px] overflow-y-auto">
                    {activities.map((activity, idx) => (
                      <ActivityItem key={idx} {...activity} />
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/history')}
                    className="btn-secondary w-full text-xs justify-center gap-1.5 mt-4 border border-surface-700"
                  >
                    View All Activity
                    <ChevronRight size={12} />
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-surface-500">
                  <Info size={32} className="mx-auto mb-2" />
                  <p className="text-xs font-semibold">No recent activity</p>
                  <p className="text-[10px] mt-1">Start by uploading documents or adding clients</p>
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <HardDrive size={14} className="text-brand-500" />
              System Status
            </h3>
            <div className="card p-4 space-y-4">
              <SystemStatusItem
                label="Python Service"
                status={pythonStatus}
                icon={Cpu}
                details={pythonStatus === 'online' ? 'Processing engine ready' : 'Service unavailable'}
              />
              <SystemStatusItem
                label="Database"
                status="online"
                icon={Database}
                details="SQLite connected"
              />
              <SystemStatusItem
                label="OCR Engine"
                status={ocrStatus}
                icon={Eye}
                details={ocrStatus === 'online' ? 'Tesseract configured' : 'Not configured'}
              />
              <SystemStatusItem
                label="Backup Status"
                status="warning"
                icon={HardDrive}
                details="Last backup: Never"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
