# RBAC System Setup Guide

## Quick Start

This guide will help you set up and configure the RBAC system for development and production environments.

## Prerequisites

- Node.js 18+ 
- Supabase account and project
- PostgreSQL database access
- Environment variables configured

## Environment Setup

### 1. Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NODE_ENV=development
PORT=5000

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
```

### 2. Database Setup

Run the following SQL scripts in your Supabase SQL editor:

#### Create Tables
```sql
-- Create roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table
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

-- Create user_roles table
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_permissions table (direct permissions)
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  permission_id INTEGER REFERENCES permissions(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

#### Create Indexes
```sql
-- Performance indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_active ON user_roles(user_id, is_active);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(user_id, is_active);
```

#### Insert Default Data
```sql
-- Insert default permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('time_logging', 'Time Logging', 'Access to time entry and logging features', 'core'),
('dashboard', 'Dashboard', 'Access to dashboard and overview features', 'core'),
('calendar', 'Calendar', 'Access to calendar and scheduling features', 'core'),
('resource_management', 'Resource Management', 'Manage resources and allocations', 'management'),
('project_management', 'Project Management', 'Manage projects and assignments', 'management'),
('submission_overview', 'Submission Overview', 'View submission status and overviews', 'management'),
('user_management', 'User Management', 'Manage user accounts and access', 'administration'),
('system_admin', 'System Administration', 'Full system administration access', 'administration'),
('settings', 'Settings', 'Access to application settings', 'administration'),
('role_management', 'Role Management', 'Manage roles and permissions', 'administration'),
('reports', 'Reports', 'Access to standard reports', 'reporting'),
('change_lead_reports', 'Change Lead Reports', 'Access to change lead specific reports', 'reporting');

-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
('user', 'User', 'Basic user access with time logging and dashboard'),
('manager', 'Manager', 'Management access with resource and project permissions'),
('admin', 'Administrator', 'Full system access with all permissions');

-- Assign permissions to roles
-- User role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name IN ('time_logging', 'dashboard', 'calendar');

-- Manager role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.name IN (
  'time_logging', 'dashboard', 'calendar', 
  'resource_management', 'project_management', 'submission_overview',
  'reports', 'change_lead_reports'
);

-- Admin role permissions (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin';
```

### 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- User profiles policy
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin' 
      AND ur.is_active = true
    )
  );

-- User roles policy
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin' 
      AND ur.is_active = true
    )
  );
```

## Application Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install
```

### 2. Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

### 3. Create First Admin User

Since you need an admin user to manage other users, create the first admin manually:

```sql
-- Insert admin user (replace with your email)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at)
VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  NOW(),
  NOW()
);

-- Create user profile
INSERT INTO user_profiles (id, email, full_name, department, job_role)
SELECT id, email, 'System Administrator', 'IT', 'Administrator'
FROM auth.users WHERE email = 'admin@yourcompany.com';

-- Assign admin role
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
SELECT u.id, r.id, u.id, NOW()
FROM auth.users u, roles r
WHERE u.email = 'admin@yourcompany.com' AND r.name = 'admin';
```

## Testing the Setup

### 1. Access the Application

Navigate to `http://localhost:5000` and log in with your admin credentials.

### 2. Test User Management

1. Go to User Management page
2. Create a new user
3. Assign roles
4. Test permissions

### 3. Test Role Management

1. Go to Role Hierarchy tab
2. Create a custom role
3. Assign permissions
4. Test role functionality

### 4. Test Error Monitoring

1. Go to Error Monitoring tab
2. Trigger an error (try invalid operations)
3. View error details
4. Export error reports

## Production Deployment

### 1. Environment Configuration

Update production environment variables:

```env
NODE_ENV=production
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
```

### 2. Database Migration

Run the same SQL scripts in your production Supabase instance.

### 3. Security Checklist

- [ ] Enable RLS policies
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure backup policies
- [ ] Test permission boundaries
- [ ] Verify error handling

### 4. Monitoring Setup

- [ ] Set up error tracking
- [ ] Configure performance monitoring
- [ ] Enable security alerts
- [ ] Set up backup monitoring

## Troubleshooting

### Common Issues

#### Database Connection Errors
```
Error: Database service unavailable
```
**Solution**: Check Supabase URL and service key in environment variables.

#### Permission Denied Errors
```
Error: Insufficient permissions
```
**Solution**: Verify user has correct role assignments and permissions.

#### RLS Policy Conflicts
```
Error: Row level security policy violation
```
**Solution**: Review and update RLS policies for proper access control.

### Debug Commands

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

-- Check user permissions (direct)
SELECT u.email, p.display_name, up.assigned_at
FROM user_profiles u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE up.is_active = true;
```

## Support

For additional help:

1. Check the [RBAC System Documentation](./RBAC_SYSTEM_DOCUMENTATION.md)
2. Review the [API Reference](./RBAC_API_REFERENCE.md)
3. Use the Error Monitoring Dashboard for debugging
4. Check server logs for detailed error information

## Next Steps

After setup:

1. Customize roles and permissions for your organization
2. Set up automated user provisioning if needed
3. Configure SSO integration if required
4. Implement custom permission checks in your application
5. Set up monitoring and alerting for production use
