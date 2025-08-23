import { ReactNode } from 'react'
import { useLocation } from 'wouter'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle, LogIn } from 'lucide-react'
import type { PermissionType, UserRole } from '@/types/rbac'

interface ProtectedRouteProps {
  children: ReactNode
  permissions?: PermissionType[]
  roles?: UserRole[]
  requireAll?: boolean // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user,
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    hasAnyRole
  } = useSupabaseAuth()
  const [, setLocation] = useLocation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-600">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to sign in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setLocation(redirectTo)}
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check permissions and roles
  let hasAccess = true

  if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  if (hasAccess && roles.length > 0) {
    hasAccess = requireAll
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles)
  }

  // Show access denied if user doesn't have required permissions/roles
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-red-800">Access Denied</CardTitle>
            <CardDescription className="text-red-600">
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {permissions.length > 0 && (
                  <div className="mb-2">
                    <strong>Required permissions:</strong> {permissions.join(', ')}
                  </div>
                )}
                {roles.length > 0 && (
                  <div className="mb-2">
                    <strong>Required roles:</strong> {roles.join(', ')}
                  </div>
                )}
                <div>
                  <strong>Your roles:</strong> {user?.roles?.map(r => r.name).join(', ') || 'None'}
                </div>
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={() => setLocation('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has access, render children
  return <>{children}</>
}

// Convenience components for common protection patterns
export function AdminRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute roles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute roles={['admin', 'manager']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function UserRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute roles={['admin', 'manager', 'user']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

// Permission-based route protection
export function PermissionRoute({ 
  children, 
  permission, 
  fallback 
}: { 
  children: ReactNode
  permission: PermissionType
  fallback?: ReactNode 
}) {
  return (
    <ProtectedRoute permissions={[permission]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

// Multiple permissions route protection
export function MultiPermissionRoute({ 
  children, 
  permissions, 
  requireAll = false,
  fallback 
}: { 
  children: ReactNode
  permissions: PermissionType[]
  requireAll?: boolean
  fallback?: ReactNode 
}) {
  return (
    <ProtectedRoute permissions={permissions} requireAll={requireAll} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}
