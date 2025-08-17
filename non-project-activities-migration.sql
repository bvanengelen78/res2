-- Migration: Add non_project_activities table for per-resource capacity tracking
-- Date: 2025-07-16
-- Description: Creates a new table to store non-project activities (meetings, admin, training, etc.) 
--              per resource instead of using global values, enabling accurate capacity calculations.

-- Create the non_project_activities table
CREATE TABLE IF NOT EXISTS non_project_activities (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('Meetings', 'Administration', 'Training', 'Support', 'Other')),
    hours_per_week DECIMAL(4,2) NOT NULL CHECK (hours_per_week >= 0 AND hours_per_week <= 40),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_non_project_activities_resource_id ON non_project_activities(resource_id);
CREATE INDEX IF NOT EXISTS idx_non_project_activities_active ON non_project_activities(is_active);
CREATE INDEX IF NOT EXISTS idx_non_project_activities_resource_active ON non_project_activities(resource_id, is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE non_project_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all non-project activities (for reporting and management)
CREATE POLICY "Users can view all non-project activities" ON non_project_activities
    FOR SELECT USING (true);

-- Policy: Users can insert non-project activities for any resource (managers need this)
CREATE POLICY "Users can insert non-project activities" ON non_project_activities
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update non-project activities for any resource (managers need this)
CREATE POLICY "Users can update non-project activities" ON non_project_activities
    FOR UPDATE USING (true);

-- Policy: Users can delete non-project activities for any resource (managers need this)
CREATE POLICY "Users can delete non-project activities" ON non_project_activities
    FOR DELETE USING (true);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_non_project_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_non_project_activities_updated_at
    BEFORE UPDATE ON non_project_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_non_project_activities_updated_at();

-- Insert some sample data for existing resources (optional - can be removed if not needed)
-- This provides a starting point with common non-project activities

-- Sample data for resource ID 16 (Boyan Kamphaus) - matching the screenshot
INSERT INTO non_project_activities (resource_id, activity_type, hours_per_week, description) VALUES
(16, 'Meetings', 6, 'Team meetings, stand-ups, reviews'),
(16, 'Administration', 2, 'Time tracking, admin tasks')
ON CONFLICT DO NOTHING;

-- You can add more sample data for other resources as needed
-- Example for other resources:
-- INSERT INTO non_project_activities (resource_id, activity_type, hours_per_week, description) VALUES
-- (2, 'Meetings', 4, 'Weekly team meetings'),
-- (2, 'Administration', 1, 'Administrative tasks'),
-- (3, 'Training', 3, 'Professional development'),
-- (3, 'Meetings', 5, 'Client and team meetings')
-- ON CONFLICT DO NOTHING;

-- Verify the migration
SELECT 
    r.name as resource_name,
    npa.activity_type,
    npa.hours_per_week,
    npa.description,
    npa.is_active
FROM non_project_activities npa
JOIN resources r ON r.id = npa.resource_id
WHERE npa.is_active = true
ORDER BY r.name, npa.activity_type;

-- Migration completed successfully
-- Next steps:
-- 1. Update API endpoints to use resource-specific queries
-- 2. Refactor frontend components to use per-resource data
-- 3. Test the new functionality with multiple resources
