import { useEffect, useMemo, useState } from 'react'
import type { Permission, RolePermissionRecord } from '../types'
import { can } from '../services/authorization/permissionService'
import { useAuthStore } from '../stores/authStore'

export function usePermissions() {
  const role = useAuthStore((state) => state.user?.role)
  const [grants, setGrants] = useState<RolePermissionRecord[]>([])

  useEffect(() => {
    window.electronAPI?.db.getRolePermissions()
      .then((records) => setGrants(records as RolePermissionRecord[]))
      .catch(() => setGrants([]))
  }, [])

  return useMemo(() => ({
    grants,
    can: (permission: Permission) => can(role, permission, grants),
  }), [grants, role])
}
