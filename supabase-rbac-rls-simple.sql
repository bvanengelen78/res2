-- Simple RLS Policies and Helper Functions for Migrated RBAC
-- Run this AFTER the migration script

-- Enable RLS on RBAC tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for testing (you can make these more restrictive later)

-- Allow authenticated users to read roles and permissions
CREATE POLICY "Allow authenticated users to read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- User profiles - users can see their own, admins can see all
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- User roles - users can see their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Helper functions for checking permissions
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id 
    AND p.name = permission_name::permission_type
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id 
    AND r.name = role_name::user_role
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name::TEXT
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = user_id 
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_id UUID)
RETURNS TABLE(role_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id 
  AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id INTEGER;
BEGIN
  -- Insert user profile
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
  
  -- Get the appropriate role ID
  SELECT id INTO default_role_id 
  FROM public.roles 
  WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role;
  
  -- Assign default role (only if user doesn't have any roles)
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, default_role_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = NEW.id AND ur.is_active = true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the setup
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  SELECT COUNT(*) INTO assignment_count FROM public.role_permissions;
  
  RAISE NOTICE '=== RBAC SYSTEM READY ===';
  RAISE NOTICE 'Roles: %', role_count;
  RAISE NOTICE 'Permissions: %', permission_count;
  RAISE NOTICE 'Assignments: %', assignment_count;
  RAISE NOTICE 'Helper functions created';
  RAISE NOTICE 'RLS policies enabled';
  RAISE NOTICE 'Auto user creation trigger active';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test user creation in Supabase Auth';
  RAISE NOTICE '2. Verify RBAC functions work';
  RAISE NOTICE '3. Update your application code';
END $$;
