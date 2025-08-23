-- Diagnose enum type and trigger function issues
-- Run this to identify the problem

-- 1. Check if enum types exist and their details
SELECT 
  typname as enum_name,
  typnamespace::regnamespace as schema_name,
  typtype,
  typcategory
FROM pg_type 
WHERE typname IN ('user_role', 'permission_type')
ORDER BY typname;

-- 2. Check enum values
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname IN ('user_role', 'permission_type')
ORDER BY t.typname, e.enumsortorder;

-- 3. Check if the trigger function exists and its definition
SELECT 
  routine_name,
  routine_schema,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 4. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. Test enum type casting directly
DO $$
BEGIN
  -- Test if we can cast to user_role
  PERFORM 'admin'::user_role;
  RAISE NOTICE 'user_role enum casting works';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'user_role enum casting failed: %', SQLERRM;
END $$;

-- 6. Test if we can access the roles table
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  RAISE NOTICE 'roles table accessible, count: %', role_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'roles table access failed: %', SQLERRM;
END $$;

-- 7. Check current search_path
SHOW search_path;

-- 8. Check function privileges
SELECT
  routine_name,
  routine_schema,
  security_type,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
