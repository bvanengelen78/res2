import { ReactNode } from 'react'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
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
  const { 
    isAuthenticated, 
    isLoading,
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    hasAnyRole
  } = useSupabaseAuth()

  // Don't render anything while loading
  if (isLoading) {
    return null
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }

  // If no permissions or roles specified, just check authentication
  if (permissions.length === 0 && roles.length === 0) {
    return requireAuth && !isAuthenticated ? <>{fallback}</> : <>{children}</>
  }

  // Check permissions
  let hasRequiredPermissions = true
  if (permissions.length > 0) {
    hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  // Check roles
  let hasRequiredRoles = true
  if (roles.length > 0) {
    hasRequiredRoles = requireAll
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles)
  }

  // Render children if user has access, otherwise render fallback
  return (hasRequiredPermissions && hasRequiredRoles) ? <>{children}</> : <>{fallback}</>
}

// Convenience components for common patterns

/**
 * Show content only for authenticated users
 */
export function AuthGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RBACGuard requireAuth fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content only for admin users
 */
export function AdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RBACGuard roles={['admin']} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content for admin and manager users
 */
export function ManagerGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RBACGuard roles={['admin', 'manager']} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content for all authenticated users (admin, manager, user)
 */
export function UserGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RBACGuard roles={['admin', 'manager', 'user']} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content only for users with specific permission
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
  return (
    <RBACGuard permissions={[permission]} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content for users with any of the specified permissions
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
  return (
    <RBACGuard permissions={permissions} requireAll={false} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

/**
 * Show content for users with all of the specified permissions
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
  return (
    <RBACGuard permissions={permissions} requireAll={true} fallback={fallback}>
      {children}
    </RBACGuard>
  )
}

// Specific feature guards
export function TimeLoggingGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="time_logging" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ReportsGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <AnyPermissionGuard permissions={['reports', 'change_lead_reports']} fallback={fallback}>
      {children}
    </AnyPermissionGuard>
  )
}

export function ResourceManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="resource_management" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ProjectManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="project_management" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function UserManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="user_management" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function SettingsGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="settings" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function SystemAdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="system_admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function RoleManagementGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="role_management" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}
