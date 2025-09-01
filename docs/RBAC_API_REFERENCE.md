# RBAC API Reference

## Authentication

All RBAC API endpoints require authentication via Bearer token:

```http
Authorization: Bearer <supabase_jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-23T12:00:00.000Z",
  "details": { ... }
}
```

## User Management Endpoints

### Create User
Creates a new user with role assignment and resource profile.

**Endpoint**: `POST /api/rbac/create-user`

**Required Permissions**: `user_management`

**Request Body**:
```json
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

**Validation Rules**:
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, mixed case, numbers, symbols
- `firstName`, `lastName`: 1-50 characters
- `role`: Must exist in roles table
- `department`, `jobRole`: 1-100 characters
- `capacity`: 1-80 hours per week

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.doe@company.com",
      "name": "John Doe",
      "role": "user",
      "department": "Engineering"
    },
    "defaultPassword": "generated-password"
  }
}
```

**Error Codes**:
- `USER_EXISTS`: Email already registered
- `INVALID_ROLE`: Role does not exist
- `VALIDATION_ERROR`: Input validation failed

### Get User Profiles
Retrieves all user profiles with roles and permissions.

**Endpoint**: `GET /api/rbac/user-profiles`

**Required Permissions**: `user_management`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@company.com",
      "full_name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Engineering",
      "jobRole": "Developer",
      "capacity": 40,
      "roles": [
        {
          "id": 1,
          "name": "user",
          "display_name": "User"
        }
      ],
      "role_assignments": [
        {
          "id": 1,
          "role": {
            "id": 1,
            "name": "user",
            "display_name": "User"
          },
          "assigned_at": "2025-08-23T12:00:00.000Z",
          "assigned_by": "admin-uuid"
        }
      ],
      "createdAt": "2025-08-23T12:00:00.000Z",
      "emailConfirmed": true,
      "is_active": true
    }
  ]
}
```

### Assign Role
Assigns a role to a user (replaces existing role assignments).

**Endpoint**: `POST /api/rbac/assign-role`

**Required Permissions**: `user_management`

**Request Body**:
```json
{
  "userId": "user-uuid",
  "roleName": "manager"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": 123,
      "user_id": "user-uuid",
      "role_id": 2,
      "assigned_at": "2025-08-23T12:00:00.000Z",
      "assigned_by": "admin-uuid"
    }
  }
}
```

**Error Codes**:
- `USER_NOT_FOUND`: User does not exist
- `ROLE_NOT_FOUND`: Role does not exist
- `ASSIGNMENT_FAILED`: Database error during assignment

### Deactivate User
Deactivates a user account (soft delete).

**Endpoint**: `DELETE /api/rbac/delete-user`

**Required Permissions**: `user_management`

**Request Body**:
```json
{
  "userId": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

**Error Codes**:
- `USER_NOT_FOUND`: User does not exist
- `SELF_DEACTIVATION`: Cannot deactivate own account
- `DEACTIVATION_FAILED`: Database error

## Role Management Endpoints

### Get Roles Hierarchy
Retrieves all roles with their permissions and user counts.

**Endpoint**: `GET /api/rbac/roles-hierarchy`

**Required Permissions**: `role_management`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "user",
      "display_name": "User",
      "description": "Basic user access",
      "is_active": true,
      "user_count": 15,
      "permissions": [
        {
          "id": 1,
          "name": "time_logging",
          "display_name": "Time Logging",
          "description": "Access to time entry features",
          "category": "core"
        }
      ]
    }
  ]
}
```

### Create Role
Creates a new role with specified permissions.

**Endpoint**: `POST /api/rbac/roles`

**Required Permissions**: `role_management`

**Request Body**:
```json
{
  "name": "custom_role",
  "display_name": "Custom Role",
  "description": "Custom role description",
  "permissions": [1, 2, 3]
}
```

**Validation Rules**:
- `name`: Unique, lowercase, underscore-separated
- `display_name`: 1-100 characters
- `description`: Optional, max 500 characters
- `permissions`: Array of valid permission IDs

**Response**:
```json
{
  "success": true,
  "data": {
    "role": {
      "id": 4,
      "name": "custom_role",
      "display_name": "Custom Role",
      "description": "Custom role description",
      "permissions": [...]
    }
  }
}
```

### Update Role
Updates an existing role and its permissions.

**Endpoint**: `PUT /api/rbac/roles/:roleId`

**Required Permissions**: `role_management`

**Request Body**:
```json
{
  "name": "updated_role",
  "display_name": "Updated Role",
  "description": "Updated description",
  "permissions": [1, 2, 4]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "role": {
      "id": 4,
      "name": "updated_role",
      "display_name": "Updated Role",
      "permissions": [...]
    }
  }
}
```

### Delete Role
Deactivates a role (soft delete). Fails if users are assigned to the role.

**Endpoint**: `DELETE /api/rbac/roles/:roleId`

**Required Permissions**: `role_management`

**Response**:
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Error Codes**:
- `ROLE_NOT_FOUND`: Role does not exist
- `ROLE_HAS_USERS`: Cannot delete role with assigned users
- `DELETION_FAILED`: Database error

## Permission Management Endpoints

### Get All Permissions
Retrieves all available permissions organized by category.

**Endpoint**: `GET /api/rbac/permissions`

**Required Permissions**: `role_management` or `user_management`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "time_logging",
      "display_name": "Time Logging",
      "description": "Access to time entry and logging features",
      "category": "core",
      "is_active": true
    }
  ]
}
```

### Assign Direct User Permissions
Assigns permissions directly to a user (bypassing roles).

**Endpoint**: `POST /api/rbac/user-permissions`

**Required Permissions**: `user_management`

**Request Body**:
```json
{
  "userId": "user-uuid",
  "permissionIds": [1, 2, 3]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 123,
        "user_id": "user-uuid",
        "permission_id": 1,
        "assigned_at": "2025-08-23T12:00:00.000Z",
        "assigned_by": "admin-uuid"
      }
    ]
  }
}
```

## Rate Limiting

All RBAC endpoints are rate-limited to prevent abuse:

- **User Creation**: 5 requests per minute
- **Role Assignment**: 10 requests per minute
- **General RBAC**: 60 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1692792000
```

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

### Error Response Structure
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "timestamp": "2025-08-23T12:00:00.000Z",
  "details": {
    "field": "validation error details",
    "requestId": "req_123456"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_REQUIRED`: Missing or invalid token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `DUPLICATE_RESOURCE`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `DATABASE_ERROR`: Internal database error
- `EXTERNAL_SERVICE_ERROR`: Supabase or other service error

## SDK Usage Examples

### JavaScript/TypeScript
```typescript
import { supabase } from './supabase-client'

// Create user
const createUser = async (userData: CreateUserData) => {
  const session = await supabase.auth.getSession()
  const response = await fetch('/api/rbac/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session?.access_token}`
    },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }
  
  return response.json()
}

// Assign role
const assignRole = async (userId: string, roleName: string) => {
  const session = await supabase.auth.getSession()
  const response = await fetch('/api/rbac/assign-role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.data.session?.access_token}`
    },
    body: JSON.stringify({ userId, roleName })
  })
  
  return response.json()
}
```

### React Hook Usage
```typescript
import { useMutation, useQuery } from '@tanstack/react-query'

// Fetch users
const useUsers = () => {
  return useQuery({
    queryKey: ['rbac', 'users'],
    queryFn: async () => {
      const response = await fetch('/api/rbac/user-profiles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return response.json()
    }
  })
}

// Create user mutation
const useCreateUser = () => {
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['rbac', 'users'])
    }
  })
}
```
