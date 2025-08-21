// Admin Password Reset Endpoint (Flattened for Vercel compatibility)
// POST /api/admin-reset-password?userId=123
// Generates a new secure password for a user (admin only)

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Password policy configuration
const PASSWORD_POLICY = {
  minLength: 16,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
  requireSpecialChar: false, // Keep simple for user experience
};

// Characters to exclude from password generation to avoid confusion
const AMBIGUOUS_CHARS = ['0', 'O', 'I', 'l', '1'];

/**
 * Generate a cryptographically secure random password
 */
function generateSecurePassword(policy = {}) {
  const finalPolicy = { ...PASSWORD_POLICY, ...policy };
  const maxAttempts = 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate 24 random bytes and convert to base64url
    const randomBytes = crypto.randomBytes(24);
    let password = randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Filter out ambiguous characters
    password = password
      .split('')
      .filter(char => !AMBIGUOUS_CHARS.includes(char))
      .join('');

    // Slice to exact length
    password = password.slice(0, finalPolicy.minLength);

    // Check if password meets policy requirements
    if (validatePasswordPolicy(password, finalPolicy)) {
      return password;
    }
  }

  // Fallback: if we can't generate a compliant password, create one manually
  return generateFallbackPassword(finalPolicy);
}

/**
 * Validate that a password meets the policy requirements
 */
function validatePasswordPolicy(password, policy) {
  if (password.length < policy.minLength) return false;
  if (policy.requireLowercase && !/[a-z]/.test(password)) return false;
  if (policy.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (policy.requireDigit && !/[0-9]/.test(password)) return false;
  if (policy.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return false;
  return true;
}

/**
 * Generate a fallback password that definitely meets policy requirements
 */
function generateFallbackPassword(policy) {
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  let remainingLength = policy.minLength;

  if (policy.requireLowercase) {
    password += getRandomChar(lowercase);
    remainingLength--;
  }
  if (policy.requireUppercase) {
    password += getRandomChar(uppercase);
    remainingLength--;
  }
  if (policy.requireDigit) {
    password += getRandomChar(digits);
    remainingLength--;
  }
  if (policy.requireSpecialChar) {
    password += getRandomChar(special);
    remainingLength--;
  }

  const allChars = lowercase + uppercase + digits + (policy.requireSpecialChar ? special : '');
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(allChars);
  }

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

function createPasswordResetAudit(adminUserId, targetUserId, ipAddress, userAgent) {
  return {
    id: crypto.randomBytes(16).toString('hex'),
    adminUserId,
    targetUserId,
    action: 'password_reset',
    ipAddress: ipAddress || 'unknown',
    userAgent: userAgent || 'unknown',
    timestamp: new Date(),
    success: true,
    details: {
      method: 'admin_reset',
      reason: 'admin_initiated'
    }
  };
}

// Main handler
const resetPasswordHandler = async (req, res, { user }) => {
  try {
    const { userId } = req.query;
    const targetUserId = parseInt(userId);
    const adminUserId = user.id;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    Logger.info('Admin password reset request', {
      adminUserId,
      targetUserId,
      ipAddress,
      userAgent: userAgent.substring(0, 100)
    });

    if (!targetUserId || isNaN(targetUserId)) {
      return createErrorResponse(res, 400, 'Valid userId parameter is required');
    }

    // Validate user exists
    const targetUser = await DatabaseService.getUser(targetUserId);
    if (!targetUser) {
      Logger.warn('Password reset failed - user not found', { targetUserId, adminUserId });
      return createErrorResponse(res, 404, 'User not found');
    }

    // Generate secure password
    const newPassword = generateSecurePassword();
    Logger.info('Generated secure password', { 
      targetUserId, 
      adminUserId,
      passwordLength: newPassword.length 
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await DatabaseService.updateUserPassword(targetUserId, hashedPassword);
    Logger.info('Password updated in database', { targetUserId, adminUserId });

    // Create audit log entry
    const auditData = createPasswordResetAudit(adminUserId, targetUserId, ipAddress, userAgent);
    await DatabaseService.createPasswordResetAudit(auditData);
    Logger.info('Password reset audit logged', { auditId: auditData.id, targetUserId, adminUserId });

    // Return success with the plaintext password (only for admin interface)
    return createSuccessResponse(res, {
      success: true,
      message: 'Password reset successfully',
      password: newPassword, // Only returned to admin
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.resource?.name || targetUser.email
      }
    });

  } catch (error) {
    Logger.error('Password reset error', {
      error: error.message,
      stack: error.stack,
      adminUserId: user?.id,
      targetUserId: req.query?.userId
    });

    return createErrorResponse(res, 500, 'Failed to reset password');
  }
};

// Export with middleware
module.exports = withMiddleware(resetPasswordHandler, {
  requireAuth: true,
  requirePermissions: ['user_management'], // Admin permission required
  allowedMethods: ['POST'],
  validateSchema: null,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 5 // 5 password resets per minute max
  }
});
