-- Complete RBAC Schema Setup - Fresh Installation
-- This script creates everything from scratch
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for roles and permissions
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
    RAISE NOTICE 'Created user_role enum type';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'user_role enum type already exists';
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
    RAISE NOTICE 'Created permission_type enum type';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'permission_type enum type already exists';
END $$;

-- 1. User profiles table (extends Supabase auth.users)
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

-- 2. Roles table
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Permissions table
CREATE TABLE public.permissions (
  id SERIAL PRIMARY KEY,
  name permission_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Role permissions junction table
CREATE TABLE public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 5. User roles junction table
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

-- Verify all tables were created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'Failed to create user_profiles table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE EXCEPTION 'Failed to create roles table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    RAISE EXCEPTION 'Failed to create permissions table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    RAISE EXCEPTION 'Failed to create role_permissions table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    RAISE EXCEPTION 'Failed to create user_roles table';
  END IF;
  
  RAISE NOTICE 'All RBAC tables created successfully';
END $$;

-- Insert default roles
INSERT INTO public.roles (name, display_name, description) VALUES
  ('admin'::user_role, 'Administrator', 'Full system access with all permissions'),
  ('manager'::user_role, 'Manager', 'Management access with resource and project permissions'),
  ('user'::user_role, 'User', 'Basic user access with time logging and reporting permissions');

-- Insert default permissions
INSERT INTO public.permissions (name, display_name, description, category) VALUES
  ('time_logging'::permission_type, 'Time Logging', 'Access to time entry and logging features', 'core'),
  ('reports'::permission_type, 'Reports', 'Access to reporting and analytics features', 'reporting'),
  ('change_lead_reports'::permission_type, 'Change Lead Reports', 'Access to change lead specific reports', 'reporting'),
  ('resource_management'::permission_type, 'Resource Management', 'Manage resources and allocations', 'management'),
  ('project_management'::permission_type, 'Project Management', 'Manage projects and assignments', 'management'),
  ('user_management'::permission_type, 'User Management', 'Manage user accounts and access', 'administration'),
  ('system_admin'::permission_type, 'System Administration', 'Full system administration access', 'administration'),
  ('dashboard'::permission_type, 'Dashboard', 'Access to dashboard and overview features', 'core'),
  ('calendar'::permission_type, 'Calendar', 'Access to calendar and scheduling features', 'core'),
  ('submission_overview'::permission_type, 'Submission Overview', 'View submission status and overviews', 'management'),
  ('settings'::permission_type, 'Settings', 'Access to application settings', 'administration'),
  ('role_management'::permission_type, 'Role Management', 'Manage roles and permissions', 'administration');

-- Assign all permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'admin'::user_role;

-- Assign management and core permissions to manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'manager'::user_role 
AND p.name IN (
  'time_logging'::permission_type, 'reports'::permission_type, 'change_lead_reports'::permission_type, 
  'resource_management'::permission_type, 'project_management'::permission_type, 'dashboard'::permission_type, 
  'calendar'::permission_type, 'submission_overview'::permission_type
);

-- Assign basic permissions to user role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'user'::user_role 
AND p.name IN ('time_logging'::permission_type, 'dashboard'::permission_type, 'calendar'::permission_type);

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
DECLARE
  default_role_id INTEGER;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Get the appropriate role ID
  SELECT id INTO default_role_id 
  FROM public.roles 
  WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role;
  
  -- Assign default role
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Final verification and summary
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  SELECT COUNT(*) INTO assignment_count FROM public.role_permissions;
  
  RAISE NOTICE '=== RBAC SETUP COMPLETE ===';
  RAISE NOTICE 'Roles created: %', role_count;
  RAISE NOTICE 'Permissions created: %', permission_count;
  RAISE NOTICE 'Role-Permission assignments: %', assignment_count;
  RAISE NOTICE 'Tables: user_profiles, roles, permissions, role_permissions, user_roles';
  RAISE NOTICE 'Triggers: Auto user profile creation';
  RAISE NOTICE 'Next: Run the RLS policies script';
END $$;
