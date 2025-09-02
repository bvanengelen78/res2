// 🎭 DEMO MODE: Mock Authentication System
// This version accepts any email/password and grants full admin access
// Perfect for demonstrations and testing without Supabase connectivity issues

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { RBACManager } from '@/lib/rbac'
import type { RBACUser, PermissionType, UserRole } from '@/types/rbac'

// Types for our auth system
export interface AuthUser extends RBACUser {
  // Extended from RBACUser which includes roles and permissions
}

export interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  // Permission checking methods
  hasPermission: (permission: PermissionType) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  hasAllPermissions: (permissions: PermissionType[]) => boolean
  hasAnyPermission: (permissions: PermissionType[]) => boolean
  isAdmin: () => boolean
  isManager: () => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Query keys for TanStack Query
const AUTH_KEYS = {
  session: ['auth', 'session'] as const,
  user: ['auth', 'user'] as const,
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(true) // Always initialized for demo
  const [mockSession, setMockSession] = useState<Session | null>(null)
  const [mockUser, setMockUser] = useState<AuthUser | null>(null)
  const queryClient = useQueryClient()

  // Mock session - always return demo session if user is "logged in"
  const session = mockSession
  const isSessionLoading = false
  const sessionError = null

  // Mock user - always return demo admin user if session exists
  const user = mockUser
  const isUserLoading = false

  // Mock sign in mutation - accepts any credentials
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Create mock session and user data
      const mockSessionData = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'demo-admin-user-id',
          email: email,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_metadata: {
            first_name: 'Demo',
            last_name: 'Admin',
            full_name: 'Demo Admin User'
          }
        }
      }

      const mockUserData = {
        id: 'demo-admin-user-id',
        email: email,
        first_name: 'Demo',
        last_name: 'Admin',
        full_name: 'Demo Admin User',
        resource_id: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: ['admin', 'manager', 'user'],
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
        ],
        role_assignments: []
      }

      // Set mock data
      setMockSession(mockSessionData as Session)
      setMockUser(mockUserData as AuthUser)

      return { session: mockSessionData, user: mockSessionData.user }
    },
    onSuccess: () => {
      console.log('Mock sign in successful')
    },
    onError: (error: any) => {
      console.error('Mock sign in error:', error.message)
    },
  })

  // Mock sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))

      // Clear mock data
      setMockSession(null)
      setMockUser(null)
    },
    onSuccess: () => {
      console.log('Mock sign out successful')
    },
    onError: (error: any) => {
      console.error('Mock sign out error:', error.message)
    },
  })

  // Mock refresh session mutation
  const refreshSessionMutation = useMutation({
    mutationFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))
      return { session: mockSession, user: mockUser }
    },
    onSuccess: () => {
      console.log('Mock session refresh successful')
    },
    onError: (error: any) => {
      console.error('Mock refresh session error:', error.message)
    },
  })

  // Mock auth state - no listener needed for demo mode
  useEffect(() => {
    // Always mark as initialized for demo mode
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Auth functions
  const signIn = async (email: string, password: string) => {
    await signInMutation.mutateAsync({ email, password })
  }

  const signOut = async () => {
    await signOutMutation.mutateAsync()
  }

  const refreshSession = async () => {
    await refreshSessionMutation.mutateAsync()
  }

  // Determine loading state
  const isLoading = !isInitialized || isSessionLoading || isUserLoading || 
                   signInMutation.isPending || signOutMutation.isPending

  // Determine authentication state
  const isAuthenticated = !!session && !!user

  // Permission checking methods
  const hasPermission = (permission: PermissionType): boolean => {
    return user?.permissions?.includes(permission) || false
  }

  const hasRole = (role: UserRole): boolean => {
    return user?.roles?.some(r => r.name === role) || false
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const isAdmin = (): boolean => {
    return hasRole('admin')
  }

  const isManager = (): boolean => {
    return hasRole('manager')
  }

  const value: AuthContextType = {
    user: user || null,
    session: session || null,
    isLoading,
    isAuthenticated,
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
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSupabaseAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

// Convenience hook for checking authentication status
export function useAuthUser() {
  const { user, isLoading, isAuthenticated } = useSupabaseAuth()
  return { user, isLoading, isAuthenticated }
}

// Convenience hook for auth actions
export function useAuthActions() {
  const { signIn, signOut, refreshSession } = useSupabaseAuth()
  return { signIn, signOut, refreshSession }
}
