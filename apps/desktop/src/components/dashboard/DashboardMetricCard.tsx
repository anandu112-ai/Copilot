import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { DashboardMetric } from './DashboardTypes'

interface DashboardMetricCardProps {
  metric: DashboardMetric
}

const iconTones: Record<DashboardMetric['tone'], string> = {
  brand: 'bg-brand-500/10 text-brand-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  amber: 'bg-amber-500/10 text-amber-500',
  violet: 'bg-violet-500/10 text-violet-500',
}

export function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  const Icon = metric.icon
  const TrendIcon = metric.changeDirection === 'up' ? ArrowUpRight : ArrowDownRight
  const trendClass = metric.changeDirection === 'up' ? 'text-emerald-500' : 'text-rose-500'

  return (
    <article className="rounded-2xl border border-surface-700 bg-surface-900 p-5 shadow-sm transition-colors hover:border-surface-600">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-surface-400">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-100">{metric.value.toLocaleString('en-IN')}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconTones[metric.tone])}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={cn('inline-flex items-center font-semibold', trendClass)}><TrendIcon size={14} aria-hidden="true" />{metric.change}</span>
        <span className="text-surface-500">{metric.description}</span>
      </div>
    </article>
  )
}
