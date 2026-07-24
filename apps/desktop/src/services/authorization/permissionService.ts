import type { AppRole, Permission, RolePermissionRecord } from '../../types'

const privilegedRoles: AppRole[] = ['Super Admin', 'Partner']

/**
 * Renderer-side authorization is a UX guard only. Sensitive IPC/API actions
 * must enforce the same permission server-side before data is changed.
 */
export function can(role: string | undefined, permission: Permission, grants: RolePermissionRecord[]): boolean {
  if (!role) return false
  if (privilegedRoles.includes(role as AppRole)) return true
  return grants.some((grant) => grant.role === role && grant.permission === permission && grant.enabled === 1)
}

export const permissionLabels: Record<Permission, string> = {
  'clients:create': 'Create clients',
  'clients:delete': 'Delete clients',
  'documents:upload': 'Upload documents',
  'reports:view': 'View reports',
  'reports:export': 'Export reports',
  'ai:run': 'Run AI',
  'audit:approve': 'Approve audit',
  'employees:manage': 'Manage employees',
  'billing:manage': 'Manage billing',
  'roles:manage': 'Manage roles',
  'teams:manage': 'Manage teams',
}
