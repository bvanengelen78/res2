-- Verification script for ResourceFlow database migration
-- Run this in Supabase SQL Editor after running the main migration

-- Check if all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'departments',
        'ogsm_charters', 
        'resources',
        'projects',
        'resource_allocations',
        'time_off',
        'time_entries',
        'weekly_submissions',
        'notification_settings',
        'users',
        'user_sessions',
        'password_reset_tokens',
        'user_roles'
    )
ORDER BY tablename;

-- Check table counts (should show 0 for new tables, except those with default data)
SELECT 'departments' as table_name, COUNT(*) as row_count FROM departments
UNION ALL
SELECT 'ogsm_charters', COUNT(*) FROM ogsm_charters
UNION ALL
SELECT 'notification_settings', COUNT(*) FROM notification_settings
UNION ALL
SELECT 'resources', COUNT(*) FROM resources
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Check if indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN (
        'resources', 'projects', 'time_entries', 
        'weekly_submissions', 'user_sessions', 'user_roles'
    )
ORDER BY tablename, indexname;
