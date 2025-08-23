# RBAC System Documentation

## Overview

This document provides comprehensive documentation for the Role-Based Access Control (RBAC) system implemented in the Resource Planning Tracker application. The system provides secure, scalable, and maintainable access control using Supabase authentication and custom RBAC implementation.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Authentication Flow](#authentication-flow)
4. [Permission System](#permission-system)
5. [Role Hierarchy](#role-hierarchy)
6. [Frontend Implementation](#frontend-implementation)
7. [Backend Security](#backend-security)
8. [Admin Interface](#admin-interface)
9. [Developer Guidelines](#developer-guidelines)
10. [API Reference](#api-reference)

## System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │    │   (Supabase)    │    │   (PostgreSQL)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Auth Context  │◄──►│ • Auth Service  │◄──►│ • User Profiles │
│ • RBAC Guards   │    │ • JWT Validation│    │ • Roles         │
│ • Permission    │    │ • RLS Policies  │    │ • Permissions   │
│   Checking      │    │ • API Endpoints │    │ • Role Mapping  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: React, TypeScript, TanStack Query
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **State Management**: React Context + TanStack Query
- **UI Components**: shadcn/ui

## Database Schema

### Core Tables

#### 1. User Profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  resource_id INTEGER REFERENCES resources(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Roles
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Permissions
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Role Permissions (Many-to-Many)
```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

#### 5. User Roles (Many-to-Many)
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_by UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);
```

#### 6. User Permissions (Direct Assignment)
```sql
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  permission_id INTEGER REFERENCES permissions(id),
  assigned_by UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_id)
);
```

## Authentication Flow

### 1. User Login
```typescript
// User initiates login
const { signIn } = useSupabaseAuth()
await signIn(email, password)

// Supabase validates credentials
// JWT token generated with user claims
// User profile and roles fetched
// Auth context updated
```

### 2. Session Management
```typescript
// Session persistence
const { session, user } = useSupabaseAuth()

// Automatic token refresh
// Real-time auth state updates
// Logout handling
```

### 3. Permission Resolution
```typescript
// Role-based permissions
const rolePermissions = user.roles.flatMap(role => role.permissions)

// Direct permissions
const directPermissions = user.direct_permissions

// Combined permissions
const allPermissions = [...rolePermissions, ...directPermissions]
```

## Permission System

### Permission Categories

1. **Core System**
   - `dashboard` - Access to main dashboard
   - `calendar` - Calendar view access
   - `settings` - System settings access

2. **Resource Management**
   - `resource_management` - Manage resources
   - `time_logging` - Log time entries
   - `submission_overview` - View submissions

3. **Project Management**
   - `project_management` - Manage projects
   - `reports` - Generate reports
   - `change_lead_reports` - Change lead reports

4. **Administration**
   - `user_management` - Manage users
   - `system_admin` - System administration
   - `role_management` - Manage roles

### Permission Checking

```typescript
// Component-level permission checking
<PermissionGuard permission="user_management">
  <AdminPanel />
</PermissionGuard>

// Hook-based permission checking
const { hasPermission } = useSupabaseAuth()
if (hasPermission('project_management')) {
  // Show project management features
}

// Multiple permission checking
const { hasAllPermissions, hasAnyPermission } = useSupabaseAuth()
const canManageSystem = hasAllPermissions(['user_management', 'system_admin'])
const canViewReports = hasAnyPermission(['reports', 'change_lead_reports'])
```

## Role Hierarchy

### Default Roles

#### 1. Admin
- **Permissions**: All permissions (12 total)
- **Description**: Full system access
- **Capabilities**:
  - User management
  - Role management
  - System administration
  - All feature access

#### 2. Manager
- **Permissions**: 8 permissions
- **Description**: Management-level access
- **Capabilities**:
  - Project management
  - Resource management
  - Reports access
  - Team oversight

#### 3. User
- **Permissions**: 3 permissions
- **Description**: Basic user access
- **Capabilities**:
  - Time logging
  - Dashboard access
  - Calendar view

### Role Assignment

```typescript
// Assign role to user
const updateUserRole = async (userId: string, roleName: string) => {
  // Deactivate existing roles
  await supabase
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)

  // Assign new role
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()

  await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: role.id,
      assigned_by: currentUser.id
    })
}
```

## Frontend Implementation

### Auth Context

```typescript
// SupabaseAuthContext.tsx
export interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (permission: PermissionType) => boolean
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  hasAllPermissions: (permissions: PermissionType[]) => boolean
  hasAnyPermission: (permissions: PermissionType[]) => boolean
  isAdmin: () => boolean
  isManager: () => boolean
}
```

### RBAC Guards

```typescript
// Basic permission guard
<PermissionGuard permission="user_management">
  <UserManagementPanel />
</PermissionGuard>

// Role-based guard
<AdminGuard>
  <AdminOnlyFeature />
</AdminGuard>

// Multiple permission guard
<AllPermissionsGuard permissions={['user_management', 'system_admin']}>
  <SystemAdminPanel />
</AllPermissionsGuard>

// Any permission guard
<AnyPermissionGuard permissions={['reports', 'change_lead_reports']}>
  <ReportsSection />
</AnyPermissionGuard>
```

### Navigation Protection

```typescript
// Sidebar navigation with RBAC
const mainNavigation: NavigationItem[] = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: DashboardIcon, 
    permission: PERMISSIONS.DASHBOARD 
  },
  { 
    name: "Projects", 
    href: "/projects", 
    icon: ProjectsIcon, 
    permission: PERMISSIONS.PROJECT_MANAGEMENT 
  },
  // ... more items
]

// Render with permission checking
{mainNavigation.map(item => (
  <RBACGuard key={item.name} permissions={[item.permission]}>
    <NavigationItem {...item} />
  </RBACGuard>
))}
```

## Backend Security

### API Route Protection

```typescript
// Supabase RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );
```

### Serverless Function Security

```typescript
// api/protected-endpoint.js
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from './lib/auth'

export default async function handler(req, res) {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.replace('Bearer ', '')
    const payload = await verifyJWT(token)
    
    // Check permissions
    const hasPermission = await checkUserPermission(
      payload.sub, 
      'required_permission'
    )
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    
    // Process request
    // ...
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
```

## Admin Interface

### User Management
- **Enhanced User Management**: Comprehensive user listing with role assignment
- **Role Hierarchy Manager**: Create and manage roles with permission assignment
- **Permission Assignment**: Direct permission assignment to users
- **Audit Trail**: Track all role and permission changes

### Features
1. **User Search and Filtering**: Find users by email, name, or role
2. **Bulk Operations**: Assign roles to multiple users
3. **Permission Matrix**: Visual permission assignment interface
4. **Role Templates**: Pre-configured role templates
5. **Activity Logging**: Complete audit trail of changes

## Developer Guidelines

### Adding New Permissions

1. **Define Permission**:
```typescript
// shared/schema.ts
export const PERMISSIONS = {
  // ... existing permissions
  NEW_FEATURE: 'new_feature',
} as const
```

2. **Add to Database**:
```sql
INSERT INTO permissions (name, description, category) 
VALUES ('new_feature', 'Access to new feature', 'features');
```

3. **Assign to Roles**:
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.name = 'new_feature';
```

4. **Protect Frontend**:
```typescript
<PermissionGuard permission="new_feature">
  <NewFeatureComponent />
</PermissionGuard>
```

5. **Protect Backend**:
```typescript
// Check permission in API
const hasPermission = await checkUserPermission(userId, 'new_feature')
```

### Best Practices

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Role-Based Design**: Use roles for common permission sets
3. **Direct Permissions**: Use sparingly for special cases
4. **Audit Everything**: Log all permission changes
5. **Test Thoroughly**: Verify all permission scenarios
6. **Documentation**: Document all permissions and their purposes

### Testing RBAC

```typescript
// Test permission checking
describe('RBAC System', () => {
  it('should allow admin access to user management', () => {
    const adminUser = createMockUser(['admin'])
    expect(adminUser.hasPermission('user_management')).toBe(true)
  })

  it('should deny user access to admin features', () => {
    const regularUser = createMockUser(['user'])
    expect(regularUser.hasPermission('user_management')).toBe(false)
  })
})
```

## API Reference

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### User Management Endpoints

- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id/role` - Update user role (admin only)
- `DELETE /api/admin/users/:id` - Deactivate user (admin only)

### Role Management Endpoints

- `GET /api/admin/roles` - List all roles (admin only)
- `POST /api/admin/roles` - Create new role (admin only)
- `PUT /api/admin/roles/:id` - Update role (admin only)
- `DELETE /api/admin/roles/:id` - Delete role (admin only)

### Permission Endpoints

- `GET /api/admin/permissions` - List all permissions (admin only)
- `POST /api/admin/permissions` - Create permission (admin only)
- `PUT /api/admin/users/:id/permissions` - Assign direct permissions (admin only)

## Security Considerations

1. **JWT Security**: Tokens expire and refresh automatically
2. **RLS Policies**: Database-level security enforcement
3. **Input Validation**: All inputs validated on both client and server
4. **Audit Logging**: All administrative actions logged
5. **Session Management**: Secure session handling with automatic cleanup
6. **HTTPS Only**: All communications encrypted
7. **CORS Configuration**: Proper cross-origin request handling

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**:
   - Check user role assignments
   - Verify permission definitions
   - Review RLS policies

2. **Authentication Failures**:
   - Verify JWT token validity
   - Check Supabase configuration
   - Review auth context state

3. **Role Assignment Issues**:
   - Ensure roles exist in database
   - Check role-permission mappings
   - Verify user-role assignments

### Debug Tools

```typescript
// Debug user permissions
const debugUserPermissions = (user) => {
  console.log('User:', user.email)
  console.log('Roles:', user.roles.map(r => r.name))
  console.log('Permissions:', user.permissions)
  console.log('Is Admin:', user.isAdmin())
}
```

## Conclusion

This RBAC system provides a robust, scalable foundation for access control in the Resource Planning Tracker application. It follows security best practices while maintaining flexibility for future requirements.

For additional support or questions, refer to the development team or create an issue in the project repository.
