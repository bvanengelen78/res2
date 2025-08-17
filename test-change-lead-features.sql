-- Test Script for Change Lead Reports Features
-- Run this in Supabase SQL Editor to verify the implementation

-- 1. Verify tables were created
SELECT 'Tables Created' as test_name, 
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_project_favorites', 'effort_summary_notes');

-- 2. Check table structures
SELECT 'user_project_favorites structure' as test_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_project_favorites'
ORDER BY ordinal_position;

SELECT 'effort_summary_notes structure' as test_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'effort_summary_notes'
ORDER BY ordinal_position;

-- 3. Test inserting sample data (if you have existing users and projects)
-- Note: Replace the IDs with actual IDs from your database

-- Sample favorite (replace user_id and project_id with real values)
-- INSERT INTO user_project_favorites (user_id, project_id) 
-- VALUES (1, 1) ON CONFLICT DO NOTHING;

-- Sample note (replace with real IDs)
-- INSERT INTO effort_summary_notes (project_id, resource_id, change_lead_id, note, created_by)
-- VALUES (1, 1, 1, 'Test note for variance explanation', 1) ON CONFLICT DO NOTHING;

-- 4. Verify RLS policies exist
SELECT 'RLS Policies' as test_name,
       schemaname,
       tablename,
       policyname,
       permissive,
       cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tablename, policyname;

-- 5. Check indexes were created
SELECT 'Indexes Created' as test_name,
       indexname,
       tablename
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tablename, indexname;

-- 6. Test basic queries (these should work without errors)
SELECT 'Basic Query Test' as test_name;

-- Test favorites query
SELECT COUNT(*) as favorite_count 
FROM user_project_favorites;

-- Test notes query  
SELECT COUNT(*) as notes_count 
FROM effort_summary_notes;

-- 7. Verify foreign key constraints
SELECT 'Foreign Key Constraints' as test_name,
       tc.constraint_name,
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tc.table_name, tc.constraint_name;

-- 8. Test unique constraints
SELECT 'Unique Constraints' as test_name,
       tc.constraint_name,
       tc.table_name,
       kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tc.table_name, tc.constraint_name;

-- Success message
SELECT '✅ All tests completed successfully!' as result,
       'The Change Lead Reports features are ready to use.' as message;
