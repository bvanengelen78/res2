-- Safe Debug script - handles missing tables gracefully
-- Run this first to diagnose the current state

-- 1. Check if the tables exist
SELECT 
  table_name, 
  table_type,
  is_insertable_into
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles')
ORDER BY table_name;

-- 2. Check if the custom types exist
SELECT 
  typname,
  typtype,
  typcategory
FROM pg_type 
WHERE typname IN ('user_role', 'permission_type');

-- 3. Check what tables DO exist in the public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Safe check for table data (only if tables exist)
DO $$
DECLARE
  role_count INTEGER := 0;
  permission_count INTEGER := 0;
  user_profile_count INTEGER := 0;
  role_permission_count INTEGER := 0;
  user_role_count INTEGER := 0;
BEGIN
  -- Check roles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    SELECT COUNT(*) INTO role_count FROM public.roles;
    RAISE NOTICE 'roles table exists with % records', role_count;
  ELSE
    RAISE NOTICE 'roles table DOES NOT EXIST';
  END IF;
  
  -- Check permissions table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
    SELECT COUNT(*) INTO permission_count FROM public.permissions;
    RAISE NOTICE 'permissions table exists with % records', permission_count;
  ELSE
    RAISE NOTICE 'permissions table DOES NOT EXIST';
  END IF;
  
  -- Check user_profiles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    SELECT COUNT(*) INTO user_profile_count FROM public.user_profiles;
    RAISE NOTICE 'user_profiles table exists with % records', user_profile_count;
  ELSE
    RAISE NOTICE 'user_profiles table DOES NOT EXIST';
  END IF;
  
  -- Check role_permissions table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    SELECT COUNT(*) INTO role_permission_count FROM public.role_permissions;
    RAISE NOTICE 'role_permissions table exists with % records', role_permission_count;
    
    -- Check its structure
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'role_id') THEN
      RAISE NOTICE 'role_permissions.role_id column EXISTS';
    ELSE
      RAISE NOTICE 'role_permissions.role_id column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'permission_id') THEN
      RAISE NOTICE 'role_permissions.permission_id column EXISTS';
    ELSE
      RAISE NOTICE 'role_permissions.permission_id column MISSING';
    END IF;
  ELSE
    RAISE NOTICE 'role_permissions table DOES NOT EXIST';
  END IF;
  
  -- Check user_roles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    SELECT COUNT(*) INTO user_role_count FROM public.user_roles;
    RAISE NOTICE 'user_roles table exists with % records', user_role_count;
  ELSE
    RAISE NOTICE 'user_roles table DOES NOT EXIST';
  END IF;
  
  -- Summary
  RAISE NOTICE '=== SUMMARY ===';
  RAISE NOTICE 'Tables found: roles=%, permissions=%, user_profiles=%, role_permissions=%, user_roles=%', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN 'YES' ELSE 'NO' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN 'YES' ELSE 'NO' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN 'YES' ELSE 'NO' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN 'YES' ELSE 'NO' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN 'YES' ELSE 'NO' END;
END $$;

-- 5. Check if there are any existing auth users
DO $$
DECLARE
  auth_user_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  RAISE NOTICE 'auth.users table has % records', auth_user_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not access auth.users table: %', SQLERRM;
END $$;

-- 6. Show column details for any existing RBAC tables
DO $$
DECLARE
  table_rec RECORD;
  col_rec RECORD;
BEGIN
  FOR table_rec IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles')
  LOOP
    RAISE NOTICE '=== Columns for table: % ===', table_rec.table_name;
    
    FOR col_rec IN
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_rec.table_name
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  %: % (nullable: %, default: %)', 
        col_rec.column_name, 
        col_rec.data_type, 
        col_rec.is_nullable, 
        COALESCE(col_rec.column_default, 'none');
    END LOOP;
  END LOOP;
END $$;
