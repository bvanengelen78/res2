import { ReactNode } from 'react'
import { useLocation } from 'wouter'
// Authentication removed - public access
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
  // Public access - always render children without protection
  return <>{children}</>
}

// Convenience components for common protection patterns - Public Access Version
export function AdminRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function ManagerRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

export function UserRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>
}

// Permission-based route protection - Public Access Version
export function PermissionRoute({
  children,
  permission,
  fallback
}: {
  children: ReactNode
  permission: PermissionType
  fallback?: ReactNode
}) {
  return <>{children}</>
}

// Multiple permissions route protection - Public Access Version
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
  return <>{children}</>
}
