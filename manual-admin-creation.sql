-- Manual Admin User Creation (Emergency Workaround)
-- Use this if the trigger is still causing issues

-- First, disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Check what users exist in auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- If you have a user in auth.users that needs RBAC setup, use their ID here
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from auth.users

-- Example manual setup for an existing auth user:
DO $$
DECLARE
  user_uuid UUID := 'YOUR_USER_ID_HERE'; -- Replace with actual user ID
  admin_role_id INTEGER;
BEGIN
  -- Get admin role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE name::TEXT = 'admin';
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;
  
  -- Create user profile manually
  INSERT INTO public.user_profiles (id, email, first_name, last_name, is_active)
  VALUES (
    user_uuid,
    'admin@yourcompany.com', -- Replace with actual email
    'Admin',
    'User',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role_id, is_active)
  VALUES (user_uuid, admin_role_id, true)
  ON CONFLICT (user_id, role_id, resource_id) DO UPDATE SET
    is_active = EXCLUDED.is_active;
  
  RAISE NOTICE 'Admin user setup complete for UUID: %', user_uuid;
END $$;

-- Verify the setup worked
SELECT 
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  r.name as role_name,
  r.display_name
FROM public.user_profiles up
JOIN public.user_roles ur ON up.id = ur.user_id
JOIN public.roles r ON ur.role_id = r.id
WHERE ur.is_active = true;

-- Test the RBAC functions
DO $$
DECLARE
  user_uuid UUID := 'YOUR_USER_ID_HERE'; -- Replace with actual user ID
  has_admin_role BOOLEAN;
  has_admin_permission BOOLEAN;
BEGIN
  -- Test role checking
  SELECT public.has_role(user_uuid, 'admin') INTO has_admin_role;
  RAISE NOTICE 'User has admin role: %', has_admin_role;
  
  -- Test permission checking
  SELECT public.has_permission(user_uuid, 'user_management') INTO has_admin_permission;
  RAISE NOTICE 'User has user_management permission: %', has_admin_permission;
END $$;

-- Re-enable the trigger with the simple version
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();
