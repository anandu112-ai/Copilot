import type { ReactNode } from 'react'

interface DashboardSectionProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function DashboardSection({ title, description, action, children, className = '' }: DashboardSectionProps) {
  return (
    <section className={className} aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`} className="text-base font-semibold text-surface-100">{title}</h2>
          {description && <p className="mt-1 text-xs text-surface-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
