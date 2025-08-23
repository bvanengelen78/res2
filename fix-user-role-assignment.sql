-- Check and fix user role assignment for admin@swisssense.nl
-- This ensures the admin user has proper role and permission assignments

-- 1. Check current user profile and role assignment
SELECT 
  'Current User Profile and Roles' as section,
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.is_active as profile_active,
  r.name as role_name,
  r.display_name as role_display,
  ur.is_active as role_active,
  ur.assigned_at
FROM public.user_profiles up
LEFT JOIN public.user_roles ur ON up.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE up.email = 'admin@swisssense.nl'
ORDER BY ur.assigned_at DESC;

-- 2. Check if user exists in auth.users
SELECT 
  'Auth Users Check' as section,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'admin@swisssense.nl';

-- 3. Ensure admin role assignment for admin@swisssense.nl
DO $$
DECLARE
  admin_user_id UUID;
  admin_role_id INTEGER;
  existing_assignment INTEGER;
BEGIN
  -- Get user ID from user_profiles
  SELECT id INTO admin_user_id 
  FROM public.user_profiles 
  WHERE email = 'admin@swisssense.nl';
  
  -- Get admin role ID
  SELECT id INTO admin_role_id 
  FROM public.roles 
  WHERE name = 'admin'::user_role;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: User profile not found for admin@swisssense.nl';
    
    -- Check if user exists in auth.users but not in user_profiles
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@swisssense.nl') THEN
      RAISE NOTICE 'User exists in auth.users but not in user_profiles - creating profile...';
      
      -- Create user profile
      INSERT INTO public.user_profiles (id, email, first_name, last_name, is_active)
      SELECT id, email, 'Admin', 'User', true
      FROM auth.users 
      WHERE email = 'admin@swisssense.nl';
      
      -- Get the newly created user ID
      SELECT id INTO admin_user_id 
      FROM public.user_profiles 
      WHERE email = 'admin@swisssense.nl';
      
      RAISE NOTICE 'Created user profile for admin@swisssense.nl with ID: %', admin_user_id;
    ELSE
      RAISE NOTICE 'User does not exist in auth.users either';
      RETURN;
    END IF;
  END IF;
  
  IF admin_role_id IS NULL THEN
    RAISE NOTICE 'ERROR: Admin role not found';
    RETURN;
  END IF;
  
  -- Check if role assignment already exists
  SELECT COUNT(*) INTO existing_assignment
  FROM public.user_roles 
  WHERE user_id = admin_user_id 
  AND role_id = admin_role_id;
  
  IF existing_assignment = 0 THEN
    -- Create admin role assignment
    INSERT INTO public.user_roles (user_id, role_id, is_active, assigned_at)
    VALUES (admin_user_id, admin_role_id, true, NOW());
    
    RAISE NOTICE 'SUCCESS: Assigned admin role to user %', admin_user_id;
  ELSE
    -- Update existing assignment to ensure it's active
    UPDATE public.user_roles 
    SET is_active = true, assigned_at = NOW()
    WHERE user_id = admin_user_id 
    AND role_id = admin_role_id;
    
    RAISE NOTICE 'SUCCESS: Updated existing admin role assignment for user %', admin_user_id;
  END IF;
  
  -- Verify the assignment worked
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = admin_user_id 
    AND r.name = 'admin'::user_role
    AND ur.is_active = true
  ) THEN
    RAISE NOTICE 'VERIFICATION: Admin role assignment confirmed';
  ELSE
    RAISE NOTICE 'ERROR: Admin role assignment verification failed';
  END IF;
END $$;

-- 4. Verify final state
SELECT 
  'Final Verification' as section,
  up.email,
  r.name as role_name,
  COUNT(p.name) as permission_count,
  string_agg(p.name::TEXT, ', ') as permissions
FROM public.user_profiles up
JOIN public.user_roles ur ON up.id = ur.user_id AND ur.is_active = true
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE up.email = 'admin@swisssense.nl'
GROUP BY up.email, r.name;

-- 5. Test RBAC functions for this user
DO $$
DECLARE
  admin_user_id UUID;
  has_admin_role BOOLEAN;
  has_user_mgmt BOOLEAN;
  user_permissions TEXT[];
BEGIN
  SELECT id INTO admin_user_id 
  FROM public.user_profiles 
  WHERE email = 'admin@swisssense.nl';
  
  IF admin_user_id IS NOT NULL THEN
    -- Test role checking
    SELECT public.has_role(admin_user_id, 'admin') INTO has_admin_role;
    
    -- Test permission checking
    SELECT public.has_permission(admin_user_id, 'user_management') INTO has_user_mgmt;
    
    -- Get all permissions
    SELECT ARRAY(SELECT permission_name FROM public.get_user_permissions(admin_user_id)) INTO user_permissions;
    
    RAISE NOTICE 'RBAC Function Test for admin@swisssense.nl:';
    RAISE NOTICE 'User ID: %', admin_user_id;
    RAISE NOTICE 'Has admin role: %', has_admin_role;
    RAISE NOTICE 'Has user_management permission: %', has_user_mgmt;
    RAISE NOTICE 'Total permissions: %', array_length(user_permissions, 1);
    
    IF array_length(user_permissions, 1) > 0 THEN
      RAISE NOTICE 'Permissions: %', array_to_string(user_permissions, ', ');
    END IF;
  END IF;
END $$;
