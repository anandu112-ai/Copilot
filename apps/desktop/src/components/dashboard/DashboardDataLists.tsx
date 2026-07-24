import { ArrowRight, Bot, FileText, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardAlert, DashboardClient, DashboardDocument } from './DashboardTypes'
import { StatusBadge } from './StatusBadge'

export function RecentClients({ clients }: { clients: DashboardClient[] }) {
  return <div className="overflow-hidden rounded-2xl border border-surface-700 bg-surface-900">
    <div className="divide-y divide-surface-700">
      {clients.map((client) => <div key={client.id} className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-xs font-bold text-brand-500">{client.initials}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-surface-200">{client.name}</p><p className="mt-0.5 truncate text-xs text-surface-500">{client.entityType} · Updated {client.updatedAt}</p></div>
        <StatusBadge tone={client.status}>{client.statusLabel}</StatusBadge>
        <button className="rounded-lg p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200" aria-label={`More options for ${client.name}`}><MoreHorizontal size={18} /></button>
      </div>)}
    </div>
    <Link to="/clients" className="flex items-center justify-center gap-2 border-t border-surface-700 px-5 py-3 text-xs font-semibold text-brand-500 hover:bg-surface-800">View all clients <ArrowRight size={14} /></Link>
  </div>
}

export function RecentDocuments({ documents }: { documents: DashboardDocument[] }) {
  return <div className="overflow-hidden rounded-2xl border border-surface-700 bg-surface-900">
    <div className="divide-y divide-surface-700">
      {documents.map((document) => <div key={document.id} className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"><FileText size={18} /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-surface-200">{document.name}</p><p className="mt-0.5 truncate text-xs text-surface-500">{document.clientName} · {document.type} · {document.updatedAt}</p></div>
        <StatusBadge tone={document.status}>{document.statusLabel}</StatusBadge>
      </div>)}
    </div>
    <Link to="/documents" className="flex items-center justify-center gap-2 border-t border-surface-700 px-5 py-3 text-xs font-semibold text-brand-500 hover:bg-surface-800">View document centre <ArrowRight size={14} /></Link>
  </div>
}

export function AiAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  return <div className="rounded-2xl border border-surface-700 bg-surface-900 p-3">
    <div className="space-y-2">
      {alerts.map((alert) => <article key={alert.id} className="rounded-xl border border-surface-700 bg-surface-800/50 p-4">
        <div className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500"><Bot size={16} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-surface-200">{alert.title}</p><StatusBadge tone={alert.status}>{alert.statusLabel}</StatusBadge></div><p className="mt-1 text-xs leading-5 text-surface-500">{alert.description}</p><button className="mt-3 text-xs font-semibold text-brand-500 hover:text-brand-400">{alert.actionLabel}</button></div></div>
      </article>)}
    </div>
  </div>
}
