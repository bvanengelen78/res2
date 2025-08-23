-- Detailed diagnosis - run each section separately to see results
-- Section 1: Check enum types
SELECT 'ENUM TYPES CHECK' as section;
SELECT 
  typname as enum_name,
  typnamespace::regnamespace as schema_name,
  typtype,
  typcategory
FROM pg_type 
WHERE typname IN ('user_role', 'permission_type')
ORDER BY typname;

-- Section 2: Check all custom types in public schema
SELECT 'ALL CUSTOM TYPES' as section;
SELECT 
  typname,
  typtype,
  typcategory
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e'  -- enum types
ORDER BY typname;

-- Section 3: Test enum casting
SELECT 'ENUM CASTING TEST' as section;
DO $$
BEGIN
  BEGIN
    PERFORM 'admin'::user_role;
    RAISE NOTICE 'SUCCESS: user_role enum casting works';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAILED: user_role enum casting failed: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM 'time_logging'::permission_type;
    RAISE NOTICE 'SUCCESS: permission_type enum casting works';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAILED: permission_type enum casting failed: %', SQLERRM;
  END;
END $$;

-- Section 4: Check roles table
SELECT 'ROLES TABLE CHECK' as section;
SELECT name, display_name FROM public.roles ORDER BY name;

-- Section 5: Check trigger function definition
SELECT 'TRIGGER FUNCTION CHECK' as section;
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';
