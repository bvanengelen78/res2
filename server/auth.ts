import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import type { User, UserWithRoles, InsertUser, InsertUserSession, InsertUserRole, InsertPasswordResetToken, RoleType, PermissionType } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  resourceId?: number;
}

export interface AuthResult {
  user: UserWithRoles;
  tokens: AuthTokens;
}

export class AuthService {
  
  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(credentials.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(credentials.password, 12);

    // Create user
    const newUser: InsertUser = {
      email: credentials.email,
      password: hashedPassword,
      resourceId: credentials.resourceId || null,
      isActive: true,
      emailVerified: false,
    };

    const user = await storage.createUser(newUser);

    // Assign default role (regular_user)
    await storage.createUserRole({
      userId: user.id,
      resourceId: credentials.resourceId || null,
      role: 'regular_user',
      assignedBy: null,
    });

    // Get user with roles
    const userWithRoles = await storage.getUserWithRoles(user.id);
    if (!userWithRoles) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    const tokens = await this.generateTokens(userWithRoles);

    return {
      user: userWithRoles,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await storage.updateUser(user.id, {
        lastLogin: new Date(),
      });

      // Get user with roles
      const userWithRoles = await storage.getUserWithRoles(user.id);
      if (!userWithRoles) {
        throw new Error('Failed to get user data');
      }

      // Generate tokens
      const tokens = await this.generateTokens(userWithRoles, credentials.rememberMe);

      return {
        user: userWithRoles,
        tokens,
      };
    } catch (error) {
      // Check if this is a database connection error
      if (error instanceof Error && error.message.includes('Database connection failed')) {
        console.error('Database connection error during login:', error.message);
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      // Re-throw authentication errors as-is
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      // Get session
      const session = await storage.getUserSession(decoded.sessionId);
      if (!session || session.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await storage.deleteUserSession(session.id);
        throw new Error('Session expired');
      }

      // Get user with roles
      const userWithRoles = await storage.getUserWithRoles(session.userId);
      if (!userWithRoles) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(userWithRoles, false, session.id);

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<void> {
    await storage.deleteUserSession(sessionId);
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: number): Promise<void> {
    await storage.deleteUserSessions(userId);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<UserWithRoles> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const userWithRoles = await storage.getUserWithRoles(decoded.userId);
      if (!userWithRoles) {
        throw new Error('User not found');
      }

      return userWithRoles;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: UserWithRoles, rememberMe = false, existingSessionId?: string): Promise<AuthTokens> {
    const sessionId = existingSessionId || nanoid();
    const expiresInMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000; // 30 days or 15 minutes
    const refreshExpiresInMs = rememberMe ? 90 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 90 days or 7 days
    
    const expiresAt = new Date(Date.now() + expiresInMs);
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresInMs);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
        email: user.email,
        roles: user.roles.map(r => r.role),
        permissions: user.permissions,
      },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
        type: 'refresh',
      },
      JWT_REFRESH_SECRET,
      { expiresIn: rememberMe ? '90d' : JWT_REFRESH_EXPIRES_IN }
    );

    // Store session
    const sessionData: InsertUserSession = {
      id: sessionId,
      userId: user.id,
      resourceId: user.resourceId,
      token: accessToken,
      refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: null,
      userAgent: null,
    };

    if (existingSessionId) {
      await storage.updateUserSession(sessionId, sessionData);
    } else {
      await storage.createUserSession(sessionData);
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await storage.createPasswordResetToken({
      id: nanoid(),
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    return token;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) {
      throw new Error('Invalid reset token');
    }

    if (resetToken.used) {
      throw new Error('Reset token has already been used');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await storage.updateUser(resetToken.userId, {
      password: hashedPassword,
    });

    // Mark token as used
    await storage.usePasswordResetToken(resetToken.id);

    // Logout all sessions for security
    await this.logoutAll(resetToken.userId);
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions: PermissionType[], requiredPermission: PermissionType): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userPermissions: PermissionType[], requiredPermissions: PermissionType[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has role
   */
  hasRole(userRoles: RoleType[], requiredRole: RoleType): boolean {
    return userRoles.includes(requiredRole);
  }

  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(userRoles: RoleType[], requiredRoles: RoleType[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: number, role: RoleType, resourceId?: number, assignedBy?: number): Promise<void> {
    const existingRoles = await storage.getUserRoles(userId);
    const hasRole = existingRoles.some(r => r.role === role && r.resourceId === resourceId);
    
    if (!hasRole) {
      await storage.createUserRole({
        userId,
        resourceId: resourceId || null,
        role,
        assignedBy: assignedBy || null,
      });
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: number, role: RoleType, resourceId?: number): Promise<void> {
    const existingRoles = await storage.getUserRoles(userId);
    const roleToRemove = existingRoles.find(r => r.role === role && r.resourceId === resourceId);
    
    if (roleToRemove) {
      await storage.deleteUserRole(roleToRemove.id);
    }
  }

  /**
   * Get permissions for a specific role
   */
  getPermissionsForRole(role: RoleType): PermissionType[] {
    // Check if there are custom permissions stored for this role
    const customPermissions = this.customRolePermissions.get(role);
    if (customPermissions) {
      return customPermissions;
    }

    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(role: RoleType, permissions: PermissionType[]): Promise<void> {
    // Store custom permissions for this role
    this.customRolePermissions.set(role, permissions);
    
    // In a real implementation, you would save this to the database
    // For now, we'll keep it in memory
  }

  // Store custom role permissions in memory (in production, this would be in the database)
  private customRolePermissions = new Map<RoleType, PermissionType[]>();
}

export const authService = new AuthService();