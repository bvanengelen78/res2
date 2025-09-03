import { ReactNode } from 'react'
// Authentication removed - public access
import type { PermissionType, UserRole } from '@/types/rbac'

interface RBACGuardProps {
  children: ReactNode
  permissions?: PermissionType[]
  roles?: UserRole[]
  requireAll?: boolean // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: ReactNode
  requireAuth?: boolean // If true, user must be authenticated
}

/**
 * RBAC Guard component for conditional rendering based on user permissions and roles
 * 
 * @example
 * // Show content only for admins
 * <RBACGuard roles={['admin']}>
 *   <AdminPanel />
 * </RBACGuard>
 * 
 * @example
 * // Show content for users with specific permission
 * <RBACGuard permissions={['user_management']}>
 *   <UserManagementButton />
 * </RBACGuard>
 * 
 * @example
 * // Show content for users with ANY of the specified permissions
 * <RBACGuard permissions={['reports', 'change_lead_reports']}>
 *   <ReportsSection />
 * </RBACGuard>
 * 
 * @example
 * // Show content for users with ALL specified permissions
 * <RBACGuard permissions={['user_management', 'system_admin']} requireAll>
 *   <SystemAdminPanel />
 * </RBACGuard>
 */
export function RBACGuard({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  requireAuth = true
}: RBACGuardProps) {
  // Public access - always render children without permission checks
  return <>{children}</>
}

// Convenience components for common patterns - Public Access Version

/**
 * Show content for all users (public access)
 */
export function AuthGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function AdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function ManagerGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function UserGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function PermissionGuard({
  children,
  permission,
  fallback
}: {
  children: ReactNode
  permission: PermissionType
  fallback?: ReactNode
}) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function AnyPermissionGuard({
  children,
  permissions,
  fallback
}: {
  children: ReactNode
  permissions: PermissionType[]
  fallback?: ReactNode
}) {
  return <>{children}</>
}

/**
 * Show content for all users (public access)
 */
export function AllPermissionsGuard({
  children,
  permissions,
  fallback
}: {
  children: ReactNode
  permissions: PermissionType[]
  fallback?: ReactNode
}) {
  return <>{children}</>
}

// Specific feature guards - Public Access Version
export function TimeLoggingGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function ReportsGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function ResourceManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function ProjectManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function UserManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function SettingsGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function SystemAdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function RoleManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}
