import { useAuth } from '@/context/AuthContext';
import { RBACManager } from '@/lib/rbac';
import type { PermissionType, RoleType, MenuItemType } from '@shared/schema';

/**
 * Custom hook for Role-Based Access Control (RBAC)
 * Provides easy access to permission checking throughout the application
 */
export function useRBAC() {
  const { user } = useAuth();

  return {
    // Permission checks
    hasPermission: (permission: PermissionType) => 
      RBACManager.hasPermission(user, permission),
    
    hasAnyPermission: (permissions: PermissionType[]) => 
      RBACManager.hasAnyPermission(user, permissions),
    
    hasAllPermissions: (permissions: PermissionType[]) => 
      RBACManager.hasAllPermissions(user, permissions),
    
    // Role checks
    hasRole: (role: RoleType) => 
      RBACManager.hasRole(user, role),
    
    hasAnyRole: (roles: RoleType[]) => 
      RBACManager.hasAnyRole(user, roles),
    
    // Menu access
    canAccessMenuItem: (menuItem: MenuItemType) => 
      RBACManager.canAccessMenuItem(user, menuItem),
    
    getAccessibleMenuItems: () => 
      RBACManager.getAccessibleMenuItems(user),
    
    // Admin checks
    isAdmin: () => RBACManager.isAdmin(user),
    
    isSystemAdmin: () => RBACManager.isSystemAdmin(user),
    
    canManageRoles: () => RBACManager.canManageRoles(user),
    
    // User info
    getUserRoleNames: () => RBACManager.getUserRoleNames(user),
    
    // Current user data
    user,
    
    // Utility functions
    getRoleDisplayName: RBACManager.getRoleDisplayName,
    getPermissionDisplayName: RBACManager.getPermissionDisplayName,
    getMenuItemDisplayName: RBACManager.getMenuItemDisplayName,
    getAllRoles: RBACManager.getAllRoles,
    getPermissionsForRole: RBACManager.getPermissionsForRole,
  };
}