-- Supabase RBAC Schema for ResourceFlow (Fixed Version with Error Handling)
-- This version includes step-by-step verification and better error handling

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for roles and permissions (only if they don't exist)
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

-- Verify user_profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE 'user_profiles table created/exists';
  ELSE
    RAISE EXCEPTION 'Failed to create user_profiles table';
  END IF;
END $$;

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

-- Verify roles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE NOTICE 'roles table created/exists';
  ELSE
    RAISE EXCEPTION 'Failed to create roles table';
  END IF;
END $$;

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

-- Verify permissions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    RAISE NOTICE 'permissions table created/exists';
  ELSE
    RAISE EXCEPTION 'Failed to create permissions table';
  END IF;
END $$;

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Verify role_permissions table and its columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    RAISE NOTICE 'role_permissions table created/exists';
    
    -- Check for required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'role_id') THEN
      RAISE EXCEPTION 'role_permissions table missing role_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'permission_id') THEN
      RAISE EXCEPTION 'role_permissions table missing permission_id column';
    END IF;
    
    RAISE NOTICE 'role_permissions table has all required columns';
  ELSE
    RAISE EXCEPTION 'Failed to create role_permissions table';
  END IF;
END $$;

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

-- Verify user_roles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    RAISE NOTICE 'user_roles table created/exists';
  ELSE
    RAISE EXCEPTION 'Failed to create user_roles table';
  END IF;
END $$;

-- Insert default roles (only if they don't exist)
INSERT INTO public.roles (name, display_name, description) 
SELECT 'admin'::user_role, 'Administrator', 'Full system access with all permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin'::user_role);

INSERT INTO public.roles (name, display_name, description) 
SELECT 'manager'::user_role, 'Manager', 'Management access with resource and project permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'manager'::user_role);

INSERT INTO public.roles (name, display_name, description) 
SELECT 'user'::user_role, 'User', 'Basic user access with time logging and reporting permissions'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'user'::user_role);

-- Verify roles were inserted
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  RAISE NOTICE 'Total roles in database: %', role_count;
  
  IF role_count < 3 THEN
    RAISE EXCEPTION 'Expected at least 3 roles, found %', role_count;
  END IF;
END $$;
