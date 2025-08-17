import * as crypto from 'crypto';
import type { InsertPasswordResetAudit } from '@shared/schema';

/**
 * Password policy configuration
 */
interface PasswordPolicy {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireDigit: boolean;
  requireSpecialChar: boolean;
}

/**
 * Default password policy
 */
const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 16,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
  requireSpecialChar: false, // Keep simple for user experience
};

/**
 * Characters to exclude from password generation to avoid confusion
 */
const AMBIGUOUS_CHARS = ['0', 'O', 'I', 'l', '1'];

/**
 * Generate a cryptographically secure random password
 * Uses crypto.randomBytes for secure random generation
 * Filters out ambiguous characters and enforces password policy
 * 
 * @param policy - Password policy to enforce (optional, uses default if not provided)
 * @returns Generated password that meets the policy requirements
 */
export function generateSecurePassword(policy: Partial<PasswordPolicy> = {}): string {
  const finalPolicy = { ...DEFAULT_POLICY, ...policy };
  const maxAttempts = 100; // Prevent infinite loops
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate 24 random bytes and convert to base64url
    const randomBytes = crypto.randomBytes(24);
    let password = randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, ''); // Remove padding

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
 * Validate if a password meets the policy requirements
 */
function validatePasswordPolicy(password: string, policy: PasswordPolicy): boolean {
  if (password.length < policy.minLength) {
    return false;
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  if (policy.requireDigit && !/[0-9]/.test(password)) {
    return false;
  }

  if (policy.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Generate a fallback password that definitely meets policy requirements
 * Used when random generation fails to meet policy after multiple attempts
 */
function generateFallbackPassword(policy: PasswordPolicy): string {
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Exclude ambiguous chars
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars
  const digits = '23456789'; // Exclude ambiguous chars
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  let remainingLength = policy.minLength;

  // Ensure at least one character from each required category
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

  // Fill remaining length with random characters from all allowed categories
  const allChars = lowercase + uppercase + digits + (policy.requireSpecialChar ? special : '');
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

/**
 * Get a random character from a string using crypto.randomBytes
 */
function getRandomChar(chars: string): string {
  const randomIndex = crypto.randomBytes(1)[0] % chars.length;
  return chars[randomIndex];
}

/**
 * Shuffle a string using Fisher-Yates algorithm with crypto.randomBytes
 */
function shuffleString(str: string): string {
  const chars = str.split('');
  
  for (let i = chars.length - 1; i > 0; i--) {
    const randomIndex = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[randomIndex]] = [chars[randomIndex], chars[i]];
  }
  
  return chars.join('');
}

/**
 * Create audit log entry for password reset
 * Returns InsertPasswordResetAudit type from schema
 */
export function createPasswordResetAudit(
  adminUserId: number,
  targetUserId: number,
  ipAddress?: string,
  userAgent?: string
): InsertPasswordResetAudit {
  return {
    adminUserId,
    targetUserId,
    ipAddress,
    userAgent,
  };
}
