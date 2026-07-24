import { ArrowRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'
import type { DashboardAction, DashboardActivity } from './DashboardTypes'

const actionTones: Record<DashboardAction['tone'], string> = { brand: 'bg-brand-500/10 text-brand-500', emerald: 'bg-emerald-500/10 text-emerald-500', violet: 'bg-violet-500/10 text-violet-500', amber: 'bg-amber-500/10 text-amber-500' }
const activityTones: Record<DashboardActivity['tone'], string> = { success: 'bg-emerald-500/10 text-emerald-500', warning: 'bg-amber-500/10 text-amber-500', danger: 'bg-rose-500/10 text-rose-500', info: 'bg-brand-500/10 text-brand-500', neutral: 'bg-surface-700 text-surface-400' }

export function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {actions.map((action) => { const Icon = action.icon; return <Link to={action.to} key={action.label} className="group flex items-center gap-3 rounded-2xl border border-surface-700 bg-surface-900 p-4 transition-colors hover:border-brand-500/40 hover:bg-surface-800"><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', actionTones[action.tone])}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-surface-200">{action.label}</span><span className="mt-1 block truncate text-xs text-surface-500">{action.description}</span></span><ArrowRight size={16} className="text-surface-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" /></Link> })}
  </div>
}

export function RecentActivity({ activities }: { activities: DashboardActivity[] }) {
  return <div className="rounded-2xl border border-surface-700 bg-surface-900 p-5">
    <ol className="space-y-5">
      {activities.map((activity) => { const Icon = activity.icon; return <li key={activity.id} className="flex gap-3"><span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', activityTones[activity.tone])}><Icon size={15} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-surface-200">{activity.title}</p><p className="mt-0.5 text-xs leading-5 text-surface-500">{activity.description}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-surface-500"><Clock3 size={12} />{activity.timestamp}</p></div></li> })}
    </ol>
  </div>
}
