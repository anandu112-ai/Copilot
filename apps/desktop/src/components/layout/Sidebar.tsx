import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../utils/cn'
import {
  LayoutDashboard, FileSpreadsheet, Brain, MessageSquare, FolderOpen,
  Users, Shield, BookCheck, GitCompare, Receipt, Calculator,
  Bot, BarChart3, Plug, History, Bell, Settings, HelpCircle,
  ChevronLeft, ChevronRight, Zap, Building2, ShieldAlert
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  isAvailable: boolean
  comingSoon?: boolean
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'core',
    label: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard size={16} />,
        isAvailable: true,
      },
      {
        id: 'ai-copilot',
        label: 'AI Copilot',
        path: '/ai-copilot',
        icon: <Bot size={16} />,
        isAvailable: true,
      },
      {
        id: 'clients',
        label: 'Client Management',
        path: '/clients',
        icon: <Building2 size={16} />,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'automation',
    label: 'AI Services',
    items: [
      {
        id: 'document-ai',
        label: 'Document AI',
        path: '/document-ai',
        icon: <Brain size={16} />,
        isAvailable: true,
      },
      {
        id: 'invoice-processing',
        label: 'Invoice Processing',
        path: '/invoice-processing',
        icon: <Receipt size={16} />,
        isAvailable: true,
      },
    ],
  },

  {
    id: 'compliance',
    label: 'Compliance',
    items: [
      {
        id: 'gst-reconciliation',
        label: 'GST Reconciliation',
        path: '/gst-reconciliation',
        icon: <Calculator size={16} />,
        isAvailable: true,
      },
      {
        id: 'bank-reconciliation',
        label: 'Bank Reconciliation',
        path: '/bank-reconciliation',
        icon: <GitCompare size={16} />,
        isAvailable: true,
      },
      {
        id: 'ledger-reconciliation',
        label: 'Ledger Reconciliation',
        path: '/ledger-reconciliation',
        icon: <BookCheck size={16} />,
        isAvailable: true,
      },
      {
        id: 'audit',
        label: 'Audit Assistant',
        path: '/audit',
        icon: <Shield size={16} />,
        isAvailable: true,
      },
      {
        id: 'audit-intelligence',
        label: 'AI Risk Analysis',
        path: '/audit-intelligence',
        icon: <ShieldAlert size={16} />,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: <BarChart3 size={16} />,
        isAvailable: true,
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: <Settings size={16} />,
        isAvailable: true,
      },
    ],
  },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'sidebar',
        sidebarCollapsed ? 'w-16' : 'w-[240px]'
      )}
      style={{ gridRow: '1 / -1', gridColumn: '1' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800 flex-shrink-0" style={{ height: 'var(--topbar-height)' }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-surface-100 leading-tight">CA Copilot</div>
            <div className="text-xs text-surface-500 leading-tight">v1.0.0</div>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors flex-shrink-0"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-1">
            {group.label && !sidebarCollapsed && (
              <div className="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'nav-item group relative',
                    isActive && 'active',
                    sidebarCollapsed && 'justify-center px-2'
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-xs text-amber-500/70 flex-shrink-0">Soon</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-t border-surface-800 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Users size={12} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-surface-200 truncate">Local Workspace</div>
              <div className="text-xs text-surface-500">Offline · Private</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
