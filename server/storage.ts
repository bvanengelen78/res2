import {
  users, userSessions, userRoles, passwordResetTokens, passwordResetAudit,
  resources, projects, resourceAllocations, timeOff, nonProjectActivities, timeEntries, weeklySubmissions,
  ogsmCharters, departments, notificationSettings,
  type User, type InsertUser, type UserSession, type InsertUserSession,
  type UserRole, type InsertUserRole, type PasswordResetToken, type InsertPasswordResetToken,
  type PasswordResetAudit, type InsertPasswordResetAudit,
  type UserWithRoles, type RoleType, type PermissionType, ROLE_PERMISSIONS,
  type Resource, type InsertResource, type ResourceWithAllocations,
  type Project, type InsertProject, type ProjectWithAllocations,
  type ResourceAllocation, type InsertResourceAllocation,
  type TimeOff, type InsertTimeOff,
  type NonProjectActivity, type InsertNonProjectActivity,
  type TimeEntry, type InsertTimeEntry,
  type WeeklySubmission, type InsertWeeklySubmission,
  type OgsmCharter, type InsertOgsmCharter,
  type Department, type InsertDepartment,
  type NotificationSettings, type InsertNotificationSettings
} from "@shared/schema";
import { db, supabaseAdmin } from "./supabase";
import { eq, and, or, gte, lte, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { format } from "date-fns";

// Utility functions for Supabase client operations
class SupabaseUtils {
  // Convert camelCase to snake_case for database fields
  static toSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toSnakeCase(item));

    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      converted[snakeKey] = this.toSnakeCase(value);
    }
    return converted;
  }

  // Convert snake_case to camelCase for TypeScript objects
  static toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toCamelCase(item));

    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      converted[camelKey] = this.toCamelCase(value);
    }
    return converted;
  }

  // Convert dates to ISO strings for Supabase
  static prepareDates(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.prepareDates(item));

    const prepared: any = {};
    for (const [key, value] of Object.entries(obj)) {
      prepared[key] = this.prepareDates(value);
    }
    return prepared;
  }

  // Convert ISO strings back to Date objects
  static parseDates(obj: any, dateFields: string[] = []): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.parseDates(item, dateFields));

    const parsed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (dateFields.includes(key) && typeof value === 'string') {
        parsed[key] = new Date(value);
      } else {
        parsed[key] = value;
      }
    }
    return parsed;
  }

  // Handle Supabase errors consistently
  static handleError(error: any, operation: string): never {
    console.error(`Error in ${operation}:`, error);
    if (error.code === 'PGRST116') {
      throw new Error(`No records found for ${operation}`);
    }
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }
}

export interface IStorage {
  // Health check methods
  testConnection(): Promise<{ data?: any; error?: any }>;

  // Authentication methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithRoles(id: number): Promise<UserWithRoles | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User>;
  
  // User session methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(id: string): Promise<UserSession | undefined>;
  updateUserSession(id: string, session: Partial<InsertUserSession>): Promise<UserSession>;
  deleteUserSession(id: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;
  
  // User role methods
  getUserRoles(userId: number): Promise<UserRole[]>;
  createUserRole(role: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: number, role: Partial<InsertUserRole>): Promise<UserRole>;
  deleteUserRole(id: number): Promise<void>;
  
  // Role management methods
  getAllRoles(): Promise<{ role: RoleType; permissions: PermissionType[] }[]>;
  getAllUsersWithRoles(): Promise<UserWithRoles[]>;
  deleteUserRoleByUserAndRole(userId: number, role: RoleType, resourceId?: number): Promise<void>;
  
  // Password reset methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  usePasswordResetToken(id: string): Promise<void>;

  // Password reset audit methods
  createPasswordResetAudit(audit: InsertPasswordResetAudit): Promise<PasswordResetAudit>;
  getPasswordResetAuditForUser(userId: number): Promise<PasswordResetAudit[]>;

  // Resource methods
  getResources(): Promise<Resource[]>;
  getResource(id: number): Promise<Resource | undefined>;
  getResourceWithAllocations(id: number): Promise<ResourceWithAllocations | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithAllocations(id: number): Promise<ProjectWithAllocations | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Resource allocation methods
  getResourceAllocations(): Promise<ResourceAllocation[]>;
  getResourceAllocation(id: number): Promise<ResourceAllocation | undefined>;
  getResourceAllocationsByProject(projectId: number): Promise<(ResourceAllocation & { resource: Resource })[]>;
  getResourceAllocationsByResource(resourceId: number): Promise<(ResourceAllocation & { project: Project })[]>;
  getResourceAllocationsByDateRange(startDate: string, endDate: string): Promise<ResourceAllocation[]>;
  createResourceAllocation(allocation: InsertResourceAllocation): Promise<ResourceAllocation>;
  updateResourceAllocation(id: number, allocation: Partial<InsertResourceAllocation>): Promise<ResourceAllocation>;
  deleteResourceAllocation(id: number): Promise<void>;
  updateWeeklyAllocation(projectId: number, resourceId: number, weekKey: string, hours: number): Promise<any>;

  // Time off methods
  getTimeOff(): Promise<TimeOff[]>;
  getTimeOffByResource(resourceId: number): Promise<TimeOff[]>;
  getTimeOffByDateRange(startDate: string, endDate: string): Promise<TimeOff[]>;
  createTimeOff(timeOff: InsertTimeOff): Promise<TimeOff>;
  updateTimeOff(id: number, timeOff: Partial<InsertTimeOff>): Promise<TimeOff>;
  deleteTimeOff(id: number): Promise<void>;

  // Non-project activities methods
  getNonProjectActivities(): Promise<NonProjectActivity[]>;
  getNonProjectActivitiesByResource(resourceId: number): Promise<NonProjectActivity[]>;
  createNonProjectActivity(activity: InsertNonProjectActivity): Promise<NonProjectActivity>;
  updateNonProjectActivity(id: number, activity: Partial<InsertNonProjectActivity>): Promise<NonProjectActivity>;
  deleteNonProjectActivity(id: number): Promise<void>;

  // Time entry methods
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesByResource(resourceId: number): Promise<(TimeEntry & { allocation: ResourceAllocation & { project: Project } })[]>;
  getTimeEntriesByWeek(resourceId: number, weekStartDate: string): Promise<(TimeEntry & { allocation: ResourceAllocation & { project: Project } })[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: number): Promise<void>;

  // Weekly submission methods
  getWeeklySubmissions(): Promise<WeeklySubmission[]>;
  getWeeklySubmission(id: number): Promise<WeeklySubmission | undefined>;
  getWeeklySubmissionByResourceAndWeek(resourceId: number, weekStartDate: string): Promise<WeeklySubmission | undefined>;
  getWeeklySubmissionsByResource(resourceId: number): Promise<WeeklySubmission[]>;
  getPendingSubmissions(): Promise<WeeklySubmission[]>;
  createWeeklySubmission(submission: InsertWeeklySubmission): Promise<WeeklySubmission>;
  updateWeeklySubmission(id: number, submission: Partial<InsertWeeklySubmission>): Promise<WeeklySubmission>;
  deleteWeeklySubmission(id: number): Promise<void>;

  // Change Lead Reporting methods
  getProjectsByChangeLead(changeLeadId: number): Promise<(Project & { changeLead: Resource })[]>;
  getProjectEffortReport(projectId: number): Promise<any[]>;
  getChangeLeadEffortSummary(changeLeadId: number, startDate?: string, endDate?: string): Promise<any[]>;
  
  // Change Effort Report methods
  getChangeEffortReport(startDate: string, endDate: string, projectId?: number): Promise<any[]>;
  
  // Business Controller Report methods
  getBusinessControllerReport(startDate: string, endDate: string, showOnlyActive?: boolean): Promise<any[]>;

  // Change Allocation Report methods
  getChangeAllocationReport(startDate: string, endDate: string, projectIds?: number[], resourceIds?: number[], groupBy?: string): Promise<any[]>;

  // Reports Dashboard methods
  getUtilizationTrend(startDate: string, endDate: string): Promise<any[]>;
  getProjectDistribution(startDate: string, endDate: string): Promise<any[]>;
  getRecentReports(userId?: number): Promise<any[]>;
  addRecentReport(reportName: string, reportType: string, generatedBy: number, size: string, criteria?: Record<string, any>): Promise<void>;
  deleteRecentReport(reportId: number, userId: number): Promise<void>;
  clearAllRecentReports(userId: number): Promise<void>;

  // Management Dashboard KPI methods
  getActiveProjectsTrend(): Promise<any>;
  getUnderUtilisedResources(): Promise<any>;
  getOverUtilisedResources(): Promise<any>;
  getUtilisationRateTrend(): Promise<any>;

  // Configuration methods
  getOgsmCharters(): Promise<OgsmCharter[]>;
  getOgsmCharter(id: number): Promise<OgsmCharter | undefined>;
  createOgsmCharter(charter: InsertOgsmCharter): Promise<OgsmCharter>;
  updateOgsmCharter(id: number, charter: Partial<InsertOgsmCharter>): Promise<OgsmCharter>;
  deleteOgsmCharter(id: number): Promise<void>;

  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Notification settings methods
  getNotificationSettings(): Promise<NotificationSettings[]>;
  getNotificationSetting(id: number): Promise<NotificationSettings | undefined>;
  getNotificationSettingByType(type: string): Promise<NotificationSettings | undefined>;
  createNotificationSetting(setting: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSetting(id: number, setting: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;
  deleteNotificationSetting(id: number): Promise<void>;
  
  // Time logging submission methods
  submitWeeklyTimesheet(resourceId: number, weekStartDate: string): Promise<WeeklySubmission>;
  unsubmitWeeklyTimesheet(resourceId: number, weekStartDate: string): Promise<WeeklySubmission>;
  getUnsubmittedUsersForWeek(weekStartDate: string): Promise<(User & { resource: Resource })[]>;
  getSubmissionOverview(weekStartDate: string, department?: string): Promise<any[]>;
  markReminderSent(resourceId: number, weekStartDate: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Health check methods
  async testConnection(): Promise<{ data?: any; error?: any }> {
    try {
      console.log('Testing Supabase connection...');

      // Test basic connection with a simple query
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Supabase connection test failed:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
        return { error };
      }

      console.log('Supabase connection test successful');
      return { data: { connected: true, timestamp: new Date().toISOString() } };
    } catch (err) {
      console.error('Unexpected error during connection test:', err);
      return { error: err };
    }
  }

  // User methods
  // Authentication methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Use Supabase client for authentication queries (more reliable than direct postgres connection)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user not found
          return undefined;
        }
        console.error('Error fetching user by id:', error);
        return undefined;
      }

      // Convert Supabase response to match our User type
      return {
        id: data.id,
        email: data.email,
        password: data.password,
        resourceId: data.resource_id,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        lastLogin: data.last_login ? new Date(data.last_login) : null,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      };
    } catch (err) {
      console.error('Unexpected error in getUser:', err);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Use Supabase client for authentication queries (more reliable than direct postgres connection)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user not found
          return undefined;
        }

        // Log the actual error for debugging
        console.error('Supabase error in getUserByEmail:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        // Check for connection/configuration errors that should be thrown
        if (error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            error.message?.includes('connection') ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' ||
            error.message?.includes('Invalid API key')) {
          throw new Error(`Database connection failed: ${error.message}`);
        }

        // For other database errors, return undefined (user not found)
        return undefined;
      }

      // Convert Supabase response to match our User type
      return {
        id: data.id,
        email: data.email,
        password: data.password,
        resourceId: data.resource_id,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        lastLogin: data.last_login ? new Date(data.last_login) : null,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      };
    } catch (err) {
      console.error('Unexpected error in getUserByEmail:', err);

      // Check if this is a network/connection error that should be propagated
      if (err instanceof Error) {
        if (err.message.includes('Database connection failed') ||
            err.message.includes('fetch failed') ||
            err.message.includes('network') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ENOTFOUND')) {
          throw err; // Propagate connection errors
        }
      }

      // For other unexpected errors, return undefined
      return undefined;
    }
  }

  async getUserWithRoles(id: number): Promise<UserWithRoles | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const roles = await this.getUserRoles(id);
    const allPermissions = roles.flatMap(role => ROLE_PERMISSIONS[role.role as RoleType] || []);
    const uniquePermissions = Array.from(new Set(allPermissions));

    let resource: Resource | undefined;
    if (user.resourceId) {
      resource = await this.getResource(user.resourceId);
    }

    return {
      ...user,
      resource,
      roles,
      permissions: uniquePermissions,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Convert camelCase to snake_case for Supabase
      const userData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(insertUser));

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create user');
      }

      // Convert back to camelCase with proper date parsing
      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['lastLogin', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createUser:', err);
      throw err;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    try {
      // Convert camelCase to snake_case for Supabase
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (userData.email) updateData.email = userData.email;
      if (userData.password) updateData.password = userData.password;
      if (userData.resourceId !== undefined) updateData.resource_id = userData.resourceId;
      if (userData.isActive !== undefined) updateData.is_active = userData.isActive;
      if (userData.emailVerified !== undefined) updateData.email_verified = userData.emailVerified;
      if (userData.lastLogin !== undefined) updateData.last_login = userData.lastLogin?.toISOString();

      // Use Supabase client for authentication-related updates
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Convert Supabase response to match our User type
      return {
        id: data.id,
        email: data.email,
        password: data.password,
        resourceId: data.resource_id,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        lastLogin: data.last_login ? new Date(data.last_login) : null,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      };
    } catch (err) {
      console.error('Unexpected error in updateUser:', err);
      throw err;
    }
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User> {
    try {
      console.log(`[STORAGE] Updating password for user ID: ${id}`);

      const updateData = {
        password: hashedPassword,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user password:', error);
        throw new Error(`Failed to update user password: ${error.message}`);
      }

      console.log(`[STORAGE] Successfully updated password for user ID: ${id}`);

      // Convert Supabase response to match our User type
      return {
        id: data.id,
        email: data.email,
        password: data.password,
        resourceId: data.resource_id,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        lastLogin: data.last_login ? new Date(data.last_login) : null,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      };
    } catch (err) {
      console.error('Unexpected error in updateUserPassword:', err);
      throw err;
    }
  }

  // User session methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    try {
      // Convert camelCase to snake_case for Supabase
      const sessionData = {
        id: session.id,
        user_id: session.userId,
        resource_id: session.resourceId,
        token: session.token,
        refresh_token: session.refreshToken,
        expires_at: session.expiresAt.toISOString(),
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
      };

      // Use Supabase client for session creation
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user session:', error);
        throw new Error(`Failed to create user session: ${error.message}`);
      }

      // Convert Supabase response to match our UserSession type
      return {
        id: data.id,
        userId: data.user_id,
        resourceId: data.resource_id,
        token: data.token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at),
        createdAt: data.created_at ? new Date(data.created_at) : null,
        lastUsed: data.last_used ? new Date(data.last_used) : null,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
      };
    } catch (err) {
      console.error('Unexpected error in createUserSession:', err);
      throw err;
    }
  }

  async getUserSession(id: string): Promise<UserSession | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching user session:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['expiresAt', 'createdAt', 'lastUsed']);
    } catch (err) {
      console.error('Unexpected error in getUserSession:', err);
      return undefined;
    }
  }

  async updateUserSession(id: string, sessionData: Partial<InsertUserSession>): Promise<UserSession> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...sessionData,
        lastUsed: new Date()
      }));

      const { data, error } = await supabaseAdmin
        .from('user_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update user session');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['expiresAt', 'createdAt', 'lastUsed']);
    } catch (err) {
      console.error('Unexpected error in updateUserSession:', err);
      throw err;
    }
  }

  async deleteUserSession(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete user session');
      }
    } catch (err) {
      console.error('Unexpected error in deleteUserSession:', err);
      throw err;
    }
  }

  async deleteUserSessions(userId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        SupabaseUtils.handleError(error, 'delete user sessions');
      }
    } catch (err) {
      console.error('Unexpected error in deleteUserSessions:', err);
      throw err;
    }
  }

  // User role methods
  async getUserRoles(userId: number): Promise<UserRole[]> {
    try {
      // Use Supabase client for authentication-related queries
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      // Convert Supabase response to match our UserRole type
      return (data || []).map(role => ({
        id: role.id,
        userId: role.user_id,
        resourceId: role.resource_id,
        role: role.role,
        assignedAt: role.assigned_at ? new Date(role.assigned_at) : null,
        assignedBy: role.assigned_by,
      }));
    } catch (err) {
      console.error('Unexpected error in getUserRoles:', err);
      return [];
    }
  }

  async createUserRole(role: InsertUserRole): Promise<UserRole> {
    try {
      const roleData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(role));

      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .insert(roleData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create user role');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['assignedAt']);
    } catch (err) {
      console.error('Unexpected error in createUserRole:', err);
      throw err;
    }
  }

  async updateUserRole(id: number, roleData: Partial<InsertUserRole>): Promise<UserRole> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(roleData));

      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update user role');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['assignedAt']);
    } catch (err) {
      console.error('Unexpected error in updateUserRole:', err);
      throw err;
    }
  }

  async deleteUserRole(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete user role');
      }
    } catch (err) {
      console.error('Unexpected error in deleteUserRole:', err);
      throw err;
    }
  }

  // Role management methods
  async getAllRoles(): Promise<{ role: RoleType; permissions: PermissionType[] }[]> {
    return Object.keys(ROLE_PERMISSIONS).map(role => ({
      role: role as RoleType,
      permissions: ROLE_PERMISSIONS[role as RoleType]
    }));
  }

  async getAllUsersWithRoles(): Promise<UserWithRoles[]> {
    try {
      // Use Supabase client for better performance and reliability
      console.log('[STORAGE] Fetching users with roles using optimized approach...');

      // First, get all users with their resources in a single query
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          resources (*)
        `)
        .eq('is_active', true)
        .order('email', { ascending: true });

      if (usersError) {
        console.error('[STORAGE] Error fetching users:', usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (!usersData || usersData.length === 0) {
        console.log('[STORAGE] No users found');
        return [];
      }

      // Get all user roles in a separate, simpler query
      const { data: rolesData, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .order('user_id', { ascending: true });

      if (rolesError) {
        console.error('[STORAGE] Error fetching user roles:', rolesError);
        throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
      }

      // Group roles by user ID for efficient lookup
      const rolesByUserId = new Map<number, UserRole[]>();
      (rolesData || []).forEach(role => {
        const userRoles = rolesByUserId.get(role.user_id) || [];
        userRoles.push({
          id: role.id,
          userId: role.user_id,
          resourceId: role.resource_id,
          role: role.role,
          assignedAt: role.assigned_at ? new Date(role.assigned_at) : null,
          assignedBy: role.assigned_by,
        });
        rolesByUserId.set(role.user_id, userRoles);
      });

      // Combine users with their roles and calculate permissions
      const result = usersData.map(userData => {
        const user = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(userData), ['lastLogin', 'createdAt', 'updatedAt']);
        const resource = userData.resources ? SupabaseUtils.toCamelCase(userData.resources) : undefined;
        const userRoles = rolesByUserId.get(user.id) || [];

        // Calculate permissions from roles
        const permissions = userRoles.reduce((acc: PermissionType[], role) => {
          const rolePermissions = ROLE_PERMISSIONS[role.role as RoleType] || [];
          return [...acc, ...rolePermissions];
        }, []);

        return {
          ...user,
          resource,
          roles: userRoles,
          permissions: [...new Set(permissions)] // Remove duplicates
        };
      });

      console.log(`[STORAGE] Successfully fetched ${result.length} users with roles`);
      return result;

    } catch (err) {
      console.error('[STORAGE] Unexpected error in getAllUsersWithRoles:', err);
      throw new Error(`Failed to fetch users with roles: ${err.message}`);
    }
  }

  async deleteUserRoleByUserAndRole(userId: number, role: RoleType, resourceId?: number): Promise<void> {
    try {
      console.log(`[STORAGE] Deleting user role for userId: ${userId}, role: ${role}, resourceId: ${resourceId}`);

      // Build the delete query using Supabase client
      let deleteQuery = supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (resourceId) {
        deleteQuery = deleteQuery.eq('resource_id', resourceId);
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('[STORAGE] Error deleting user role:', error);
        throw new Error(`Failed to delete user role: ${error.message}`);
      }

      console.log('[STORAGE] Successfully deleted user role');
    } catch (error) {
      console.error('[STORAGE] Error in deleteUserRoleByUserAndRole:', error);
      throw error;
    }
  }

  // Password reset methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    try {
      const tokenData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(token));

      const { data, error } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert(tokenData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create password reset token');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['expiresAt', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in createPasswordResetToken:', err);
      throw err;
    }
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching password reset token:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['expiresAt', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in getPasswordResetToken:', err);
      return undefined;
    }
  }

  async usePasswordResetToken(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'use password reset token');
      }
    } catch (err) {
      console.error('Unexpected error in usePasswordResetToken:', err);
      throw err;
    }
  }

  // Password reset audit methods
  async createPasswordResetAudit(audit: InsertPasswordResetAudit): Promise<PasswordResetAudit> {
    try {
      const auditData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(audit));

      const { data, error } = await supabaseAdmin
        .from('password_reset_audit')
        .insert(auditData)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, create it first
        if (error.message?.includes('relation "password_reset_audit" does not exist')) {
          console.log('[STORAGE] Creating password_reset_audit table...');
          await this.createPasswordResetAuditTable();
          // Retry the insert
          const { data: retryData, error: retryError } = await supabaseAdmin
            .from('password_reset_audit')
            .insert(auditData)
            .select()
            .single();

          if (retryError) {
            SupabaseUtils.handleError(retryError, 'create password reset audit (retry)');
          }
          return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(retryData), ['resetAt']);
        }
        SupabaseUtils.handleError(error, 'create password reset audit');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['resetAt']);
    } catch (err) {
      console.error('Unexpected error in createPasswordResetAudit:', err);
      throw err;
    }
  }

  async getPasswordResetAuditForUser(userId: number): Promise<PasswordResetAudit[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('password_reset_audit')
        .select(`
          *,
          admin_user:admin_user_id(id, email, resource_id),
          target_user:target_user_id(id, email, resource_id)
        `)
        .eq('target_user_id', userId)
        .order('reset_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing error
        if (error.message?.includes('relation "password_reset_audit" does not exist')) {
          console.log('[STORAGE] Password reset audit table does not exist yet, returning empty array');
          return [];
        }
        SupabaseUtils.handleError(error, 'get password reset audit for user');
      }

      return data?.map(item => SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(item), ['resetAt'])) || [];
    } catch (err) {
      console.error('Unexpected error in getPasswordResetAuditForUser:', err);
      // Return empty array instead of throwing error to prevent UI breakage
      return [];
    }
  }

  // Helper method to create password reset audit table
  private async createPasswordResetAuditTable(): Promise<void> {
    try {
      // Use direct SQL execution via Supabase
      const { error } = await supabaseAdmin
        .from('password_reset_audit')
        .select('id')
        .limit(1);

      // If we get here without error, table exists
      if (!error) {
        console.log('[STORAGE] Password reset audit table already exists');
        return;
      }

      // Try to create the table using raw SQL
      console.log('[STORAGE] Attempting to create password_reset_audit table...');

      // For now, just log that we need to create the table manually
      console.log('[STORAGE] Please run the following SQL in your Supabase SQL editor:');
      console.log(`
        CREATE TABLE IF NOT EXISTS password_reset_audit (
          id SERIAL PRIMARY KEY,
          admin_user_id INTEGER REFERENCES users(id) NOT NULL,
          target_user_id INTEGER REFERENCES users(id) NOT NULL,
          reset_at TIMESTAMP DEFAULT NOW(),
          ip_address VARCHAR(45),
          user_agent TEXT
        );
      `);

    } catch (err) {
      console.error('[STORAGE] Error checking/creating password_reset_audit table:', err);
    }
  }

  // Resource methods
  async getResources(): Promise<Resource[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching resources:', error);
        return [];
      }

      return (data || []).map(resource =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(resource), ['createdAt', 'updatedAt', 'deletedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getResources:', err);
      return [];
    }
  }

  async getResource(id: number): Promise<Resource | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching resource:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt', 'deletedAt']);
    } catch (err) {
      console.error('Unexpected error in getResource:', err);
      return undefined;
    }
  }

  async getResourceWithAllocations(id: number): Promise<ResourceWithAllocations | undefined> {
    try {
      const resource = await this.getResource(id);
      if (!resource) return undefined;

      // Fetch allocations with projects using Supabase
      const { data: allocationsData, error: allocationsError } = await supabaseAdmin
        .from('resource_allocations')
        .select(`
          *,
          projects (*)
        `)
        .eq('resource_id', id)
        .order('start_date', { ascending: false });

      if (allocationsError) {
        console.error('Error fetching resource allocations:', allocationsError);
      }

      // Fetch time off using Supabase
      const { data: timeOffData, error: timeOffError } = await supabaseAdmin
        .from('time_off')
        .select('*')
        .eq('resource_id', id);

      if (timeOffError) {
        console.error('Error fetching resource time off:', timeOffError);
      }

      // Convert allocations to proper format
      const allocations = (allocationsData || []).map(allocation => ({
        ...SupabaseUtils.toCamelCase(allocation),
        project: allocation.projects ? SupabaseUtils.toCamelCase(allocation.projects) : null,
      }));

      // Convert time off to proper format
      const timeOff = (timeOffData || []).map(timeOffItem =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(timeOffItem), ['startDate', 'endDate', 'createdAt'])
      );

      return {
        ...resource,
        allocations,
        timeOff,
      };
    } catch (err) {
      console.error('Unexpected error in getResourceWithAllocations:', err);
      return undefined;
    }
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    try {
      const resourceData = {
        ...resource,
        skills: resource.skills || []
      };
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(resourceData));

      const { data, error } = await supabaseAdmin
        .from('resources')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create resource');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt', 'deletedAt']);
    } catch (err) {
      console.error('Unexpected error in createResource:', err);
      throw err;
    }
  }

  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(resource));

      const { data, error } = await supabaseAdmin
        .from('resources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update resource');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt', 'deletedAt']);
    } catch (err) {
      console.error('Unexpected error in updateResource:', err);
      throw err;
    }
  }

  async deleteResource(id: number): Promise<void> {
    try {
      // First, check if the resource exists and is not already deleted
      const { data: existingResource, error: fetchError } = await supabaseAdmin
        .from('resources')
        .select('id, name, is_deleted')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error(`Resource with ID ${id} not found`);
        }
        SupabaseUtils.handleError(fetchError, 'fetch resource for deletion');
      }

      if (existingResource.is_deleted) {
        throw new Error(`Resource "${existingResource.name}" is already deleted`);
      }

      // Check for active relationships that might prevent deletion
      const relationshipChecks = await this.checkResourceRelationships(id);

      // Log the relationships for debugging
      console.log(`Deleting resource ${id}:`, relationshipChecks);

      // Perform soft delete
      const { error } = await supabaseAdmin
        .from('resources')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase error during resource deletion:', error);
        SupabaseUtils.handleError(error, 'delete resource');
      }

      console.log(`Successfully soft-deleted resource ${id}`);
    } catch (err) {
      console.error('Unexpected error in deleteResource:', err);
      throw err;
    }
  }

  async checkResourceRelationships(resourceId: number): Promise<{
    activeAllocations: number;
    timeEntries: number;
    projectsAsDirector: number;
    projectsAsChangeLead: number;
    projectsAsBusinessLead: number;
    timeOffEntries: number;
    weeklySubmissions: number;
    userAccounts: number;
    canDelete: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      const [
        allocations,
        timeEntries,
        projectsAsDirector,
        projectsAsChangeLead,
        projectsAsBusinessLead,
        timeOffEntries,
        weeklySubmissions,
        userAccounts
      ] = await Promise.all([
        // Active resource allocations
        supabaseAdmin
          .from('resource_allocations')
          .select('id')
          .eq('resource_id', resourceId)
          .eq('status', 'active'),

        // Time entries
        supabaseAdmin
          .from('time_entries')
          .select('id')
          .eq('resource_id', resourceId),

        // Projects where resource is director
        supabaseAdmin
          .from('projects')
          .select('id')
          .eq('director_id', resourceId)
          .neq('status', 'rejected'),

        // Projects where resource is change lead
        supabaseAdmin
          .from('projects')
          .select('id')
          .eq('change_lead_id', resourceId)
          .neq('status', 'rejected'),

        // Projects where resource is business lead
        supabaseAdmin
          .from('projects')
          .select('id')
          .eq('business_lead_id', resourceId)
          .neq('status', 'rejected'),

        // Time off entries
        supabaseAdmin
          .from('time_off')
          .select('id')
          .eq('resource_id', resourceId),

        // Weekly submissions
        supabaseAdmin
          .from('weekly_submissions')
          .select('id')
          .eq('resource_id', resourceId),

        // User accounts
        supabaseAdmin
          .from('users')
          .select('id')
          .eq('resource_id', resourceId)
          .eq('is_active', true)
      ]);

      const counts = {
        activeAllocations: allocations.data?.length || 0,
        timeEntries: timeEntries.data?.length || 0,
        projectsAsDirector: projectsAsDirector.data?.length || 0,
        projectsAsChangeLead: projectsAsChangeLead.data?.length || 0,
        projectsAsBusinessLead: projectsAsBusinessLead.data?.length || 0,
        timeOffEntries: timeOffEntries.data?.length || 0,
        weeklySubmissions: weeklySubmissions.data?.length || 0,
        userAccounts: userAccounts.data?.length || 0,
      };

      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Check for blocking relationships
      if (counts.activeAllocations > 0) {
        warnings.push(`${counts.activeAllocations} active project allocation(s) will be preserved`);
        suggestions.push("Consider completing or reassigning active allocations before deletion");
      }

      if (counts.projectsAsDirector > 0 || counts.projectsAsChangeLead > 0 || counts.projectsAsBusinessLead > 0) {
        const totalProjects = counts.projectsAsDirector + counts.projectsAsChangeLead + counts.projectsAsBusinessLead;
        warnings.push(`${totalProjects} project leadership role(s) will be preserved`);
        suggestions.push("Consider reassigning project leadership roles to other resources");
      }

      if (counts.userAccounts > 0) {
        warnings.push(`${counts.userAccounts} user account(s) will be deactivated`);
        suggestions.push("User accounts will be automatically deactivated");
      }

      if (counts.timeEntries > 0) {
        warnings.push(`${counts.timeEntries} time entries will be preserved for historical reporting`);
      }

      // Resource can be deleted (soft delete), but warn about relationships
      const canDelete = true; // Soft delete always allowed

      return {
        ...counts,
        canDelete,
        warnings,
        suggestions,
      };
    } catch (err) {
      console.error('Error checking resource relationships:', err);
      // Return empty counts if check fails - don't block deletion
      return {
        activeAllocations: 0,
        timeEntries: 0,
        projectsAsDirector: 0,
        projectsAsChangeLead: 0,
        projectsAsBusinessLead: 0,
        timeOffEntries: 0,
        weeklySubmissions: 0,
        userAccounts: 0,
        canDelete: true,
        warnings: ['Unable to check relationships - proceeding with caution'],
        suggestions: ['Please verify manually that no critical relationships exist'],
      };
    }
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      return (data || []).map(project =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project), ['startDate', 'endDate', 'createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getProjects:', err);
      return [];
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching project:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getProject:', err);
      return undefined;
    }
  }

  async getProjectWithAllocations(id: number): Promise<ProjectWithAllocations | undefined> {
    try {
      // Get project with leadership team details using Supabase client
      const { data: projectData, error: projectError } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          director:resources!projects_director_id_fkey (*),
          changeLead:resources!projects_change_lead_id_fkey (*),
          businessLead:resources!projects_business_lead_id_fkey (*)
        `)
        .eq('id', id)
        .single();

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return undefined;
        }
        SupabaseUtils.handleError(projectError, 'get project with leadership');
        return undefined;
      }

      // Get allocations with resource details using Supabase client
      const { data: allocationsData, error } = await supabaseAdmin
        .from('resource_allocations')
        .select(`
          *,
          resource:resources(*)
        `)
        .eq('project_id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'get project allocations');
        return undefined;
      }

      const allocations = (allocationsData || []).map(allocation => ({
        ...SupabaseUtils.toCamelCase(allocation),
        resource: SupabaseUtils.toCamelCase(allocation.resource),
      }));

      // Parse and structure the project data with leadership team
      const project = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(projectData), ['startDate', 'endDate', 'createdAt', 'updatedAt']);

      return {
        ...project,
        director: projectData.director ? SupabaseUtils.toCamelCase(projectData.director) : null,
        changeLead: projectData.changeLead ? SupabaseUtils.toCamelCase(projectData.changeLead) : null,
        businessLead: projectData.businessLead ? SupabaseUtils.toCamelCase(projectData.businessLead) : null,
        allocations,
      };
    } catch (err) {
      console.error('Unexpected error in getProjectWithAllocations:', err);
      return undefined;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const projectData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(project));

      const { data, error } = await supabaseAdmin
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create project');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createProject:', err);
      throw err;
    }
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(project));

      const { data, error } = await supabaseAdmin
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update project');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateProject:', err);
      throw err;
    }
  }

  async deleteProject(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete project');
      }
    } catch (err) {
      console.error('Unexpected error in deleteProject:', err);
      throw err;
    }
  }

  // Resource allocation methods
  async getResourceAllocations(): Promise<ResourceAllocation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching resource allocations:', error);
        return [];
      }

      return (data || []).map(allocation =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(allocation), ['startDate', 'endDate', 'createdAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getResourceAllocations:', err);
      return [];
    }
  }

  async getResourceAllocation(id: number): Promise<ResourceAllocation | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching resource allocation:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in getResourceAllocation:', err);
      return undefined;
    }
  }

  async getResourceAllocationsByProject(projectId: number): Promise<(ResourceAllocation & { resource: Resource })[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .select(`
          *,
          resources (*)
        `)
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching resource allocations by project:', error);
        return [];
      }

      const transformedAllocations = (data || []).map(allocation => {
        const transformed = {
          ...SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(allocation), ['startDate', 'endDate', 'createdAt']),
          resource: allocation.resources ? SupabaseUtils.toCamelCase(allocation.resources) : null,
        };

        // Debug weekly allocations transformation
        if (allocation.weekly_allocations) {
          console.log(`[STORAGE] Raw weekly_allocations for allocation ${allocation.id}:`, allocation.weekly_allocations);
          console.log(`[STORAGE] Transformed weekly_allocations:`, transformed.weeklyAllocations);
        }

        return transformed;
      });

      return transformedAllocations;
    } catch (err) {
      console.error('Unexpected error in getResourceAllocationsByProject:', err);
      return [];
    }
  }

  async getResourceAllocationsByResource(resourceId: number): Promise<(ResourceAllocation & { project: Project })[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .select(`
          *,
          projects (*)
        `)
        .eq('resource_id', resourceId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching resource allocations by resource:', error);
        return [];
      }

      return (data || []).map(allocation => ({
        ...SupabaseUtils.toCamelCase(allocation),
        project: allocation.projects ? SupabaseUtils.toCamelCase(allocation.projects) : null,
      }));
    } catch (err) {
      console.error('Unexpected error in getResourceAllocationsByResource:', err);
      return [];
    }
  }

  async getResourceAllocationsByDateRange(startDate: string, endDate: string): Promise<ResourceAllocation[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .select('*')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching resource allocations by date range:', error);
        return [];
      }

      return (data || []).map(allocation =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(allocation), ['startDate', 'endDate', 'createdAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getResourceAllocationsByDateRange:', err);
      return [];
    }
  }

  async createResourceAllocation(allocation: InsertResourceAllocation): Promise<ResourceAllocation> {
    try {
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(allocation));

      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create resource allocation');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in createResourceAllocation:', err);
      throw err;
    }
  }

  async updateResourceAllocation(id: number, allocation: Partial<InsertResourceAllocation>): Promise<ResourceAllocation> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(allocation));

      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update resource allocation');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in updateResourceAllocation:', err);
      throw err;
    }
  }

  async deleteResourceAllocation(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('resource_allocations')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete resource allocation');
      }
    } catch (err) {
      console.error('Unexpected error in deleteResourceAllocation:', err);
      throw err;
    }
  }

  async updateWeeklyAllocation(projectId: number, resourceId: number, weekKey: string, hours: number): Promise<any> {
    try {
      console.log(`[STORAGE] Updating weekly allocation: projectId=${projectId}, resourceId=${resourceId}, weekKey=${weekKey}, hours=${hours}`);

      // First, find the allocation record
      const { data: allocation, error: findError } = await supabaseAdmin
        .from('resource_allocations')
        .select('id, weekly_allocations')
        .eq('project_id', projectId)
        .eq('resource_id', resourceId)
        .single();

      if (findError) {
        console.error('Error finding allocation:', findError);
        throw new Error('Allocation not found');
      }

      console.log(`[STORAGE] Found allocation ${allocation.id}, current weekly_allocations:`, allocation.weekly_allocations);

      // Update the weekly allocations JSON
      const weeklyAllocations = allocation.weekly_allocations || {};
      weeklyAllocations[weekKey] = hours;

      console.log(`[STORAGE] Updated weekly_allocations:`, weeklyAllocations);

      const { data, error } = await supabaseAdmin
        .from('resource_allocations')
        .update({ weekly_allocations: weeklyAllocations })
        .eq('id', allocation.id)
        .select()
        .single();

      if (error) {
        console.error('[STORAGE] Error updating weekly allocation:', error);
        SupabaseUtils.handleError(error, 'update weekly allocation');
      }

      console.log(`[STORAGE] Successfully updated allocation, returning data:`, data);
      return SupabaseUtils.toCamelCase(data);
    } catch (err) {
      console.error('Unexpected error in updateWeeklyAllocation:', err);
      throw err;
    }
  }

  // Time off methods
  async getTimeOff(): Promise<TimeOff[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_off')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching time off:', error);
        return [];
      }

      return (data || []).map(timeOffItem =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(timeOffItem), ['startDate', 'endDate', 'createdAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getTimeOff:', err);
      return [];
    }
  }

  async getTimeOffByResource(resourceId: number): Promise<TimeOff[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_off')
        .select('*')
        .eq('resource_id', resourceId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching time off by resource:', error);
        return [];
      }

      return (data || []).map(timeOffItem =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(timeOffItem), ['startDate', 'endDate', 'createdAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getTimeOffByResource:', err);
      return [];
    }
  }

  async getTimeOffByDateRange(startDate: string, endDate: string): Promise<TimeOff[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_off')
        .select('*')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching time off by date range:', error);
        return [];
      }

      return (data || []).map(timeOffItem =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(timeOffItem), ['startDate', 'endDate', 'createdAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getTimeOffByDateRange:', err);
      return [];
    }
  }

  async createTimeOff(timeOffData: InsertTimeOff): Promise<TimeOff> {
    try {
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(timeOffData));

      const { data, error } = await supabaseAdmin
        .from('time_off')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create time off');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in createTimeOff:', err);
      throw err;
    }
  }

  async updateTimeOff(id: number, timeOffData: Partial<InsertTimeOff>): Promise<TimeOff> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(timeOffData));

      const { data, error } = await supabaseAdmin
        .from('time_off')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update time off');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['startDate', 'endDate', 'createdAt']);
    } catch (err) {
      console.error('Unexpected error in updateTimeOff:', err);
      throw err;
    }
  }

  async deleteTimeOff(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('time_off')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete time off');
      }
    } catch (err) {
      console.error('Unexpected error in deleteTimeOff:', err);
      throw err;
    }
  }

  // Non-project activities methods
  async getNonProjectActivities(): Promise<NonProjectActivity[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('non_project_activities')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        SupabaseUtils.handleError(error, 'fetch non-project activities');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getNonProjectActivities:', err);
      throw err;
    }
  }

  async getNonProjectActivitiesByResource(resourceId: number): Promise<NonProjectActivity[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('non_project_activities')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        SupabaseUtils.handleError(error, 'fetch non-project activities by resource');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getNonProjectActivitiesByResource:', err);
      throw err;
    }
  }

  async createNonProjectActivity(activity: InsertNonProjectActivity): Promise<NonProjectActivity> {
    try {
      const activityData = SupabaseUtils.toSnakeCase(activity);

      const { data, error } = await supabaseAdmin
        .from('non_project_activities')
        .insert(activityData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create non-project activity');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createNonProjectActivity:', err);
      throw err;
    }
  }

  async updateNonProjectActivity(id: number, activity: Partial<InsertNonProjectActivity>): Promise<NonProjectActivity> {
    try {
      const activityData = SupabaseUtils.toSnakeCase({
        ...activity,
        updated_at: new Date().toISOString()
      });

      const { data, error } = await supabaseAdmin
        .from('non_project_activities')
        .update(activityData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update non-project activity');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateNonProjectActivity:', err);
      throw err;
    }
  }

  async deleteNonProjectActivity(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('non_project_activities')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete non-project activity');
      }
    } catch (err) {
      console.error('Unexpected error in deleteNonProjectActivity:', err);
      throw err;
    }
  }

  // Time entry methods
  async getTimeEntries(): Promise<TimeEntry[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select('*');

      if (error) {
        console.error('Error fetching time entries:', error);
        return [];
      }

      return (data || []).map(entry =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(entry), ['date', 'weekStartDate', 'createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getTimeEntries:', err);
      return [];
    }
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching time entry:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['date', 'weekStartDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getTimeEntry:', err);
      return undefined;
    }
  }

  async getTimeEntriesByResource(resourceId: number): Promise<(TimeEntry & { allocation: ResourceAllocation & { project: Project } })[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select(`
          *,
          resource_allocations (
            *,
            projects (*)
          )
        `)
        .eq('resource_id', resourceId)
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching time entries by resource:', error);
        return [];
      }

      return (data || []).map(entry => {
        const timeEntry = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(entry), ['date', 'weekStartDate', 'createdAt', 'updatedAt']);
        const allocation = entry.resource_allocations ? SupabaseUtils.toCamelCase(entry.resource_allocations) : null;
        const project = allocation?.projects ? SupabaseUtils.toCamelCase(allocation.projects) : null;

        return {
          ...timeEntry,
          allocation: allocation ? {
            ...allocation,
            project: project || null,
          } : null,
        };
      }).filter(entry => entry.allocation !== null); // Filter out entries without allocations
    } catch (err) {
      console.error('Unexpected error in getTimeEntriesByResource:', err);
      return [];
    }
  }

  async getTimeEntriesByWeek(resourceId: number, weekStartDate: string): Promise<(TimeEntry & { allocation: ResourceAllocation & { project: Project } })[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select(`
          *,
          resource_allocations (
            *,
            projects (*)
          )
        `)
        .eq('resource_id', resourceId)
        .eq('week_start_date', weekStartDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching time entries by week:', error);
        return [];
      }

      return (data || []).map(entry => {
        const timeEntry = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(entry), ['date', 'weekStartDate', 'createdAt', 'updatedAt']);
        const allocation = entry.resource_allocations ? SupabaseUtils.toCamelCase(entry.resource_allocations) : null;
        const project = allocation?.projects ? SupabaseUtils.toCamelCase(allocation.projects) : null;

        return {
          ...timeEntry,
          allocation: allocation ? {
            ...allocation,
            project: project || null,
          } : null,
        };
      }).filter(entry => entry.allocation !== null); // Filter out entries without allocations
    } catch (err) {
      console.error('Unexpected error in getTimeEntriesByWeek:', err);
      return [];
    }
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    try {
      const entryData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(timeEntry));

      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .insert(entryData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create time entry');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['date', 'weekStartDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createTimeEntry:', err);
      throw err;
    }
  }

  async updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...timeEntry,
        updatedAt: new Date()
      }));

      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update time entry');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['date', 'weekStartDate', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateTimeEntry:', err);
      throw err;
    }
  }

  async deleteTimeEntry(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete time entry');
      }
    } catch (err) {
      console.error('Unexpected error in deleteTimeEntry:', err);
      throw err;
    }
  }

  // Change Lead Reporting methods
  async getProjectsByChangeLead(changeLeadId: number): Promise<(Project & { changeLead: Resource })[]> {
    try {
      console.log(`[STORAGE] Getting projects by change lead: ${changeLeadId}`);

      // Use Supabase client with join to get projects and their change leads
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          change_lead:resources!projects_change_lead_id_fkey (*)
        `)
        .eq('change_lead_id', changeLeadId);

      if (error) {
        console.error('[STORAGE] Error fetching projects by change lead:', error);
        throw new Error(`Failed to fetch projects by change lead: ${error.message}`);
      }

      const projects = (data || []).map(project => {
        const projectData = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project), ['startDate', 'endDate', 'createdAt', 'updatedAt']);
        const changeLeadData = project.change_lead ? SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project.change_lead), ['createdAt', 'updatedAt', 'deletedAt']) : null;

        return {
          ...projectData,
          changeLead: changeLeadData,
        };
      });

      console.log(`[STORAGE] Found ${projects.length} projects for change lead ${changeLeadId}`);
      return projects;
    } catch (error) {
      console.error('[STORAGE] Error in getProjectsByChangeLead:', error);
      throw error;
    }
  }

  async getProjectEffortReport(projectId: number): Promise<any[]> {
    return await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectDescription: projects.description,
        estimatedHours: projects.estimatedHours,
        resourceId: resources.id,
        resourceName: resources.name,
        resourceEmail: resources.email,
        allocatedHours: resourceAllocations.allocatedHours,
        allocationStatus: resourceAllocations.status,
        allocationRole: resourceAllocations.role,
        actualHours: sql<string>`COALESCE(SUM(
          COALESCE(${timeEntries.mondayHours}, 0) +
          COALESCE(${timeEntries.tuesdayHours}, 0) +
          COALESCE(${timeEntries.wednesdayHours}, 0) +
          COALESCE(${timeEntries.thursdayHours}, 0) +
          COALESCE(${timeEntries.fridayHours}, 0) +
          COALESCE(${timeEntries.saturdayHours}, 0) +
          COALESCE(${timeEntries.sundayHours}, 0)
        ), 0)`.as("actualHours"),
      })
      .from(projects)
      .innerJoin(resourceAllocations, eq(projects.id, resourceAllocations.projectId))
      .innerJoin(resources, eq(resourceAllocations.resourceId, resources.id))
      .leftJoin(timeEntries, eq(resourceAllocations.id, timeEntries.allocationId))
      .where(eq(projects.id, projectId))
      .groupBy(
        projects.id,
        projects.name,
        projects.description,
        projects.estimatedHours,
        resources.id,
        resources.name,
        resources.email,
        resourceAllocations.allocatedHours,
        resourceAllocations.status,
        resourceAllocations.role
      );
  }

  // Helper function to calculate planned hours from weekly allocations for a date range
  private calculatePlannedHoursForDateRange(weeklyAllocations: Record<string, number>, startDate?: string, endDate?: string): number {
    if (!startDate || !endDate || !weeklyAllocations) {
      return 0;
    }

    let totalPlannedHours = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through all weekly allocations and sum those within the date range
    Object.entries(weeklyAllocations).forEach(([weekKey, hours]) => {
      // Parse week key format: "YYYY-WXX"
      const weekMatch = weekKey.match(/^(\d{4})-W(\d{2})$/);
      if (!weekMatch) return;

      const year = parseInt(weekMatch[1]);
      const weekNumber = parseInt(weekMatch[2]);

      // Calculate the Monday of this week using ISO week calculation
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
      const firstMonday = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000);
      const weekStart = new Date(firstMonday.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);

      // Check if this week overlaps with our date range
      if (weekStart >= start && weekStart <= end) {
        totalPlannedHours += hours || 0;
      }
    });

    return totalPlannedHours;
  }

  async getChangeLeadEffortSummary(changeLeadId: number, startDate?: string, endDate?: string): Promise<any[]> {
    console.log(`[STORAGE] Getting effort summary for change lead: ${changeLeadId}, dates: ${startDate} to ${endDate}`);

    try {
      // Try using Supabase client instead of Drizzle for better reliability
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          priority,
          start_date,
          end_date,
          estimated_hours,
          resource_allocations!inner(
            id,
            allocated_hours,
            weekly_allocations,
            status,
            role,
            resources!inner(
              id,
              name,
              email,
              is_active,
              is_deleted
            )
          )
        `)
        .eq('change_lead_id', changeLeadId)
        .eq('resource_allocations.resources.is_active', true)
        .eq('resource_allocations.resources.is_deleted', false);

      if (projectsError) {
        console.error('[STORAGE] Error fetching projects:', projectsError);
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      if (!projects || projects.length === 0) {
        console.log('[STORAGE] No projects found for change lead');
        return [];
      }

      console.log(`[STORAGE] Found ${projects.length} projects for change lead ${changeLeadId}`);

      // Get time entries for all allocations if date range is provided
      const result = [];

      for (const project of projects) {
        for (const allocation of project.resource_allocations) {
          let actualHours = 0;

          if (startDate && endDate) {
            const { data: timeEntries, error: timeError } = await supabaseAdmin
              .from('time_entries')
              .select('*')
              .eq('allocation_id', allocation.id)
              .gte('week_start_date', startDate)
              .lte('week_start_date', endDate);

            if (!timeError && timeEntries) {
              actualHours = timeEntries.reduce((sum, entry) => {
                return sum +
                  (parseFloat(entry.monday_hours || '0')) +
                  (parseFloat(entry.tuesday_hours || '0')) +
                  (parseFloat(entry.wednesday_hours || '0')) +
                  (parseFloat(entry.thursday_hours || '0')) +
                  (parseFloat(entry.friday_hours || '0')) +
                  (parseFloat(entry.saturday_hours || '0')) +
                  (parseFloat(entry.sunday_hours || '0'));
              }, 0);
            }
          }

          // Get note for this project-resource-changeLead combination
          let note = '';
          const { data: noteData, error: noteError } = await supabaseAdmin
            .from('effort_summary_notes')
            .select('note')
            .eq('project_id', project.id)
            .eq('resource_id', allocation.resources.id)
            .eq('change_lead_id', changeLeadId)
            .single();

          if (!noteError && noteData) {
            note = noteData.note;
          }

          // Calculate planned hours based on weekly allocations for the date range
          const plannedHours = this.calculatePlannedHoursForDateRange(
            allocation.weekly_allocations || {},
            startDate,
            endDate
          );

          // Fall back to total allocated hours if no weekly allocations or date range
          const allocatedHours = plannedHours > 0 ? plannedHours : parseFloat(allocation.allocated_hours || '0');
          const deviation = actualHours - allocatedHours;

          result.push({
            projectId: project.id,
            projectName: project.name,
            projectDescription: project.description,
            projectStatus: project.status,
            projectPriority: project.priority,
            projectStartDate: project.start_date,
            projectEndDate: project.end_date,
            estimatedHours: parseFloat(project.estimated_hours || '0'),
            resourceId: allocation.resources.id,
            resourceName: allocation.resources.name,
            resourceEmail: allocation.resources.email,
            allocatedHours,
            allocationStatus: allocation.status,
            allocationRole: allocation.role,
            actualHours,
            deviation,
            note
          });
        }
      }

      console.log(`[STORAGE] Returning ${result.length} effort summary records`);
      return result;

    } catch (error) {
      console.error('[STORAGE] Error in getChangeLeadEffortSummary:', error);
      throw error;
    }
  }

  // Weekly submission methods
  async getWeeklySubmissions(): Promise<WeeklySubmission[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*');

      if (error) {
        console.error('Error fetching weekly submissions:', error);
        return [];
      }

      return (data || []).map(submission =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(submission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getWeeklySubmissions:', err);
      return [];
    }
  }

  async getWeeklySubmission(id: number): Promise<WeeklySubmission | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching weekly submission:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getWeeklySubmission:', err);
      return undefined;
    }
  }

  async getWeeklySubmissionByResourceAndWeek(resourceId: number, weekStartDate: string): Promise<WeeklySubmission | undefined> {
    try {
      console.log(`[STORAGE] Getting weekly submission for resourceId: ${resourceId}, weekStartDate: ${weekStartDate}`);

      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('week_start_date', weekStartDate)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - submission not found
          console.log('[STORAGE] No weekly submission found for this resource and week');
          return undefined;
        }
        console.error('[STORAGE] Error fetching weekly submission by resource and week:', error);
        return undefined;
      }

      const submission = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
      console.log('[STORAGE] Found weekly submission:', submission);
      return submission;
    } catch (error) {
      console.error('[STORAGE] Error in getWeeklySubmissionByResourceAndWeek:', error);
      return undefined;
    }
  }

  async getWeeklySubmissionsByResource(resourceId: number): Promise<WeeklySubmission[]> {
    try {
      console.log(`[STORAGE] Getting weekly submissions for resourceId: ${resourceId}`);

      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('resource_id', resourceId)
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('[STORAGE] Error fetching weekly submissions by resource:', error);
        return [];
      }

      const submissions = (data || []).map(submission =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(submission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt'])
      );

      console.log(`[STORAGE] Found ${submissions.length} weekly submissions for resource ${resourceId}`);
      return submissions;
    } catch (error) {
      console.error('[STORAGE] Error in getWeeklySubmissionsByResource:', error);
      return [];
    }
  }

  async getPendingSubmissions(): Promise<WeeklySubmission[]> {
    try {
      console.log('[STORAGE] Fetching pending submissions using Supabase client...');

      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('is_submitted', false)
        .order('week_start_date', { ascending: false });

      if (error) {
        console.error('[STORAGE] Error fetching pending submissions:', error);
        return [];
      }

      const submissions = (data || []).map(submission =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(submission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt'])
      );

      console.log(`[STORAGE] Found ${submissions.length} pending submissions`);
      return submissions;
    } catch (error) {
      console.error("[STORAGE] Unexpected error fetching pending submissions:", error);
      return [];
    }
  }

  async createWeeklySubmission(submission: InsertWeeklySubmission): Promise<WeeklySubmission> {
    try {
      console.log("[STORAGE] Creating weekly submission with data:", submission);

      // Set submittedAt to current time when creating a submission
      const submissionData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...submission,
        submittedAt: new Date(),
      }));

      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error('[STORAGE] Error creating weekly submission:', error);
        throw new Error(`Failed to create weekly submission: ${error.message}`);
      }

      const newSubmission = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
      console.log("[STORAGE] Created weekly submission:", newSubmission);
      return newSubmission;
    } catch (error) {
      console.error('[STORAGE] Error in createWeeklySubmission:', error);
      throw error;
    }
  }

  async updateWeeklySubmission(id: number, submission: Partial<InsertWeeklySubmission>): Promise<WeeklySubmission> {
    try {
      console.log("[STORAGE] Updating weekly submission with data:", submission);

      // Set submittedAt to current time when updating to submitted status
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...submission,
        ...(submission.isSubmitted && { submittedAt: new Date() }),
        updatedAt: new Date(),
      }));

      const { data, error } = await supabaseAdmin
        .from('weekly_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[STORAGE] Error updating weekly submission:', error);
        throw new Error(`Failed to update weekly submission: ${error.message}`);
      }

      const updatedSubmission = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
      console.log("[STORAGE] Updated weekly submission:", updatedSubmission);
      return updatedSubmission;
    } catch (error) {
      console.error('[STORAGE] Error in updateWeeklySubmission:', error);
      throw error;
    }
  }

  async deleteWeeklySubmission(id: number): Promise<void> {
    try {
      console.log(`[STORAGE] Deleting weekly submission with id: ${id}`);

      const { error } = await supabaseAdmin
        .from('weekly_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[STORAGE] Error deleting weekly submission:', error);
        throw new Error(`Failed to delete weekly submission: ${error.message}`);
      }

      console.log('[STORAGE] Successfully deleted weekly submission');
    } catch (error) {
      console.error('[STORAGE] Error in deleteWeeklySubmission:', error);
      throw error;
    }
  }

  // Business Controller Report method
  async getBusinessControllerReport(startDate: string, endDate: string, showOnlyActive?: boolean): Promise<any[]> {
    const query = db
      .select({
        changeId: projects.id,
        changeTitle: projects.name,
        changeDescription: projects.description,
        projectStatus: projects.status,
        projectStream: projects.stream,
        directorId: projects.directorId,
        directorName: sql<string>`COALESCE(dir_res.name, 'Not assigned')`.as("directorName"),
        changeLeadId: projects.changeLeadId,
        changeLeadName: sql<string>`COALESCE(lead_res.name, 'Not assigned')`.as("changeLeadName"),
        resourceId: sql<number>`alloc_res.id`.as("resourceId"),
        resourceName: sql<string>`alloc_res.name`.as("resourceName"),
        resourceEmail: sql<string>`alloc_res.email`.as("resourceEmail"),
        resourceDepartment: sql<string>`alloc_res.department`.as("resourceDepartment"),
        allocationId: resourceAllocations.id,
        allocationRole: resourceAllocations.role,
        allocationStatus: resourceAllocations.status,
        weekStartDate: timeEntries.weekStartDate,
        weeklyHours: sql<number>`(
          COALESCE(${timeEntries.mondayHours}, 0) +
          COALESCE(${timeEntries.tuesdayHours}, 0) +
          COALESCE(${timeEntries.wednesdayHours}, 0) +
          COALESCE(${timeEntries.thursdayHours}, 0) +
          COALESCE(${timeEntries.fridayHours}, 0) +
          COALESCE(${timeEntries.saturdayHours}, 0) +
          COALESCE(${timeEntries.sundayHours}, 0)
        )`.as("weeklyHours"),
      })
      .from(projects)
      .innerJoin(resourceAllocations, eq(projects.id, resourceAllocations.projectId))
      .innerJoin(
        sql`${resources} AS alloc_res`,
        sql`${resourceAllocations.resourceId} = alloc_res.id AND alloc_res.is_deleted = false`
      )
      .leftJoin(
        sql`${resources} AS dir_res`,
        sql`${projects.directorId} = dir_res.id AND dir_res.is_deleted = false`
      )
      .leftJoin(
        sql`${resources} AS lead_res`,
        sql`${projects.changeLeadId} = lead_res.id AND lead_res.is_deleted = false`
      )
      .innerJoin(timeEntries, eq(resourceAllocations.id, timeEntries.allocationId))
      .where(
        and(
          eq(projects.type, 'change'),
          sql`${timeEntries.weekStartDate} >= ${startDate}`,
          sql`${timeEntries.weekStartDate} <= ${endDate}`,
          sql`(
            COALESCE(${timeEntries.mondayHours}, 0) +
            COALESCE(${timeEntries.tuesdayHours}, 0) +
            COALESCE(${timeEntries.wednesdayHours}, 0) +
            COALESCE(${timeEntries.thursdayHours}, 0) +
            COALESCE(${timeEntries.fridayHours}, 0) +
            COALESCE(${timeEntries.saturdayHours}, 0) +
            COALESCE(${timeEntries.sundayHours}, 0)
          ) > 0`,
          showOnlyActive ? eq(projects.status, 'active') : sql`1 = 1`
        )
      )
      .orderBy(projects.name, sql`alloc_res.name`, timeEntries.weekStartDate);

    const results = await query;

    // Group by resource-change-month combination
    const groupedData = new Map();
    
    results.forEach(row => {
      const monthKey = format(new Date(row.weekStartDate), 'yyyy-MM');
      const key = `${row.changeId}-${row.resourceId}-${monthKey}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          changeId: row.changeId,
          changeTitle: row.changeTitle,
          resourceId: row.resourceId,
          resourceName: row.resourceName,
          resourceEmail: row.resourceEmail,
          department: row.resourceDepartment,
          role: row.allocationRole,
          month: monthKey,
          totalActualHours: 0,
          changeStatus: row.projectStatus,
          director: row.directorName,
          changeLead: row.changeLeadName,
          stream: row.projectStream,
          weeklyBreakdown: [],
        });
      }
      
      const entry = groupedData.get(key);
      entry.totalActualHours += parseFloat(row.weeklyHours.toString());
      entry.weeklyBreakdown.push({
        weekStartDate: row.weekStartDate,
        hours: parseFloat(row.weeklyHours.toString()),
      });
    });

    return Array.from(groupedData.values());
  }

  // Change Effort Report method
  async getChangeEffortReport(startDate: string, endDate: string, projectId?: number): Promise<any[]> {
    // First, get all change projects with their allocations
    const baseQuery = db
      .select({
        changeId: projects.id,
        changeTitle: projects.name,
        changeDescription: projects.description,
        projectId: projects.id,
        projectName: projects.name,
        projectDescription: projects.description,
        projectStatus: projects.status,
        projectStream: projects.stream,
        estimatedHours: projects.estimatedHours,
        changeLeadId: projects.changeLeadId,
        changeLeadName: sql<string>`COALESCE(lead_res.name, 'Not assigned')`.as("changeLeadName"),
        changeLeadEmail: sql<string>`COALESCE(lead_res.email, '')`.as("changeLeadEmail"),
        changeLeadDepartment: sql<string>`COALESCE(lead_res.department, '')`.as("changeLeadDepartment"),
        resourceId: sql<number>`alloc_res.id`.as("resourceId"),
        resourceName: sql<string>`alloc_res.name`.as("resourceName"),
        resourceEmail: sql<string>`alloc_res.email`.as("resourceEmail"),
        resourceDepartment: sql<string>`alloc_res.department`.as("resourceDepartment"),
        allocatedHours: resourceAllocations.allocatedHours,
        allocationId: resourceAllocations.id,
        allocationStatus: resourceAllocations.status,
        allocationRole: resourceAllocations.role,
        allocationStartDate: resourceAllocations.startDate,
        allocationEndDate: resourceAllocations.endDate,
        actualHours: sql<number>`COALESCE(SUM(
          COALESCE(${timeEntries.mondayHours}, 0) +
          COALESCE(${timeEntries.tuesdayHours}, 0) +
          COALESCE(${timeEntries.wednesdayHours}, 0) +
          COALESCE(${timeEntries.thursdayHours}, 0) +
          COALESCE(${timeEntries.fridayHours}, 0) +
          COALESCE(${timeEntries.saturdayHours}, 0) +
          COALESCE(${timeEntries.sundayHours}, 0)
        ), 0)`.as("actualHours"),
      })
      .from(projects)
      .innerJoin(resourceAllocations, eq(projects.id, resourceAllocations.projectId))
      .innerJoin(
        sql`${resources} AS alloc_res`,
        sql`${resourceAllocations.resourceId} = alloc_res.id AND alloc_res.is_deleted = false`
      )
      .leftJoin(
        sql`${resources} AS lead_res`,
        sql`${projects.changeLeadId} = lead_res.id AND lead_res.is_deleted = false`
      )
      .leftJoin(timeEntries, 
        and(
          eq(resourceAllocations.id, timeEntries.allocationId),
          sql`${timeEntries.weekStartDate} >= ${startDate}`,
          sql`${timeEntries.weekStartDate} <= ${endDate}`
        )
      )
      .where(
        and(
          eq(projects.type, 'change'),
          sql`${resourceAllocations.startDate} <= ${endDate}`,
          sql`${resourceAllocations.endDate} >= ${startDate}`,
          projectId ? eq(projects.id, projectId) : sql`1 = 1`
        )
      )
      .groupBy(
        projects.id,
        projects.name,
        projects.description,
        projects.status,
        projects.stream,
        projects.estimatedHours,
        projects.changeLeadId,
        sql`lead_res.name`,
        sql`lead_res.email`,
        sql`lead_res.department`,
        sql`alloc_res.id`,
        sql`alloc_res.name`,
        sql`alloc_res.email`,
        sql`alloc_res.department`,
        resourceAllocations.id,
        resourceAllocations.allocatedHours,
        resourceAllocations.status,
        resourceAllocations.role,
        resourceAllocations.startDate,
        resourceAllocations.endDate
      )
      .orderBy(projects.name, sql`alloc_res.name`);

    const results = await baseQuery;

    // Convert decimal values to numbers and calculate deviations
    return results.map(row => ({
      ...row,
      estimatedHours: parseFloat(row.estimatedHours?.toString() || '0'),
      allocatedHours: parseFloat(row.allocatedHours.toString()),
      actualHours: parseFloat(row.actualHours.toString()),
      deviation: parseFloat(row.actualHours.toString()) - parseFloat(row.allocatedHours.toString()),
      deviationPercentage: parseFloat(row.allocatedHours.toString()) > 0 
        ? ((parseFloat(row.actualHours.toString()) - parseFloat(row.allocatedHours.toString())) / parseFloat(row.allocatedHours.toString())) * 100
        : 0,
      missingTimeLogs: parseFloat(row.actualHours.toString()) === 0 && parseFloat(row.allocatedHours.toString()) > 0,
    }));
  }

  // Change Allocation Report method - Direct implementation using Supabase client
  async getChangeAllocationReport(startDate: string, endDate: string, projectIds?: number[], resourceIds?: number[], groupBy?: string): Promise<any[]> {
    try {
      console.log('[STORAGE] Starting change allocation report generation');
      console.log(`[STORAGE] Parameters - Start: ${startDate}, End: ${endDate}, Projects: ${projectIds?.length || 'all'}, Resources: ${resourceIds?.length || 'all'}, GroupBy: ${groupBy || 'project'}`);

      // Step 1: Get change projects with filters
      let projectQuery = supabaseAdmin
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          stream,
          estimated_hours,
          change_lead_id,
          change_lead:resources!projects_change_lead_id_fkey(name)
        `)
        .eq('type', 'change');

      if (projectIds && projectIds.length > 0) {
        projectQuery = projectQuery.in('id', projectIds);
      }

      const { data: projects, error: projectsError } = await projectQuery;

      if (projectsError) {
        console.error('[STORAGE] Error fetching projects:', projectsError);
        return [];
      }

      console.log(`[STORAGE] Found ${projects?.length || 0} change projects`);

      if (!projects || projects.length === 0) {
        console.log('[STORAGE] No projects found matching criteria');
        return [];
      }

      // Step 2: Get allocations for these projects
      const projectIdList = projects.map(p => p.id);
      let allocationQuery = supabaseAdmin
        .from('resource_allocations')
        .select(`
          id,
          project_id,
          resource_id,
          allocated_hours,
          role,
          status,
          start_date,
          end_date,
          resources(id, name, email, department)
        `)
        .in('project_id', projectIdList)
        .lte('start_date', endDate)
        .gte('end_date', startDate);

      if (resourceIds && resourceIds.length > 0) {
        allocationQuery = allocationQuery.in('resource_id', resourceIds);
      }

      const { data: allocations, error: allocationsError } = await allocationQuery;

      if (allocationsError) {
        console.error('[STORAGE] Error fetching allocations:', allocationsError);
        return [];
      }

      console.log(`[STORAGE] Found ${allocations?.length || 0} resource allocations`);

      if (!allocations || allocations.length === 0) {
        console.log('[STORAGE] No allocations found matching criteria');
        return [];
      }

      // Step 3: Get time entries for these allocations
      const allocationIds = allocations.map(a => a.id);
      const { data: timeEntries, error: timeEntriesError } = await supabaseAdmin
        .from('time_entries')
        .select('*')
        .in('allocation_id', allocationIds)
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate);

      if (timeEntriesError) {
        console.error('[STORAGE] Error fetching time entries:', timeEntriesError);
      }

      console.log(`[STORAGE] Found ${timeEntries?.length || 0} time entries`);

      // Step 4: Process and combine the data
      const result = [];

      for (const project of projects) {
        const projectAllocations = allocations.filter(a => a.project_id === project.id);

        for (const allocation of projectAllocations) {
          if (!allocation.resources) {
            console.warn(`[STORAGE] Missing resource data for allocation ${allocation.id}`);
            continue;
          }

          const allocationTimeEntries = timeEntries?.filter(te => te.allocation_id === allocation.id) || [];

          let totalActualHours = 0;
          const weeklyBreakdown = [];

          for (const timeEntry of allocationTimeEntries) {
            const weeklyHours =
              (parseFloat(timeEntry.monday_hours) || 0) +
              (parseFloat(timeEntry.tuesday_hours) || 0) +
              (parseFloat(timeEntry.wednesday_hours) || 0) +
              (parseFloat(timeEntry.thursday_hours) || 0) +
              (parseFloat(timeEntry.friday_hours) || 0) +
              (parseFloat(timeEntry.saturday_hours) || 0) +
              (parseFloat(timeEntry.sunday_hours) || 0);

            totalActualHours += weeklyHours;

            if (weeklyHours > 0) {
              weeklyBreakdown.push({
                weekStartDate: timeEntry.week_start_date,
                hours: weeklyHours,
              });
            }
          }

          const allocatedHours = parseFloat(allocation.allocated_hours) || 0;
          const estimatedHours = parseFloat(project.estimated_hours) || 0;
          const variance = totalActualHours - allocatedHours;

          result.push({
            changeId: project.id,
            changeTitle: project.name,
            changeDescription: project.description,
            projectStatus: project.status,
            projectStream: project.stream,
            estimatedHours: estimatedHours,
            changeLeadName: project.change_lead?.name || 'Not assigned',
            resourceId: allocation.resources.id,
            resourceName: allocation.resources.name,
            resourceEmail: allocation.resources.email,
            resourceDepartment: allocation.resources.department,
            allocationRole: allocation.role,
            allocatedHours: allocatedHours,
            actualHours: totalActualHours,
            variance: variance,
            variancePercentage: allocatedHours > 0 ? (variance / allocatedHours) * 100 : 0,
            utilizationRate: allocatedHours > 0 ? (totalActualHours / allocatedHours) * 100 : 0,
            weeklyBreakdown: weeklyBreakdown,
          });
        }
      }

      console.log(`[STORAGE] Successfully generated report with ${result.length} entries`);
      return result;

    } catch (error) {
      console.error('[STORAGE] Error in getChangeAllocationReport:', error);
      return [];
    }
  }



  // Configuration methods
  async getOgsmCharters(): Promise<OgsmCharter[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ogsm_charters')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching OGSM charters:', error);
        return [];
      }

      return (data || []).map(charter =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(charter), ['createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getOgsmCharters:', err);
      return [];
    }
  }

  async getOgsmCharter(id: number): Promise<OgsmCharter | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('ogsm_charters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching OGSM charter:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getOgsmCharter:', err);
      return undefined;
    }
  }

  async createOgsmCharter(charterData: InsertOgsmCharter): Promise<OgsmCharter> {
    try {
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(charterData));

      const { data, error } = await supabaseAdmin
        .from('ogsm_charters')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create OGSM charter');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createOgsmCharter:', err);
      throw err;
    }
  }

  async updateOgsmCharter(id: number, charterData: Partial<InsertOgsmCharter>): Promise<OgsmCharter> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...charterData,
        updatedAt: new Date()
      }));

      const { data, error } = await supabaseAdmin
        .from('ogsm_charters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update OGSM charter');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateOgsmCharter:', err);
      throw err;
    }
  }

  async deleteOgsmCharter(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('ogsm_charters')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete OGSM charter');
      }
    } catch (err) {
      console.error('Unexpected error in deleteOgsmCharter:', err);
      throw err;
    }
  }

  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching departments:', error);
        return [];
      }

      return (data || []).map(department =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(department), ['createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getDepartments:', err);
      return [];
    }
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching department:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getDepartment:', err);
      return undefined;
    }
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    try {
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(departmentData));

      const { data, error } = await supabaseAdmin
        .from('departments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create department');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createDepartment:', err);
      throw err;
    }
  }

  async updateDepartment(id: number, departmentData: Partial<InsertDepartment>): Promise<Department> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...departmentData,
        updatedAt: new Date()
      }));

      const { data, error } = await supabaseAdmin
        .from('departments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update department');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateDepartment:', err);
      throw err;
    }
  }

  async deleteDepartment(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('departments')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete department');
      }
    } catch (err) {
      console.error('Unexpected error in deleteDepartment:', err);
      throw err;
    }
  }

  // Notification settings methods
  async getNotificationSettings(): Promise<NotificationSettings[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .order('type', { ascending: true });

      if (error) {
        console.error('Error fetching notification settings:', error);
        return [];
      }

      return (data || []).map(setting =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(setting), ['createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getNotificationSettings:', err);
      return [];
    }
  }

  async getNotificationSetting(id: number): Promise<NotificationSettings | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching notification setting:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getNotificationSetting:', err);
      return undefined;
    }
  }

  async getNotificationSettingByType(type: string): Promise<NotificationSettings | undefined> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .eq('type', type)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        console.error('Error fetching notification setting by type:', error);
        return undefined;
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in getNotificationSettingByType:', err);
      return undefined;
    }
  }

  async createNotificationSetting(setting: InsertNotificationSettings): Promise<NotificationSettings> {
    try {
      const insertData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates(setting));

      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'create notification setting');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in createNotificationSetting:', err);
      throw err;
    }
  }

  async updateNotificationSetting(id: number, setting: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(SupabaseUtils.prepareDates({
        ...setting,
        updatedAt: new Date()
      }));

      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        SupabaseUtils.handleError(error, 'update notification setting');
      }

      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
    } catch (err) {
      console.error('Unexpected error in updateNotificationSetting:', err);
      throw err;
    }
  }

  async deleteNotificationSetting(id: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('notification_settings')
        .delete()
        .eq('id', id);

      if (error) {
        SupabaseUtils.handleError(error, 'delete notification setting');
      }
    } catch (err) {
      console.error('Unexpected error in deleteNotificationSetting:', err);
      throw err;
    }
  }

  // Alert settings methods
  async getAlertSettings(type: string = 'capacity'): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('alert_settings')
        .select('*')
        .eq('type', type)
        .eq('is_enabled', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return defaults
          return {
            type: 'capacity',
            warningThreshold: 90.00,
            errorThreshold: 100.00,
            criticalThreshold: 120.00,
            underUtilizationThreshold: 50.00,
            isEnabled: true
          };
        }
        console.error('Error fetching alert settings:', error);
        return null;
      }

      return SupabaseUtils.toCamelCase(data);
    } catch (err) {
      console.error('Unexpected error in getAlertSettings:', err);
      return null;
    }
  }

  async updateAlertSettings(type: string, settings: any): Promise<boolean> {
    try {
      const updateData = SupabaseUtils.toSnakeCase(settings);
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabaseAdmin
        .from('alert_settings')
        .update(updateData)
        .eq('type', type);

      if (error) {
        console.error('Error updating alert settings:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error in updateAlertSettings:', err);
      return false;
    }
  }

  // Time logging submission methods
  async submitWeeklyTimesheet(resourceId: number, weekStartDate: string): Promise<WeeklySubmission> {
    try {
      console.log(`[STORAGE] submitWeeklyTimesheet called with resourceId: ${resourceId}, weekStartDate: ${weekStartDate}`);

      // Use Supabase client for better reliability
      console.log('[STORAGE] Checking for existing submission using Supabase client...');

      const { data: existingSubmissions, error: selectError } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('week_start_date', weekStartDate);

      if (selectError) {
        console.error('[STORAGE] Error checking existing submission:', selectError);
        throw new Error(`Failed to check existing submission: ${selectError.message}`);
      }

      const existingSubmission = existingSubmissions?.[0];

      if (existingSubmission) {
        console.log('[STORAGE] Found existing submission, updating...', existingSubmission);

        // Update existing submission
        const { data: updatedSubmission, error: updateError } = await supabaseAdmin
          .from('weekly_submissions')
          .update({
            is_submitted: true,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();

        if (updateError) {
          console.error('[STORAGE] Error updating submission:', updateError);
          throw new Error(`Failed to update submission: ${updateError.message}`);
        }

        console.log('[STORAGE] Updated submission:', updatedSubmission);
        return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(updatedSubmission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
      } else {
        console.log('[STORAGE] No existing submission found, creating new one...');

        // Create new submission
        const { data: newSubmission, error: insertError } = await supabaseAdmin
          .from('weekly_submissions')
          .insert({
            resource_id: resourceId,
            week_start_date: weekStartDate,
            is_submitted: true,
            submitted_at: new Date().toISOString(),
            reminder_sent: false,
            total_hours: "0.00",
          })
          .select()
          .single();

        if (insertError) {
          console.error('[STORAGE] Error creating submission:', insertError);
          throw new Error(`Failed to create submission: ${insertError.message}`);
        }

        console.log('[STORAGE] Created new submission:', newSubmission);
        return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(newSubmission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
      }
    } catch (error) {
      console.error('[STORAGE] Error in submitWeeklyTimesheet:', error);
      console.error('[STORAGE] Error details:', {
        resourceId,
        weekStartDate,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getUnsubmittedUsersForWeek(weekStartDate: string): Promise<(User & { resource: Resource })[]> {
    // Get all users who have time logging permissions and active allocations for the week
    const usersWithAllocations = await db
      .select({
        user: users,
        resource: resources,
        submission: weeklySubmissions,
      })
      .from(users)
      .leftJoin(resources, eq(users.resourceId, resources.id))
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(resourceAllocations, eq(resources.id, resourceAllocations.resourceId))
      .leftJoin(
        weeklySubmissions,
        and(
          eq(weeklySubmissions.resourceId, resources.id),
          eq(weeklySubmissions.weekStartDate, weekStartDate)
        )
      )
      .where(
        and(
          eq(users.isActive, true),
          eq(resources.isActive, true),
          eq(resources.isDeleted, false),
          inArray(userRoles.role, ['regular_user', 'change_lead', 'manager_change', 'business_controller']),
          lte(resourceAllocations.startDate, weekStartDate),
          gte(resourceAllocations.endDate, weekStartDate),
          eq(resourceAllocations.status, 'active'),
          or(
            isNull(weeklySubmissions.isSubmitted),
            eq(weeklySubmissions.isSubmitted, false)
          )
        )
      );

    // Process results to get unique users
    const uniqueUsers = new Map<number, User & { resource: Resource }>();
    
    for (const row of usersWithAllocations) {
      if (row.user && row.resource && !uniqueUsers.has(row.user.id)) {
        uniqueUsers.set(row.user.id, {
          ...row.user,
          resource: row.resource,
        });
      }
    }

    return Array.from(uniqueUsers.values());
  }

  async unsubmitWeeklyTimesheet(resourceId: number, weekStartDate: string): Promise<WeeklySubmission> {
    try {
      console.log(`[STORAGE] unsubmitWeeklyTimesheet called with resourceId: ${resourceId}, weekStartDate: ${weekStartDate}`);

      // Use Supabase client for better reliability
      const { data: submission, error } = await supabaseAdmin
        .from('weekly_submissions')
        .update({
          is_submitted: false,
          submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('resource_id', resourceId)
        .eq('week_start_date', weekStartDate)
        .select()
        .single();

      if (error) {
        console.error('[STORAGE] Error unsubmitting timesheet:', error);
        throw new Error(`Failed to unsubmit timesheet: ${error.message}`);
      }

      if (!submission) {
        throw new Error('Weekly submission not found');
      }

      console.log('[STORAGE] Unsubmitted timesheet:', submission);
      return SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(submission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']);
    } catch (error) {
      console.error('[STORAGE] Error in unsubmitWeeklyTimesheet:', error);
      throw error;
    }
  }

  async getSubmissionOverview(weekStartDate: string, department?: string): Promise<any[]> {
    try {
      console.log("[STORAGE] Getting submission overview for week:", weekStartDate, "department:", department);

      // Use Supabase client for better reliability
      let resourcesQuery = supabaseAdmin
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (department) {
        resourcesQuery = resourcesQuery.eq('department', department);
      }

      const { data: resourcesData, error: resourcesError } = await resourcesQuery;

      if (resourcesError) {
        console.error('[STORAGE] Error fetching resources for submission overview:', resourcesError);
        throw new Error(`Failed to fetch resources: ${resourcesError.message}`);
      }

      if (!resourcesData || resourcesData.length === 0) {
        console.log('[STORAGE] No resources found for submission overview');
        return [];
      }

      // Get submissions for all resources for the specific week
      const resourceIds = resourcesData.map(r => r.id);
      const { data: submissionsData, error: submissionsError } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .in('resource_id', resourceIds)
        .eq('week_start_date', weekStartDate);

      if (submissionsError) {
        console.error('[STORAGE] Error fetching submissions:', submissionsError);
        throw new Error(`Failed to fetch submissions: ${submissionsError.message}`);
      }

      // Create a map of submissions by resource ID
      const submissionsMap = new Map();
      (submissionsData || []).forEach(submission => {
        submissionsMap.set(submission.resource_id, submission);
      });

      // For each resource, check if they have time entries and build the result
      const results = [];
      for (const resource of resourcesData) {
        // Check if resource has time entries for the week by checking allocations first
        const { data: allocationsData, error: allocationsError } = await supabaseAdmin
          .from('resource_allocations')
          .select('id')
          .eq('resource_id', resource.id);

        let hasTimeEntries = false;
        if (!allocationsError && allocationsData && allocationsData.length > 0) {
          const allocationIds = allocationsData.map(a => a.id);
          const { data: timeEntriesData, error: timeEntriesError } = await supabaseAdmin
            .from('time_entries')
            .select('id')
            .in('allocation_id', allocationIds)
            .eq('week_start_date', weekStartDate)
            .limit(1);

          hasTimeEntries = !timeEntriesError && timeEntriesData && timeEntriesData.length > 0;
        }

        const submission = submissionsMap.get(resource.id);

        results.push({
          resource: SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(resource), ['createdAt', 'updatedAt', 'deletedAt']),
          department: { name: resource.department },
          submission: submission ? SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(submission), ['weekStartDate', 'submittedAt', 'createdAt', 'updatedAt']) : null,
          hasTimeEntries,
        });
      }

      console.log(`[STORAGE] Successfully retrieved submission overview for ${results.length} resources`);
      return results;
    } catch (error) {
      console.error("[STORAGE] Failed to get submission overview:", error);
      throw error;
    }
  }

  async markReminderSent(resourceId: number, weekStartDate: string): Promise<void> {
    try {
      console.log(`[STORAGE] Marking reminder sent for resourceId: ${resourceId}, weekStartDate: ${weekStartDate}`);

      // Check if submission record exists using Supabase client
      const { data: existingSubmissions, error: selectError } = await supabaseAdmin
        .from('weekly_submissions')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('week_start_date', weekStartDate);

      if (selectError) {
        console.error('[STORAGE] Error checking existing submission for reminder:', selectError);
        throw new Error(`Failed to check existing submission: ${selectError.message}`);
      }

      const existingSubmission = existingSubmissions?.[0];

      if (existingSubmission) {
        console.log('[STORAGE] Updating existing submission with reminder sent flag');
        // Update existing submission
        const { error: updateError } = await supabaseAdmin
          .from('weekly_submissions')
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubmission.id);

        if (updateError) {
          console.error('[STORAGE] Error updating submission with reminder flag:', updateError);
          throw new Error(`Failed to update submission: ${updateError.message}`);
        }
      } else {
        console.log('[STORAGE] Creating new submission record with reminder sent flag');
        // Create new submission record
        const { error: insertError } = await supabaseAdmin
          .from('weekly_submissions')
          .insert({
            resource_id: resourceId,
            week_start_date: weekStartDate,
            is_submitted: false,
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString(),
            total_hours: "0.00",
          });

        if (insertError) {
          console.error('[STORAGE] Error creating submission with reminder flag:', insertError);
          throw new Error(`Failed to create submission: ${insertError.message}`);
        }
      }

      console.log('[STORAGE] Successfully marked reminder as sent');
    } catch (error) {
      console.error('[STORAGE] Error in markReminderSent:', error);
      throw error;
    }
  }

  // Reports Dashboard methods
  async getUtilizationTrend(startDate: string, endDate: string): Promise<any[]> {
    try {
      // Get monthly utilization data for the past 6 months
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select(`
          week_start_date,
          monday_hours,
          tuesday_hours,
          wednesday_hours,
          thursday_hours,
          friday_hours,
          saturday_hours,
          sunday_hours,
          resource_allocations!inner(
            allocated_hours,
            resources!inner(
              weekly_capacity
            )
          )
        `)
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate);

      if (error) {
        console.error('Error fetching utilization trend:', error);
        return [];
      }

      // Group by month and calculate utilization
      const monthlyData = new Map();

      (data || []).forEach(entry => {
        const weekDate = new Date(entry.week_start_date);
        const monthKey = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}`;

        const totalHours = [
          entry.monday_hours, entry.tuesday_hours, entry.wednesday_hours,
          entry.thursday_hours, entry.friday_hours, entry.saturday_hours, entry.sunday_hours
        ].reduce((sum, hours) => sum + parseFloat(hours || '0'), 0);

        const capacity = parseFloat(entry.resource_allocations?.resources?.weekly_capacity || '40');

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: new Date(weekDate.getFullYear(), weekDate.getMonth(), 1).toLocaleDateString('en-US', { month: 'short' }),
            totalActualHours: 0,
            totalCapacityHours: 0,
            allocatedHours: 0
          });
        }

        const monthData = monthlyData.get(monthKey);
        monthData.totalActualHours += totalHours;
        monthData.totalCapacityHours += capacity;
        monthData.allocatedHours += parseFloat(entry.resource_allocations?.allocated_hours || '0');
      });

      return Array.from(monthlyData.values()).map(data => ({
        month: data.month,
        utilization: data.totalCapacityHours > 0 ? (data.totalActualHours / data.totalCapacityHours) * 100 : 0,
        allocatedHours: data.allocatedHours,
        actualHours: data.totalActualHours
      })).slice(-6); // Last 6 months
    } catch (error) {
      console.error('Error in getUtilizationTrend:', error);
      return [];
    }
  }

  async getProjectDistribution(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('time_entries')
        .select(`
          monday_hours,
          tuesday_hours,
          wednesday_hours,
          thursday_hours,
          friday_hours,
          saturday_hours,
          sunday_hours,
          resource_allocations!inner(
            projects!inner(
              id,
              name,
              status
            )
          )
        `)
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate);

      if (error) {
        console.error('Error fetching project distribution:', error);
        return [];
      }

      // Calculate total hours per project
      const projectHours = new Map();
      let totalHours = 0;

      (data || []).forEach(entry => {
        const project = entry.resource_allocations?.projects;
        if (!project) return;

        const entryHours = [
          entry.monday_hours, entry.tuesday_hours, entry.wednesday_hours,
          entry.thursday_hours, entry.friday_hours, entry.saturday_hours, entry.sunday_hours
        ].reduce((sum, hours) => sum + parseFloat(hours || '0'), 0);

        totalHours += entryHours;

        if (!projectHours.has(project.id)) {
          projectHours.set(project.id, {
            projectName: project.name,
            status: project.status,
            totalHours: 0
          });
        }

        projectHours.get(project.id).totalHours += entryHours;
      });

      // Convert to percentage and add colors
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

      return Array.from(projectHours.values())
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 8) // Top 8 projects
        .map((project, index) => ({
          projectName: project.projectName,
          value: totalHours > 0 ? (project.totalHours / totalHours) * 100 : 0,
          color: colors[index % colors.length],
          status: project.status,
          totalHours: project.totalHours
        }));
    } catch (error) {
      console.error('Error in getProjectDistribution:', error);
      return [];
    }
  }

  async getRecentReports(userId?: number): Promise<any[]> {
    try {
      console.log('[STORAGE] getRecentReports called with userId:', userId);

      let query = supabaseAdmin
        .from('recent_reports')
        .select(`
          id,
          name,
          type,
          generated_at,
          size,
          download_url,
          criteria,
          users!recent_reports_generated_by_fkey(email)
        `)
        .order('generated_at', { ascending: false })
        .limit(20);

      // If userId is provided, filter by user
      if (userId) {
        console.log('[STORAGE] Filtering by userId:', userId);
        query = query.eq('generated_by', userId);
      }

      const { data: reports, error } = await query;

      if (error) {
        console.error('Error fetching recent reports:', error);
        return [];
      }

      console.log('[STORAGE] Raw reports from database:', reports?.length || 0, 'reports');
      if (reports && reports.length > 0) {
        console.log('[STORAGE] First report:', reports[0]);
      }

      const mappedReports = (reports || []).map(report => ({
        id: report.id,
        name: report.name,
        type: report.type,
        generatedAt: report.generated_at,
        generatedBy: report.users?.email || 'Unknown User',
        size: report.size || 'Unknown',
        downloadUrl: report.download_url,
        criteria: report.criteria
      }));

      console.log('[STORAGE] Returning mapped reports:', mappedReports.length, 'reports');
      return mappedReports;

    } catch (error) {
      console.error('Error in getRecentReports:', error);
      return [];
    }
  }

  async addRecentReport(reportName: string, reportType: string, generatedBy: number, size: string, criteria?: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('recent_reports')
        .insert({
          name: reportName,
          type: reportType,
          generated_by: generatedBy,
          size: size,
          criteria: criteria || null,
          generated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding recent report:', error);
        throw error;
      }

      console.log(`[STORAGE] Report added to recent reports: ${reportName} (${reportType})`);
    } catch (error) {
      console.error('Error in addRecentReport:', error);
      throw error;
    }
  }

  async deleteRecentReport(reportId: number, userId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('recent_reports')
        .delete()
        .eq('id', reportId)
        .eq('generated_by', userId); // Ensure users can only delete their own reports

      if (error) {
        console.error('Error deleting recent report:', error);
        throw error;
      }

      console.log(`[STORAGE] Report deleted: ${reportId}`);
    } catch (error) {
      console.error('Error in deleteRecentReport:', error);
      throw error;
    }
  }

  async clearAllRecentReports(userId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('recent_reports')
        .delete()
        .eq('generated_by', userId);

      if (error) {
        console.error('Error clearing all recent reports:', error);
        throw error;
      }

      console.log(`[STORAGE] All reports cleared for user: ${userId}`);
    } catch (error) {
      console.error('Error in clearAllRecentReports:', error);
      throw error;
    }
  }

  // Email Delivery History methods
  async addEmailDeliveryHistory(emailData: {
    userId: number;
    recipients: string[];
    subject: string;
    body: string;
    reportData?: any;
    includeAttachment: boolean;
    sendCopy: boolean;
    sentAt: string;
    status: string;
  }): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('email_delivery_history')
        .insert({
          user_id: emailData.userId,
          recipients: emailData.recipients,
          subject: emailData.subject,
          body: emailData.body,
          report_data: emailData.reportData,
          include_attachment: emailData.includeAttachment,
          send_copy: emailData.sendCopy,
          sent_at: emailData.sentAt,
          status: emailData.status,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding email delivery history:', error);
        throw error;
      }

      console.log(`[STORAGE] Email delivery history added for user ${emailData.userId}`);
    } catch (error) {
      console.error('Error in addEmailDeliveryHistory:', error);
      throw error;
    }
  }

  async getEmailDeliveryHistory(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('email_delivery_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching email delivery history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEmailDeliveryHistory:', error);
      return [];
    }
  }

  // Report Scheduling methods
  async addReportSchedule(scheduleData: {
    userId: number;
    name: string;
    frequency: string;
    time: string;
    timezone: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    enabled: boolean;
    emailRecipients: string[];
    includeAttachment: boolean;
    customSubject?: string;
    reportTemplate: string;
    createdAt: string;
  }): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('report_schedules')
        .insert({
          user_id: scheduleData.userId,
          name: scheduleData.name,
          frequency: scheduleData.frequency,
          time: scheduleData.time,
          timezone: scheduleData.timezone,
          day_of_week: scheduleData.dayOfWeek,
          day_of_month: scheduleData.dayOfMonth,
          enabled: scheduleData.enabled,
          email_recipients: scheduleData.emailRecipients,
          include_attachment: scheduleData.includeAttachment,
          custom_subject: scheduleData.customSubject,
          report_template: scheduleData.reportTemplate,
          created_at: scheduleData.createdAt
        });

      if (error) {
        console.error('Error adding report schedule:', error);
        throw error;
      }

      console.log(`[STORAGE] Report schedule added for user ${scheduleData.userId}`);
    } catch (error) {
      console.error('Error in addReportSchedule:', error);
      throw error;
    }
  }

  async getReportSchedules(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('report_schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching report schedules:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReportSchedules:', error);
      return [];
    }
  }

  async updateReportSchedule(scheduleId: number, userId: number, updateData: any): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('report_schedules')
        .update(updateData)
        .eq('id', scheduleId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating report schedule:', error);
        throw error;
      }

      console.log(`[STORAGE] Report schedule ${scheduleId} updated for user ${userId}`);
    } catch (error) {
      console.error('Error in updateReportSchedule:', error);
      throw error;
    }
  }

  async deleteReportSchedule(scheduleId: number, userId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting report schedule:', error);
        throw error;
      }

      console.log(`[STORAGE] Report schedule ${scheduleId} deleted for user ${userId}`);
    } catch (error) {
      console.error('Error in deleteReportSchedule:', error);
      throw error;
    }
  }

  // Project Favorites methods
  async getUserProjectFavorites(userId: number): Promise<number[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_project_favorites')
        .select('project_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user project favorites:', error);
        throw error;
      }

      return data.map(fav => fav.project_id);
    } catch (error) {
      console.error('Error in getUserProjectFavorites:', error);
      throw error;
    }
  }

  async addProjectFavorite(userId: number, projectId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_project_favorites')
        .insert({
          user_id: userId,
          project_id: projectId
        });

      if (error) {
        console.error('Error adding project favorite:', error);
        throw error;
      }

      console.log(`[STORAGE] Project ${projectId} added to favorites for user ${userId}`);
    } catch (error) {
      console.error('Error in addProjectFavorite:', error);
      throw error;
    }
  }

  async removeProjectFavorite(userId: number, projectId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_project_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error removing project favorite:', error);
        throw error;
      }

      console.log(`[STORAGE] Project ${projectId} removed from favorites for user ${userId}`);
    } catch (error) {
      console.error('Error in removeProjectFavorite:', error);
      throw error;
    }
  }

  // Effort Summary Notes methods
  async getEffortSummaryNote(projectId: number, resourceId: number, changeLeadId: number): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('effort_summary_notes')
        .select('note')
        .eq('project_id', projectId)
        .eq('resource_id', resourceId)
        .eq('change_lead_id', changeLeadId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No note found
          return null;
        }
        console.error('Error fetching effort summary note:', error);
        throw error;
      }

      return data.note;
    } catch (error) {
      console.error('Error in getEffortSummaryNote:', error);
      throw error;
    }
  }

  async saveEffortSummaryNote(
    projectId: number,
    resourceId: number,
    changeLeadId: number,
    note: string,
    createdBy: number
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('effort_summary_notes')
        .upsert({
          project_id: projectId,
          resource_id: resourceId,
          change_lead_id: changeLeadId,
          note: note,
          created_by: createdBy,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving effort summary note:', error);
        throw error;
      }

      console.log(`[STORAGE] Effort summary note saved for project ${projectId}, resource ${resourceId}`);
    } catch (error) {
      console.error('Error in saveEffortSummaryNote:', error);
      throw error;
    }
  }

  async deleteEffortSummaryNote(projectId: number, resourceId: number, changeLeadId: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('effort_summary_notes')
        .delete()
        .eq('project_id', projectId)
        .eq('resource_id', resourceId)
        .eq('change_lead_id', changeLeadId);

      if (error) {
        console.error('Error deleting effort summary note:', error);
        throw error;
      }

      console.log(`[STORAGE] Effort summary note deleted for project ${projectId}, resource ${resourceId}`);
    } catch (error) {
      console.error('Error in deleteEffortSummaryNote:', error);
      throw error;
    }
  }

  // Management Dashboard KPI methods
  async getActiveProjectsTrend(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_active_projects_trend');

      if (error) {
        console.error('Error fetching active projects trend:', error);
        throw new Error(`Failed to fetch active projects trend: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Unexpected error in getActiveProjectsTrend:', err);
      throw err;
    }
  }

  async getUnderUtilisedResources(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_under_utilised_resources');

      if (error) {
        console.error('Error fetching under-utilised resources:', error);
        throw new Error(`Failed to fetch under-utilised resources: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Unexpected error in getUnderUtilisedResources:', err);
      throw err;
    }
  }

  async getOverUtilisedResources(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_over_utilised_resources');

      if (error) {
        console.error('Error fetching over-utilised resources:', error);
        throw new Error(`Failed to fetch over-utilised resources: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Unexpected error in getOverUtilisedResources:', err);
      throw err;
    }
  }

  async getUtilisationRateTrend(): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_utilisation_rate_trend');

      if (error) {
        console.error('Error fetching utilisation rate trend:', error);
        throw new Error(`Failed to fetch utilisation rate trend: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Unexpected error in getUtilisationRateTrend:', err);
      throw err;
    }
  }
}

export const storage = new DatabaseStorage();
