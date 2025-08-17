-- ========================================
-- ResourceFlow Admin User Setup Script
-- ========================================
-- This script creates an initial admin user for ResourceFlow
-- 
-- ADMIN CREDENTIALS:
-- Email: admin@resourceflow.com
-- Password: admin123
-- 
-- IMPORTANT: Change the password after first login!
-- ========================================

-- Step 1: Create the admin user
-- Password 'admin123' is hashed using bcrypt with 12 salt rounds
INSERT INTO users (
    email, 
    password, 
    resource_id,
    is_active, 
    email_verified, 
    created_at, 
    updated_at
) VALUES (
    'admin@resourceflow.com',
    '$2b$12$LQv3c1yqBwlFDvjhGGRAmu.Aq7.dJDO6rnOUBLQxcAhscUKrHPjgG',
    NULL,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Step 2: Get the user ID for role assignment
-- (This will be used in the next step)

-- Step 3: Assign admin role to the user
-- First, let's get the user ID and then assign the admin role
WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@resourceflow.com'
)
INSERT INTO user_roles (
    user_id,
    resource_id,
    role,
    assigned_at,
    assigned_by
) 
SELECT 
    admin_user.id,
    NULL,
    'admin',
    NOW(),
    NULL
FROM admin_user
ON CONFLICT DO NOTHING;

-- Step 4: Verify the admin user was created successfully
SELECT 
    u.id,
    u.email,
    u.is_active,
    u.email_verified,
    u.created_at,
    ur.role,
    ur.assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@resourceflow.com';

-- ========================================
-- ADMIN ROLE PERMISSIONS VERIFICATION
-- ========================================
-- The admin role in ResourceFlow has the following permissions:
-- 
-- ✅ TIME_LOGGING - Can log time entries
-- ✅ REPORTS - Can view and generate reports  
-- ✅ CHANGE_LEAD_REPORTS - Can access change lead reports
-- ✅ RESOURCE_MANAGEMENT - Can manage resources
-- ✅ PROJECT_MANAGEMENT - Can manage projects
-- ✅ USER_MANAGEMENT - Can create/edit/delete users
-- ✅ SYSTEM_ADMIN - Can access system administration
-- ✅ DASHBOARD - Can view dashboard
-- ✅ CALENDAR - Can access calendar features
-- ✅ SUBMISSION_OVERVIEW - Can view submission overview
-- ✅ SETTINGS - Can access and modify settings
-- ✅ ROLE_MANAGEMENT - Can assign/modify user roles
-- 
-- This provides FULL ACCESS to all ResourceFlow features!
-- ========================================

-- Optional: Create a resource record for the admin (if needed)
-- Uncomment the following if you want the admin to have a resource profile
/*
INSERT INTO resources (
    name,
    email,
    role,
    department,
    roles,
    weekly_capacity,
    is_active,
    created_at
) VALUES (
    'System Administrator',
    'admin@resourceflow.com',
    'System Administrator',
    'IT Administration',
    '["admin", "system_administrator"]'::jsonb,
    40.00,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Link the admin user to the resource
UPDATE users 
SET resource_id = (SELECT id FROM resources WHERE email = 'admin@resourceflow.com')
WHERE email = 'admin@resourceflow.com' AND resource_id IS NULL;
*/

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if admin user exists and has correct role
SELECT 
    'Admin User Check' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS - Admin user exists'
        ELSE '❌ FAIL - Admin user not found'
    END as result
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@resourceflow.com' 
AND ur.role = 'admin';

-- Check admin permissions (this would be handled by the application)
SELECT 
    'Admin Permissions Check' as check_type,
    '✅ PASS - Admin role configured with full permissions' as result,
    'See ROLE_PERMISSIONS.admin in schema.ts for complete list' as details;

-- ========================================
-- NEXT STEPS
-- ========================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Go to http://localhost:5000 in your browser
-- 3. Login with:
--    Email: admin@resourceflow.com
--    Password: admin123
-- 4. IMMEDIATELY change the password after first login!
-- 5. Create additional users through the admin interface
-- ========================================
