import { 
  PERMISSIONS, 
  MENU_ITEMS, 
  MENU_PERMISSIONS, 
  ROLE_PERMISSIONS, 
  ROLES,
  type PermissionType, 
  type RoleType, 
  type MenuItemType 
} from '@shared/schema';

// User permissions interface
export interface UserPermissions {
  roles: Array<{ role: RoleType }>;
  permissions: PermissionType[];
}

/**
 * Central Role-Based Access Control (RBAC) utility
 * Provides centralized access control for the entire application
 */
export class RBACManager {
  
  /**
   * Check if user has a specific permission
   */
  static hasPermission(user: UserPermissions | null, permission: PermissionType): boolean {
    if (!user) return false;
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: UserPermissions | null, permissions: PermissionType[]): boolean {
    if (!user) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(user: UserPermissions | null, permissions: PermissionType[]): boolean {
    if (!user) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user has a specific role
   */
  static hasRole(user: UserPermissions | null, role: RoleType): boolean {
    if (!user) return false;
    return user.roles.some(r => r.role === role);
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: UserPermissions | null, roles: RoleType[]): boolean {
    if (!user) return false;
    return roles.some(role => user.roles.some(r => r.role === role));
  }

  /**
   * Check if user can access a specific menu item
   */
  static canAccessMenuItem(user: UserPermissions | null, menuItem: MenuItemType): boolean {
    if (!user) return false;
    
    const requiredPermissions = MENU_PERMISSIONS[menuItem];
    if (!requiredPermissions) return false;

    return this.hasAnyPermission(user, requiredPermissions);
  }

  /**
   * Get all accessible menu items for a user
   */
  static getAccessibleMenuItems(user: UserPermissions | null): MenuItemType[] {
    if (!user) return [];
    
    return Object.keys(MENU_ITEMS).filter(key => {
      const menuItem = MENU_ITEMS[key as keyof typeof MENU_ITEMS];
      return this.canAccessMenuItem(user, menuItem);
    }) as MenuItemType[];
  }

  /**
   * Check if user is admin
   */
  static isAdmin(user: UserPermissions | null): boolean {
    return this.hasRole(user, ROLES.ADMIN);
  }

  /**
   * Check if user has system admin permissions
   */
  static isSystemAdmin(user: UserPermissions | null): boolean {
    return this.hasPermission(user, PERMISSIONS.SYSTEM_ADMIN);
  }

  /**
   * Check if user can manage roles
   */
  static canManageRoles(user: UserPermissions | null): boolean {
    return this.hasPermission(user, PERMISSIONS.ROLE_MANAGEMENT);
  }

  /**
   * Get user's role display names
   */
  static getUserRoleNames(user: UserPermissions | null): string[] {
    if (!user) return [];
    
    return user.roles.map(role => {
      switch (role.role) {
        case ROLES.REGULAR_USER:
          return 'Regular User';
        case ROLES.CHANGE_LEAD:
          return 'Change Lead';
        case ROLES.MANAGER_CHANGE:
          return 'Manager Change';
        case ROLES.BUSINESS_CONTROLLER:
          return 'Business Controller';
        case ROLES.ADMIN:
          return 'Admin';
        default:
          return role.role;
      }
    });
  }

  /**
   * Get permissions for a specific role
   */
  static getPermissionsForRole(role: RoleType): PermissionType[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get all available roles
   */
  static getAllRoles(): Array<{ value: RoleType; label: string; permissions: PermissionType[] }> {
    return Object.values(ROLES).map(role => ({
      value: role,
      label: this.getRoleDisplayName(role),
      permissions: this.getPermissionsForRole(role)
    }));
  }

  /**
   * Get display name for a role
   */
  static getRoleDisplayName(role: RoleType): string {
    switch (role) {
      case ROLES.REGULAR_USER:
        return 'Regular User';
      case ROLES.CHANGE_LEAD:
        return 'Change Lead';
      case ROLES.MANAGER_CHANGE:
        return 'Manager Change';
      case ROLES.BUSINESS_CONTROLLER:
        return 'Business Controller';
      case ROLES.ADMIN:
        return 'Admin';
      default:
        return role;
    }
  }

  /**
   * Get display name for a permission
   */
  static getPermissionDisplayName(permission: PermissionType): string {
    switch (permission) {
      case PERMISSIONS.TIME_LOGGING:
        return 'Time Logging';
      case PERMISSIONS.REPORTS:
        return 'Reports';
      case PERMISSIONS.CHANGE_LEAD_REPORTS:
        return 'Change Lead Reports';
      case PERMISSIONS.RESOURCE_MANAGEMENT:
        return 'Resource Management';
      case PERMISSIONS.PROJECT_MANAGEMENT:
        return 'Project Management';
      case PERMISSIONS.USER_MANAGEMENT:
        return 'User Management';
      case PERMISSIONS.SYSTEM_ADMIN:
        return 'System Administration';
      case PERMISSIONS.DASHBOARD:
        return 'Dashboard';
      case PERMISSIONS.CALENDAR:
        return 'Calendar';
      case PERMISSIONS.SUBMISSION_OVERVIEW:
        return 'Submission Overview';
      case PERMISSIONS.SETTINGS:
        return 'Settings';
      case PERMISSIONS.ROLE_MANAGEMENT:
        return 'Role Management';
      default:
        return permission;
    }
  }

  /**
   * Get menu item display name
   */
  static getMenuItemDisplayName(menuItem: MenuItemType): string {
    switch (menuItem) {
      case MENU_ITEMS.DASHBOARD:
        return 'Dashboard';
      case MENU_ITEMS.PROJECTS:
        return 'Projects';
      case MENU_ITEMS.RESOURCES:
        return 'Resources';
      case MENU_ITEMS.CALENDAR:
        return 'Calendar';
      case MENU_ITEMS.TIME_LOGGING:
        return 'Time Logging';
      case MENU_ITEMS.SUBMISSION_OVERVIEW:
        return 'Submission Overview';
      case MENU_ITEMS.REPORTS:
        return 'Reports';
      case MENU_ITEMS.CHANGE_LEAD_REPORTS:
        return 'Change Lead Reports';
      case MENU_ITEMS.SETTINGS:
        return 'Settings';
      default:
        return menuItem;
    }
  }
}

// Export convenience functions
export const {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  canAccessMenuItem,
  getAccessibleMenuItems,
  isAdmin,
  isSystemAdmin,
  canManageRoles,
  getUserRoleNames,
  getPermissionsForRole,
  getAllRoles,
  getRoleDisplayName,
  getPermissionDisplayName,
  getMenuItemDisplayName
} = RBACManager;