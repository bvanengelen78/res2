# RBAC Developer Guidelines

## Quick Start Guide

This guide provides practical instructions for developers working with the RBAC system in the Resource Planning Tracker application.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Adding New Features with RBAC](#adding-new-features-with-rbac)
3. [Common Patterns](#common-patterns)
4. [Testing Guidelines](#testing-guidelines)
5. [Troubleshooting](#troubleshooting)
6. [Code Examples](#code-examples)

## Setup and Configuration

### Environment Variables

Ensure these environment variables are set:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Required Imports

```typescript
// For permission checking
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { PermissionGuard, AdminGuard, RBACGuard } from '@/components/auth/RBACGuard'

// For types
import type { PermissionType, UserRole } from '@/types/rbac'
```

## Adding New Features with RBAC

### Step 1: Define the Permission

Add the new permission to the shared schema:

```typescript
// shared/schema.ts
export const PERMISSIONS = {
  // ... existing permissions
  MY_NEW_FEATURE: 'my_new_feature',
} as const
```

### Step 2: Add Permission to Database

```sql
-- Add the permission
INSERT INTO permissions (name, description, category, is_active) 
VALUES ('my_new_feature', 'Access to my new feature', 'features', true);

-- Assign to appropriate roles (example: admin and manager)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name IN ('admin', 'manager') 
AND p.name = 'my_new_feature';
```

### Step 3: Protect the Frontend Component

```typescript
// MyNewFeature.tsx
import { PermissionGuard } from '@/components/auth/RBACGuard'

export function MyNewFeature() {
  return (
    <PermissionGuard permission="my_new_feature">
      <div>
        {/* Your feature content */}
        <h1>My New Feature</h1>
        <p>This is only visible to users with the my_new_feature permission</p>
      </div>
    </PermissionGuard>
  )
}
```

### Step 4: Add Navigation Item (if needed)

```typescript
// components/sidebar.tsx
const mainNavigation: NavigationItem[] = [
  // ... existing items
  { 
    name: "My New Feature", 
    href: "/my-new-feature", 
    icon: MyFeatureIcon, 
    permission: PERMISSIONS.MY_NEW_FEATURE 
  },
]
```

### Step 5: Protect the Page Route

```typescript
// pages/my-new-feature.tsx
import { PermissionGuard } from '@/components/auth/RBACGuard'

export default function MyNewFeaturePage() {
  return (
    <PermissionGuard permission="my_new_feature">
      <main>
        <h1>My New Feature Page</h1>
        {/* Page content */}
      </main>
    </PermissionGuard>
  )
}
```

### Step 6: Protect Backend Endpoints (if needed)

```typescript
// api/my-new-feature.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Get user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check permission
    const hasPermission = await checkUserPermission(user.id, 'my_new_feature')
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    // Process request
    res.json({ message: 'Success' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to check permissions
async function checkUserPermission(userId, permissionName) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Check role-based permissions
  const { data: rolePermissions } = await supabase
    .from('user_roles')
    .select(`
      roles (
        role_permissions (
          permissions (name)
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  // Check direct permissions
  const { data: directPermissions } = await supabase
    .from('user_permissions')
    .select('permissions (name)')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Combine and check
  const allPermissions = [
    ...rolePermissions?.flatMap(ur => 
      ur.roles?.role_permissions?.map(rp => rp.permissions?.name) || []
    ) || [],
    ...directPermissions?.map(up => up.permissions?.name) || []
  ]

  return allPermissions.includes(permissionName)
}
```

## Common Patterns

### 1. Conditional Rendering Based on Permissions

```typescript
function MyComponent() {
  const { hasPermission, isAdmin } = useSupabaseAuth()

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show admin panel only to admins */}
      {isAdmin() && (
        <AdminPanel />
      )}
      
      {/* Show feature based on permission */}
      {hasPermission('project_management') && (
        <ProjectManagementTools />
      )}
      
      {/* Show different content based on multiple permissions */}
      {hasAnyPermission(['reports', 'change_lead_reports']) ? (
        <ReportsSection />
      ) : (
        <div>You don't have access to reports</div>
      )}
    </div>
  )
}
```

### 2. Role-Based Component Variants

```typescript
function Dashboard() {
  const { user, hasRole } = useSupabaseAuth()

  if (hasRole('admin')) {
    return <AdminDashboard />
  }
  
  if (hasRole('manager')) {
    return <ManagerDashboard />
  }
  
  return <UserDashboard />
}
```

### 3. Permission-Based API Calls

```typescript
function useProjectData() {
  const { hasPermission } = useSupabaseAuth()
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiRequest('/api/projects'),
    enabled: hasPermission('project_management'), // Only fetch if user has permission
  })
}
```

### 4. Dynamic Menu Generation

```typescript
function NavigationMenu() {
  const { hasPermission } = useSupabaseAuth()
  
  const menuItems = [
    { name: 'Dashboard', href: '/', permission: 'dashboard' },
    { name: 'Projects', href: '/projects', permission: 'project_management' },
    { name: 'Users', href: '/users', permission: 'user_management' },
  ]
  
  const visibleItems = menuItems.filter(item => hasPermission(item.permission))
  
  return (
    <nav>
      {visibleItems.map(item => (
        <Link key={item.href} href={item.href}>
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
```

### 5. Form Field Protection

```typescript
function UserForm() {
  const { hasPermission } = useSupabaseAuth()
  const canEditRoles = hasPermission('user_management')
  
  return (
    <form>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      
      {/* Only show role field to users with permission */}
      {canEditRoles && (
        <select name="role">
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      )}
    </form>
  )
}
```

## Testing Guidelines

### 1. Unit Tests for Permission Logic

```typescript
// __tests__/rbac.test.ts
import { renderHook } from '@testing-library/react'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'

// Mock user with specific permissions
const mockUser = {
  id: '123',
  email: 'test@example.com',
  roles: [{ name: 'manager', permissions: ['project_management', 'reports'] }],
  permissions: ['project_management', 'reports']
}

describe('RBAC Permission Checking', () => {
  it('should allow access to project management for managers', () => {
    const { result } = renderHook(() => useSupabaseAuth(), {
      wrapper: ({ children }) => (
        <MockAuthProvider user={mockUser}>
          {children}
        </MockAuthProvider>
      )
    })
    
    expect(result.current.hasPermission('project_management')).toBe(true)
    expect(result.current.hasPermission('user_management')).toBe(false)
  })
})
```

### 2. Component Tests with RBAC

```typescript
// __tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent RBAC', () => {
  it('should show admin features for admin users', () => {
    render(
      <MockAuthProvider user={{ ...mockUser, roles: [{ name: 'admin' }] }}>
        <MyComponent />
      </MockAuthProvider>
    )
    
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })
  
  it('should hide admin features for regular users', () => {
    render(
      <MockAuthProvider user={{ ...mockUser, roles: [{ name: 'user' }] }}>
        <MyComponent />
      </MockAuthProvider>
    )
    
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })
})
```

### 3. API Endpoint Tests

```typescript
// __tests__/api/protected-endpoint.test.js
import handler from '@/api/protected-endpoint'
import { createMocks } from 'node-mocks-http'

describe('/api/protected-endpoint', () => {
  it('should return 403 for users without permission', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer invalid-token'
      }
    })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(403)
  })
})
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Permission Not Working

**Problem**: User has the role but permission check fails

**Solution**:
```typescript
// Debug the user's permissions
const { user } = useSupabaseAuth()
console.log('User roles:', user?.roles)
console.log('User permissions:', user?.permissions)
console.log('Has permission:', user?.hasPermission('my_permission'))
```

#### 2. Component Not Rendering

**Problem**: Component wrapped in PermissionGuard doesn't show

**Solutions**:
- Check if user is authenticated
- Verify permission name spelling
- Check if user has the required permission
- Ensure permission exists in database

```typescript
// Debug component rendering
<PermissionGuard 
  permission="my_permission"
  fallback={<div>No permission - Debug info</div>}
>
  <MyComponent />
</PermissionGuard>
```

#### 3. API Returns 403

**Problem**: API endpoint returns forbidden error

**Solutions**:
- Verify JWT token is being sent
- Check token validity
- Ensure permission checking logic is correct
- Verify user has required permission

```typescript
// Debug API calls
const token = localStorage.getItem('supabase.auth.token')
console.log('Token:', token)

// Check token payload
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token payload:', payload)
```

### Debug Utilities

```typescript
// Add to your development environment
window.debugRBAC = {
  getCurrentUser: () => {
    const { user } = useSupabaseAuth()
    return user
  },
  
  checkPermission: (permission) => {
    const { hasPermission } = useSupabaseAuth()
    return hasPermission(permission)
  },
  
  listAllPermissions: () => {
    const { user } = useSupabaseAuth()
    return user?.permissions || []
  }
}
```

## Performance Considerations

### 1. Permission Caching

```typescript
// Use React Query for caching user data
const { data: user } = useQuery({
  queryKey: ['auth', 'user'],
  queryFn: fetchUserWithPermissions,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
})
```

### 2. Lazy Loading Protected Components

```typescript
// Lazy load components that require specific permissions
const AdminPanel = lazy(() => import('@/components/AdminPanel'))

function App() {
  const { hasPermission } = useSupabaseAuth()
  
  return (
    <div>
      {hasPermission('user_management') && (
        <Suspense fallback={<div>Loading...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  )
}
```

### 3. Minimize Permission Checks

```typescript
// Cache permission results in component
function MyComponent() {
  const { hasPermission } = useSupabaseAuth()
  
  // Calculate once, use multiple times
  const canManageUsers = hasPermission('user_management')
  const canManageProjects = hasPermission('project_management')
  
  return (
    <div>
      {canManageUsers && <UserManagementSection />}
      {canManageProjects && <ProjectManagementSection />}
      {(canManageUsers || canManageProjects) && <AdminTools />}
    </div>
  )
}
```

## Best Practices Summary

1. **Always use PermissionGuard** for component protection
2. **Check permissions at multiple levels** (component, page, API)
3. **Use descriptive permission names** (e.g., 'project_management' not 'pm')
4. **Test all permission scenarios** thoroughly
5. **Cache permission data** to improve performance
6. **Provide fallback content** for unauthorized access
7. **Log permission changes** for audit purposes
8. **Follow principle of least privilege**
9. **Document all permissions** and their purposes
10. **Use TypeScript** for type safety

## Getting Help

- Check the main RBAC documentation
- Review existing implementations in the codebase
- Ask the development team for guidance
- Create detailed bug reports with permission debugging info

Remember: Security is everyone's responsibility. When in doubt, err on the side of caution and restrict access rather than allowing it.
