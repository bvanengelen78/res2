-- Change Lead Reports Features Migration
-- Run this script in your Supabase SQL editor to add support for:
-- 1. Project favorites
-- 2. Effort summary notes
-- 3. Enhanced Change Lead Reports functionality

-- Create user project favorites table
CREATE TABLE IF NOT EXISTS user_project_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Create effort summary notes table
CREATE TABLE IF NOT EXISTS effort_summary_notes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    change_lead_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, resource_id, change_lead_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_project_favorites_user_id ON user_project_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_favorites_project_id ON user_project_favorites(project_id);
CREATE INDEX IF NOT EXISTS idx_effort_summary_notes_project_resource ON effort_summary_notes(project_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_effort_summary_notes_change_lead ON effort_summary_notes(change_lead_id);
CREATE INDEX IF NOT EXISTS idx_effort_summary_notes_created_by ON effort_summary_notes(created_by);

-- Enable Row Level Security (RLS) for the new tables
ALTER TABLE user_project_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE effort_summary_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_project_favorites
-- Users can only manage their own favorites
CREATE POLICY "Users can view their own favorites" ON user_project_favorites
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own favorites" ON user_project_favorites
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own favorites" ON user_project_favorites
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for effort_summary_notes
-- Change leads can manage notes for their projects
-- Users can view notes for projects they have access to
CREATE POLICY "Change leads can manage effort notes" ON effort_summary_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = effort_summary_notes.project_id 
            AND p.change_lead_id IN (
                SELECT resource_id FROM users WHERE id = auth.uid()::integer
            )
        )
    );

CREATE POLICY "Users can view effort notes for accessible projects" ON effort_summary_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resource_allocations ra
            JOIN users u ON u.resource_id = ra.resource_id
            WHERE ra.project_id = effort_summary_notes.project_id
            AND u.id = auth.uid()::integer
        )
        OR
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = effort_summary_notes.project_id 
            AND (
                p.change_lead_id IN (SELECT resource_id FROM users WHERE id = auth.uid()::integer)
                OR p.director_id IN (SELECT resource_id FROM users WHERE id = auth.uid()::integer)
                OR p.business_lead_id IN (SELECT resource_id FROM users WHERE id = auth.uid()::integer)
            )
        )
    );

-- Verification queries
-- Check if tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tablename;

-- Check if indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tablename, indexname;

-- Check if RLS policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('user_project_favorites', 'effort_summary_notes')
ORDER BY tablename, policyname;
