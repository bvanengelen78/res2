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
  const [isInitialized, setIsInitialized] = useState(false)
  const queryClient = useQueryClient()

  // Session query
  const {
    data: session,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: AUTH_KEYS.session,
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  })

  // User query (depends on session)
  const {
    data: user,
    isLoading: isUserLoading,
  } = useQuery({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      if (!session?.user) return null

      // Get user with RBAC information from our database
      const rbacUser = await RBACManager.getUserWithRBAC(session.user.id)

      if (!rbacUser) {
        // If no RBAC user found, create a basic user object
        console.warn('No RBAC user found for:', session.user.email)
        return {
          ...session.user,
          email: session.user.email || '',
          first_name: session.user.user_metadata?.first_name,
          last_name: session.user.user_metadata?.last_name,
          full_name: session.user.user_metadata?.full_name,
          resource_id: session.user.user_metadata?.resource_id,
          is_active: true,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
          roles: [],
          permissions: [],
          role_assignments: [],
        } as AuthUser
      }

      return rbacUser as AuthUser
    },
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch auth queries
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user })
    },
    onError: (error: AuthError) => {
      console.error('Sign in error:', error.message)
    },
  })

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      // Clear all auth-related queries
      queryClient.setQueryData(AUTH_KEYS.session, null)
      queryClient.setQueryData(AUTH_KEYS.user, null)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
    onError: (error: AuthError) => {
      console.error('Sign out error:', error.message)
    },
  })

  // Refresh session mutation
  const refreshSessionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session })
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user })
    },
  })

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Update session in query cache
        queryClient.setQueryData(AUTH_KEYS.session, session)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Invalidate user query to refetch with new session
          queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user })
        } else if (event === 'SIGNED_OUT') {
          // Clear user data
          queryClient.setQueryData(AUTH_KEYS.user, null)
        }
        
        if (!isInitialized) {
          setIsInitialized(true)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient, isInitialized])

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
