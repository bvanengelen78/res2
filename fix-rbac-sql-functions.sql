-- Fix SQL ambiguity in RBAC helper functions
-- This resolves the "column reference 'user_id' is ambiguous" error

-- Drop and recreate the problematic functions with proper column qualification

-- 1. Fix get_user_permissions function
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID);
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name::TEXT
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = get_user_permissions.user_id  -- Fully qualified reference
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix get_user_roles function
DROP FUNCTION IF EXISTS public.get_user_roles(UUID);
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id UUID)
RETURNS TABLE(role_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = get_user_roles.user_id  -- Fully qualified reference
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix has_permission function
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = has_permission.user_id  -- Fully qualified reference
    AND p.name = permission_name::permission_type
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix has_role function
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = has_role.user_id  -- Fully qualified reference
    AND r.name = role_name::user_role
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions
DO $$
DECLARE
  test_user_id UUID;
  user_permissions TEXT[];
  user_roles TEXT[];
  has_admin_role BOOLEAN;
  has_time_logging BOOLEAN;
BEGIN
  -- Get a test user (most recent user profile)
  SELECT id INTO test_user_id FROM public.user_profiles ORDER BY created_at DESC LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test get_user_permissions
    SELECT ARRAY(SELECT permission_name FROM public.get_user_permissions(test_user_id)) INTO user_permissions;
    
    -- Test get_user_roles
    SELECT ARRAY(SELECT role_name FROM public.get_user_roles(test_user_id)) INTO user_roles;
    
    -- Test has_role
    SELECT public.has_role(test_user_id, 'admin') INTO has_admin_role;
    
    -- Test has_permission
    SELECT public.has_permission(test_user_id, 'time_logging') INTO has_time_logging;
    
    RAISE NOTICE 'RBAC Functions Test Results:';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Permissions: %', array_length(user_permissions, 1);
    RAISE NOTICE 'Roles: %', array_length(user_roles, 1);
    RAISE NOTICE 'Has admin role: %', has_admin_role;
    RAISE NOTICE 'Has time_logging permission: %', has_time_logging;
    
    IF array_length(user_permissions, 1) > 0 THEN
      RAISE NOTICE 'Permission list: %', array_to_string(user_permissions, ', ');
    END IF;
    
    IF array_length(user_roles, 1) > 0 THEN
      RAISE NOTICE 'Role list: %', array_to_string(user_roles, ', ');
    END IF;
  ELSE
    RAISE NOTICE 'No user profiles found for testing';
  END IF;
END $$;
