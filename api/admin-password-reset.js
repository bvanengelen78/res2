// Admin Password Reset Endpoint (Simplified for Vercel)
// POST /api/admin-password-reset?userId=123

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Password policy configuration
const PASSWORD_POLICY = {
  minLength: 16,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
  requireSpecialChar: false,
};

const AMBIGUOUS_CHARS = ['0', 'O', 'I', 'l', '1'];

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  // Ensure at least one of each required type
  password += getRandomChar('abcdefghijkmnpqrstuvwxyz'); // lowercase
  password += getRandomChar('ABCDEFGHJKLMNPQRSTUVWXYZ'); // uppercase  
  password += getRandomChar('23456789'); // digit
  
  // Fill remaining length
  for (let i = 3; i < 16; i++) {
    password += getRandomChar(chars);
  }
  
  // Shuffle the password
  return shuffleString(password);
}

function getRandomChar(chars) {
  const randomIndex = crypto.randomBytes(1)[0] % chars.length;
  return chars[randomIndex];
}

function shuffleString(str) {
  const chars = str.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const randomIndex = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[randomIndex]] = [chars[randomIndex], chars[i]];
  }
  return chars.join('');
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get user from database
async function getUser(userId) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      resources (
        id,
        name,
        email,
        role,
        department
      )
    `)
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

// Update user password
async function updateUserPassword(userId, hashedPassword) {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);

  return !error;
}

// Create audit log
async function createPasswordResetAudit(auditData) {
  if (!supabase) return true; // Skip if no database
  
  const { error } = await supabase
    .from('password_reset_audit')
    .insert({
      id: auditData.id,
      admin_user_id: auditData.adminUserId,
      target_user_id: auditData.targetUserId,
      action: auditData.action,
      ip_address: auditData.ipAddress,
      user_agent: auditData.userAgent,
      timestamp: auditData.timestamp.toISOString(),
      success: auditData.success,
      details: auditData.details
    });

  return !error;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: true,
      message: `Method ${req.method} not allowed`,
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: 'Authorization header required',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.user) {
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    const user = decoded.user;
    
    // Check if user has admin permissions (simplified check)
    if (!user.permissions || !user.permissions.includes('user_management')) {
      return res.status(403).json({
        error: true,
        message: 'Insufficient permissions for password reset',
        timestamp: new Date().toISOString()
      });
    }

    // Get target user ID from query
    const { userId } = req.query;
    const targetUserId = parseInt(userId);
    
    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({
        error: true,
        message: 'Valid userId parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[ADMIN_PASSWORD_RESET] Request from admin ${user.id} for user ${targetUserId}`);

    // Validate target user exists
    const targetUser = await getUser(targetUserId);
    if (!targetUser) {
      console.log(`[ADMIN_PASSWORD_RESET] User ${targetUserId} not found`);
      return res.status(404).json({
        error: true,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure password
    const newPassword = generateSecurePassword();
    console.log(`[ADMIN_PASSWORD_RESET] Generated password for user ${targetUserId}`);

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const updateSuccess = await updateUserPassword(targetUserId, hashedPassword);
    if (!updateSuccess) {
      console.error(`[ADMIN_PASSWORD_RESET] Failed to update password for user ${targetUserId}`);
      return res.status(500).json({
        error: true,
        message: 'Failed to update password in database',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[ADMIN_PASSWORD_RESET] Password updated for user ${targetUserId}`);

    // Create audit log entry
    const auditData = {
      id: crypto.randomBytes(16).toString('hex'),
      adminUserId: user.id,
      targetUserId,
      action: 'password_reset',
      ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      success: true,
      details: {
        method: 'admin_reset',
        reason: 'admin_initiated'
      }
    };

    await createPasswordResetAudit(auditData);
    console.log(`[ADMIN_PASSWORD_RESET] Audit logged for user ${targetUserId}`);

    // Return success with the plaintext password
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      password: newPassword, // Only returned to admin
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.resources?.name || targetUser.email
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ADMIN_PASSWORD_RESET] Error:', error);
    return res.status(500).json({
      error: true,
      message: 'Internal server error',
      debug: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
