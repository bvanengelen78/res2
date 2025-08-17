import { ReactNode } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import type { PermissionType, RoleType, MenuItemType } from '@shared/schema';

interface RoleGuardProps {
  children: ReactNode;
  
  // Permission-based access
  permission?: PermissionType;
  permissions?: PermissionType[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
  
  // Role-based access
  role?: RoleType;
  roles?: RoleType[];
  
  // Menu item access
  menuItem?: MenuItemType;
  
  // Admin checks
  adminOnly?: boolean;
  systemAdminOnly?: boolean;
  
  // Fallback content when access is denied
  fallback?: ReactNode;
  
  // Invert the logic (show when user DOESN'T have access)
  invert?: boolean;
}

/**
 * Role-Based Access Control Guard Component
 * Conditionally renders children based on user permissions, roles, or menu access
 */
export function RoleGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  menuItem,
  adminOnly = false,
  systemAdminOnly = false,
  fallback = null,
  invert = false,
}: RoleGuardProps) {
  const rbac = useRBAC();
  
  let hasAccess = false;
  
  // Check admin access first
  if (adminOnly) {
    hasAccess = rbac.isAdmin();
  } else if (systemAdminOnly) {
    hasAccess = rbac.isSystemAdmin();
  } else {
    // Check specific permission
    if (permission) {
      hasAccess = rbac.hasPermission(permission);
    }
    
    // Check multiple permissions
    if (permissions && permissions.length > 0) {
      hasAccess = requireAll 
        ? rbac.hasAllPermissions(permissions)
        : rbac.hasAnyPermission(permissions);
    }
    
    // Check specific role
    if (role) {
      hasAccess = rbac.hasRole(role);
    }
    
    // Check multiple roles
    if (roles && roles.length > 0) {
      hasAccess = rbac.hasAnyRole(roles);
    }
    
    // Check menu item access
    if (menuItem) {
      hasAccess = rbac.canAccessMenuItem(menuItem);
    }
  }
  
  // Invert logic if specified
  if (invert) {
    hasAccess = !hasAccess;
  }
  
  // If no access rules are specified, default to showing content
  if (!permission && !permissions && !role && !roles && !menuItem && !adminOnly && !systemAdminOnly) {
    hasAccess = true;
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard adminOnly fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function SystemAdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard systemAdminOnly fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function PermissionGuard({ 
  children, 
  permission, 
  permissions, 
  requireAll = false, 
  fallback = null 
}: { 
  children: ReactNode; 
  permission?: PermissionType; 
  permissions?: PermissionType[]; 
  requireAll?: boolean;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard 
      permission={permission} 
      permissions={permissions} 
      requireAll={requireAll} 
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function RoleBasedGuard({ 
  children, 
  role, 
  roles, 
  fallback = null 
}: { 
  children: ReactNode; 
  role?: RoleType; 
  roles?: RoleType[]; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard role={role} roles={roles} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function MenuItemGuard({ 
  children, 
  menuItem, 
  fallback = null 
}: { 
  children: ReactNode; 
  menuItem: MenuItemType; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard menuItem={menuItem} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}