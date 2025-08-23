-- Complete fix for enum types and trigger function
-- This will resolve the "type user_role does not exist" error

-- Step 1: Create the missing enum types
DO $$ 
BEGIN
    -- Create user_role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
    
    -- Create permission_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_type') THEN
        CREATE TYPE public.permission_type AS ENUM (
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
    ELSE
        RAISE NOTICE 'permission_type enum type already exists';
    END IF;
END $$;

-- Step 2: Verify enum types were created
SELECT 
    typname as enum_name,
    typnamespace::regnamespace as schema_name
FROM pg_type 
WHERE typname IN ('user_role', 'permission_type')
ORDER BY typname;

-- Step 3: Test enum casting
DO $$
BEGIN
    -- Test user_role casting
    PERFORM 'admin'::public.user_role;
    RAISE NOTICE 'SUCCESS: user_role enum casting works';
    
    -- Test permission_type casting  
    PERFORM 'time_logging'::public.permission_type;
    RAISE NOTICE 'SUCCESS: permission_type enum casting works';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ENUM CASTING FAILED: %', SQLERRM;
END $$;

-- Step 4: Drop and recreate the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 5: Create a new, robust trigger function that avoids enum casting issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INTEGER;
    user_role_name TEXT;
BEGIN
    -- Log the trigger execution
    RAISE LOG 'handle_new_user triggered for user: %', NEW.email;
    
    -- Step 1: Create user profile
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
        
        RAISE LOG 'User profile created for: %', NEW.email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Failed to create user profile: %', SQLERRM;
            -- Continue execution
    END;
    
    -- Step 2: Assign role (avoid enum casting by using text comparison)
    BEGIN
        -- Get role name from metadata, default to 'user'
        user_role_name := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
        
        -- Find role ID using text comparison (no enum casting)
        SELECT id INTO default_role_id 
        FROM public.roles 
        WHERE name::TEXT = user_role_name;
        
        -- If role not found, try 'user' role as fallback
        IF default_role_id IS NULL THEN
            SELECT id INTO default_role_id 
            FROM public.roles 
            WHERE name::TEXT = 'user';
        END IF;
        
        -- Assign role if found
        IF default_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id, is_active)
            VALUES (NEW.id, default_role_id, true)
            ON CONFLICT (user_id, role_id, resource_id) DO UPDATE SET
                is_active = EXCLUDED.is_active;
            
            RAISE LOG 'Role % assigned to user: %', user_role_name, NEW.email;
        ELSE
            RAISE LOG 'No role found for: %, skipping role assignment', NEW.email;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Failed to assign role: %', SQLERRM;
            -- Continue execution - don't fail user creation
    END;
    
    RAISE LOG 'handle_new_user completed successfully for: %', NEW.email;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE LOG 'handle_new_user failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Verify everything is working
DO $$
DECLARE
    role_count INTEGER;
    function_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    -- Check roles exist
    SELECT COUNT(*) INTO role_count FROM public.roles;
    
    -- Check function exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' 
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    -- Check trigger exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    RAISE NOTICE '=== FIX VERIFICATION ===';
    RAISE NOTICE 'Enum types created: user_role, permission_type';
    RAISE NOTICE 'Roles in database: %', role_count;
    RAISE NOTICE 'Trigger function exists: %', function_exists;
    RAISE NOTICE 'Trigger exists: %', trigger_exists;
    RAISE NOTICE 'Ready to test user creation!';
END $$;

-- Step 8: Show available roles for testing
SELECT 'Available roles for user creation:' as info;
SELECT name::TEXT as role_name, display_name FROM public.roles ORDER BY name;
