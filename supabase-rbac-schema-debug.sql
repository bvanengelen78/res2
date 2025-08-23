-- Debug script to identify the exact issue with role_permissions table
-- Run this first to diagnose the problem

-- 1. Check if the tables exist
SELECT 
  table_name, 
  table_type,
  is_insertable_into
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles')
ORDER BY table_name;

-- 2. Check the exact column structure of role_permissions table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'role_permissions'
ORDER BY ordinal_position;

-- 3. Check if the custom types exist
SELECT 
  typname,
  typtype,
  typcategory
FROM pg_type 
WHERE typname IN ('user_role', 'permission_type');

-- 4. Check if roles table has data
SELECT COUNT(*) as role_count FROM public.roles;

-- 5. Check if permissions table has data  
SELECT COUNT(*) as permission_count FROM public.permissions;

-- 6. Check for any foreign key constraints that might be causing issues
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'role_permissions';

-- 7. Try a simple test insert to see what happens
-- (This will help identify the exact error)
DO $$
BEGIN
  -- Test if we can insert into role_permissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    RAISE NOTICE 'role_permissions table exists';
    
    -- Check if it has the expected columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'role_id') THEN
      RAISE NOTICE 'role_id column exists';
    ELSE
      RAISE NOTICE 'role_id column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'permission_id') THEN
      RAISE NOTICE 'permission_id column exists';
    ELSE
      RAISE NOTICE 'permission_id column MISSING';
    END IF;
  ELSE
    RAISE NOTICE 'role_permissions table DOES NOT EXIST';
  END IF;
END $$;
