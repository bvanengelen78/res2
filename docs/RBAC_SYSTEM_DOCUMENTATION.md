# RBAC System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Role & Permission Structure](#role--permission-structure)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Development Guidelines](#development-guidelines)

## System Overview

The Role-Based Access Control (RBAC) system provides comprehensive user management, role assignment, and permission control for the Resource Planning Tracker application. It supports:

- **User Management**: Create, read, update, and deactivate users
- **Role Management**: Dynamic role creation with customizable permissions
- **Permission Assignment**: Both role-based and direct user permissions
- **Authentication**: Supabase Auth integration
- **Authorization**: Middleware-based permission checking
- **Audit Trail**: Comprehensive logging of all RBAC operations

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │    │   (Express)     │    │   (Supabase)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • User Mgmt UI  │◄──►│ • RBAC APIs     │◄──►│ • auth.users    │
│ • Role Mgmt UI  │    │ • Middleware    │    │ • user_profiles │
│ • Permission UI │    │ • Validation    │    │ • roles         │
│ • Error Monitor │    │ • Logging       │    │ • permissions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure
```
client/src/
├── components/admin/
│   ├── EnhancedUserManagement.tsx     # Main user management interface
│   ├── RoleHierarchyManager.tsx       # Role CRUD operations
│   ├── PermissionAssignmentInterface.tsx # Permission management
│   └── ErrorMonitoringDashboard.tsx   # Error tracking
├── components/auth/
│   ├── AdminUserRegistration.tsx      # User creation workflow
│   └── RBACGuard.tsx                  # Permission-based route protection
├── lib/
│   ├── rbac.ts                        # RBAC utility functions
│   └── error-handler.ts               # Centralized error handling
└── pages/
    └── user-management.tsx             # Main RBAC page
```

### Backend Structure
```
api/rbac/
├── create-user.js          # User creation endpoint
├── assign-role.js          # Role assignment endpoint
├── delete-user.js          # User deactivation endpoint
└── update-user.js          # User profile updates

server/
├── routes.ts               # Legacy route handlers
└── middleware/
    ├── auth.js             # Authentication middleware
    ├── rbac.js             # Permission checking
    └── validation.js       # Input validation
```

## Database Schema

### Core Tables

#### `auth.users` (Supabase Auth)
```sql
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  user_metadata JSONB
);
```

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  department VARCHAR,
  job_role VARCHAR,
  weekly_capacity INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `roles`
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `permissions`
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

#### `role_permissions`
```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_permissions` (Direct Permissions)
```sql
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  permission_id INTEGER REFERENCES permissions(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_active ON user_roles(user_id, is_active);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(user_id, is_active);
```

## Role & Permission Structure

### Default Roles

#### User Role
- **Permissions**: `time_logging`, `dashboard`, `calendar`
- **Description**: Basic access for time tracking and personal dashboard
- **Target Users**: Regular employees

#### Manager Role
- **Permissions**: User permissions + `resource_management`, `project_management`, `submission_overview`, `reports`, `change_lead_reports`
- **Description**: Team management and reporting capabilities
- **Target Users**: Team leads, project managers

#### Administrator Role
- **Permissions**: All permissions including `user_management`, `system_admin`, `settings`, `role_management`
- **Description**: Full system access and user management
- **Target Users**: System administrators, IT staff

### Permission Categories

#### Core Permissions
- `time_logging`: Access to time entry features
- `dashboard`: Access to dashboard and overview features
- `calendar`: Access to calendar and scheduling features

#### Management Permissions
- `resource_management`: Manage resources and allocations
- `project_management`: Manage projects and assignments
- `submission_overview`: View submission status and overviews

#### Administration Permissions
- `user_management`: Manage user accounts and access
- `system_admin`: Full system administration access
- `settings`: Access to application settings
- `role_management`: Manage roles and permissions

#### Reporting Permissions
- `reports`: Access to standard reports
- `change_lead_reports`: Access to change lead specific reports

## API Endpoints

### User Management

#### Create User
```http
POST /api/rbac/create-user
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "role": "user",
  "department": "Engineering",
  "jobRole": "Software Developer",
  "capacity": 40
}
```

#### Get User Profiles
```http
GET /api/rbac/user-profiles
Authorization: Bearer <token>
```

#### Assign Role
```http
POST /api/rbac/assign-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid-here",
  "roleName": "manager"
}
```

#### Deactivate User
```http
DELETE /api/rbac/delete-user
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid-here"
}
```

### Role Management

#### Get Roles with Permissions
```http
GET /api/rbac/roles-hierarchy
Authorization: Bearer <token>
```

#### Create Role
```http
POST /api/rbac/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom_role",
  "display_name": "Custom Role",
  "description": "Custom role description",
  "permissions": [1, 2, 3]
}
```

### Permission Management

#### Get All Permissions
```http
GET /api/rbac/permissions
Authorization: Bearer <token>
```

#### Assign Direct Permission
```http
POST /api/rbac/user-permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid-here",
  "permissionIds": [1, 2, 3]
}
```

## Frontend Components

### EnhancedUserManagement
**Location**: `client/src/components/admin/EnhancedUserManagement.tsx`
**Purpose**: Main user management interface with CRUD operations
**Features**:
- User listing with role display
- Role assignment/removal
- User creation integration
- Audit trail display
- Enhanced error handling

### RoleHierarchyManager
**Location**: `client/src/components/admin/RoleHierarchyManager.tsx`
**Purpose**: Complete role management with permissions
**Features**:
- Role CRUD operations
- Permission assignment
- User count per role
- Role deletion validation

### PermissionAssignmentInterface
**Location**: `client/src/components/admin/PermissionAssignmentInterface.tsx`
**Purpose**: Direct permission management for users
**Features**:
- User permission overview
- Direct permission assignment
- Role vs direct permission distinction
- Permission categorization

### AdminUserRegistration
**Location**: `client/src/components/auth/AdminUserRegistration.tsx`
**Purpose**: Streamlined user creation workflow
**Features**:
- Dynamic role selection
- Real-time validation
- Password generation
- Confirmation dialog
- Department/job role integration

## Error Handling

### Centralized Error Handler
**Location**: `client/src/lib/error-handler.ts`
**Features**:
- Structured error logging
- User-friendly error messages
- Recovery suggestions
- Error categorization
- Production vs development handling

### Error Monitoring Dashboard
**Location**: `client/src/components/admin/ErrorMonitoringDashboard.tsx`
**Features**:
- Real-time error tracking
- Error categorization by component/action
- Error export functionality
- Detailed error inspection
- Error statistics

### Backend Error Handling
- Middleware-level error catching
- Structured logging with context
- Security-aware error responses
- Rate limiting protection
- Input validation errors

## Security Considerations

### Authentication
- Supabase Auth integration
- JWT token validation
- Session management
- Automatic token refresh

### Authorization
- Permission-based access control
- Middleware validation
- Route protection
- API endpoint security

### Data Protection
- Row Level Security (RLS) policies
- Input sanitization
- SQL injection prevention
- XSS protection

### Audit Trail
- All RBAC operations logged
- User action tracking
- Error monitoring
- Security event logging

## Troubleshooting Guide

### Common Issues

#### Users Not Displaying
**Symptoms**: Empty user list in management interface
**Causes**:
- Database connection issues
- RLS policy conflicts
- Authentication token problems
**Solutions**:
1. Check server logs for database errors
2. Verify Supabase connection
3. Check user authentication status
4. Review RLS policies

#### Role Assignment Failures
**Symptoms**: Role assignment returns errors
**Causes**:
- Invalid role IDs
- Permission conflicts
- Database constraints
**Solutions**:
1. Verify role exists and is active
2. Check user permissions
3. Review database constraints
4. Check for duplicate assignments

#### Permission Errors
**Symptoms**: Users can't access features they should have access to
**Causes**:
- Incorrect role assignments
- Missing permissions
- Cache issues
**Solutions**:
1. Verify user roles in database
2. Check role permissions
3. Clear authentication cache
4. Review permission middleware

### Debugging Tools

#### Error Monitoring Dashboard
Access via User Management → Error Monitoring tab
- View recent errors
- Filter by component/action
- Export error reports
- Detailed error inspection

#### Database Queries
```sql
-- Check user roles
SELECT u.email, r.display_name, ur.assigned_at
FROM user_profiles u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE ur.is_active = true;

-- Check role permissions
SELECT r.display_name, p.display_name, p.category
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = true AND p.is_active = true;

-- Check direct user permissions
SELECT u.email, p.display_name, up.assigned_at
FROM user_profiles u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE up.is_active = true;
```

#### Server Logs
Check for structured log entries:
```
[RBAC] User creation request
[RBAC] Role assignment successful
[ERROR] Database connection failed
```

## Development Guidelines

### Adding New Permissions
1. Add permission to database:
```sql
INSERT INTO permissions (name, display_name, description, category)
VALUES ('new_permission', 'New Permission', 'Description', 'category');
```

2. Update role assignments if needed
3. Add permission checks in middleware
4. Update frontend permission guards

### Creating New Roles
1. Use RoleHierarchyManager UI or API
2. Assign appropriate permissions
3. Test role functionality
4. Document role purpose and permissions

### Modifying User Workflow
1. Update validation schemas
2. Modify API endpoints
3. Update frontend components
4. Test error handling
5. Update documentation

### Best Practices
- Always use parameterized queries
- Implement proper error handling
- Log security-relevant events
- Test permission boundaries
- Keep documentation updated
- Use TypeScript for type safety
- Implement comprehensive tests
