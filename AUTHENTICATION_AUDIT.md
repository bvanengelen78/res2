# Authentication System Audit - Pre-Supabase Migration

## Overview
This document provides a comprehensive audit of the existing authentication system before migration to Supabase Auth with RBAC. This serves as a reference for understanding what needs to be removed and replaced.

## Current Authentication Architecture

### Backend Authentication Services

#### 1. Enterprise Authentication Service (`api/lib/auth-service.js`)
- **Purpose**: Production-ready authentication with database integration
- **Features**:
  - bcrypt password hashing (12 salt rounds)
  - JWT token generation and verification
  - Rate limiting and account lockout protection
  - Audit logging for security events
  - Session management with configurable expiry
- **Dependencies**: bcrypt, jsonwebtoken, Supabase DatabaseService, AuditLogger
- **Security Features**:
  - Max 5 login attempts before 15-minute lockout
  - Configurable token expiry (1d short, 30d long)
  - IP-based rate limiting
  - Security event logging

#### 2. Server Authentication (`server/auth.ts`)
- **Purpose**: Main authentication service for the server
- **Features**:
  - JWT token generation and verification
  - User registration and login
  - Password security validation
  - Role and permission management
- **Dependencies**: jwt, bcrypt, nanoid, storage service
- **Configuration**: Uses ConfigSecurityService for JWT settings

#### 3. Authentication Middleware (`server/middleware/auth.ts`)
- **Purpose**: Request authentication and authorization
- **Features**:
  - JWT token verification
  - Permission-based authorization
  - Role-based authorization
  - Resource ownership checks
- **Middleware Functions**:
  - `authenticate`: Verifies JWT tokens
  - `authorize`: Checks permissions
  - `authorizeRole`: Checks roles
  - `authorizeResourceOwner`: Resource-specific access
  - `adminOnly`: Admin-only access
  - `managerOrAdmin`: Manager or admin access

### Frontend Authentication Components

#### 1. Authentication Context (`client/src/context/AuthContext.tsx`)
- **Purpose**: Global authentication state management
- **Features**:
  - User session management
  - Login/logout functionality
  - Token storage and refresh
  - Permission and role checking
- **State Management**: React Context with localStorage persistence
- **API Integration**: Uses apiRequest for backend communication

#### 2. Login Form (`client/src/components/auth/login-form.tsx`)
- **Purpose**: User login interface
- **Features**:
  - Email/password authentication
  - Remember me functionality
  - Form validation with zod
  - Error handling and loading states
- **UI Components**: shadcn/ui components with Tailwind styling

#### 3. Register Form (`client/src/components/auth/register-form.tsx`)
- **Purpose**: User registration interface
- **Features**:
  - Email/password registration
  - Password confirmation
  - Form validation
  - Error handling
- **UI Components**: shadcn/ui components

#### 4. RBAC Components (`client/src/components/rbac/RoleGuard.tsx`)
- **Purpose**: Role-based access control for UI
- **Features**:
  - Permission-based rendering
  - Role-based rendering
  - Admin checks
  - Fallback content support
- **Components**: RoleGuard, PermissionGuard, RoleBasedGuard

#### 5. RBAC Hook (`client/src/hooks/useRBAC.ts`)
- **Purpose**: Role and permission checking utilities
- **Features**:
  - Permission validation
  - Role validation
  - Menu access control
  - Admin status checks
- **Integration**: Uses AuthContext and RBACManager

### API Routes and Endpoints

#### Authentication Routes (`server/routes.ts`)
- **POST /api/auth/register**: User registration
- **POST /api/auth/login**: User login
- **POST /api/auth/logout**: User logout
- **GET /api/me**: Get current user profile
- **POST /api/auth/refresh**: Token refresh

#### Serverless Functions (Vercel)
- **api/register.js**: User registration endpoint
- **api/login-enterprise-simple.js**: Simplified login endpoint
- **api/me.js**: User profile endpoint

### Database Schema

#### Users Table (`shared/schema.ts`)
```sql
users {
  id: serial PRIMARY KEY
  email: text UNIQUE NOT NULL
  password: text NOT NULL
  resource_id: integer REFERENCES resources(id)
  is_active: boolean DEFAULT true
  email_verified: boolean DEFAULT false
  last_login: timestamp
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}
```

#### Role System
- **Roles**: Admin, Manager, User (defined in schema)
- **Permissions**: Granular permissions for different features
- **User Roles**: Many-to-many relationship between users and roles

### Configuration and Security

#### Environment Variables
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `JWT_EXPIRES_IN`: Access token expiry (default: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiry (default: 7d)
- `BCRYPT_SALT_ROUNDS`: Password hashing rounds (default: 12)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service key

#### Security Features
- **Password Security**: bcrypt with 12 salt rounds
- **JWT Security**: Separate access and refresh tokens
- **Rate Limiting**: In-memory rate limiting for login attempts
- **Session Management**: Configurable token expiry
- **Audit Logging**: Security event logging
- **CORS**: Configured for cross-origin requests

### Current Issues and Limitations

1. **Mixed Authentication Systems**: Multiple authentication implementations
2. **Custom JWT Management**: Manual token handling instead of Supabase Auth
3. **In-Memory Rate Limiting**: Not suitable for production scaling
4. **Complex Permission System**: Custom RBAC implementation
5. **Manual Session Management**: No automatic session refresh
6. **Security Gaps**: Potential vulnerabilities in custom implementation

## Files to be Removed

### Backend Files
- `api/lib/auth-service.js`
- `server/auth.ts`
- `server/middleware/auth.ts`
- `api/register.js`
- `api/login-enterprise-simple.js`
- `api/me.js`

### Frontend Files
- `client/src/context/AuthContext.tsx`
- `client/src/components/auth/login-form.tsx`
- `client/src/components/auth/register-form.tsx`
- `client/src/components/rbac/RoleGuard.tsx`
- `client/src/hooks/useRBAC.ts`
- `client/src/pages/login.tsx`

### Configuration Files
- Authentication-related sections in `shared/schema.ts`
- Custom JWT configuration in `api/lib/config-security.js`

## Migration Considerations

1. **User Data**: Existing users need to be migrated to Supabase Auth
2. **Role Assignments**: Current role assignments must be preserved
3. **Session Continuity**: Active sessions should be handled gracefully
4. **API Compatibility**: Ensure frontend continues to work during migration
5. **Security**: Maintain or improve current security standards

## Cleanup Status

### ✅ Completed
- Removed `api/lib/auth-service.js`
- Removed `server/auth.ts`
- Removed `server/middleware/auth.ts`
- Removed `api/register.js`
- Removed `api/login-enterprise-simple.js`
- Removed `api/me.js`
- Removed `client/src/context/AuthContext.tsx`
- Removed `client/src/components/auth/login-form.tsx`
- Removed `client/src/components/auth/register-form.tsx`
- Removed `client/src/components/rbac/RoleGuard.tsx`
- Removed `client/src/hooks/useRBAC.ts`
- Removed `client/src/pages/login.tsx`
- Removed authentication routes from `server/routes.ts`

### 🚧 Pending
- Remove authentication middleware from 79 API routes in `server/routes.ts`
- Clean up authentication-related imports and types in `shared/schema.ts`
- Update frontend components that reference removed authentication context
- Remove authentication-related configuration

## Next Steps

1. ✅ Remove all identified authentication files
2. Install and configure Supabase Auth
3. Implement new RBAC system with Supabase
4. Create migration scripts for existing users
5. Update all API endpoints to use Supabase Auth
6. Test thoroughly before deployment

## Routes Requiring Authentication Middleware Removal

The following 79 routes in `server/routes.ts` need authentication middleware removed:
- All routes using `authenticate`, `authorize`, `adminOnly`, `authorizeResourceOwner`
- Manual authorization checks using `req.user` need to be updated
- Permission checks using `PERMISSIONS` constants need to be updated
