import type { LucideIcon } from 'lucide-react'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface DashboardMetric {
  label: string
  value: number
  change: string
  changeDirection: 'up' | 'down'
  description: string
  icon: LucideIcon
  tone: 'brand' | 'emerald' | 'amber' | 'violet'
}

export interface DashboardClient {
  id: string
  name: string
  initials: string
  entityType: string
  status: StatusTone
  statusLabel: string
  updatedAt: string
}

export interface DashboardDocument {
  id: string
  name: string
  clientName: string
  type: string
  updatedAt: string
  status: StatusTone
  statusLabel: string
}

export interface DashboardAlert {
  id: string
  title: string
  description: string
  status: StatusTone
  statusLabel: string
  actionLabel: string
}

export interface DashboardActivity {
  id: string
  title: string
  description: string
  timestamp: string
  icon: LucideIcon
  tone: StatusTone
}

export interface DashboardAction {
  label: string
  description: string
  icon: LucideIcon
  to: string
  tone: 'brand' | 'emerald' | 'violet' | 'amber'
}
