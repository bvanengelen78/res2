import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb, varchar, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Authentication system tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // Using email as primary login
  password: text("password").notNull(),
  resourceId: integer("resource_id").references(() => resources.id),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for JWT management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id", { length: 128 }).primaryKey(), // JWT session ID
  userId: integer("user_id").references(() => users.id).notNull(),
  resourceId: integer("resource_id").references(() => resources.id),
  token: text("token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  used: boolean("used").default(false),
});

// Password reset audit log
export const passwordResetAudit = pgTable("password_reset_audit", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => users.id).notNull(),
  targetUserId: integer("target_user_id").references(() => users.id).notNull(),
  resetAt: timestamp("reset_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// Role-based access control
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  resourceId: integer("resource_id").references(() => resources.id),
  role: varchar("role", { length: 50 }).notNull(), // regular_user, change_lead, manager_change, business_controller, admin
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
}, (table) => ({
  userResourceRoleIdx: uniqueIndex("user_resource_role_idx").on(table.userId, table.resourceId, table.role),
}));

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  department: text("department").notNull().default('IT Architecture & Delivery'),
  roles: jsonb("roles").$type<string[]>().default([]),
  skills: jsonb("skills").$type<string[]>(),
  weeklyCapacity: decimal("weekly_capacity", { precision: 5, scale: 2 }).notNull().default('40.00'),
  isActive: boolean("is_active").notNull().default(true),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default('active'), // draft, active, closure, rejected
  priority: text("priority").notNull().default('medium'), // low, medium, high
  type: text("type").notNull().default('business'), // change, business
  directorId: integer("director_id").references(() => resources.id),
  changeLeadId: integer("change_lead_id").references(() => resources.id),
  businessLeadId: integer("business_lead_id").references(() => resources.id),
  ogsmCharter: text("ogsm_charter"), // OGSM charter selection
  stream: text("stream"), // staff, region
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resourceAllocations = pgTable("resource_allocations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  allocatedHours: decimal("allocated_hours", { precision: 5, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  role: text("role"), // specific role for this allocation
  status: text("status").notNull().default('active'), // active, planned, completed
  weeklyAllocations: jsonb("weekly_allocations").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeOff = pgTable("time_off", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(), // vacation, sick, training, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time entries for actual hours worked
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  allocationId: integer("allocation_id").notNull().references(() => resourceAllocations.id),
  weekStartDate: date("week_start_date").notNull(), // Date for Monday of the week
  mondayHours: decimal("monday_hours", { precision: 4, scale: 2 }).default("0.00"),
  tuesdayHours: decimal("tuesday_hours", { precision: 4, scale: 2 }).default("0.00"),
  wednesdayHours: decimal("wednesday_hours", { precision: 4, scale: 2 }).default("0.00"),
  thursdayHours: decimal("thursday_hours", { precision: 4, scale: 2 }).default("0.00"),
  fridayHours: decimal("friday_hours", { precision: 4, scale: 2 }).default("0.00"),
  saturdayHours: decimal("saturday_hours", { precision: 4, scale: 2 }).default("0.00"),
  sundayHours: decimal("sunday_hours", { precision: 4, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weekly submission tracking
export const weeklySubmissions = pgTable("weekly_submissions", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  weekStartDate: date("week_start_date").notNull(), // Date for Monday of the week
  submittedAt: timestamp("submitted_at"),
  isSubmitted: boolean("is_submitted").default(false),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configuration tables
export const ogsmCharters = pgTable("ogsm_charters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification configuration table
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default('weekly_reminder'), // weekly_reminder, other types...
  isEnabled: boolean("is_enabled").notNull().default(true),
  reminderDay: integer("reminder_day").notNull().default(5), // 1=Monday, 5=Friday
  reminderTime: text("reminder_time").notNull().default('16:00'), // 24-hour format
  emailSubject: text("email_subject").notNull().default('Weekly Time Log Reminder'),
  emailTemplate: text("email_template").notNull().default('Hi [Name], please remember to submit your hours for Week [WeekNumber]. Click here to complete your log: [Link].'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alert configuration table
export const alertSettings = pgTable("alert_settings", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default('capacity'), // capacity, other types...
  warningThreshold: decimal("warning_threshold", { precision: 5, scale: 2 }).notNull().default('90.00'), // Percentage for warning alerts
  errorThreshold: decimal("error_threshold", { precision: 5, scale: 2 }).notNull().default('100.00'), // Percentage for error alerts
  criticalThreshold: decimal("critical_threshold", { precision: 5, scale: 2 }).notNull().default('120.00'), // Percentage for critical alerts
  underUtilizationThreshold: decimal("under_utilization_threshold", { precision: 5, scale: 2 }).notNull().default('50.00'), // Percentage for under-utilization info
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Non-project activities table for per-resource capacity tracking
export const nonProjectActivities = pgTable("non_project_activities", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  activityType: text("activity_type").notNull(), // 'Meetings', 'Administration', 'Training', 'Support', 'Other'
  hoursPerWeek: decimal("hours_per_week", { precision: 4, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recent reports tracking table
export const recentReports = pgTable("recent_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'Change Allocation', 'Utilization', 'Capacity', etc.
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  size: text("size"), // File size as string (e.g., "1.2 MB")
  criteria: jsonb("criteria").$type<Record<string, any>>(), // Store report criteria as JSON
  downloadUrl: text("download_url"), // Optional: for future file storage
  createdAt: timestamp("created_at").defaultNow(),
});

// User project favorites table
export const userProjectFavorites = pgTable("user_project_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure unique user-project combinations
  uniqueUserProject: unique().on(table.userId, table.projectId),
}));

// Effort summary notes table
export const effortSummaryNotes = pgTable("effort_summary_notes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  changeLeadId: integer("change_lead_id").notNull().references(() => resources.id),
  note: text("note").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure unique notes per project-resource-changeLead combination
  uniqueProjectResourceChangeLead: unique().on(table.projectId, table.resourceId, table.changeLeadId),
}));

// Relations
export const resourcesRelations = relations(resources, ({ one, many }) => ({
  allocations: many(resourceAllocations),
  timeOff: many(timeOff),
  nonProjectActivities: many(nonProjectActivities),
  timeEntries: many(timeEntries),
  weeklySubmissions: many(weeklySubmissions),
  directedProjects: many(projects, { relationName: "director" }),
  ledProjects: many(projects, { relationName: "changeLead" }),
  businessLeadProjects: many(projects, { relationName: "businessLead" }),
  user: one(users, {
    fields: [resources.id],
    references: [users.resourceId],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  allocations: many(resourceAllocations),
  director: one(resources, {
    fields: [projects.directorId],
    references: [resources.id],
    relationName: "director",
  }),
  changeLead: one(resources, {
    fields: [projects.changeLeadId],
    references: [resources.id],
    relationName: "changeLead",
  }),
  businessLead: one(resources, {
    fields: [projects.businessLeadId],
    references: [resources.id],
    relationName: "businessLead",
  }),
}));

export const resourceAllocationsRelations = relations(resourceAllocations, ({ one, many }) => ({
  project: one(projects, {
    fields: [resourceAllocations.projectId],
    references: [projects.id],
  }),
  resource: one(resources, {
    fields: [resourceAllocations.resourceId],
    references: [resources.id],
  }),
  timeEntries: many(timeEntries),
}));

export const timeOffRelations = relations(timeOff, ({ one }) => ({
  resource: one(resources, {
    fields: [timeOff.resourceId],
    references: [resources.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  resource: one(resources, {
    fields: [timeEntries.resourceId],
    references: [resources.id],
  }),
  allocation: one(resourceAllocations, {
    fields: [timeEntries.allocationId],
    references: [resourceAllocations.id],
  }),
}));

export const weeklySubmissionsRelations = relations(weeklySubmissions, ({ one }) => ({
  resource: one(resources, {
    fields: [weeklySubmissions.resourceId],
    references: [resources.id],
  }),
}));

export const nonProjectActivitiesRelations = relations(nonProjectActivities, ({ one }) => ({
  resource: one(resources, {
    fields: [nonProjectActivities.resourceId],
    references: [resources.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  resource: one(resources, {
    fields: [users.resourceId],
    references: [resources.id],
  }),
  sessions: many(userSessions),
  roles: many(userRoles),
  passwordResets: many(passwordResetTokens),
}));

// Authentication relations
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [userSessions.resourceId],
    references: [resources.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [userRoles.resourceId],
    references: [resources.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetAuditRelations = relations(passwordResetAudit, ({ one }) => ({
  adminUser: one(users, {
    fields: [passwordResetAudit.adminUserId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [passwordResetAudit.targetUserId],
    references: [users.id],
  }),
}));

export const userProjectFavoritesRelations = relations(userProjectFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userProjectFavorites.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [userProjectFavorites.projectId],
    references: [projects.id],
  }),
}));

export const effortSummaryNotesRelations = relations(effortSummaryNotes, ({ one }) => ({
  project: one(projects, {
    fields: [effortSummaryNotes.projectId],
    references: [projects.id],
  }),
  resource: one(resources, {
    fields: [effortSummaryNotes.resourceId],
    references: [resources.id],
  }),
  changeLead: one(resources, {
    fields: [effortSummaryNotes.changeLeadId],
    references: [resources.id],
  }),
  createdByUser: one(users, {
    fields: [effortSummaryNotes.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  createdAt: true,
  lastUsed: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
}).extend({
  role: z.enum(['regular_user', 'change_lead', 'manager_change', 'business_controller', 'admin']),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  createdAt: true,
});

export const insertPasswordResetAuditSchema = createInsertSchema(passwordResetAudit).omit({
  id: true,
  resetAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  role: z.string().min(1, "Job role is required"),
  department: z.string().min(1, "Department is required"),
  weeklyCapacity: z.string().regex(/^\d+(\.\d{1,2})?$/, "Weekly capacity must be a valid number with up to 2 decimal places").refine(
    (val) => {
      const num = parseFloat(val);
      return num >= 1 && num <= 60;
    },
    "Weekly capacity must be between 1 and 60 hours"
  ),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(['change', 'business']),
  status: z.enum(['draft', 'active', 'closure', 'rejected']),
  stream: z.enum(['staff', 'region']).optional(),
  ogsmCharter: z.string().optional(), // Allow any string value for dynamic OGSM charters
});

export const insertResourceAllocationSchema = createInsertSchema(resourceAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertTimeOffSchema = createInsertSchema(timeOff).omit({
  id: true,
  createdAt: true,
});

export const insertNonProjectActivitySchema = createInsertSchema(nonProjectActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  resourceId: z.number().min(1, "Resource ID is required"),
  activityType: z.enum(['Meetings', 'Administration', 'Training', 'Support', 'Other']),
  hoursPerWeek: z.string().regex(/^\d+(\.\d{1,2})?$/, "Hours per week must be a valid number with up to 2 decimal places").refine(
    (val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 40;
    },
    "Hours per week must be between 0 and 40"
  ),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Helper function to create hour field validation that accepts both string and number
const createHourFieldValidation = (dayName: string) =>
  z.preprocess(
    (val) => {
      // Convert to string if it's a number
      if (typeof val === 'number') {
        return val.toString();
      }
      // Handle empty strings, null, undefined
      if (val === '' || val === null || val === undefined) {
        return "0.00";
      }
      // Return as string
      return String(val);
    },
    z.string().refine(
      (val) => {
        // Parse and validate the numeric value
        const numVal = parseFloat(val);
        if (isNaN(numVal)) {
          return false;
        }
        return numVal >= 0 && numVal <= 24;
      },
      `${dayName} hours must be a valid number between 0 and 24`
    ).transform((val) => {
      // Format to ensure proper decimal format
      const numVal = parseFloat(val);
      return numVal.toFixed(2);
    })
  );

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  mondayHours: createHourFieldValidation("Monday").optional(),
  tuesdayHours: createHourFieldValidation("Tuesday").optional(),
  wednesdayHours: createHourFieldValidation("Wednesday").optional(),
  thursdayHours: createHourFieldValidation("Thursday").optional(),
  fridayHours: createHourFieldValidation("Friday").optional(),
  saturdayHours: createHourFieldValidation("Saturday").optional(),
  sundayHours: createHourFieldValidation("Sunday").optional(),
});

export const insertWeeklySubmissionSchema = createInsertSchema(weeklySubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOgsmCharterSchema = createInsertSchema(ogsmCharters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecentReportSchema = createInsertSchema(recentReports).omit({
  id: true,
  createdAt: true,
});

export const insertUserProjectFavoriteSchema = createInsertSchema(userProjectFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertEffortSummaryNoteSchema = createInsertSchema(effortSummaryNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type PasswordResetAudit = typeof passwordResetAudit.$inferSelect;
export type InsertPasswordResetAudit = z.infer<typeof insertPasswordResetAuditSchema>;

// Role definitions
export const ROLES = {
  REGULAR_USER: 'regular_user',
  CHANGE_LEAD: 'change_lead',
  MANAGER_CHANGE: 'manager_change',
  BUSINESS_CONTROLLER: 'business_controller',
  ADMIN: 'admin',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// Permission definitions - Extended for RBA
export const PERMISSIONS = {
  TIME_LOGGING: 'time_logging',
  REPORTS: 'reports',
  CHANGE_LEAD_REPORTS: 'change_lead_reports',
  RESOURCE_MANAGEMENT: 'resource_management',
  PROJECT_MANAGEMENT: 'project_management',
  USER_MANAGEMENT: 'user_management',
  SYSTEM_ADMIN: 'system_admin',
  DASHBOARD: 'dashboard',
  CALENDAR: 'calendar',
  SUBMISSION_OVERVIEW: 'submission_overview',
  SETTINGS: 'settings',
  ROLE_MANAGEMENT: 'role_management',
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Menu item definitions for RBA
export const MENU_ITEMS = {
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  RESOURCES: 'resources',
  CALENDAR: 'calendar',
  TIME_LOGGING: 'time_logging',
  SUBMISSION_OVERVIEW: 'submission_overview',
  REPORTS: 'reports',
  CHANGE_LEAD_REPORTS: 'change_lead_reports',
  SETTINGS: 'settings',
} as const;

export type MenuItemType = typeof MENU_ITEMS[keyof typeof MENU_ITEMS];

// Role-permission mapping - Updated for comprehensive RBA
export const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [ROLES.REGULAR_USER]: [
    PERMISSIONS.TIME_LOGGING,
    PERMISSIONS.DASHBOARD,
  ],
  [ROLES.CHANGE_LEAD]: [
    PERMISSIONS.TIME_LOGGING,
    PERMISSIONS.CHANGE_LEAD_REPORTS,
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.REPORTS,
  ],
  [ROLES.MANAGER_CHANGE]: [
    PERMISSIONS.TIME_LOGGING,
    PERMISSIONS.REPORTS,
    PERMISSIONS.CHANGE_LEAD_REPORTS,
    PERMISSIONS.RESOURCE_MANAGEMENT,
    PERMISSIONS.PROJECT_MANAGEMENT,
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.CALENDAR,
    PERMISSIONS.SUBMISSION_OVERVIEW,
    PERMISSIONS.SETTINGS,
  ],
  [ROLES.BUSINESS_CONTROLLER]: [
    PERMISSIONS.TIME_LOGGING,
    PERMISSIONS.REPORTS,
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.SUBMISSION_OVERVIEW,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.TIME_LOGGING,
    PERMISSIONS.REPORTS,
    PERMISSIONS.CHANGE_LEAD_REPORTS,
    PERMISSIONS.RESOURCE_MANAGEMENT,
    PERMISSIONS.PROJECT_MANAGEMENT,
    PERMISSIONS.USER_MANAGEMENT,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.CALENDAR,
    PERMISSIONS.SUBMISSION_OVERVIEW,
    PERMISSIONS.SETTINGS,
    PERMISSIONS.ROLE_MANAGEMENT,
  ],
};

// Menu item to permission mapping
export const MENU_PERMISSIONS: Record<MenuItemType, PermissionType[]> = {
  [MENU_ITEMS.DASHBOARD]: [PERMISSIONS.DASHBOARD],
  [MENU_ITEMS.PROJECTS]: [PERMISSIONS.PROJECT_MANAGEMENT],
  [MENU_ITEMS.RESOURCES]: [PERMISSIONS.RESOURCE_MANAGEMENT],
  [MENU_ITEMS.CALENDAR]: [PERMISSIONS.CALENDAR],
  [MENU_ITEMS.TIME_LOGGING]: [PERMISSIONS.TIME_LOGGING],
  [MENU_ITEMS.SUBMISSION_OVERVIEW]: [PERMISSIONS.SUBMISSION_OVERVIEW],
  [MENU_ITEMS.REPORTS]: [PERMISSIONS.REPORTS],
  [MENU_ITEMS.CHANGE_LEAD_REPORTS]: [PERMISSIONS.CHANGE_LEAD_REPORTS],
  [MENU_ITEMS.SETTINGS]: [PERMISSIONS.SETTINGS],
};

// User with roles and permissions
export type UserWithRoles = User & {
  resource?: Resource;
  roles: UserRole[];
  permissions: PermissionType[];
};

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ResourceAllocation = typeof resourceAllocations.$inferSelect;
export type InsertResourceAllocation = z.infer<typeof insertResourceAllocationSchema>;

export type TimeOff = typeof timeOff.$inferSelect;
export type InsertTimeOff = z.infer<typeof insertTimeOffSchema>;

export type NonProjectActivity = typeof nonProjectActivities.$inferSelect;
export type InsertNonProjectActivity = typeof nonProjectActivities.$inferInsert;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type WeeklySubmission = typeof weeklySubmissions.$inferSelect;
export type InsertWeeklySubmission = z.infer<typeof insertWeeklySubmissionSchema>;

export type OgsmCharter = typeof ogsmCharters.$inferSelect;
export type InsertOgsmCharter = z.infer<typeof insertOgsmCharterSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type RecentReport = typeof recentReports.$inferSelect;
export type InsertRecentReport = z.infer<typeof insertRecentReportSchema>;

export type UserProjectFavorite = typeof userProjectFavorites.$inferSelect;
export type InsertUserProjectFavorite = z.infer<typeof insertUserProjectFavoriteSchema>;

export type EffortSummaryNote = typeof effortSummaryNotes.$inferSelect;
export type InsertEffortSummaryNote = z.infer<typeof insertEffortSummaryNoteSchema>;

// Extended types with relations
export type ResourceWithAllocations = Resource & {
  allocations: (ResourceAllocation & { project: Project })[];
  timeOff: TimeOff[];
};

export type ProjectWithAllocations = Project & {
  allocations: (ResourceAllocation & { resource: Resource })[];
  director?: Resource | null;
  changeLead?: Resource | null;
  businessLead?: Resource | null;
};

// Enhanced Alert Data Structures
export interface AlertResource {
  id: number;
  name: string;
  utilization: number; // Percentage
  allocatedHours: number;
  capacity: number;
  department?: string;
  role?: string;
}

export interface AlertCategory {
  type: 'critical' | 'error' | 'warning' | 'info' | 'unassigned' | 'conflicts' | 'untapped';
  title: string;
  description: string;
  count: number;
  resources: AlertResource[];
  threshold?: number; // The threshold that triggered this category
  color: string; // Color coding for UI
  icon: string; // Icon identifier for UI
}

export interface EnhancedCapacityAlerts {
  categories: AlertCategory[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    unassignedCount: number;
  };
  metadata: {
    department?: string;
    startDate?: string;
    endDate?: string;
    generatedAt: string;
  };
}
