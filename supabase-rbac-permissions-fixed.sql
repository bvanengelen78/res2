-- Part 2: Permissions and Role Assignments (Fixed Version)
-- Run this AFTER the main schema script

-- Insert default permissions (only if they don't exist)
INSERT INTO public.permissions (name, display_name, description, category) 
SELECT v.name::permission_type, v.display_name, v.description, v.category 
FROM (VALUES
  ('time_logging', 'Time Logging', 'Access to time entry and logging features', 'core'),
  ('reports', 'Reports', 'Access to reporting and analytics features', 'reporting'),
  ('change_lead_reports', 'Change Lead Reports', 'Access to change lead specific reports', 'reporting'),
  ('resource_management', 'Resource Management', 'Manage resources and allocations', 'management'),
  ('project_management', 'Project Management', 'Manage projects and assignments', 'management'),
  ('user_management', 'User Management', 'Manage user accounts and access', 'administration'),
  ('system_admin', 'System Administration', 'Full system administration access', 'administration'),
  ('dashboard', 'Dashboard', 'Access to dashboard and overview features', 'core'),
  ('calendar', 'Calendar', 'Access to calendar and scheduling features', 'core'),
  ('submission_overview', 'Submission Overview', 'View submission status and overviews', 'management'),
  ('settings', 'Settings', 'Access to application settings', 'administration'),
  ('role_management', 'Role Management', 'Manage roles and permissions', 'administration')
) AS v(name, display_name, description, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = v.name::permission_type
);

-- Verify permissions were inserted
DO $$
DECLARE
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  RAISE NOTICE 'Total permissions in database: %', permission_count;
  
  IF permission_count < 12 THEN
    RAISE EXCEPTION 'Expected at least 12 permissions, found %', permission_count;
  END IF;
END $$;

-- Verify tables exist before role assignments
DO $$
BEGIN
  -- Check all required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE EXCEPTION 'roles table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    RAISE EXCEPTION 'permissions table does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    RAISE EXCEPTION 'role_permissions table does not exist';
  END IF;
  
  -- Check required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'role_id') THEN
    RAISE EXCEPTION 'role_permissions.role_id column does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'permission_id') THEN
    RAISE EXCEPTION 'role_permissions.permission_id column does not exist';
  END IF;
  
  RAISE NOTICE 'All required tables and columns verified';
END $$;

-- Admin role gets all permissions
DO $$
DECLARE
  admin_role_id INTEGER;
  permission_record RECORD;
  assignment_count INTEGER := 0;
BEGIN
  -- Get admin role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin'::user_role;
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;
  
  RAISE NOTICE 'Admin role ID: %', admin_role_id;
  
  -- Assign all permissions to admin
  FOR permission_record IN SELECT id FROM public.permissions LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT admin_role_id, permission_record.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp 
      WHERE rp.role_id = admin_role_id AND rp.permission_id = permission_record.id
    );
    
    assignment_count := assignment_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % permissions for admin role', assignment_count;
END $$;

-- Manager role gets management and core permissions
DO $$
DECLARE
  manager_role_id INTEGER;
  permission_record RECORD;
  assignment_count INTEGER := 0;
BEGIN
  -- Get manager role ID
  SELECT id INTO manager_role_id FROM public.roles WHERE name = 'manager'::user_role;
  
  IF manager_role_id IS NULL THEN
    RAISE EXCEPTION 'Manager role not found';
  END IF;
  
  RAISE NOTICE 'Manager role ID: %', manager_role_id;
  
  -- Assign specific permissions to manager
  FOR permission_record IN 
    SELECT id FROM public.permissions 
    WHERE name IN (
      'time_logging'::permission_type, 'reports'::permission_type, 'change_lead_reports'::permission_type, 
      'resource_management'::permission_type, 'project_management'::permission_type, 'dashboard'::permission_type, 
      'calendar'::permission_type, 'submission_overview'::permission_type
    )
  LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT manager_role_id, permission_record.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp 
      WHERE rp.role_id = manager_role_id AND rp.permission_id = permission_record.id
    );
    
    assignment_count := assignment_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % permissions for manager role', assignment_count;
END $$;

-- User role gets basic permissions
DO $$
DECLARE
  user_role_id INTEGER;
  permission_record RECORD;
  assignment_count INTEGER := 0;
BEGIN
  -- Get user role ID
  SELECT id INTO user_role_id FROM public.roles WHERE name = 'user'::user_role;
  
  IF user_role_id IS NULL THEN
    RAISE EXCEPTION 'User role not found';
  END IF;
  
  RAISE NOTICE 'User role ID: %', user_role_id;
  
  -- Assign basic permissions to user
  FOR permission_record IN 
    SELECT id FROM public.permissions 
    WHERE name IN ('time_logging'::permission_type, 'dashboard'::permission_type, 'calendar'::permission_type)
  LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT user_role_id, permission_record.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp 
      WHERE rp.role_id = user_role_id AND rp.permission_id = permission_record.id
    );
    
    assignment_count := assignment_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % permissions for user role', assignment_count;
END $$;

-- Final verification
DO $$
DECLARE
  total_assignments INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_assignments FROM public.role_permissions;
  RAISE NOTICE 'Total role-permission assignments: %', total_assignments;
  
  -- Show summary
  RAISE NOTICE 'RBAC Schema Setup Complete!';
  RAISE NOTICE 'Next step: Run the indexes and triggers script';
END $$;
