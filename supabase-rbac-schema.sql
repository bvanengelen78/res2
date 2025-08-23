-- Supabase RBAC Schema for ResourceFlow
-- This schema implements Role-Based Access Control using Supabase Auth
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for roles and permissions
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
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

-- User profiles table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
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
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE public.permissions (
  id SERIAL PRIMARY KEY,
  name permission_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User roles junction table
CREATE TABLE public.user_roles (
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

-- Insert default roles
INSERT INTO public.roles (name, display_name, description) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions'),
  ('manager', 'Manager', 'Management access with resource and project permissions'),
  ('user', 'User', 'Basic user access with time logging and reporting permissions');

-- Insert default permissions
INSERT INTO public.permissions (name, display_name, description, category) VALUES
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
  ('role_management', 'Role Management', 'Manage roles and permissions', 'administration');

-- Assign permissions to roles
-- Admin role gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'admin';

-- Manager role gets management and core permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'manager' 
AND p.name IN (
  'time_logging', 'reports', 'change_lead_reports', 'resource_management', 
  'project_management', 'dashboard', 'calendar', 'submission_overview'
);

-- User role gets basic permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'user' 
AND p.name IN ('time_logging', 'dashboard', 'calendar');

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_resource_id ON public.user_profiles(resource_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_user_roles_active ON public.user_roles(is_active);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM public.roles r
  WHERE r.name = COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name IN ('admin', 'manager')
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Roles and permissions are readable by authenticated users
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Helper functions for checking permissions
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id 
    AND p.name = permission_name::permission_type
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id 
    AND r.name = role_name::user_role
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name::TEXT
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = user_id 
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id UUID)
RETURNS TABLE(role_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id 
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
