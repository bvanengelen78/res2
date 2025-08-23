// RBAC Types for ResourceFlow
// These types match the Supabase database schema

export type UserRole = 'admin' | 'manager' | 'user'

export type PermissionType = 
  | 'time_logging'
  | 'reports'
  | 'change_lead_reports'
  | 'resource_management'
  | 'project_management'
  | 'user_management'
  | 'system_admin'
  | 'dashboard'
  | 'calendar'
  | 'submission_overview'
  | 'settings'
  | 'role_management'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  resource_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  name: UserRole
  display_name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: PermissionType
  display_name: string
  description?: string
  category: string
  is_active: boolean
  created_at: string
}

export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: string
  role?: Role
  permission?: Permission
}

export interface UserRoleAssignment {
  id: number
  user_id: string
  role_id: number
  resource_id?: number
  assigned_by?: string
  assigned_at: string
  expires_at?: string
  is_active: boolean
  role?: Role
  user?: UserProfile
  assigned_by_user?: UserProfile
}

// Extended user type that includes RBAC information
export interface RBACUser extends UserProfile {
  roles: Role[]
  permissions: PermissionType[]
  role_assignments: UserRoleAssignment[]
}

// Permission checking utilities
export interface PermissionCheck {
  hasPermission: (permission: PermissionType) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  hasAllPermissions: (permissions: PermissionType[]) => boolean
  hasAnyPermission: (permissions: PermissionType[]) => boolean
  isAdmin: () => boolean
  isManager: () => boolean
  isUser: () => boolean
}

// Role hierarchy and permission groups
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  manager: 2,
  admin: 3,
}

export const PERMISSION_CATEGORIES = {
  core: ['time_logging', 'dashboard', 'calendar'] as PermissionType[],
  reporting: ['reports', 'change_lead_reports'] as PermissionType[],
  management: ['resource_management', 'project_management', 'submission_overview'] as PermissionType[],
  administration: ['user_management', 'system_admin', 'settings', 'role_management'] as PermissionType[],
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionType[]> = {
  user: [
    'time_logging',
    'dashboard', 
    'calendar'
  ],
  manager: [
    'time_logging',
    'reports',
    'change_lead_reports',
    'resource_management',
    'project_management',
    'dashboard',
    'calendar',
    'submission_overview'
  ],
  admin: [
    'time_logging',
    'reports',
    'change_lead_reports',
    'resource_management',
    'project_management',
    'user_management',
    'system_admin',
    'dashboard',
    'calendar',
    'submission_overview',
    'settings',
    'role_management'
  ],
}

// Route protection configuration
export interface RoutePermission {
  path: string
  permissions?: PermissionType[]
  roles?: UserRole[]
  requireAll?: boolean // If true, user must have ALL permissions/roles, otherwise ANY
}

export const PROTECTED_ROUTES: RoutePermission[] = [
  {
    path: '/dashboard',
    permissions: ['dashboard'],
  },
  {
    path: '/time-logging',
    permissions: ['time_logging'],
  },
  {
    path: '/reports',
    permissions: ['reports'],
  },
  {
    path: '/resources',
    permissions: ['resource_management'],
  },
  {
    path: '/projects',
    permissions: ['project_management'],
  },
  {
    path: '/settings',
    permissions: ['settings'],
    roles: ['admin'],
  },
  {
    path: '/admin',
    roles: ['admin'],
  },
  {
    path: '/users',
    permissions: ['user_management'],
    roles: ['admin'],
  },
]

// API endpoint permissions
export interface APIPermission {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  permissions?: PermissionType[]
  roles?: UserRole[]
  requireAll?: boolean
}

export const API_PERMISSIONS: APIPermission[] = [
  // User management endpoints
  {
    endpoint: '/api/users',
    method: 'GET',
    permissions: ['user_management'],
  },
  {
    endpoint: '/api/users',
    method: 'POST',
    permissions: ['user_management'],
    roles: ['admin'],
  },
  {
    endpoint: '/api/users/:id',
    method: 'PUT',
    permissions: ['user_management'],
  },
  {
    endpoint: '/api/users/:id',
    method: 'DELETE',
    roles: ['admin'],
  },
  
  // Resource management endpoints
  {
    endpoint: '/api/resources',
    method: 'GET',
    permissions: ['resource_management', 'dashboard'],
  },
  {
    endpoint: '/api/resources',
    method: 'POST',
    permissions: ['resource_management'],
  },
  {
    endpoint: '/api/resources/:id',
    method: 'PUT',
    permissions: ['resource_management'],
  },
  {
    endpoint: '/api/resources/:id',
    method: 'DELETE',
    permissions: ['resource_management'],
    roles: ['admin', 'manager'],
  },
  
  // Project management endpoints
  {
    endpoint: '/api/projects',
    method: 'GET',
    permissions: ['project_management', 'dashboard'],
  },
  {
    endpoint: '/api/projects',
    method: 'POST',
    permissions: ['project_management'],
  },
  {
    endpoint: '/api/projects/:id',
    method: 'PUT',
    permissions: ['project_management'],
  },
  {
    endpoint: '/api/projects/:id',
    method: 'DELETE',
    permissions: ['project_management'],
    roles: ['admin', 'manager'],
  },
  
  // Time logging endpoints
  {
    endpoint: '/api/time-entries',
    method: 'GET',
    permissions: ['time_logging'],
  },
  {
    endpoint: '/api/time-entries',
    method: 'POST',
    permissions: ['time_logging'],
  },
  {
    endpoint: '/api/time-entries/:id',
    method: 'PUT',
    permissions: ['time_logging'],
  },
  {
    endpoint: '/api/time-entries/:id',
    method: 'DELETE',
    permissions: ['time_logging'],
  },
  
  // Reports endpoints
  {
    endpoint: '/api/reports',
    method: 'GET',
    permissions: ['reports'],
  },
  {
    endpoint: '/api/reports/change-lead',
    method: 'GET',
    permissions: ['change_lead_reports'],
  },
]

// Utility functions for permission checking
export function hasPermission(
  userPermissions: PermissionType[], 
  requiredPermission: PermissionType
): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasRole(
  userRoles: UserRole[], 
  requiredRole: UserRole
): boolean {
  return userRoles.includes(requiredRole)
}

export function hasAnyRole(
  userRoles: UserRole[], 
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.some(role => userRoles.includes(role))
}

export function hasAllPermissions(
  userPermissions: PermissionType[], 
  requiredPermissions: PermissionType[]
): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}

export function hasAnyPermission(
  userPermissions: PermissionType[], 
  requiredPermissions: PermissionType[]
): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

export function isAdmin(userRoles: UserRole[]): boolean {
  return userRoles.includes('admin')
}

export function isManager(userRoles: UserRole[]): boolean {
  return userRoles.includes('manager')
}

export function canAccessRoute(
  userPermissions: PermissionType[],
  userRoles: UserRole[],
  route: RoutePermission
): boolean {
  // Check role requirements
  if (route.roles && route.roles.length > 0) {
    const hasRequiredRole = route.requireAll 
      ? route.roles.every(role => userRoles.includes(role))
      : route.roles.some(role => userRoles.includes(role))
    
    if (!hasRequiredRole) return false
  }
  
  // Check permission requirements
  if (route.permissions && route.permissions.length > 0) {
    const hasRequiredPermission = route.requireAll
      ? route.permissions.every(permission => userPermissions.includes(permission))
      : route.permissions.some(permission => userPermissions.includes(permission))
    
    if (!hasRequiredPermission) return false
  }
  
  return true
}
