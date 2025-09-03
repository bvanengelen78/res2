import { createContext, useContext, ReactNode } from 'react'
import type { PermissionType, UserRole } from '@/types/rbac'

// Define AuthContextType locally since SupabaseAuthContext was removed
interface AuthContextType {
  user: any | null
  session: any | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  hasPermission: (permission: PermissionType) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  hasAllPermissions: (permissions: PermissionType[]) => boolean
  hasAnyPermission: (permissions: PermissionType[]) => boolean
  isAdmin: () => boolean
  isManager: () => boolean
}

/**
 * Mock Authentication Context for MVP Testing
 * 
 * This context provides a mock implementation of the authentication system
 * that bypasses all authentication checks and grants full access to all features.
 * 
 * Usage: Replace SupabaseAuthProvider with MockAuthProvider in App.tsx for testing
 */

// Mock user data for testing
const mockUser = {
  id: 'mock-user-id',
  email: 'stakeholder@test.com',
  roles: ['admin', 'manager', 'user'] as UserRole[],
  permissions: [
    'dashboard',
    'project_management',
    'resource_management',
    'time_logging',
    'submission_overview',
    'reports',
    'change_lead_reports',
    'user_management',
    'system_admin',
    'settings',
    'role_management',
    'calendar'
  ] as PermissionType[],
  resource: {
    id: 1,
    name: 'Test Stakeholder',
    email: 'stakeholder@test.com',
    role: 'Director',
    department: 'IT Architecture & Delivery',
    weeklyCapacity: '40.00',
    isActive: true,
    isDeleted: false,
    profileImage: null,
    createdAt: new Date(),
  },
  resourceId: 1,
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: {
    id: 'mock-user-id',
    email: 'stakeholder@test.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const MockAuthContext = createContext<AuthContextType | null>(null)

export function MockAuthProvider({ children }: { children: ReactNode }) {
  // Mock authentication functions
  const signIn = async (email: string, password: string) => {
    console.log('Mock signIn called with:', { email, password })
    // Always succeed for testing
    return Promise.resolve()
  }

  const signOut = async () => {
    console.log('Mock signOut called')
    // Always succeed for testing
    return Promise.resolve()
  }

  const refreshSession = async () => {
    console.log('Mock refreshSession called')
    // Always succeed for testing
    return Promise.resolve()
  }

  // Permission checking methods - always return true for testing
  const hasPermission = (permission: PermissionType): boolean => {
    console.log('Mock hasPermission called with:', permission)
    return true // Grant all permissions for testing
  }

  const hasRole = (role: UserRole): boolean => {
    console.log('Mock hasRole called with:', role)
    return true // Grant all roles for testing
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    console.log('Mock hasAnyRole called with:', roles)
    return true // Grant all roles for testing
  }

  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    console.log('Mock hasAllPermissions called with:', permissions)
    return true // Grant all permissions for testing
  }

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    console.log('Mock hasAnyPermission called with:', permissions)
    return true // Grant all permissions for testing
  }

  const isAdmin = (): boolean => {
    console.log('Mock isAdmin called')
    return true // Always admin for testing
  }

  const isManager = (): boolean => {
    console.log('Mock isManager called')
    return true // Always manager for testing
  }

  const value: AuthContextType = {
    user: mockUser,
    session: mockSession,
    isLoading: false, // Never loading for testing
    isAuthenticated: true, // Always authenticated for testing
    signIn,
    signOut,
    refreshSession,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isManager,
  }

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  )
}

export function useMockAuth(): AuthContextType {
  const context = useContext(MockAuthContext)
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider')
  }
  return context
}

// Export the same hooks as the real auth context for compatibility
export const useSupabaseAuth = useMockAuth
export const useAuthUser = () => {
  const { user, isLoading, isAuthenticated } = useMockAuth()
  return { user, isLoading, isAuthenticated }
}

export const useAuthActions = () => {
  const { signIn, signOut, refreshSession } = useMockAuth()
  return { signIn, signOut, refreshSession }
}
