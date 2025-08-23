-- RBAC Migration Script for Existing Database
-- This script works with your existing tables and adds the missing RBAC components

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

-- Check existing users table structure
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  -- Check if users table has the columns we need
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE 'Existing users table found with id column';
  ELSE
    RAISE NOTICE 'Users table structure may need adjustment';
  END IF;
END $$;

-- Create user_profiles table that links to your existing users table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  resource_id INTEGER REFERENCES public.resources(id), -- Links to your existing resources table
  legacy_user_id INTEGER REFERENCES public.users(id), -- Links to your existing users table
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  name permission_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Check if existing user_roles table has the structure we need
DO $$
DECLARE
  has_role_id BOOLEAN;
  has_user_id BOOLEAN;
  rec RECORD;
BEGIN
  -- Check existing user_roles table structure
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'role_id'
  ) INTO has_role_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'user_id'
  ) INTO has_user_id;

  IF has_role_id AND has_user_id THEN
    RAISE NOTICE 'Existing user_roles table has compatible structure';
  ELSE
    RAISE NOTICE 'Existing user_roles table may need migration';

    -- Show current structure
    RAISE NOTICE 'Current user_roles columns:';
    FOR rec IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_roles'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  %: %', rec.column_name, rec.data_type;
    END LOOP;
  END IF;
END $$;

-- Backup existing user_roles table if it has data
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.user_roles;
  
  IF row_count > 0 THEN
    RAISE NOTICE 'Found % existing records in user_roles table', row_count;
    
    -- Create backup table
    CREATE TABLE IF NOT EXISTS public.user_roles_backup AS 
    SELECT * FROM public.user_roles;
    
    RAISE NOTICE 'Created backup table: user_roles_backup';
  ELSE
    RAISE NOTICE 'user_roles table is empty, no backup needed';
  END IF;
END $$;

-- Rename existing user_roles table to avoid conflicts
DO $$
BEGIN
  -- Check if we need to rename the existing table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    -- Rename existing table
    ALTER TABLE public.user_roles RENAME TO user_roles_legacy;
    RAISE NOTICE 'Renamed existing user_roles table to user_roles_legacy';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not rename user_roles table: %', SQLERRM;
END $$;

-- Create new user_roles table with proper RBAC structure
CREATE TABLE public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES public.resources(id), -- Optional: role specific to a resource
  assigned_by UUID REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional: temporary roles
  is_active BOOLEAN DEFAULT true,
  legacy_user_id INTEGER, -- For migration purposes
  UNIQUE(user_id, role_id, resource_id)
);

-- Insert default roles
INSERT INTO public.roles (name, display_name, description) VALUES
  ('admin'::user_role, 'Administrator', 'Full system access with all permissions'),
  ('manager'::user_role, 'Manager', 'Management access with resource and project permissions'),
  ('user'::user_role, 'User', 'Basic user access with time logging and reporting permissions')
ON CONFLICT (name) DO NOTHING;

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
  ('role_management'::permission_type, 'Role Management', 'Manage roles and permissions', 'administration')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'admin'::user_role
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign management and core permissions to manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'manager'::user_role 
AND p.name IN (
  'time_logging'::permission_type, 'reports'::permission_type, 'change_lead_reports'::permission_type, 
  'resource_management'::permission_type, 'project_management'::permission_type, 'dashboard'::permission_type, 
  'calendar'::permission_type, 'submission_overview'::permission_type
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic permissions to user role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'user'::user_role 
AND p.name IN ('time_logging'::permission_type, 'dashboard'::permission_type, 'calendar'::permission_type)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_resource_id ON public.user_profiles(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_legacy_user_id ON public.user_profiles(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);

-- Final verification and summary
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  assignment_count INTEGER;
  legacy_user_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  SELECT COUNT(*) INTO assignment_count FROM public.role_permissions;
  
  -- Check legacy data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles_legacy') THEN
    SELECT COUNT(*) INTO legacy_user_count FROM public.user_roles_legacy;
  END IF;
  
  RAISE NOTICE '=== RBAC MIGRATION COMPLETE ===';
  RAISE NOTICE 'Roles created: %', role_count;
  RAISE NOTICE 'Permissions created: %', permission_count;
  RAISE NOTICE 'Role-Permission assignments: %', assignment_count;
  RAISE NOTICE 'Legacy user_roles records preserved: %', legacy_user_count;
  RAISE NOTICE 'Tables: user_profiles, roles, permissions, role_permissions, user_roles';
  RAISE NOTICE 'Legacy tables: user_roles_legacy (if data existed)';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run RLS policies script';
  RAISE NOTICE '2. Migrate existing users to Supabase Auth';
  RAISE NOTICE '3. Update application to use new RBAC system';
END $$;
