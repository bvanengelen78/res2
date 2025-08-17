-- ResourceFlow Database Migration for Supabase
-- Run this script in your Supabase SQL editor to create all necessary tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create OGSM charters table
CREATE TABLE IF NOT EXISTS ogsm_charters (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'IT Architecture & Delivery',
    roles JSONB DEFAULT '[]'::jsonb,
    skills JSONB,
    weekly_capacity DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL DEFAULT 'medium',
    type TEXT NOT NULL DEFAULT 'business',
    director_id INTEGER REFERENCES resources(id),
    change_lead_id INTEGER REFERENCES resources(id),
    business_lead_id INTEGER REFERENCES resources(id),
    ogsm_charter TEXT,
    stream TEXT,
    estimated_hours DECIMAL(6,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create resource allocations table
CREATE TABLE IF NOT EXISTS resource_allocations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    allocated_hours DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    weekly_allocations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create time off table
CREATE TABLE IF NOT EXISTS time_off (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create time entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    allocation_id INTEGER NOT NULL REFERENCES resource_allocations(id),
    week_start_date DATE NOT NULL,
    monday_hours DECIMAL(4,2) DEFAULT 0.00,
    tuesday_hours DECIMAL(4,2) DEFAULT 0.00,
    wednesday_hours DECIMAL(4,2) DEFAULT 0.00,
    thursday_hours DECIMAL(4,2) DEFAULT 0.00,
    friday_hours DECIMAL(4,2) DEFAULT 0.00,
    saturday_hours DECIMAL(4,2) DEFAULT 0.00,
    sunday_hours DECIMAL(4,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create weekly submissions table
CREATE TABLE IF NOT EXISTS weekly_submissions (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    week_start_date DATE NOT NULL,
    submitted_at TIMESTAMP,
    is_submitted BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    total_hours DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'weekly_reminder',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_day INTEGER NOT NULL DEFAULT 5,
    reminder_time TEXT NOT NULL DEFAULT '16:00',
    email_subject TEXT NOT NULL DEFAULT 'Weekly Time Log Reminder',
    email_template TEXT NOT NULL DEFAULT 'Hi [Name], please remember to submit your hours for Week [WeekNumber]. Click here to complete your log: [Link].',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Authentication and user management tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    resource_id INTEGER REFERENCES resources(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    resource_id INTEGER REFERENCES resources(id),
    token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used BOOLEAN DEFAULT false
);

-- Password reset audit log table
CREATE TABLE IF NOT EXISTS password_reset_audit (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id) NOT NULL,
    target_user_id INTEGER REFERENCES users(id) NOT NULL,
    reset_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    resource_id INTEGER REFERENCES resources(id),
    role VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id)
);

-- Create unique index for user roles
CREATE UNIQUE INDEX IF NOT EXISTS user_resource_role_idx ON user_roles(user_id, resource_id, role);

-- Insert default notification settings
INSERT INTO notification_settings (type, is_enabled, reminder_day, reminder_time, email_subject, email_template)
VALUES (
    'weekly_reminder',
    true,
    5,
    '16:00',
    'Weekly Time Log Reminder',
    'Hi [Name], please remember to submit your hours for Week [WeekNumber]. Click here to complete your log: [Link].'
) ON CONFLICT DO NOTHING;

-- Insert default OGSM charters
INSERT INTO ogsm_charters (name, description) VALUES
    ('More Future Value', 'Focus on creating more future value for the organization'),
    ('Data Fundament', 'Building strong data foundations'),
    ('Efficient Operating Organization', 'Creating more efficient operational processes'),
    ('Service Cost Improvements', 'Improving service delivery while reducing costs'),
    ('Rationalized IT Landscape', 'Simplifying and optimizing the IT landscape'),
    ('Sustainability', 'Focus on sustainable business practices')
ON CONFLICT DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, description) VALUES
    ('IT Architecture & Delivery', 'Information Technology Architecture and Delivery'),
    ('Business Operations', 'Business Operations and Management'),
    ('Finance', 'Financial Management and Control'),
    ('Human Resources', 'Human Resources and People Management')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_email ON resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_resource_week ON time_entries(resource_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_submissions_resource_week ON weekly_submissions(resource_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_submissions ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create RLS policies based on your specific security requirements
-- This is a basic setup - you should customize the policies according to your role-based access needs
