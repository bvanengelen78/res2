-- Supabase RBAC Schema for ResourceFlow (Safe Version)
-- This schema implements Role-Based Access Control using Supabase Auth
-- Handles existing tables gracefully

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for roles and permissions (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_type AS ENUM (
      'time_logging',
      'reports',
      'change_lead_reports', 
      'resource_management',
      'project_management',
      'user_management',
      'system_admin',
      'dashboard',
      'calendar',
      'submission_overview',
      'settings',
      'role_management'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  resource_id INTEGER, -- Links to existing resources table
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  name permission_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  resource_id INTEGER, -- Optional: role specific to a resource
  assigned_by UUID REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional: temporary roles
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id, resource_id)
);

-- Insert default roles (only if they don't exist)
INSERT INTO public.roles (name, display_name, description) 
SELECT 'admin', 'Administrator', 'Full system access with all permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin');

INSERT INTO public.roles (name, display_name, description) 
SELECT 'manager', 'Manager', 'Management access with resource and project permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'manager');

INSERT INTO public.roles (name, display_name, description) 
SELECT 'user', 'User', 'Basic user access with time logging and reporting permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'user');

-- Insert default permissions (only if they don't exist)
INSERT INTO public.permissions (name, display_name, description, category)
SELECT v.name::permission_type, v.display_name, v.description, v.category
FROM (VALUES
  ('time_logging', 'Time Logging', 'Access to time entry and logging features', 'core'),
  ('reports', 'Reports', 'Access to reporting and analytics features', 'reporting'),
  ('change_lead_reports', 'Change Lead Reports', 'Access to change lead specific reports', 'reporting'),
  ('resource_management', 'Resource Management', 'Manage resources and allocations', 'management'),
  ('project_management', 'Project Management', 'Manage projects and assignments', 'management'),
  ('user_management', 'User Management', 'Manage user accounts and access', 'administration'),
  ('system_admin', 'System Administration', 'Full system administration access', 'administration'),
  ('dashboard', 'Dashboard', 'Access to dashboard and overview features', 'core'),
  ('calendar', 'Calendar', 'Access to calendar and scheduling features', 'core'),
  ('submission_overview', 'Submission Overview', 'View submission status and overviews', 'management'),
  ('settings', 'Settings', 'Access to application settings', 'administration'),
  ('role_management', 'Role Management', 'Manage roles and permissions', 'administration')
) AS v(name, display_name, description, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.name = v.name::permission_type
);

-- Assign permissions to roles (only if not already assigned)
-- Admin role gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin'::user_role
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Manager role gets management and core permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'manager'::user_role
AND p.name IN (
  'time_logging'::permission_type, 'reports'::permission_type, 'change_lead_reports'::permission_type,
  'resource_management'::permission_type, 'project_management'::permission_type, 'dashboard'::permission_type,
  'calendar'::permission_type, 'submission_overview'::permission_type
)
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- User role gets basic permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'user'::user_role
AND p.name IN ('time_logging'::permission_type, 'dashboard'::permission_type, 'calendar'::permission_type)
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_resource_id ON public.user_profiles(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_roles_updated_at ON public.roles;
CREATE TRIGGER handle_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();
  
  -- Assign default user role (only if user doesn't have any roles)
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM public.roles r
  WHERE r.name = COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = NEW.id AND ur.is_active = true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up (drop and recreate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
