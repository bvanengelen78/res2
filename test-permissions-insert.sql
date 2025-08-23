-- Test script to verify the permissions insertion works correctly
-- Run this to test the enum casting fix

-- First, let's check if the enum types exist
SELECT typname FROM pg_type WHERE typname IN ('user_role', 'permission_type');

-- Test the corrected permissions insertion
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

-- Verify the insertion worked
SELECT name, display_name, category FROM public.permissions ORDER BY category, name;
