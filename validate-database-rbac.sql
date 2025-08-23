-- Comprehensive RBAC Database Validation Script
-- This script validates the complete RBAC configuration in Supabase

-- ============================================================================
-- 1. VALIDATE CORE RBAC TABLES STRUCTURE
-- ============================================================================

SELECT 'RBAC Tables Structure Validation' as section;

-- Check if all required tables exist
SELECT 
  'Table Existence Check' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN '✅ roles table exists'
    ELSE '❌ roles table missing'
  END as roles_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN '✅ permissions table exists'
    ELSE '❌ permissions table missing'
  END as permissions_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN '✅ role_permissions table exists'
    ELSE '❌ role_permissions table missing'
  END as role_permissions_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN '✅ user_profiles table exists'
    ELSE '❌ user_profiles table missing'
  END as user_profiles_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN '✅ user_roles table exists'
    ELSE '❌ user_roles table missing'
  END as user_roles_table;

-- ============================================================================
-- 2. VALIDATE ROLES CONFIGURATION
-- ============================================================================

SELECT 'Roles Configuration Validation' as section;

-- Check roles data
SELECT 
  'Roles Data' as test,
  COUNT(*) as total_roles,
  string_agg(name::TEXT, ', ') as available_roles
FROM public.roles;

-- Validate specific required roles
SELECT 
  'Required Roles Check' as test,
  CASE WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin'::user_role) THEN '✅ admin role exists' ELSE '❌ admin role missing' END as admin_role,
  CASE WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'manager'::user_role) THEN '✅ manager role exists' ELSE '❌ manager role missing' END as manager_role,
  CASE WHEN EXISTS (SELECT 1 FROM public.roles WHERE name = 'user'::user_role) THEN '✅ user role exists' ELSE '❌ user role missing' END as user_role;

-- ============================================================================
-- 3. VALIDATE PERMISSIONS CONFIGURATION
-- ============================================================================

SELECT 'Permissions Configuration Validation' as section;

-- Check permissions data
SELECT 
  'Permissions Data' as test,
  COUNT(*) as total_permissions,
  string_agg(name::TEXT, ', ' ORDER BY name::TEXT) as available_permissions
FROM public.permissions;

-- Validate specific required permissions
SELECT 
  'Core Permissions Check' as test,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'time_logging'::permission_type) THEN '✅' ELSE '❌' END as time_logging,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'reports'::permission_type) THEN '✅' ELSE '❌' END as reports,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'resource_management'::permission_type) THEN '✅' ELSE '❌' END as resource_management,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'project_management'::permission_type) THEN '✅' ELSE '❌' END as project_management,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'user_management'::permission_type) THEN '✅' ELSE '❌' END as user_management,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'system_admin'::permission_type) THEN '✅' ELSE '❌' END as system_admin,
  CASE WHEN EXISTS (SELECT 1 FROM public.permissions WHERE name = 'settings'::permission_type) THEN '✅' ELSE '❌' END as settings;

-- ============================================================================
-- 4. VALIDATE ROLE-PERMISSION ASSIGNMENTS
-- ============================================================================

SELECT 'Role-Permission Assignments Validation' as section;

-- Check role-permission mappings
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count,
  string_agg(p.name::TEXT, ', ' ORDER BY p.name::TEXT) as assigned_permissions
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Validate admin role has all permissions
SELECT 
  'Admin Role Permissions Check' as test,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM public.role_permissions rp 
      JOIN public.roles r ON rp.role_id = r.id 
      WHERE r.name = 'admin'::user_role
    ) >= 10 THEN '✅ Admin has sufficient permissions'
    ELSE '❌ Admin missing permissions'
  END as admin_permissions_status;

-- ============================================================================
-- 5. VALIDATE USER PROFILES AND ASSIGNMENTS
-- ============================================================================

SELECT 'User Profiles and Assignments Validation' as section;

-- Check user profiles
SELECT 
  'User Profiles Summary' as test,
  COUNT(*) as total_user_profiles,
  COUNT(CASE WHEN is_active THEN 1 END) as active_profiles,
  COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_profiles
FROM public.user_profiles;

-- Check user role assignments
SELECT 
  'User Role Assignments Summary' as test,
  COUNT(*) as total_assignments,
  COUNT(CASE WHEN is_active THEN 1 END) as active_assignments,
  COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_assignments
FROM public.user_roles;

-- Check specific admin user
SELECT 
  'Admin User Check' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.user_roles ur ON up.id = ur.user_id
      JOIN public.roles r ON ur.role_id = r.id
      WHERE up.email = 'admin@swisssense.nl' 
      AND r.name = 'admin'::user_role 
      AND ur.is_active = true
    ) THEN '✅ Admin user properly configured'
    ELSE '❌ Admin user not properly configured'
  END as admin_user_status;

-- ============================================================================
-- 6. VALIDATE RBAC HELPER FUNCTIONS
-- ============================================================================

SELECT 'RBAC Helper Functions Validation' as section;

-- Check if functions exist
SELECT 
  'Function Existence Check' as test,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_permissions') THEN '✅' ELSE '❌' END as get_user_permissions,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_roles') THEN '✅' ELSE '❌' END as get_user_roles,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_permission') THEN '✅' ELSE '❌' END as has_permission,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN '✅' ELSE '❌' END as has_role;

-- Test functions with admin user
DO $$
DECLARE
  admin_user_id UUID;
  user_permissions TEXT[];
  user_roles TEXT[];
  has_admin_role BOOLEAN;
  has_user_mgmt BOOLEAN;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM public.user_profiles 
  WHERE email = 'admin@swisssense.nl';
  
  IF admin_user_id IS NOT NULL THEN
    -- Test get_user_permissions
    SELECT ARRAY(SELECT permission_name FROM public.get_user_permissions(admin_user_id)) INTO user_permissions;
    
    -- Test get_user_roles
    SELECT ARRAY(SELECT role_name FROM public.get_user_roles(admin_user_id)) INTO user_roles;
    
    -- Test has_role
    SELECT public.has_role(admin_user_id, 'admin') INTO has_admin_role;
    
    -- Test has_permission
    SELECT public.has_permission(admin_user_id, 'user_management') INTO has_user_mgmt;
    
    RAISE NOTICE 'RBAC Functions Test Results for admin@swisssense.nl:';
    RAISE NOTICE 'User ID: %', admin_user_id;
    RAISE NOTICE 'Permissions count: %', array_length(user_permissions, 1);
    RAISE NOTICE 'Roles count: %', array_length(user_roles, 1);
    RAISE NOTICE 'Has admin role: %', has_admin_role;
    RAISE NOTICE 'Has user_management permission: %', has_user_mgmt;
    
    IF array_length(user_permissions, 1) > 0 THEN
      RAISE NOTICE 'Permissions: %', array_to_string(user_permissions, ', ');
    END IF;
    
    IF array_length(user_roles, 1) > 0 THEN
      RAISE NOTICE 'Roles: %', array_to_string(user_roles, ', ');
    END IF;
    
    -- Validation summary
    IF has_admin_role AND has_user_mgmt AND array_length(user_permissions, 1) >= 10 THEN
      RAISE NOTICE '✅ RBAC Functions: All tests passed';
    ELSE
      RAISE NOTICE '❌ RBAC Functions: Some tests failed';
    END IF;
  ELSE
    RAISE NOTICE '❌ Admin user not found for function testing';
  END IF;
END $$;

-- ============================================================================
-- 7. VALIDATE DATA INTEGRITY
-- ============================================================================

SELECT 'Data Integrity Validation' as section;

-- Check for orphaned role assignments
SELECT 
  'Orphaned Role Assignments' as test,
  COUNT(*) as orphaned_count
FROM public.user_roles ur
LEFT JOIN public.user_profiles up ON ur.user_id = up.id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE up.id IS NULL OR r.id IS NULL;

-- Check for orphaned role permissions
SELECT 
  'Orphaned Role Permissions' as test,
  COUNT(*) as orphaned_count
FROM public.role_permissions rp
LEFT JOIN public.roles r ON rp.role_id = r.id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
WHERE r.id IS NULL OR p.id IS NULL;

-- Check for users without roles
SELECT 
  'Users Without Roles' as test,
  COUNT(*) as users_without_roles
FROM public.user_profiles up
LEFT JOIN public.user_roles ur ON up.id = ur.user_id AND ur.is_active = true
WHERE ur.user_id IS NULL AND up.is_active = true;

-- ============================================================================
-- 8. FINAL VALIDATION SUMMARY
-- ============================================================================

SELECT 'Final Validation Summary' as section;

-- Overall system health check
SELECT 
  'RBAC System Health' as test,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM public.roles) >= 3 AND
      (SELECT COUNT(*) FROM public.permissions) >= 10 AND
      (SELECT COUNT(*) FROM public.role_permissions) >= 15 AND
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_permissions') AND
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.user_roles ur ON up.id = ur.user_id
        JOIN public.roles r ON ur.role_id = r.id
        WHERE up.email = 'admin@swisssense.nl' 
        AND r.name = 'admin'::user_role 
        AND ur.is_active = true
      )
    ) THEN '✅ RBAC System: Healthy and fully configured'
    ELSE '❌ RBAC System: Configuration issues detected'
  END as system_status;

-- Recommendations
SELECT 
  'Recommendations' as section,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.user_profiles WHERE is_active = true) = 0 
    THEN '⚠️ No active users found - create user accounts'
    WHEN (SELECT COUNT(*) FROM public.user_roles WHERE is_active = true) = 0 
    THEN '⚠️ No active role assignments - assign roles to users'
    ELSE '✅ Basic user configuration looks good'
  END as user_recommendations;
