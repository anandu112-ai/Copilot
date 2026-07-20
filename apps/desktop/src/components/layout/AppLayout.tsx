import { Outlet } from 'react-router-dom'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../utils/cn'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div
      className={cn(
        'app-layout',
        sidebarCollapsed && 'sidebar-collapsed'
      )}
    >
      <Sidebar />
      <TopBar />
      <main className="main-content bg-surface-950 animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
