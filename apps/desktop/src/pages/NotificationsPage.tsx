import { Bell, Info } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Bell size={18} className="text-brand-400" />
            Notifications
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">System alerts, processing updates, and activity notifications</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-800 flex items-center justify-center mb-4">
            <Bell size={22} className="text-surface-500" />
          </div>
          <p className="text-sm font-medium text-surface-300 mb-1">No notifications</p>
          <p className="text-xs text-surface-500 max-w-xs">
            You'll see processing alerts, conversion results, and system updates here.
          </p>
        </div>
      </div>
    </div>
  )
}
