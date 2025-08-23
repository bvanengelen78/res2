import { supabase } from './supabase'
import type {
  UserRole,
  PermissionType,
  RBACUser,
  UserProfile,
  Role,
  Permission,
  UserRoleAssignment,
  PermissionCheck
} from '@/types/rbac'

/**
 * RBAC Manager - Handles role and permission operations
 */
export class RBACManager {
  /**
   * Get user profile with roles and permissions
   */
  static async getUserWithRBAC(userId: string): Promise<RBACUser | null> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError)
        return null
      }

      // Get user roles with role details
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError)
        return null
      }

      // Get user permissions
      const permissions = await this.getUserPermissions(userId)

      const rbacUser: RBACUser = {
        ...profile,
        roles: userRoles?.map(ur => ur.role).filter(Boolean) || [],
        permissions: permissions || [],
        role_assignments: userRoles || [],
      }

      return rbacUser
    } catch (error) {
      console.error('Error in getUserWithRBAC:', error)
      return null
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<PermissionType[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: userId })

      if (error) {
        console.error('Error fetching user permissions:', error)
        return []
      }

      return data?.map((row: any) => row.permission_name as PermissionType) || []
    } catch (error) {
      console.error('Error in getUserPermissions:', error)
      return []
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_roles', { user_id: userId })

      if (error) {
        console.error('Error fetching user roles:', error)
        return []
      }

      return data?.map((row: any) => row.role_name as UserRole) || []
    } catch (error) {
      console.error('Error in getUserRoles:', error)
      return []
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permission: PermissionType): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_permission', {
          user_id: userId,
          permission_name: permission
        })

      if (error) {
        console.error('Error checking permission:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in hasPermission:', error)
      return false
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_role', {
          user_id: userId,
          role_name: role
        })

      if (error) {
        console.error('Error checking role:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Error in hasRole:', error)
      return false
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(
    userId: string,
    roleName: UserRole,
    assignedBy: string,
    resourceId?: number
  ): Promise<boolean> {
    try {
      // Get role ID
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleError || !role) {
        console.error('Error fetching role:', roleError)
        return false
      }

      // Assign role to user
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: role.id,
          resource_id: resourceId,
          assigned_by: assignedBy,
        })

      if (assignError) {
        console.error('Error assigning role:', assignError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in assignRole:', error)
      return false
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(
    userId: string,
    roleName: UserRole,
    resourceId?: number
  ): Promise<boolean> {
    try {
      // Get role ID
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single()

      if (roleError || !role) {
        console.error('Error fetching role:', roleError)
        return false
      }

      // Build query
      let query = supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', role.id)

      if (resourceId !== undefined) {
        query = query.eq('resource_id', resourceId)
      }

      const { error } = await query

      if (error) {
        console.error('Error removing role:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in removeRole:', error)
      return false
    }
  }

  /**
   * Get all available roles
   */
  static async getAllRoles(): Promise<Role[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching roles:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllRoles:', error)
      return []
    }
  }

  /**
   * Get all available permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching permissions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllPermissions:', error)
      return []
    }
  }

  /**
   * Create permission checker for a user
   */
  static createPermissionChecker(
    userPermissions: PermissionType[],
    userRoles: UserRole[]
  ): PermissionCheck {
    return {
      hasPermission: (permission: PermissionType) =>
        userPermissions.includes(permission),

      hasRole: (role: UserRole) =>
        userRoles.includes(role),

      hasAnyRole: (roles: UserRole[]) =>
        roles.some(role => userRoles.includes(role)),

      hasAllPermissions: (permissions: PermissionType[]) =>
        permissions.every(permission => userPermissions.includes(permission)),

      hasAnyPermission: (permissions: PermissionType[]) =>
        permissions.some(permission => userPermissions.includes(permission)),

      isAdmin: () => userRoles.includes('admin'),
      isManager: () => userRoles.includes('manager'),
      isUser: () => userRoles.includes('user'),
    }
  }
}

/**
 * Hook for RBAC operations
 */
export function useRBAC() {
  return {
    getUserWithRBAC: RBACManager.getUserWithRBAC,
    getUserPermissions: RBACManager.getUserPermissions,
    getUserRoles: RBACManager.getUserRoles,
    hasPermission: RBACManager.hasPermission,
    hasRole: RBACManager.hasRole,
    assignRole: RBACManager.assignRole,
    removeRole: RBACManager.removeRole,
    getAllRoles: RBACManager.getAllRoles,
    getAllPermissions: RBACManager.getAllPermissions,
    createPermissionChecker: RBACManager.createPermissionChecker,
  }
}