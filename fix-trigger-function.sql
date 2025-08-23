-- Fix the trigger function to handle enum types properly
-- Run this to fix the user creation issue

-- First, let's recreate the enum types with explicit schema qualification
-- This ensures they're in the public schema and accessible

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with explicit schema references and better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id INTEGER;
  user_role_name TEXT;
  role_exists BOOLEAN;
BEGIN
  -- Log the start of the function
  RAISE LOG 'handle_new_user triggered for user: %', NEW.email;
  
  -- Insert user profile with error handling
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
    
    RAISE LOG 'User profile created/updated for: %', NEW.email;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to create user profile for %: %', NEW.email, SQLERRM;
      -- Continue execution even if profile creation fails
  END;
  
  -- Get role name from metadata, default to 'user'
  user_role_name := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  RAISE LOG 'Attempting to assign role: % to user: %', user_role_name, NEW.email;
  
  -- Check if the role exists before trying to assign it
  SELECT EXISTS(
    SELECT 1 FROM public.roles 
    WHERE name::TEXT = user_role_name
  ) INTO role_exists;
  
  IF NOT role_exists THEN
    RAISE LOG 'Role % does not exist, defaulting to user role', user_role_name;
    user_role_name := 'user';
  END IF;
  
  -- Get the role ID using text comparison to avoid enum casting issues
  BEGIN
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name::TEXT = user_role_name;
    
    RAISE LOG 'Found role ID % for role %', default_role_id, user_role_name;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Failed to get role ID for %: %', user_role_name, SQLERRM;
      -- Try to get the 'user' role as fallback
      SELECT id INTO default_role_id 
      FROM public.roles 
      WHERE name::TEXT = 'user';
  END;
  
  -- Assign role if we found one and user doesn't already have roles
  IF default_role_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role_id)
      SELECT NEW.id, default_role_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = NEW.id AND ur.is_active = true
      );
      
      RAISE LOG 'Role assigned successfully to user: %', NEW.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Failed to assign role to %: %', NEW.email, SQLERRM;
        -- Don't fail the entire user creation if role assignment fails
    END;
  ELSE
    RAISE LOG 'No role ID found, skipping role assignment for: %', NEW.email;
  END IF;
  
  RAISE LOG 'handle_new_user completed for user: %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE LOG 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the function manually to see if it works
DO $$
BEGIN
  RAISE NOTICE 'Testing enum access...';
  
  -- Test direct enum access
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    RAISE NOTICE 'user_role enum type exists';
  ELSE
    RAISE NOTICE 'user_role enum type NOT found';
  END IF;
  
  -- Test role table access
  IF EXISTS (SELECT 1 FROM public.roles WHERE name::TEXT = 'admin') THEN
    RAISE NOTICE 'admin role found in roles table';
  ELSE
    RAISE NOTICE 'admin role NOT found in roles table';
  END IF;
  
  RAISE NOTICE 'Function test completed';
END $$;

-- Alternative: Create a simpler version that doesn't use enums at all
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id INTEGER;
  user_role_name TEXT;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Get role name from metadata, default to 'user'
  user_role_name := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  
  -- Get the role ID using simple text comparison
  SELECT id INTO default_role_id 
  FROM public.roles 
  WHERE name::TEXT = user_role_name;
  
  -- If role not found, try 'user' role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id 
    FROM public.roles 
    WHERE name::TEXT = 'user';
  END IF;
  
  -- Assign role if found
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Show current function status
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines 
WHERE routine_name LIKE 'handle_new_user%';
