import { cn } from '../../utils/cn'
import type { StatusTone } from './DashboardTypes'

interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 ring-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-500 ring-rose-500/20',
  info: 'bg-brand-500/10 text-brand-500 ring-brand-500/20',
  neutral: 'bg-surface-700 text-surface-400 ring-surface-600',
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', toneClasses[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}
