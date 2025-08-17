-- Create password reset audit table
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_audit (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id) NOT NULL,
    target_user_id INTEGER REFERENCES users(id) NOT NULL,
    reset_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_target_user 
ON password_reset_audit(target_user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_audit_admin_user 
ON password_reset_audit(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_audit_reset_at 
ON password_reset_audit(reset_at DESC);

-- Verify table creation
SELECT 'password_reset_audit table created successfully' as status;
