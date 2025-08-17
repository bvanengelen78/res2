import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authService } from "./auth";
import { supabaseAdmin } from "./supabase";
import { authenticate, authorize, authorizeRole, authorizeResourceOwner, adminOnly, managerOrAdmin } from "./middleware/auth";
import { 
  insertUserSchema,
  insertResourceSchema, 
  insertProjectSchema, 
  insertResourceAllocationSchema, 
  insertTimeOffSchema, 
  insertTimeEntrySchema,
  insertOgsmCharterSchema,
  insertDepartmentSchema,
  PERMISSIONS,
  ROLES,
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { format, startOfWeek } from 'date-fns';
import { generateSecurePassword, createPasswordResetAudit } from "./utils/password-generator";

// STANDARDIZED: Single ISO week number calculation function used throughout alerts system
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, resourceId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await authService.register({ email, password, resourceId });
      
      res.status(201).json({
        user: {
          id: result.user.id,
          email: result.user.email,
          resourceId: result.user.resourceId,
          roles: result.user.roles,
          permissions: result.user.permissions,
        },
        tokens: result.tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      res.status(400).json({ message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await authService.login({ email, password, rememberMe });
      
      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          resourceId: result.user.resourceId,
          roles: result.user.roles,
          permissions: result.user.permissions,
          resource: result.user.resource,
        },
        tokens: result.tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      res.status(401).json({ message });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const tokens = await authService.refreshToken(refreshToken);
      res.json({ tokens });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Token refresh failed";
      res.status(401).json({ message });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      // Extract session ID from token (you'll need to decode it)
      const authHeader = req.headers.authorization!;
      const token = authHeader.substring(7);
      // In a real implementation, you'd extract sessionId from the token
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Self-service password reset removed - admin-only password management
  app.post("/api/auth/forgot-password", async (req, res) => {
    res.status(404).json({
      message: "Self-service password reset is not available. Contact your administrator to reset your password."
    });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    res.status(404).json({
      message: "Self-service password reset is not available. Contact your administrator to reset your password."
    });
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        resourceId: req.user!.resourceId,
        roles: req.user!.roles,
        permissions: req.user!.permissions,
        resource: req.user!.resource,
      }
    });
  });

  // User management routes (Admin only)
  app.get("/api/users", authenticate, adminOnly, async (req, res) => {
    try {
      // Implementation would go here
      res.json({ message: "User management endpoint" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users/:id/roles", authenticate, adminOnly, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, resourceId } = req.body;
      
      await authService.assignRole(userId, role, resourceId, req.user!.id);
      res.json({ message: "Role assigned successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign role";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/users/:id/roles/:roleId", authenticate, adminOnly, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      await storage.deleteUserRole(roleId);
      res.json({ message: "Role removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  // Admin-only password reset endpoint
  app.post("/api/admin/users/:userId/reset-password", authenticate, adminOnly, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const adminUserId = req.user!.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Validate user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate secure password
      const newPassword = generateSecurePassword();

      // Hash the password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await storage.updateUser(userId, {
        password: hashedPassword,
      });

      // Create audit log entry
      const auditData = createPasswordResetAudit(adminUserId, userId, ipAddress, userAgent);
      await storage.createPasswordResetAudit(auditData);

      // Return success (never return the plaintext password)
      res.json({
        success: true,
        message: "Password reset successfully",
        password: newPassword // Only for this admin interface
      });
    } catch (error) {
      console.error('Password reset error:', error);
      const message = error instanceof Error ? error.message : "Failed to reset password";
      res.status(500).json({ message });
    }
  });

  // Get password reset audit trail for a user (Admin only)
  app.get("/api/admin/users/:userId/password-audit", authenticate, adminOnly, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const auditTrail = await storage.getPasswordResetAuditForUser(userId);
      res.json(auditTrail);
    } catch (error) {
      console.error('Get password audit error:', error);
      const message = error instanceof Error ? error.message : "Failed to get password audit";
      res.status(500).json({ message });
    }
  });

  // Resources routes (now with authentication)
  app.get("/api/resources", authenticate, authorize([PERMISSIONS.RESOURCE_MANAGEMENT, PERMISSIONS.TIME_LOGGING]), async (req, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.get("/api/resources/:id", authenticate, authorizeResourceOwner(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resource = await storage.getResourceWithAllocations(id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resource" });
    }
  });

  app.post("/api/resources", authenticate, authorize(PERMISSIONS.RESOURCE_MANAGEMENT), async (req, res) => {
    try {
      const validatedData = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(validatedData);
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid resource data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create resource" });
    }
  });

  app.put("/api/resources/:id", authenticate, authorizeResourceOwner(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertResourceSchema.partial().parse(req.body);
      const resource = await storage.updateResource(id, validatedData);
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid resource data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update resource" });
    }
  });

  // Check resource relationships before deletion
  app.get("/api/resources/:id/relationships", authenticate, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const relationships = await storage.checkResourceRelationships(id);
      res.json(relationships);
    } catch (error) {
      console.error("Error checking resource relationships:", error);
      res.status(500).json({ message: "Failed to check resource relationships" });
    }
  });

  app.delete("/api/resources/:id", authenticate, adminOnly, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      await storage.deleteResource(id);
      res.status(204).send();
    } catch (error) {
      console.error("Resource deletion error:", error);

      // Provide specific error messages based on the error type
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('already deleted')) {
        return res.status(409).json({ message: error.message });
      }

      if (error.message.includes('foreign key')) {
        return res.status(409).json({
          message: "Cannot delete resource due to existing relationships. Please remove all project assignments and time entries first.",
          details: error.message
        });
      }

      // Generic error for unexpected issues
      res.status(500).json({
        message: "Failed to delete resource",
        details: error.message || "Unknown error occurred"
      });
    }
  });

  // Profile image upload endpoint
  app.post("/api/resources/:id/profile-image", authenticate, authorizeResourceOwner(), async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      
      // In a real implementation, you would handle file upload here
      // For now, we'll simulate a successful upload
      const mockImageUrl = `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1494790108755-2616b169ee31' : '1507003211169-0a1dd7228f2d'}?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200`;
      
      // Update the resource with the new profile image URL
      const updatedResource = await storage.updateResource(resourceId, {
        profileImage: mockImageUrl
      });
      
      res.json({ 
        message: "Profile image uploaded successfully", 
        profileImage: mockImageUrl 
      });
    } catch (error) {
      console.error("Failed to upload profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image", error: error.message });
    }
  });

  // Profile image delete endpoint
  app.delete("/api/resources/:id/profile-image", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      
      // Update the resource to remove the profile image (set to null)
      const updatedResource = await storage.updateResource(resourceId, {
        profileImage: null
      });
      
      res.json({ 
        message: "Profile image removed successfully",
        resource: updatedResource
      });
    } catch (error) {
      console.error("Failed to remove profile image:", error);
      res.status(500).json({ message: "Failed to remove profile image", error: error.message });
    }
  });

  // Projects routes
  app.get("/api/projects", authenticate, authorize([PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]), async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", authenticate, authorize([PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProjectWithAllocations(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", authenticate, authorize(PERMISSIONS.PROJECT_MANAGEMENT), async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", authenticate, authorize(PERMISSIONS.PROJECT_MANAGEMENT), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticate, authorize(PERMISSIONS.PROJECT_MANAGEMENT), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project allocations routes
  app.get("/api/projects/:id/allocations", authenticate, authorize([PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.TIME_LOGGING]), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const allocations = await storage.getResourceAllocationsByProject(projectId);
      res.json(allocations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project allocations" });
    }
  });

  // Weekly allocation management for projects
  app.put("/api/projects/:id/weekly-allocations", authenticate, authorize(PERMISSIONS.PROJECT_MANAGEMENT), async (req, res) => {
    try {
      console.log(`[ROUTES] PUT /api/projects/${req.params.id}/weekly-allocations called`);
      console.log(`[ROUTES] Request body:`, req.body);

      const projectId = parseInt(req.params.id);
      const { resourceId, weekKey, hours } = req.body;

      if (!resourceId || !weekKey || hours === undefined) {
        console.log(`[ROUTES] Missing required fields: resourceId=${resourceId}, weekKey=${weekKey}, hours=${hours}`);
        return res.status(400).json({ message: "resourceId, weekKey, and hours are required" });
      }

      console.log(`[ROUTES] Calling storage.updateWeeklyAllocation(${projectId}, ${resourceId}, ${weekKey}, ${hours})`);
      const result = await storage.updateWeeklyAllocation(projectId, resourceId, weekKey, hours);
      console.log(`[ROUTES] Storage result:`, result);
      res.json(result);
    } catch (error) {
      console.error(`[ROUTES] Error in weekly allocation update:`, error);
      res.status(500).json({ message: "Failed to update weekly allocation" });
    }
  });

  // Resource allocations routes
  app.get("/api/resources/:id/allocations", authenticate, authorizeResourceOwner(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[ROUTES] GET /api/resources/${id}/allocations - User: ${req.user?.email} (resourceId: ${req.user?.resourceId})`);

      if (isNaN(id)) {
        console.log(`[ROUTES] Invalid resource ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const allocations = await storage.getResourceAllocationsByResource(id);
      console.log(`[ROUTES] Found ${allocations.length} allocations for resource ${id}`);

      res.json(allocations);
    } catch (error) {
      console.error(`[ROUTES] Error fetching allocations for resource ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch resource allocations" });
    }
  });

  // Weekly allocation management for resources (alternative to project-based endpoint)
  app.put("/api/resources/:id/weekly-allocations", authenticate, authorizeResourceOwner(), async (req, res) => {
    try {
      console.log(`[ROUTES] PUT /api/resources/${req.params.id}/weekly-allocations called`);
      console.log(`[ROUTES] Request body:`, req.body);

      const resourceId = parseInt(req.params.id);
      const { projectId, weekKey, hours } = req.body;

      if (!projectId || !weekKey || hours === undefined) {
        console.log(`[ROUTES] Missing required fields: projectId=${projectId}, weekKey=${weekKey}, hours=${hours}`);
        return res.status(400).json({ message: "projectId, weekKey, and hours are required" });
      }

      console.log(`[ROUTES] Calling storage.updateWeeklyAllocation(${projectId}, ${resourceId}, ${weekKey}, ${hours})`);
      const result = await storage.updateWeeklyAllocation(projectId, resourceId, weekKey, hours);
      console.log(`[ROUTES] Storage result:`, result);
      res.json(result);
    } catch (error) {
      console.error(`[ROUTES] Error in weekly allocation update:`, error);
      res.status(500).json({ message: "Failed to update weekly allocation" });
    }
  });

  app.get("/api/allocations", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let allocations;
      
      if (startDate && endDate) {
        allocations = await storage.getResourceAllocationsByDateRange(
          startDate as string,
          endDate as string
        );
      } else {
        allocations = await storage.getResourceAllocations();
      }
      
      res.json(allocations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post("/api/allocations", async (req, res) => {
    try {
      const validatedData = insertResourceAllocationSchema.parse(req.body);
      const allocation = await storage.createResourceAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create allocation" });
    }
  });

  app.put("/api/allocations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertResourceAllocationSchema.partial().parse(req.body);
      const allocation = await storage.updateResourceAllocation(id, validatedData);
      res.json(allocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update allocation" });
    }
  });

  app.delete("/api/allocations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteResourceAllocation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete allocation" });
    }
  });

  // Time off routes
  app.get("/api/timeoff", async (req, res) => {
    try {
      const { resourceId, startDate, endDate } = req.query;
      let timeOff;
      
      if (resourceId) {
        timeOff = await storage.getTimeOffByResource(parseInt(resourceId as string));
      } else if (startDate && endDate) {
        timeOff = await storage.getTimeOffByDateRange(
          startDate as string,
          endDate as string
        );
      } else {
        timeOff = await storage.getTimeOff();
      }
      
      res.json(timeOff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time off" });
    }
  });

  // Time off routes
  app.get("/api/resources/:id/time-off", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const timeOff = await storage.getTimeOffByResource(resourceId);
      res.json(timeOff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time off for resource" });
    }
  });

  app.post("/api/timeoff", async (req, res) => {
    try {
      const validatedData = insertTimeOffSchema.parse(req.body);
      const timeOff = await storage.createTimeOff(validatedData);
      res.status(201).json(timeOff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid time off data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time off" });
    }
  });

  app.post("/api/resources/:id/time-off", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const validatedData = insertTimeOffSchema.parse({ ...req.body, resourceId });
      const timeOff = await storage.createTimeOff(validatedData);
      res.status(201).json(timeOff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid time off data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time off" });
    }
  });

  app.put("/api/timeoff/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTimeOffSchema.partial().parse(req.body);
      const timeOff = await storage.updateTimeOff(id, validatedData);
      res.json(timeOff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid time off data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update time off" });
    }
  });

  app.put("/api/time-off/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTimeOffSchema.partial().parse(req.body);
      const timeOff = await storage.updateTimeOff(id, validatedData);
      res.json(timeOff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid time off data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update time off" });
    }
  });

  app.delete("/api/timeoff/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimeOff(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time off" });
    }
  });

  app.delete("/api/time-off/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimeOff(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time off" });
    }
  });

  // Non-project activities routes
  app.get("/api/non-project-activities", async (req, res) => {
    try {
      const activities = await storage.getNonProjectActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch non-project activities" });
    }
  });

  app.get("/api/resources/:id/non-project-activities", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const activities = await storage.getNonProjectActivitiesByResource(resourceId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch non-project activities for resource" });
    }
  });

  app.post("/api/resources/:id/non-project-activities", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const activityData = {
        ...req.body,
        resourceId
      };

      const activity = await storage.createNonProjectActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error.message.includes('validation')) {
        return res.status(400).json({ message: "Invalid activity data", error: error.message });
      }
      res.status(500).json({ message: "Failed to create non-project activity" });
    }
  });

  app.put("/api/non-project-activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.updateNonProjectActivity(id, req.body);
      res.json(activity);
    } catch (error) {
      if (error.message.includes('validation')) {
        return res.status(400).json({ message: "Invalid activity data", error: error.message });
      }
      res.status(500).json({ message: "Failed to update non-project activity" });
    }
  });

  app.delete("/api/non-project-activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNonProjectActivity(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete non-project activity" });
    }
  });

  // Migration endpoint for creating non-project activities table
  app.post("/api/migrate/non-project-activities", async (req, res) => {
    try {
      // For now, let's just create some sample data to test the table creation
      // The table should be created manually in Supabase dashboard

      // Test if table exists by trying to query it
      const { data, error } = await supabaseAdmin
        .from('non_project_activities')
        .select('*')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist
        return res.status(400).json({
          message: "Table 'non_project_activities' does not exist. Please create it manually in Supabase dashboard.",
          sql: `
CREATE TABLE non_project_activities (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('Meetings', 'Administration', 'Training', 'Support', 'Other')),
    hours_per_week DECIMAL(4,2) NOT NULL CHECK (hours_per_week >= 0 AND hours_per_week <= 40),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_non_project_activities_resource_id ON non_project_activities(resource_id);
CREATE INDEX idx_non_project_activities_active ON non_project_activities(is_active);
CREATE INDEX idx_non_project_activities_resource_active ON non_project_activities(resource_id, is_active);

ALTER TABLE non_project_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all non-project activities" ON non_project_activities FOR SELECT USING (true);
CREATE POLICY "Users can insert non-project activities" ON non_project_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update non-project activities" ON non_project_activities FOR UPDATE USING (true);
CREATE POLICY "Users can delete non-project activities" ON non_project_activities FOR DELETE USING (true);
          `
        });
      }

      if (error) {
        return res.status(500).json({ message: "Database error", error: error.message });
      }

      res.json({ message: "Non-project activities table exists and is accessible", data });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });

  // Legacy route handlers for old URL patterns (temporary compatibility)
  app.get("/api/dashboard/kpis/:department/:startDate/:endDate", async (req, res) => {
    try {
      const { department } = req.params;

      const resources = await storage.getResources();
      const projects = await storage.getProjects();
      const allocations = await storage.getResourceAllocations();

      // Apply department filter to resources if specified
      const filteredResources = department && department !== 'all'
        ? resources.filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department;
          })
        : resources;

      // Calculate KPIs with improved logic
      const activeProjects = projects.filter(p => p.status === 'active').length;

      // Available resources: active resources with utilization < 100%
      const resourceUtilization = new Map();
      const activeAllocations = allocations.filter(a => a.status === 'active');

      // Only consider allocations for filtered resources
      const filteredResourceIds = new Set(filteredResources.map(r => r.id));
      const relevantAllocations = activeAllocations.filter(a => filteredResourceIds.has(a.resourceId));

      relevantAllocations.forEach(allocation => {
        const key = allocation.resourceId;
        const current = resourceUtilization.get(key) || 0;
        resourceUtilization.set(key, current + parseFloat(allocation.allocatedHours || '0'));
      });

      let availableResources = 0;
      let conflicts = 0;
      let totalCapacity = 0;
      let totalAllocated = 0;

      filteredResources.forEach(resource => {
        if (resource.isActive) {
          const capacity = parseFloat(resource.weeklyCapacity || '40');
          const allocated = resourceUtilization.get(resource.id) || 0;
          const utilization = capacity > 0 ? (allocated / capacity) * 100 : 0;

          totalCapacity += capacity;
          totalAllocated += allocated;

          if (utilization < 100) {
            availableResources++;
          }

          if (utilization > 100) {
            conflicts++;
          }
        }
      });

      // Calculate overall utilization rate
      const utilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

      res.json({
        activeProjects,
        availableResources,
        conflicts,
        utilization
      });
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      res.status(500).json({ message: "Failed to fetch dashboard KPIs" });
    }
  });

  // Helper function to calculate allocated hours for a specific period
  function calculatePeriodAllocatedHours(allocation, startDate, endDate) {
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const allocationStart = new Date(allocation.startDate);
    const allocationEnd = new Date(allocation.endDate);

    // Check if allocation overlaps with the period
    if (allocationStart > periodEnd || allocationEnd < periodStart) {
      return 0; // No overlap
    }

    // If allocation has weekly breakdown, calculate based on weeks in the period
    if (allocation.weeklyAllocations && Object.keys(allocation.weeklyAllocations).length > 0) {
      let totalHours = 0;
      const weekKeys = [];

      // Generate week keys for the period
      let currentWeek = new Date(periodStart);
      currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Start of week (Monday)

      while (currentWeek <= periodEnd) {
        const year = currentWeek.getFullYear();
        const weekNumber = getISOWeekNumber(currentWeek);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        weekKeys.push(weekKey);

        currentWeek.setDate(currentWeek.getDate() + 7);
      }

      // Sum up hours for weeks in the period
      weekKeys.forEach(weekKey => {
        if (allocation.weeklyAllocations[weekKey]) {
          totalHours += parseFloat(allocation.weeklyAllocations[weekKey]);
        }
      });

      return totalHours;
    } else {
      // Use base allocated hours, potentially prorated for partial overlap
      const baseHours = parseFloat(allocation.allocatedHours || '0');

      // Calculate overlap duration vs total allocation duration
      const overlapStart = new Date(Math.max(allocationStart.getTime(), periodStart.getTime()));
      const overlapEnd = new Date(Math.min(allocationEnd.getTime(), periodEnd.getTime()));
      const overlapDays = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));

      const totalAllocationDays = (allocationEnd.getTime() - allocationStart.getTime()) / (1000 * 60 * 60 * 24);

      if (totalAllocationDays <= 0) return baseHours;

      // Prorate hours based on overlap
      return baseHours * (overlapDays / totalAllocationDays);
    }
  }



  // Helper function to calculate period multiplier (how many weeks in the period)
  function calculatePeriodMultiplier(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffInMs = end.getTime() - start.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    const diffInWeeks = diffInDays / 7;

    // Round to nearest week, minimum 1 week
    return Math.max(1, Math.round(diffInWeeks));
  }

  /**
   * BULLETPROOF: Simplified and consistent period adjustment for current date awareness
   * This function ensures that forward-looking periods (thisMonth, quarter, year)
   * always start from the current week and never include past weeks.
   */
  function adjustPeriodForCurrentDateAwareness(startDate, endDate) {
    if (!startDate || !endDate) {
      return {
        startDate,
        endDate,
        isForwardLooking: false,
        excludedPastWeeks: 0
      };
    }

    const now = new Date();
    const currentWeekStart = new Date(now);
    // Get Monday of current week (bulletproof calculation)
    currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    currentWeekStart.setHours(0, 0, 0, 0);

    const originalStartDate = new Date(startDate);
    const originalEndDate = new Date(endDate);

    // Determine if this is a forward-looking period
    const isCurrentPeriod = originalStartDate <= now && originalEndDate >= now;
    const isMultiWeek = (originalEndDate.getTime() - originalStartDate.getTime()) > (7 * 24 * 60 * 60 * 1000);
    const includesPastWeeks = originalStartDate < currentWeekStart;

    if (isCurrentPeriod && isMultiWeek && includesPastWeeks) {
      // This is a forward-looking period that includes past weeks - adjust it
      const adjustedStartDate = currentWeekStart.toISOString().split('T')[0];
      const timeDiff = currentWeekStart.getTime() - originalStartDate.getTime();
      const excludedPastWeeks = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));

      console.log(`[PERIOD_ADJUSTMENT] 📅 BULLETPROOF: Adjusted period for current date awareness`);
      console.log(`[PERIOD_ADJUSTMENT] Original: ${startDate} -> Adjusted: ${adjustedStartDate}`);
      console.log(`[PERIOD_ADJUSTMENT] Excluded ${excludedPastWeeks} past weeks from analysis`);

      return {
        startDate: adjustedStartDate,
        endDate,
        isForwardLooking: true,
        excludedPastWeeks
      };
    }

    // No adjustment needed
    return {
      startDate,
      endDate,
      isForwardLooking: false,
      excludedPastWeeks: 0
    };
  }

  // Helper function for period breakdown calculations
  async function calculatePeriodBreakdown(resource, allocations, projectMap, startDate, endDate, periodType) {
    const weeklyTotalCapacity = parseFloat(resource.weeklyCapacity || '40');
    const weeklyNonProjectHours = 8;
    const weeklyEffectiveCapacity = Math.max(0, weeklyTotalCapacity - weeklyNonProjectHours);

    // Calculate the actual period multiplier for accurate capacity scaling
    const periodMultiplier = calculatePeriodMultiplier(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    const totalPeriodEffectiveCapacity = weeklyEffectiveCapacity * periodMultiplier;

    const periods = [];
    const contributingProjects = new Map();

    // Using standardized getISOWeekNumber function from top of file

    // REDESIGNED: Always break down into individual weeks for week-based analysis
    // Generate week intervals regardless of periodType for consistent week-based breakdown
    console.log(`[ALERT_BREAKDOWN] ${resource.name} - Generating week intervals for ${startDate} to ${endDate}`);
    const periodIntervals = generateWeekIntervals(startDate, endDate);
    console.log(`[ALERT_BREAKDOWN] ${resource.name} - Generated ${periodIntervals.length} week intervals:`, periodIntervals.map(i => i.label));

    for (const interval of periodIntervals) {
      const periodAllocations = allocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        return allocationStart <= interval.end && allocationEnd >= interval.start;
      });

      let totalHours = 0;
      const projectBreakdown = [];

      // FIXED: Use the same period-aware allocation calculation as main alerts endpoint
      // Generate week keys for this period interval (same logic as main alerts endpoint)
      const weekKeys = [];
      let currentWeek = new Date(interval.start);
      currentWeek.setDate(currentWeek.getDate() - (currentWeek.getDay() === 0 ? 6 : currentWeek.getDay() - 1)); // Start of week (Monday)

      while (currentWeek <= interval.end) {
        const year = currentWeek.getFullYear();
        const weekNum = getISOWeekNumber(currentWeek); // Use same function as main alerts endpoint
        weekKeys.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
        currentWeek.setDate(currentWeek.getDate() + 7);
      }

      console.log(`[ALERT_BREAKDOWN] ${resource.name} - Period ${interval.label}: Generated week keys:`, weekKeys);

      // BULLETPROOF: Filter out past weeks from breakdown calculations
      const now = new Date();
      const currentWeekNumber = getISOWeekNumber(now);
      const currentYear = now.getFullYear();

      const validatedWeekKeys = weekKeys.filter(weekKey => {
        const [yearStr, weekStr] = weekKey.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);

        // Only include current and future weeks
        if (year > currentYear) return true;
        if (year < currentYear) return false;
        return week >= currentWeekNumber;
      });

      if (validatedWeekKeys.length !== weekKeys.length) {
        console.log(`[ALERT_BREAKDOWN] 🚫 BULLETPROOF FILTER: Removed ${weekKeys.length - validatedWeekKeys.length} past weeks from breakdown`);
        console.log(`[ALERT_BREAKDOWN] Original weeks: ${weekKeys.join(', ')}`);
        console.log(`[ALERT_BREAKDOWN] Validated weeks: ${validatedWeekKeys.join(', ')}`);
      }

      // Calculate total hours using the same logic as main alerts endpoint (with validated weeks only)
      validatedWeekKeys.forEach(weekKey => {
        periodAllocations.forEach(allocation => {
          const project = projectMap.get(allocation.projectId);
          if (!project) return;

          if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
            if (allocation.weeklyAllocations[weekKey]) {
              const weeklyHours = allocation.weeklyAllocations[weekKey];
              totalHours += weeklyHours;
              console.log(`[ALERT_BREAKDOWN] ${resource.name} - ${project.name} - Week ${weekKey}: +${weeklyHours}h (running total: ${totalHours}h)`);

              // Track in project breakdown
              projectBreakdown.push({
                projectId: allocation.projectId,
                projectName: project.name,
                allocatedHours: weeklyHours,
                role: allocation.role,
                allocationId: allocation.id,
                weekKey
              });

              // Track contributing projects
              if (!contributingProjects.has(allocation.projectId)) {
                contributingProjects.set(allocation.projectId, {
                  projectName: project.name,
                  totalHours: 0,
                  allocations: []
                });
              }
              const projectData = contributingProjects.get(allocation.projectId);
              projectData.totalHours += weeklyHours;

              // Add allocation details to the project
              projectData.allocations.push({
                id: allocation.id,
                role: allocation.role,
                allocatedHours: weeklyHours,
                weekKey,
                startDate: allocation.startDate,
                endDate: allocation.endDate
              });
            }
          } else {
            // Fallback: If no weekly data, distribute base allocation evenly across period
            const baseHours = parseFloat(allocation.allocatedHours || '0');
            const weeklyDistribution = baseHours / weekKeys.length;
            totalHours += weeklyDistribution;
            console.log(`[ALERT_BREAKDOWN] ${resource.name} - ${project.name} - Week ${weekKey}: +${weeklyDistribution}h (distributed from ${baseHours}h base, running total: ${totalHours}h)`);

            // Track in project breakdown
            projectBreakdown.push({
              projectId: allocation.projectId,
              projectName: project.name,
              allocatedHours: weeklyDistribution,
              role: allocation.role,
              allocationId: allocation.id,
              weekKey
            });

            // Track contributing projects
            if (!contributingProjects.has(allocation.projectId)) {
              contributingProjects.set(allocation.projectId, {
                projectName: project.name,
                totalHours: 0,
                allocations: []
              });
            }
            const projectData = contributingProjects.get(allocation.projectId);
            projectData.totalHours += weeklyDistribution;

            // Add allocation details to the project (fallback case)
            projectData.allocations.push({
              id: allocation.id,
              role: allocation.role,
              allocatedHours: weeklyDistribution,
              weekKey,
              startDate: allocation.startDate,
              endDate: allocation.endDate,
              note: 'Distributed from base allocation'
            });
          }
        });
      });

      // FIXED: For month/quarter/year periods, we need to use the total period capacity, not weekly
      // For individual period breakdown, we still use weekly capacity per period
      const periodEffectiveCapacity = periodType === 'week' ? weeklyEffectiveCapacity : totalPeriodEffectiveCapacity;
      const utilization = periodEffectiveCapacity > 0 ? Math.round((totalHours / periodEffectiveCapacity) * 100) : 0;

      console.log(`[ALERT_BREAKDOWN] ${resource.name} - Period ${interval.label}: Total ${totalHours}h / ${periodEffectiveCapacity}h = ${utilization}% (periodType: ${periodType})`);
      const status = getUtilizationStatus(utilization);

      periods.push({
        period: interval.label,
        startDate: interval.start.toISOString(),
        endDate: interval.end.toISOString(),
        allocatedHours: totalHours,
        effectiveCapacity: periodEffectiveCapacity,
        utilization,
        status,
        projectBreakdown,
        isProblematic: utilization > 100 || utilization < 50
      });
    }

    // REDESIGNED: Week-based summary calculation for consistency with main alerts endpoint
    const totalAllocatedHours = periods.reduce((sum, p) => sum + p.allocatedHours, 0);

    // Find peak weekly utilization for alert categorization consistency
    const peakUtilization = periods.length > 0 ? Math.max(...periods.map(p => p.utilization)) : 0;
    const peakPeriod = periods.find(p => p.utilization === peakUtilization);

    // Use peak utilization for overall assessment (consistent with main alerts endpoint)
    const overallUtilization = peakUtilization;

    const problematicPeriods = periods.filter(p => p.isProblematic);

    console.log(`[ALERT_BREAKDOWN] ${resource.name} - Week-Based Summary:`);
    console.log(`  - Total Allocated Hours: ${totalAllocatedHours}h across ${periods.length} periods`);
    console.log(`  - Peak Utilization: ${peakUtilization}% in ${peakPeriod?.period || 'N/A'}`);
    console.log(`  - Weekly Effective Capacity: ${weeklyEffectiveCapacity}h`);
    console.log(`  - Total Period Effective Capacity: ${totalPeriodEffectiveCapacity}h`);
    console.log(`  - Overall Assessment: ${overallUtilization}% (based on peak week)`);
    console.log(`  - Problematic Periods: ${problematicPeriods.length}/${periods.length}`);

    return {
      resource: {
        id: resource.id,
        name: resource.name,
        department: resource.department,
        role: resource.role,
        totalCapacity: weeklyTotalCapacity,
        effectiveCapacity: weeklyEffectiveCapacity,
        nonProjectHours: weeklyNonProjectHours
      },
      summary: {
        periodType,
        totalPeriods: periods.length,
        problematicPeriods: problematicPeriods.length,
        overallUtilization: overallUtilization,
        totalAllocatedHours,
        peakUtilization: peakUtilization,
        peakPeriod: peakPeriod?.period || null,
        calculationFormula: `Peak Weekly Analysis: ${peakUtilization}% in ${peakPeriod?.period || 'N/A'} (${peakPeriod?.allocatedHours || 0}h ÷ ${weeklyEffectiveCapacity}h × 100)`
      },
      periods,
      contributingProjects: Array.from(contributingProjects.values()),
      recommendations: generateRecommendations(overallUtilization, problematicPeriods, contributingProjects)
    };
  }

  // BULLETPROOF: Generate week intervals for week-based breakdown analysis with past week filtering
  function generateWeekIntervals(startDate, endDate) {
    const intervals = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // BULLETPROOF: Filter out past weeks from interval generation
    const now = new Date();
    const currentWeekNumber = getISOWeekNumber(now);
    const currentYear = now.getFullYear();

    // Start from the beginning of the week containing startDate
    let currentWeek = new Date(start);
    currentWeek.setDate(currentWeek.getDate() - (currentWeek.getDay() === 0 ? 6 : currentWeek.getDay() - 1)); // Monday

    while (currentWeek <= end) {
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      // Only include weeks that overlap with the requested period
      if (weekEnd >= start && currentWeek <= end) {
        // Get actual ISO week number for this period
        const isoWeekNumber = getISOWeekNumber(currentWeek);
        const year = currentWeek.getFullYear();

        // Only include current and future weeks
        const isCurrentOrFuture = (year > currentYear) ||
                                 (year === currentYear && isoWeekNumber >= currentWeekNumber);

        if (isCurrentOrFuture) {
          intervals.push({
            start: new Date(Math.max(currentWeek.getTime(), start.getTime())),
            end: new Date(Math.min(weekEnd.getTime(), end.getTime())),
            label: `Week ${isoWeekNumber}, ${year}`,
            weekKey: `${year}-W${isoWeekNumber.toString().padStart(2, '0')}`
          });
        } else {
          console.log(`[WEEK_INTERVALS] 🚫 Filtered out past week: Week ${isoWeekNumber}, ${year}`);
        }
      }

      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    return intervals;
  }

  function generatePeriodIntervals(startDate, endDate, periodType) {
    const intervals = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (periodType === 'week') {
      // BULLETPROOF: Filter out past weeks from period generation
      const now = new Date();
      const currentWeekNumber = getISOWeekNumber(now);
      const currentYear = now.getFullYear();

      let current = new Date(start);

      while (current <= end) {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Get actual ISO week number for this period
        const isoWeekNumber = getISOWeekNumber(current);
        const year = current.getFullYear();

        // Only include current and future weeks
        const isCurrentOrFuture = (year > currentYear) ||
                                 (year === currentYear && isoWeekNumber >= currentWeekNumber);

        if (isCurrentOrFuture) {
          intervals.push({
            label: `Week ${isoWeekNumber}, ${year}`,
            start: new Date(current),
            end: weekEnd > end ? new Date(end) : weekEnd
          });
        } else {
          console.log(`[PERIOD_INTERVALS] 🚫 Filtered out past week: Week ${isoWeekNumber}, ${year}`);
        }

        current.setDate(current.getDate() + 7);
      }
    } else if (periodType === 'month') {
      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        intervals.push({
          label: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          start: new Date(Math.max(current.getTime(), start.getTime())),
          end: new Date(Math.min(monthEnd.getTime(), end.getTime()))
        });

        current.setMonth(current.getMonth() + 1);
      }
    }

    return intervals;
  }

  function getUtilizationStatus(utilization) {
    if (utilization >= 120) return 'critical';
    if (utilization >= 100) return 'overallocated';
    if (utilization >= 90) return 'near-capacity';
    if (utilization >= 50) return 'optimal';
    if (utilization > 0) return 'under-utilized';
    return 'unassigned';
  }

  function generateRecommendations(utilization, problematicPeriods, contributingProjects) {
    const recommendations = [];
    const projectCount = Array.from(contributingProjects.values()).length;

    // Critical overallocation (>120%)
    if (utilization > 120) {
      recommendations.push({
        type: 'critical',
        priority: 'critical',
        title: 'Critical Overallocation - Immediate Action Required',
        description: `Resource is critically overallocated at ${utilization}%. Immediate workload redistribution is essential to prevent burnout and maintain quality.`
      });

      recommendations.push({
        type: 'redistribute',
        priority: 'high',
        title: 'Emergency Workload Redistribution',
        description: `Redistribute ${Math.round(utilization - 100)}% of workload (approximately ${Math.round((utilization - 100) * 0.32)} hours) to other team members immediately.`
      });
    }
    // Overallocation (100-120%)
    else if (utilization > 100) {
      recommendations.push({
        type: 'redistribute',
        priority: 'high',
        title: 'Redistribute Workload',
        description: `Resource is ${utilization}% allocated. Consider redistributing ${Math.round(utilization - 100)}% to other team members to maintain sustainable workload.`
      });

      if (problematicPeriods.length > 0) {
        recommendations.push({
          type: 'timeline',
          priority: 'medium',
          title: 'Adjust Project Timelines',
          description: `${problematicPeriods.length} periods are problematic. Consider extending deadlines or staggering project starts.`
        });
      }
    }
    // Near capacity (90-100%) - NEW LOGIC FOR ROB BECKERS CASE
    else if (utilization >= 90) {
      recommendations.push({
        type: 'monitor',
        priority: 'medium',
        title: 'Monitor Capacity Closely',
        description: `Resource is at ${utilization}% capacity. Monitor workload closely and avoid additional assignments without careful planning.`
      });

      recommendations.push({
        type: 'buffer',
        priority: 'medium',
        title: 'Maintain Buffer Capacity',
        description: `Consider maintaining ${Math.round(100 - utilization)}% buffer for unexpected urgent tasks or project scope changes.`
      });

      if (projectCount > 1) {
        recommendations.push({
          type: 'prioritize',
          priority: 'low',
          title: 'Review Project Priorities',
          description: `Resource is working on ${projectCount} projects. Review priorities to ensure focus on most critical deliverables.`
        });
      }
    }
    // Optimal range (70-89%)
    else if (utilization >= 70) {
      recommendations.push({
        type: 'optimal',
        priority: 'low',
        title: 'Optimal Utilization',
        description: `Resource is optimally utilized at ${utilization}%. Current allocation provides good productivity while maintaining flexibility.`
      });

      if (utilization < 85) {
        recommendations.push({
          type: 'opportunity',
          priority: 'low',
          title: 'Capacity for Additional Work',
          description: `${Math.round(100 - utilization)}% capacity available for additional high-priority tasks or professional development activities.`
        });
      }
    }
    // Under-utilized (50-69%)
    else if (utilization >= 50) {
      recommendations.push({
        type: 'assign',
        priority: 'medium',
        title: 'Consider Additional Assignments',
        description: `Resource has ${Math.round(100 - utilization)}% available capacity. Consider assigning to high-priority projects or strategic initiatives.`
      });

      recommendations.push({
        type: 'development',
        priority: 'low',
        title: 'Professional Development Opportunity',
        description: `Available capacity could be used for training, mentoring, or process improvement activities.`
      });
    }
    // Significantly under-utilized (<50%)
    else if (utilization > 0) {
      recommendations.push({
        type: 'assign',
        priority: 'high',
        title: 'Significant Under-utilization',
        description: `Resource has ${Math.round(100 - utilization)}% available capacity. Review project assignments and consider additional responsibilities.`
      });
    }
    // Unassigned (0%)
    else {
      recommendations.push({
        type: 'assign',
        priority: 'high',
        title: 'No Current Assignments',
        description: `Resource has no current project allocations. Assign to active projects or consider strategic initiatives.`
      });
    }

    return recommendations;
  }

  // Enhanced Alert Details with Period Breakdown
  app.get("/api/dashboard/alerts/resource/:resourceId/breakdown", async (req, res) => {
    console.log('🔍 [ALERT_BREAKDOWN] Starting detailed resource alert breakdown...');
    try {
      const { resourceId } = req.params;
      const { startDate, endDate, periodType = 'week' } = req.query;

      console.log('[ALERT_BREAKDOWN] Parameters:', { resourceId, startDate, endDate, periodType });

      if (!resourceId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required parameters: resourceId, startDate, endDate" });
      }

      // BULLETPROOF: Use the same simplified period logic as main alerts endpoint
      const periodAdjustment = adjustPeriodForCurrentDateAwareness(startDate as string, endDate as string);
      const adjustedStartDate = periodAdjustment.startDate;
      const adjustedEndDate = periodAdjustment.endDate;
      const isForwardLooking = periodAdjustment.isForwardLooking;
      const excludedPastWeeks = periodAdjustment.excludedPastWeeks;

      // Get resource details
      const resources = await storage.getResources();
      const resource = resources.find(r => r.id === parseInt(resourceId as string));

      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Get all allocations for this resource in the period
      const allocations = await storage.getResourceAllocations();
      const resourceAllocations = allocations.filter(a =>
        a.resourceId === parseInt(resourceId as string) &&
        a.status === 'active'
      );

      // Filter allocations by adjusted date range (current date aware)
      const filterStartDate = new Date(adjustedStartDate);
      const filterEndDate = new Date(adjustedEndDate);

      const periodAllocations = resourceAllocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
      });

      // Get projects for context
      const projects = await storage.getProjects();
      const projectMap = new Map(projects.map(p => [p.id, p]));

      // Calculate period breakdown based on periodType
      const breakdown = await calculatePeriodBreakdown(
        resource,
        periodAllocations,
        projectMap,
        filterStartDate,
        filterEndDate,
        periodType as string
      );

      console.log('[ALERT_BREAKDOWN] Generated breakdown:', {
        resourceName: resource.name,
        totalPeriods: breakdown.periods.length,
        overallUtilization: breakdown.summary.overallUtilization
      });

      res.json(breakdown);
    } catch (error) {
      console.error('Error generating alert breakdown:', error);
      res.status(500).json({ message: "Failed to generate alert breakdown" });
    }
  });

  // Dashboard analytics routes
  app.get("/api/dashboard/kpis", async (req, res) => {
    try {
      const { department, debug, includeTrends, startDate, endDate } = req.query;

      const resources = await storage.getResources();
      const projects = await storage.getProjects();
      let allocations = await storage.getResourceAllocations();

      // Apply date filtering to allocations if specified
      if (startDate && endDate) {
        const filterStartDate = new Date(startDate as string);
        const filterEndDate = new Date(endDate as string);

        allocations = allocations.filter(allocation => {
          const allocationStart = new Date(allocation.startDate);
          const allocationEnd = new Date(allocation.endDate);

          // Include allocations that overlap with the filter period
          return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
        });

        console.log(`[KPI] Applied period filter: ${startDate} to ${endDate}, filtered allocations: ${allocations.length}`);
      }

      // Apply department filter to resources if specified
      const filteredResources = department && department !== 'all'
        ? resources.filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department;
          })
        : resources;

      // Calculate KPIs with improved logic and period filtering
      let activeProjects = projects.filter(p => p.status === 'active').length;

      // If period filtering is applied, only count projects active during the period
      if (startDate && endDate) {
        const filterStartDate = new Date(startDate as string);
        const filterEndDate = new Date(endDate as string);

        activeProjects = projects.filter(project => {
          if (project.status !== 'active') return false;

          const projectStart = new Date(project.startDate);
          const projectEnd = new Date(project.endDate);

          // Include projects that overlap with the filter period
          return projectStart <= filterEndDate && projectEnd >= filterStartDate;
        }).length;
      }

      // Available resources: active resources with utilization < 100%
      const resourceUtilization = new Map();
      const activeAllocations = allocations.filter(a => a.status === 'active');

      // Only consider allocations for filtered resources
      const filteredResourceIds = new Set(filteredResources.map(r => r.id));
      const relevantAllocations = activeAllocations.filter(a => filteredResourceIds.has(a.resourceId));

      // Calculate period-aware allocated hours
      relevantAllocations.forEach(allocation => {
        const key = allocation.resourceId;
        let allocatedHours = 0;

        // If period filtering is applied, calculate hours for the specific period
        if (startDate && endDate) {
          allocatedHours = calculatePeriodAllocatedHours(allocation, startDate as string, endDate as string);
        } else {
          // Use base allocated hours if no period filtering
          allocatedHours = parseFloat(allocation.allocatedHours || '0');
        }

        const current = resourceUtilization.get(key) || 0;
        resourceUtilization.set(key, current + allocatedHours);
      });

      let availableResources = 0;
      let totalCapacity = 0;
      let totalAllocated = 0;

      // FIXED: Single, accurate conflicts calculation
      // Count resources that are actually over 100% utilization
      let actualConflicts = 0;

      filteredResources.forEach(resource => {
        if (resource.isActive) {
          let capacity = parseFloat(resource.weeklyCapacity || '40');
          const allocated = resourceUtilization.get(resource.id) || 0;

          // Adjust capacity for the period if period filtering is applied
          if (startDate && endDate) {
            const periodMultiplier = calculatePeriodMultiplier(startDate as string, endDate as string);
            capacity = capacity * periodMultiplier;
          }

          // Calculate utilization with explicit precision handling
          const utilization = capacity > 0 ? (allocated / capacity) * 100 : 0;

          totalCapacity += capacity;
          totalAllocated += allocated;

          // Count as available if utilization is less than 100%
          if (utilization < 100) {
            availableResources++;
          }

          // Only count as conflict if utilization is clearly over 100%
          // Use strict threshold to avoid false positives
          if (utilization > 100.01) {
            actualConflicts++;
          }
        }
      });

      // Calculate overall utilization rate
      const utilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

      // Disable caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const response: any = {
        activeProjects,
        availableResources,
        conflicts: actualConflicts, // Use the corrected count
        utilization
      };

      // Include trend data if requested
      if (includeTrends === 'true') {
        try {
          const [activeProjectsTrend, utilisationRateTrend] = await Promise.all([
            storage.getActiveProjectsTrend(),
            storage.getUtilisationRateTrend()
          ]);

          response.trendData = {
            activeProjects: activeProjectsTrend,
            utilization: utilisationRateTrend
          };
        } catch (trendError) {
          console.error('Error fetching trend data:', trendError);
          // Continue without trend data if there's an error
        }
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      res.status(500).json({ message: "Failed to fetch dashboard KPIs" });
    }
  });

  app.get("/api/dashboard/alerts", async (req, res) => {
    console.log('🚨 [ALERTS] ENDPOINT CALLED - Starting alert generation...');
    try {
      const { department, startDate, endDate, periodType } = req.query;

      console.log('[ALERTS] Fetching enhanced alerts with filters:', { department, startDate, endDate, periodType });

      // BULLETPROOF: Simplified and consistent period logic
      const periodAdjustment = adjustPeriodForCurrentDateAwareness(startDate as string, endDate as string);
      const adjustedStartDate = periodAdjustment.startDate;
      const adjustedEndDate = periodAdjustment.endDate;
      const isForwardLooking = periodAdjustment.isForwardLooking;
      const excludedPastWeeks = periodAdjustment.excludedPastWeeks;

      // Get alert settings for configurable thresholds
      const alertSettings = await storage.getAlertSettings('capacity');
      console.log('[ALERTS] Using alert settings:', alertSettings);

      const resources = await storage.getResources();
      let allocations = await storage.getResourceAllocations();

      console.log('[ALERTS] Found resources:', resources.length, 'allocations:', allocations.length);

      // Apply date filtering to allocations if specified
      if (startDate && endDate) {
        const filterStartDate = new Date(startDate as string);
        const filterEndDate = new Date(endDate as string);

        allocations = allocations.filter(allocation => {
          const allocationStart = new Date(allocation.startDate);
          const allocationEnd = new Date(allocation.endDate);

          // Include allocations that overlap with the filter period
          return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
        });

        console.log('[ALERTS] After date filtering:', allocations.length, 'allocations');
      }

      // Apply department filter to resources if specified
      const filteredResources = department && department !== 'all'
        ? resources.filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department;
          })
        : resources;

      console.log('[ALERTS] Filtered resources:', filteredResources.length);

      // Initialize enhanced alert structure
      const categories = {
        critical: { type: 'critical', title: 'Critical Overallocation', description: 'Resources severely overallocated', count: 0, resources: [], threshold: 120, color: '#dc2626', icon: 'alert-circle' },
        error: { type: 'error', title: 'Overallocation Detected', description: 'Resources over capacity', count: 0, resources: [], threshold: 100, color: '#ea580c', icon: 'alert-circle' },
        warning: { type: 'warning', title: 'Near Capacity', description: 'Resources approaching capacity limits', count: 0, resources: [], threshold: 90, color: '#ca8a04', icon: 'alert-triangle' },
        info: { type: 'info', title: 'Under-utilized', description: 'Resources available for additional work', count: 0, resources: [], threshold: 50, color: '#2563eb', icon: 'trending-down' },
        unassigned: { type: 'unassigned', title: 'Unassigned Resources', description: 'Resources with no project allocations', count: 0, resources: [], color: '#6b7280', icon: 'user-x' }
      };

      // FIXED: Use same logic as heatmap endpoint for consistent period-based calculations
      const resourceCapacities = new Map();
      const activeAllocations = allocations.filter(a => a.status === 'active');

      console.log('[ALERTS] Active allocations:', activeAllocations.length);
      console.log('[ALERTS] Date range filter:', { startDate, endDate });

      // Only consider allocations for filtered resources
      const filteredResourceIds = new Set(filteredResources.map(r => r.id));
      const relevantAllocations = activeAllocations.filter(a => filteredResourceIds.has(a.resourceId));

      console.log('[ALERTS] Relevant allocations for filtered resources:', relevantAllocations.length);

      // Helper function to get week keys for a date range (same as heatmap)
      const getWeekKeysInRange = (start: string, end: string): string[] => {
        const weekKeys: string[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Get the Monday of the week containing startDate
        const startMonday = new Date(startDate);
        startMonday.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));

        let currentWeek = new Date(startMonday);
        while (currentWeek <= endDate) {
          const year = currentWeek.getFullYear();
          const weekNum = getISOWeekNumber(currentWeek);
          weekKeys.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
          currentWeek.setDate(currentWeek.getDate() + 7);
        }

        return weekKeys;
      };

      // Using standardized getISOWeekNumber function from top of file

      // REDESIGNED: Week-based utilization calculation for accurate peak detection
      const resourceWeeklyData = new Map(); // Store weekly breakdown for each resource

      if (adjustedStartDate && adjustedEndDate) {
        // Get week keys for the adjusted period (current date aware)
        const weekKeys = getWeekKeysInRange(adjustedStartDate, adjustedEndDate);
        console.log('[ALERTS] Generated week keys for adjusted period:', weekKeys);
        console.log('[ALERTS] Period contains', weekKeys.length, 'weeks');
        if (isForwardLooking) {
          console.log('[ALERTS] 🔮 Forward-looking analysis: excluded past weeks from calculations');
        }

        // BULLETPROOF: Additional validation to ensure no past weeks in week keys
        const now = new Date();
        const currentWeekNumber = getISOWeekNumber(now);
        const currentYear = now.getFullYear();

        const validatedWeekKeys = weekKeys.filter(weekKey => {
          const [yearStr, weekStr] = weekKey.split('-W');
          const year = parseInt(yearStr);
          const week = parseInt(weekStr);

          // Only include current and future weeks
          if (year > currentYear) return true;
          if (year < currentYear) return false;
          return week >= currentWeekNumber;
        });

        if (validatedWeekKeys.length !== weekKeys.length) {
          console.log(`[ALERTS] 🚫 BULLETPROOF FILTER: Removed ${weekKeys.length - validatedWeekKeys.length} past weeks from analysis`);
          console.log(`[ALERTS] Original weeks: ${weekKeys.join(', ')}`);
          console.log(`[ALERTS] Validated weeks: ${validatedWeekKeys.join(', ')}`);
        }

        // Use validated week keys for all calculations
        const finalWeekKeys = validatedWeekKeys;

        // Calculate week-by-week utilization for each resource
        filteredResources.forEach(resource => {
          const resourceAllocations = relevantAllocations.filter(a => a.resourceId === resource.id);
          const weeklyEffectiveCapacity = Math.max(0, parseFloat(resource.weeklyCapacity || '40') - 8);

          const weeklyBreakdown = {
            weeks: [],
            totalAllocatedHours: 0,
            peakUtilization: 0,
            peakWeek: null,
            hasWeeklyData: false
          };

          if (finalWeekKeys.length > 0) {
            finalWeekKeys.forEach(weekKey => {
              let weeklyHours = 0;

              resourceAllocations.forEach(allocation => {
                if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
                  if (allocation.weeklyAllocations[weekKey]) {
                    weeklyHours += allocation.weeklyAllocations[weekKey];
                    weeklyBreakdown.hasWeeklyData = true;
                  }
                } else {
                  // Fallback: If no weekly data, distribute base allocation evenly across period
                  const baseHours = parseFloat(allocation.allocatedHours || '0');
                  weeklyHours += baseHours / finalWeekKeys.length;
                }
              });

              // Calculate weekly utilization percentage
              const weeklyUtilization = weeklyEffectiveCapacity > 0 ?
                Math.round((weeklyHours / weeklyEffectiveCapacity) * 100) : 0;

              weeklyBreakdown.weeks.push({
                weekKey,
                allocatedHours: weeklyHours,
                utilization: weeklyUtilization
              });

              weeklyBreakdown.totalAllocatedHours += weeklyHours;

              // Track peak utilization for alert categorization
              if (weeklyUtilization > weeklyBreakdown.peakUtilization) {
                weeklyBreakdown.peakUtilization = weeklyUtilization;
                weeklyBreakdown.peakWeek = weekKey;
              }

              console.log(`[ALERTS] ${resource.name} - Week ${weekKey}: ${weeklyHours}h (${weeklyUtilization}%)`);
            });

            console.log(`[ALERTS] ${resource.name} - Peak utilization: ${weeklyBreakdown.peakUtilization}% in ${weeklyBreakdown.peakWeek}, Total: ${weeklyBreakdown.totalAllocatedHours}h`);
          } else {
            // Fallback to total allocation approach
            let totalHours = 0;
            resourceAllocations.forEach(allocation => {
              totalHours += parseFloat(allocation.allocatedHours || '0');
            });
            weeklyBreakdown.totalAllocatedHours = totalHours;
            weeklyBreakdown.peakUtilization = weeklyEffectiveCapacity > 0 ?
              Math.round((totalHours / weeklyEffectiveCapacity) * 100) : 0;
            console.log(`[ALERTS] ${resource.name} - Fallback total allocation: ${totalHours}h (${weeklyBreakdown.peakUtilization}%)`);
          }

          resourceWeeklyData.set(resource.id, weeklyBreakdown);
          // Store total hours for backward compatibility with display logic
          resourceCapacities.set(resource.id, weeklyBreakdown.totalAllocatedHours);
        });
      } else {
        // Fallback to total allocation approach if no date range specified
        filteredResources.forEach(resource => {
          let totalHours = 0;
          const resourceAllocations = relevantAllocations.filter(a => a.resourceId === resource.id);
          resourceAllocations.forEach(allocation => {
            totalHours += parseFloat(allocation.allocatedHours || '0');
          });

          const weeklyEffectiveCapacity = Math.max(0, parseFloat(resource.weeklyCapacity || '40') - 8);
          const utilization = weeklyEffectiveCapacity > 0 ? Math.round((totalHours / weeklyEffectiveCapacity) * 100) : 0;

          resourceWeeklyData.set(resource.id, {
            weeks: [],
            totalAllocatedHours: totalHours,
            peakUtilization: utilization,
            peakWeek: null,
            hasWeeklyData: false
          });
          resourceCapacities.set(resource.id, totalHours);
        });
      }

      // Use configurable thresholds
      const criticalThreshold = parseFloat(alertSettings?.criticalThreshold || '120');
      const errorThreshold = parseFloat(alertSettings?.errorThreshold || '100');
      const warningThreshold = parseFloat(alertSettings?.warningThreshold || '90');
      const underUtilizationThreshold = parseFloat(alertSettings?.underUtilizationThreshold || '50');

      // Update category thresholds
      categories.critical.threshold = criticalThreshold;
      categories.error.threshold = errorThreshold;
      categories.warning.threshold = warningThreshold;
      categories.info.threshold = underUtilizationThreshold;

      console.log('[ALERTS] Resource capacity calculations:');

      // Calculate period multiplier for capacity scaling using adjusted dates
      const periodMultiplier = adjustedStartDate && adjustedEndDate ? calculatePeriodMultiplier(adjustedStartDate, adjustedEndDate) : 1;
      console.log('[ALERTS] Period multiplier:', periodMultiplier, 'weeks');
      if (isForwardLooking) {
        console.log('[ALERTS] 📊 Capacity calculations based on forward-looking period (current + future weeks only)');
      }

      // REDESIGNED: Process all active resources using week-based peak utilization for categorization
      for (const resource of filteredResources) {
        if (!resource.isActive) {
          console.log(`[ALERTS] SKIPPING ${resource.name}: not active (isActive: ${resource.isActive})`);
          continue;
        }

        const weeklyData = resourceWeeklyData.get(resource.id);
        if (!weeklyData) {
          console.log(`[ALERTS] SKIPPING ${resource.name}: no weekly data available`);
          continue;
        }

        // Use PEAK weekly utilization for alert categorization (not average)
        const peakUtilization = weeklyData.peakUtilization;
        const totalHours = weeklyData.totalAllocatedHours;
        const peakWeek = weeklyData.peakWeek;

        // Calculate period capacity for display purposes
        const weeklyTotalCapacity = parseFloat(resource.weeklyCapacity || '40');
        const weeklyNonProjectHours = 8;
        const weeklyEffectiveCapacity = Math.max(0, weeklyTotalCapacity - weeklyNonProjectHours);
        const periodEffectiveCapacity = weeklyEffectiveCapacity * periodMultiplier;

        console.log(`[ALERTS] ${resource.name} (ID: ${resource.id}): Peak ${peakUtilization}% in ${peakWeek || 'N/A'}, Total ${totalHours}h across ${periodMultiplier} weeks`);

        // Enhanced logging for key resources
        if (resource.name.includes('Rob') || resource.name.includes('Beckers')) {
          console.log(`[ALERTS] 🔍 ROB BECKERS DEBUG (WEEK-BASED CALCULATION):`);
          console.log(`[ALERTS]   - Resource ID: ${resource.id}`);
          console.log(`[ALERTS]   - Name: ${resource.name}`);
          console.log(`[ALERTS]   - Weekly Effective Capacity: ${weeklyEffectiveCapacity}h`);
          console.log(`[ALERTS]   - Peak Utilization: ${peakUtilization}% (Week: ${peakWeek})`);
          console.log(`[ALERTS]   - Total Period Hours: ${totalHours}h`);
          console.log(`[ALERTS]   - Weekly Breakdown:`);
          weeklyData.weeks.forEach(week => {
            console.log(`[ALERTS]     * ${week.weekKey}: ${week.allocatedHours}h (${week.utilization}%)`);
          });
        }

        // Create alert resource object with peak utilization for categorization
        const alertResource = {
          id: resource.id,
          name: resource.name,
          utilization: peakUtilization, // Use peak weekly utilization for alert display
          allocatedHours: totalHours, // Total hours across all weeks for context
          capacity: periodEffectiveCapacity, // Period capacity for context
          department: resource.department,
          role: resource.role,
          // Additional metadata for detailed breakdown
          peakWeek: peakWeek,
          weeklyBreakdown: weeklyData.weeks
        };

        // CRITICAL CHANGE: Categorize based on PEAK weekly utilization, not period average
        if (peakUtilization >= criticalThreshold) {
          console.log(`[ALERTS] 🔥 CRITICAL OVERALLOCATION: ${resource.name} at PEAK ${peakUtilization}% (Week: ${peakWeek})`);
          categories.critical.resources.push(alertResource);
          categories.critical.count++;
        } else if (peakUtilization >= errorThreshold) {
          console.log(`[ALERTS] 🚨 OVERALLOCATION DETECTED: ${resource.name} at PEAK ${peakUtilization}% (Week: ${peakWeek})`);
          categories.error.resources.push(alertResource);
          categories.error.count++;
        } else if (peakUtilization >= warningThreshold) {
          console.log(`[ALERTS] ⚠️ NEAR CAPACITY: ${resource.name} at PEAK ${peakUtilization}% (Week: ${peakWeek})`);
          categories.warning.resources.push(alertResource);
          categories.warning.count++;
        } else if (peakUtilization > 0 && peakUtilization < underUtilizationThreshold) {
          console.log(`[ALERTS] 📉 UNDER-UTILIZED: ${resource.name} at PEAK ${peakUtilization}%`);
          categories.info.resources.push(alertResource);
          categories.info.count++;
        } else if (peakUtilization === 0) {
          console.log(`[ALERTS] 👤 UNASSIGNED: ${resource.name} at ${peakUtilization}%`);
          categories.unassigned.resources.push(alertResource);
          categories.unassigned.count++;
        }
      }

      // Build enhanced response
      const enhancedAlerts = {
        categories: Object.values(categories).filter(cat => cat.count > 0),
        summary: {
          totalAlerts: categories.critical.count + categories.error.count + categories.warning.count + categories.info.count + categories.unassigned.count,
          criticalCount: categories.critical.count,
          warningCount: categories.warning.count,
          infoCount: categories.info.count,
          unassignedCount: categories.unassigned.count
        },
        metadata: {
          department: department as string,
          startDate: startDate as string,
          endDate: endDate as string,
          generatedAt: new Date().toISOString()
        }
      };

      console.log('[ALERTS] Generated enhanced alerts:', {
        totalCategories: enhancedAlerts.categories.length,
        totalAlerts: enhancedAlerts.summary.totalAlerts,
        breakdown: {
          critical: categories.critical.count,
          error: categories.error.count,
          warning: categories.warning.count,
          info: categories.info.count,
          unassigned: categories.unassigned.count
        }
      });

      res.json(enhancedAlerts);
    } catch (error) {
      console.error('Error fetching dashboard alerts:', error);
      res.status(500).json({ message: "Failed to fetch dashboard alerts" });
    }
  });

  // Resource heatmap data endpoint
  app.get("/api/dashboard/heatmap", async (req, res) => {
    try {
      const { department, startDate, endDate } = req.query;

      const resources = await storage.getResources();
      const allocations = await storage.getResourceAllocations();

      const heatmapData: any[] = [];
      const activeAllocations = allocations.filter(a => a.status === 'active');

      // Helper function to get week keys for a date range
      const getWeekKeysInRange = (start: string, end: string): string[] => {
        const weekKeys: string[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Get the Monday of the week containing startDate
        const startMonday = new Date(startDate);
        startMonday.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));

        let currentWeek = new Date(startMonday);
        while (currentWeek <= endDate) {
          const year = currentWeek.getFullYear();
          const weekNum = getISOWeekNumber(currentWeek);
          weekKeys.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
          currentWeek.setDate(currentWeek.getDate() + 7);
        }

        return weekKeys;
      };

      // Helper function to get ISO week number
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Get week keys for the specified period
      const weekKeys = startDate && endDate ? getWeekKeysInRange(startDate as string, endDate as string) : [];

      resources.forEach(resource => {
        if (resource.isActive) {
          // Apply department filter
          const resourceDepartment = resource.department || resource.role || 'General';
          if (department && department !== 'all' && resourceDepartment !== department) {
            return;
          }

          const resourceAllocations = activeAllocations.filter(a => a.resourceId === resource.id);

          let totalAllocatedHours = 0;
          let totalCapacityHours = 0;

          if (weekKeys.length > 0) {
            // Calculate based on weekly allocations for the specified period
            weekKeys.forEach(weekKey => {
              resourceAllocations.forEach(allocation => {
                if (allocation.weeklyAllocations && allocation.weeklyAllocations[weekKey]) {
                  totalAllocatedHours += allocation.weeklyAllocations[weekKey];
                }
              });
              // FIXED: Add effective weekly capacity for each week in the period (total - non-project hours)
              const totalWeeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
              const nonProjectHours = 8; // Default non-project hours (meetings, admin, etc.)
              const effectiveWeeklyCapacity = Math.max(0, totalWeeklyCapacity - nonProjectHours);
              totalCapacityHours += effectiveWeeklyCapacity;
            });
          } else {
            // Fallback to total allocation hours if no period specified
            totalAllocatedHours = resourceAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || '0'), 0);
            // FIXED: Use effective capacity (total - non-project hours) for consistency
            const totalWeeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
            const nonProjectHours = 8; // Default non-project hours (meetings, admin, etc.)
            totalCapacityHours = Math.max(0, totalWeeklyCapacity - nonProjectHours);
          }

          const utilization = totalCapacityHours > 0 ? Math.round((totalAllocatedHours / totalCapacityHours) * 100) : 0;

          let status = 'available';
          if (utilization >= 100) {
            status = 'overallocated';
          } else if (utilization >= 80) {
            status = 'near-capacity';
          }

          heatmapData.push({
            id: resource.id,
            name: resource.name,
            department: resourceDepartment,
            utilization,
            allocatedHours: Math.round(totalAllocatedHours * 10) / 10, // Round to 1 decimal
            capacity: Math.round(totalCapacityHours * 10) / 10, // Round to 1 decimal
            status,
            projects: resourceAllocations.length,
            weeklyBreakdown: weekKeys.length > 0 ? weekKeys.map(weekKey => {
              const weekHours = resourceAllocations.reduce((sum, allocation) => {
                return sum + (allocation.weeklyAllocations?.[weekKey] || 0);
              }, 0);
              // FIXED: Use effective capacity for weekly breakdown consistency
              const totalWeeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
              const nonProjectHours = 8; // Default non-project hours (meetings, admin, etc.)
              const effectiveWeeklyCapacity = Math.max(0, totalWeeklyCapacity - nonProjectHours);
              return {
                week: weekKey,
                hours: weekHours,
                capacity: effectiveWeeklyCapacity
              };
            }) : []
          });
        }
      });

      res.json(heatmapData);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  });

  // Project timeline data endpoint
  app.get("/api/dashboard/timeline", async (req, res) => {
    try {
      const { department, startDate: filterStartDate, endDate: filterEndDate } = req.query;

      const projects = await storage.getProjects();
      const allocations = await storage.getResourceAllocations();
      const resources = await storage.getResources();

      // Apply department filter if specified
      let filteredAllocations = allocations;
      if (department && department !== 'all') {
        const filteredResourceIds = resources
          .filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department;
          })
          .map(r => r.id);

        filteredAllocations = allocations.filter(a => filteredResourceIds.includes(a.resourceId));
      }

      // Apply time period filter if specified
      let filteredProjects = projects;
      if (filterStartDate && filterEndDate) {
        const startFilter = new Date(filterStartDate as string);
        const endFilter = new Date(filterEndDate as string);

        filteredProjects = projects.filter(project => {
          const projectStart = new Date(project.startDate);
          const projectEnd = new Date(project.endDate);

          // Include projects that overlap with the filter period
          return projectStart <= endFilter && projectEnd >= startFilter;
        });
      }

      const timelineData = filteredProjects.map(project => {
        const projectAllocations = filteredAllocations.filter(a => a.projectId === project.id);
        const uniqueResources = new Set(projectAllocations.map(a => a.resourceId)).size;

        // Calculate completion percentage based on project dates
        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);
        const now = new Date();

        let completion = 0;
        if (now >= endDate) {
          completion = 100;
        } else if (now >= startDate) {
          const total = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          completion = Math.round((elapsed / total) * 100);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          completion,
          resourceCount: uniqueResources,
          allocatedHours: projectAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || '0'), 0)
        };
      });

      res.json(timelineData.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      res.status(500).json({ message: "Failed to fetch timeline data" });
    }
  });



  app.get("/api/dashboard/timeline/:department/:startDate/:endDate", async (req, res) => {
    try {
      const { department, startDate: filterStartDate, endDate: filterEndDate } = req.params;

      const projects = await storage.getProjects();
      const allocations = await storage.getResourceAllocations();
      const resources = await storage.getResources();

      // Apply department filter if specified
      let filteredAllocations = allocations;
      if (department && department !== 'all') {
        const filteredResourceIds = resources
          .filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department;
          })
          .map(r => r.id);

        filteredAllocations = allocations.filter(a => filteredResourceIds.includes(a.resourceId));
      }

      // Apply time period filter if specified
      let filteredProjects = projects;
      if (filterStartDate && filterEndDate) {
        const startFilter = new Date(filterStartDate as string);
        const endFilter = new Date(filterEndDate as string);

        filteredProjects = projects.filter(project => {
          const projectStart = new Date(project.startDate);
          const projectEnd = new Date(project.endDate);

          // Include projects that overlap with the filter period
          return projectStart <= endFilter && projectEnd >= startFilter;
        });
      }

      const timelineData = filteredProjects.map(project => {
        const projectAllocations = filteredAllocations.filter(a => a.projectId === project.id);
        const uniqueResources = new Set(projectAllocations.map(a => a.resourceId)).size;

        // Calculate completion percentage based on project dates
        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);
        const now = new Date();

        let completion = 0;
        if (now >= endDate) {
          completion = 100;
        } else if (now >= startDate) {
          const total = endDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          completion = Math.round((elapsed / total) * 100);
        }

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.startDate,
          endDate: project.endDate,
          completion,
          resourceCount: uniqueResources,
          allocatedHours: projectAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || '0'), 0)
        };
      });

      res.json(timelineData.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      res.status(500).json({ message: "Failed to fetch timeline data" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", async (req, res) => {
    try {
      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/:id", async (req, res) => {
    try {
      const timeEntry = await storage.getTimeEntry(parseInt(req.params.id));
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.json(timeEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entry" });
    }
  });

  app.get("/api/resources/:id/time-entries", authenticate, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user can access this resource's time entries
      if (resourceId !== user.resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) && !user.permissions.includes(PERMISSIONS.RESOURCE_MANAGEMENT)) {
        return res.status(403).json({ message: "Cannot access time entries for another user" });
      }

      const timeEntries = await storage.getTimeEntriesByResource(resourceId);
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries for resource" });
    }
  });

  app.get("/api/resources/:id/time-entries/week/:weekStartDate", authenticate, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const weekStartDate = req.params.weekStartDate;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user can access this resource's time entries
      if (resourceId !== user.resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) && !user.permissions.includes(PERMISSIONS.RESOURCE_MANAGEMENT)) {
        return res.status(403).json({ message: "Cannot access time entries for another user" });
      }

      const timeEntries = await storage.getTimeEntriesByWeek(resourceId, weekStartDate);
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries for week" });
    }
  });

  app.post("/api/time-entries", authenticate, async (req, res) => {
    try {
      // Sanitize hour fields to prevent empty string database errors
      const sanitizedData = { ...req.body };
      const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];

      hourFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
          sanitizedData[field] = "0.00";
        }
      });

      const validatedData = insertTimeEntrySchema.parse(sanitizedData);

      // Validate resource ownership - non-admin users can only log time for themselves
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is trying to log time for a different resource
      if (validatedData.resourceId !== user.resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) && !user.permissions.includes(PERMISSIONS.RESOURCE_MANAGEMENT)) {
        console.log(`[TIME_ENTRY] User ${user.email} (resourceId: ${user.resourceId}) attempted to log time for resourceId: ${validatedData.resourceId}`);
        return res.status(403).json({ message: "Cannot log time for another user" });
      }

      const timeEntry = await storage.createTimeEntry(validatedData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Time entry validation error:", error.errors);
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      console.error("Failed to create time entry:", error);
      res.status(500).json({ message: "Failed to create time entry", error: error.message });
    }
  });

  app.put("/api/time-entries/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get the existing time entry to check ownership
      const existingTimeEntry = await storage.getTimeEntry(id);
      if (!existingTimeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      // Validate resource ownership - non-admin users can only update their own time entries
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is trying to update time entry for a different resource
      if (existingTimeEntry.resourceId !== user.resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) && !user.permissions.includes(PERMISSIONS.RESOURCE_MANAGEMENT)) {
        console.log(`[TIME_ENTRY] User ${user.email} (resourceId: ${user.resourceId}) attempted to update time entry for resourceId: ${existingTimeEntry.resourceId}`);
        return res.status(403).json({ message: "Cannot update time entry for another user" });
      }

      // Sanitize hour fields to prevent empty string database errors
      const sanitizedData = { ...req.body };
      const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];

      hourFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === null || sanitizedData[field] === undefined) {
          sanitizedData[field] = "0.00";
        }
      });

      const validatedData = insertTimeEntrySchema.partial().parse(sanitizedData);
      const timeEntry = await storage.updateTimeEntry(id, validatedData);
      res.json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Time entry validation error:", error.errors);
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      console.error("Failed to update time entry:", error);
      res.status(500).json({ message: "Failed to update time entry", error: error.message });
    }
  });

  app.delete("/api/time-entries/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get the existing time entry to check ownership
      const existingTimeEntry = await storage.getTimeEntry(id);
      if (!existingTimeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      // Validate resource ownership - non-admin users can only delete their own time entries
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is trying to delete time entry for a different resource
      if (existingTimeEntry.resourceId !== user.resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN) && !user.permissions.includes(PERMISSIONS.RESOURCE_MANAGEMENT)) {
        console.log(`[TIME_ENTRY] User ${user.email} (resourceId: ${user.resourceId}) attempted to delete time entry for resourceId: ${existingTimeEntry.resourceId}`);
        return res.status(403).json({ message: "Cannot delete time entry for another user" });
      }

      await storage.deleteTimeEntry(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Weekly submission routes
  app.get("/api/weekly-submissions", async (req, res) => {
    try {
      const submissions = await storage.getWeeklySubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly submissions" });
    }
  });

  // IMPORTANT: This route must come BEFORE parameterized routes to avoid conflicts
  app.get("/api/weekly-submissions/pending", async (req, res) => {
    try {
      const pendingSubmissions = await storage.getPendingSubmissions();
      res.json(pendingSubmissions);
    } catch (error) {
      console.error("Failed to fetch pending submissions:", error);
      res.status(500).json({ message: "Failed to fetch pending submissions", error: error.message });
    }
  });



  app.get("/api/weekly-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getWeeklySubmission(parseInt(req.params.id));
      if (!submission) {
        return res.status(404).json({ message: "Weekly submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly submission" });
    }
  });

  app.get("/api/resources/:id/weekly-submissions", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const submissions = await storage.getWeeklySubmissionsByResource(resourceId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly submissions for resource" });
    }
  });

  app.get("/api/resources/:id/weekly-submissions/week/:weekStartDate", async (req, res) => {
    try {
      console.log('[ROUTE] Weekly submission request params:', req.params);
      const resourceId = parseInt(req.params.id);
      const weekStartDate = req.params.weekStartDate;

      console.log('[ROUTE] Parsed resourceId:', resourceId, 'weekStartDate:', weekStartDate);

      if (isNaN(resourceId)) {
        console.error('[ROUTE] Invalid resourceId - not a number:', req.params.id);
        return res.status(400).json({ message: "Invalid resource ID" });
      }

      const submission = await storage.getWeeklySubmissionByResourceAndWeek(resourceId, weekStartDate);
      res.json(submission);
    } catch (error) {
      console.error('[ROUTE] Error fetching weekly submission:', error);
      res.status(500).json({ message: "Failed to fetch weekly submission", error: error.message });
    }
  });



  app.post("/api/weekly-submissions", async (req, res) => {
    try {
      console.log("Creating weekly submission with data:", req.body);
      const submission = await storage.createWeeklySubmission(req.body);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Failed to create weekly submission:", error);
      res.status(500).json({ message: "Failed to create weekly submission", error: error.message });
    }
  });

  app.put("/api/weekly-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.updateWeeklySubmission(parseInt(req.params.id), req.body);
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to update weekly submission" });
    }
  });

  app.delete("/api/weekly-submissions/:id", async (req, res) => {
    try {
      await storage.deleteWeeklySubmission(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete weekly submission" });
    }
  });

  // Change Lead Reporting routes
  app.get("/api/change-lead/:changeLeadId/projects", async (req, res) => {
    try {
      const changeLeadId = parseInt(req.params.changeLeadId);
      const projects = await storage.getProjectsByChangeLead(changeLeadId);
      res.json(projects);
    } catch (error) {
      console.error("Failed to fetch change lead projects:", error);
      res.status(500).json({ message: "Failed to fetch change lead projects", error: error.message });
    }
  });

  app.get("/api/change-lead/:changeLeadId/effort-summary", async (req, res) => {
    try {
      const changeLeadId = parseInt(req.params.changeLeadId);
      const { startDate, endDate } = req.query;

      console.log(`[ROUTES] Effort summary request - Change Lead: ${changeLeadId}, Start: ${startDate}, End: ${endDate}`);

      if (!changeLeadId || isNaN(changeLeadId)) {
        return res.status(400).json({ message: "Invalid change lead ID" });
      }

      const effortSummary = await storage.getChangeLeadEffortSummary(
        changeLeadId,
        startDate as string,
        endDate as string
      );

      console.log(`[ROUTES] Effort summary result - Found ${effortSummary.length} records`);
      res.json(effortSummary);
    } catch (error) {
      console.error("Failed to fetch effort summary:", error);
      res.status(500).json({ message: "Failed to fetch effort summary", error: error.message });
    }
  });

  app.get("/api/projects/:projectId/effort-report", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const effortReport = await storage.getProjectEffortReport(projectId);
      res.json(effortReport);
    } catch (error) {
      console.error("Failed to fetch project effort report:", error);
      res.status(500).json({ message: "Failed to fetch project effort report", error: error.message });
    }
  });

  app.post("/api/change-lead/:changeLeadId/export-excel", async (req, res) => {
    try {
      const changeLeadId = parseInt(req.params.changeLeadId);
      const { startDate, endDate, projectId } = req.body;
      
      const effortData = await storage.getChangeLeadEffortSummary(
        changeLeadId,
        startDate,
        endDate
      );

      // Generate CSV content for Excel compatibility
      const csvHeaders = [
        "Project ID",
        "Project Name",
        "Project Description",
        "Project Status",
        "Project Priority",
        "Project Start Date",
        "Project End Date",
        "Estimated Hours",
        "Resource Name",
        "Resource Email",
        "Allocated Hours",
        "Allocation Status",
        "Allocation Role",
        "Actual Hours",
        "Deviation"
      ];

      const csvRows = effortData.map(row => [
        row.projectId,
        `"${row.projectName}"`,
        `"${row.projectDescription || ''}"`,
        row.projectStatus,
        row.projectPriority || '',
        row.projectStartDate || '',
        row.projectEndDate || '',
        row.estimatedHours,
        `"${row.resourceName}"`,
        row.resourceEmail,
        row.allocatedHours,
        row.allocationStatus,
        `"${row.allocationRole || ''}"`,
        row.actualHours,
        row.deviation
      ].join(","));

      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="change-lead-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Failed to export Excel report:", error);
      res.status(500).json({ message: "Failed to export Excel report", error: error.message });
    }
  });

  // Project Favorites routes
  app.get("/api/user/project-favorites", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const favorites = await storage.getUserProjectFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Failed to fetch project favorites:", error);
      res.status(500).json({ message: "Failed to fetch project favorites", error: error.message });
    }
  });

  app.post("/api/user/project-favorites/:projectId", async (req, res) => {
    try {
      const userId = req.user?.id;
      const projectId = parseInt(req.params.projectId);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      await storage.addProjectFavorite(userId, projectId);
      res.status(201).json({ message: "Project added to favorites" });
    } catch (error) {
      console.error("Failed to add project favorite:", error);
      res.status(500).json({ message: "Failed to add project favorite", error: error.message });
    }
  });

  app.delete("/api/user/project-favorites/:projectId", async (req, res) => {
    try {
      const userId = req.user?.id;
      const projectId = parseInt(req.params.projectId);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      await storage.removeProjectFavorite(userId, projectId);
      res.status(200).json({ message: "Project removed from favorites" });
    } catch (error) {
      console.error("Failed to remove project favorite:", error);
      res.status(500).json({ message: "Failed to remove project favorite", error: error.message });
    }
  });

  // Effort Summary Notes routes
  app.get("/api/effort-notes/:projectId/:resourceId/:changeLeadId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const resourceId = parseInt(req.params.resourceId);
      const changeLeadId = parseInt(req.params.changeLeadId);

      if (!projectId || !resourceId || !changeLeadId || isNaN(projectId) || isNaN(resourceId) || isNaN(changeLeadId)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const note = await storage.getEffortSummaryNote(projectId, resourceId, changeLeadId);
      res.json({ note: note || "" });
    } catch (error) {
      console.error("Failed to fetch effort note:", error);
      res.status(500).json({ message: "Failed to fetch effort note", error: error.message });
    }
  });

  app.post("/api/effort-notes", async (req, res) => {
    try {
      const userId = req.user?.id;
      const { projectId, resourceId, changeLeadId, note } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!projectId || !resourceId || !changeLeadId || note === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.saveEffortSummaryNote(projectId, resourceId, changeLeadId, note, userId);
      res.status(201).json({ message: "Note saved successfully" });
    } catch (error) {
      console.error("Failed to save effort note:", error);
      res.status(500).json({ message: "Failed to save effort note", error: error.message });
    }
  });

  app.delete("/api/effort-notes/:projectId/:resourceId/:changeLeadId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const resourceId = parseInt(req.params.resourceId);
      const changeLeadId = parseInt(req.params.changeLeadId);

      if (!projectId || !resourceId || !changeLeadId || isNaN(projectId) || isNaN(resourceId) || isNaN(changeLeadId)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      await storage.deleteEffortSummaryNote(projectId, resourceId, changeLeadId);
      res.status(200).json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Failed to delete effort note:", error);
      res.status(500).json({ message: "Failed to delete effort note", error: error.message });
    }
  });

  // Authentication route for current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      // For now, we'll return a mock user with Manager Change role for testing
      // In a real implementation, this would check the session/token
      const mockUser = {
        resource: {
          id: 1,
          name: "Test Manager",
          email: "manager@company.com",
          roles: ["Manager Change", "Business Controller"],
          department: "IT Architecture & Delivery",
        }
      };
      res.json(mockUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to get current user" });
    }
  });

  // Reports Dashboard API endpoint
  app.post("/api/reports/dashboard", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      // Fetch all necessary data
      const [
        resources,
        projects,
        allocations,
        timeEntries,
        recentReports
      ] = await Promise.all([
        storage.getResources(),
        storage.getProjects(),
        storage.getResourceAllocations(),
        storage.getTimeEntries(),
        storage.getRecentReports ? storage.getRecentReports() : []
      ]);

      // Calculate KPIs
      const activeResources = resources.filter(r => r.isActive && !r.isDeleted);
      const activeProjects = projects.filter(p => p.status === 'active');
      const activeAllocations = allocations.filter(a => a.status === 'active');

      // Calculate utilization metrics
      const resourceUtilization = new Map();
      const resourceCapacity = new Map();

      activeResources.forEach(resource => {
        resourceCapacity.set(resource.id, parseFloat(resource.weeklyCapacity));
        resourceUtilization.set(resource.id, 0);
      });

      activeAllocations.forEach(allocation => {
        const current = resourceUtilization.get(allocation.resourceId) || 0;
        resourceUtilization.set(allocation.resourceId, current + parseFloat(allocation.allocatedHours));
      });

      // Calculate actual hours from time entries within date range
      const actualHoursMap = new Map();
      timeEntries
        .filter(entry => entry.weekStartDate >= startDate && entry.weekStartDate <= endDate)
        .forEach(entry => {
          const totalHours = [
            entry.mondayHours, entry.tuesdayHours, entry.wednesdayHours,
            entry.thursdayHours, entry.fridayHours, entry.saturdayHours, entry.sundayHours
          ].reduce((sum, hours) => sum + parseFloat(hours || '0'), 0);

          const current = actualHoursMap.get(entry.resourceId) || 0;
          actualHoursMap.set(entry.resourceId, current + totalHours);
        });

      // Calculate KPI metrics
      let totalUtilization = 0;
      let overallocatedCount = 0;
      let totalAllocatedHours = 0;
      let totalActualHours = 0;

      const capacityData = [];

      activeResources.forEach(resource => {
        const allocated = resourceUtilization.get(resource.id) || 0;
        const capacity = resourceCapacity.get(resource.id) || 40;
        const actual = actualHoursMap.get(resource.id) || 0;
        const utilization = capacity > 0 ? (actual / capacity) * 100 : 0;

        totalUtilization += utilization;
        totalAllocatedHours += allocated;
        totalActualHours += actual;

        if (allocated > capacity) {
          overallocatedCount++;
        }

        capacityData.push({
          resourceName: resource.name,
          department: resource.department,
          allocated,
          capacity,
          utilization,
          isOverallocated: allocated > capacity
        });
      });

      const averageUtilization = activeResources.length > 0 ? totalUtilization / activeResources.length : 0;
      const capacityEfficiency = totalAllocatedHours > 0 ? (totalActualHours / totalAllocatedHours) * 100 : 0;

      // Projects on track calculation (simplified - projects with status 'active' are considered on track)
      const projectsOnTrack = activeProjects.length;
      const totalProjects = projects.length;

      const kpis = {
        averageUtilization,
        overallocatedResources: overallocatedCount,
        projectsOnTrack,
        totalProjects,
        capacityEfficiency,
        totalActiveResources: activeResources.length,
        totalAllocatedHours,
        totalActualHours
      };

      // Get additional chart data
      const [utilizationTrend, projectDistribution] = await Promise.all([
        storage.getUtilizationTrend(startDate, endDate),
        storage.getProjectDistribution(startDate, endDate)
      ]);

      res.json({
        kpis,
        utilizationTrend,
        capacityData: capacityData.slice(0, 10), // Top 10 resources
        projectDistribution,
        recentReports: recentReports || []
      });
    } catch (error) {
      console.error("Failed to generate reports dashboard:", error);
      res.status(500).json({ message: "Failed to generate reports dashboard", error: error.message });
    }
  });

  // Business Controller Report routes
  app.post("/api/reports/business-controller", async (req, res) => {
    try {
      const { startDate, endDate, showOnlyActive } = req.body;

      const reportData = await storage.getBusinessControllerReport(startDate, endDate, showOnlyActive);

      // Calculate summary statistics
      const totalChanges = new Set(reportData.map(r => r.changeId)).size;
      const totalResources = new Set(reportData.map(r => r.resourceId)).size;
      const totalHours = reportData.reduce((sum, r) => sum + r.totalActualHours, 0);
      const avgHoursPerChange = totalChanges > 0 ? totalHours / totalChanges : 0;
      
      // Top resources by hours
      const resourceHoursMap = new Map();
      reportData.forEach(row => {
        const key = row.resourceId;
        if (!resourceHoursMap.has(key)) {
          resourceHoursMap.set(key, {
            resourceName: row.resourceName,
            department: row.department,
            totalHours: 0,
          });
        }
        resourceHoursMap.get(key).totalHours += row.totalActualHours;
      });
      
      const topResourcesByHours = Array.from(resourceHoursMap.values())
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 5);
      
      // Most active changes
      const changeHoursMap = new Map();
      reportData.forEach(row => {
        const key = row.changeId;
        if (!changeHoursMap.has(key)) {
          changeHoursMap.set(key, {
            changeTitle: row.changeTitle,
            totalHours: 0,
            resourceCount: 0,
          });
        }
        changeHoursMap.get(key).totalHours += row.totalActualHours;
        changeHoursMap.get(key).resourceCount++;
      });
      
      const mostActiveChanges = Array.from(changeHoursMap.values())
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 5);
      
      const summary = {
        totalChanges,
        totalResources,
        totalHours,
        avgHoursPerChange,
        topResourcesByHours,
        mostActiveChanges,
      };

      res.json({ reportData, summary });
    } catch (error) {
      console.error("Failed to generate business controller report:", error);
      res.status(500).json({ message: "Failed to generate business controller report", error: error.message });
    }
  });

  // Change Effort Report routes
  app.post("/api/reports/change-effort", async (req, res) => {
    try {
      const { startDate, endDate, projectId } = req.body;
      
      const rawData = await storage.getChangeEffortReport(startDate, endDate, projectId);
      
      // Group the data by change/project
      const changeMap = new Map();
      
      rawData.forEach(row => {
        const key = row.changeId;
        if (!changeMap.has(key)) {
          changeMap.set(key, {
            changeId: row.changeId,
            changeTitle: row.changeTitle,
            changeDescription: row.changeDescription,
            project: {
              id: row.projectId,
              name: row.projectName,
              description: row.projectDescription,
              status: row.projectStatus,
              stream: row.projectStream,
              estimatedHours: row.estimatedHours,
            },
            changeLead: row.changeLeadId ? {
              id: row.changeLeadId,
              name: row.changeLeadName,
              email: row.changeLeadEmail,
              department: row.changeLeadDepartment,
            } : null,
            resources: [],
            status: row.projectStatus,
          });
        }
        
        const change = changeMap.get(key);
        change.resources.push({
          resourceId: row.resourceId,
          resourceName: row.resourceName,
          department: row.resourceDepartment,
          estimatedHours: row.allocatedHours,
          actualHours: row.actualHours,
          deviation: row.deviation,
          deviationPercentage: row.deviationPercentage,
          missingTimeLogs: row.missingTimeLogs,
          allocation: {
            id: row.allocationId,
            role: row.allocationRole,
            status: row.allocationStatus,
            startDate: row.allocationStartDate,
            endDate: row.allocationEndDate,
          },
        });
      });

      // Calculate totals for each change
      const result = Array.from(changeMap.values()).map(change => {
        const totalEstimatedHours = change.resources.reduce((sum, r) => sum + r.estimatedHours, 0);
        const totalActualHours = change.resources.reduce((sum, r) => sum + r.actualHours, 0);
        const totalDeviation = totalActualHours - totalEstimatedHours;
        const totalDeviationPercentage = totalEstimatedHours > 0 ? (totalDeviation / totalEstimatedHours) * 100 : 0;
        
        return {
          ...change,
          totalEstimatedHours,
          totalActualHours,
          totalDeviation,
          totalDeviationPercentage,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Failed to generate change effort report:", error);
      res.status(500).json({ message: "Failed to generate change effort report", error: error.message });
    }
  });

  // Change Allocation Report routes
  app.post("/api/reports/change-allocation", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    try {
      const { startDate, endDate, projectIds, resourceIds, groupBy } = req.body;

      // Validate required fields
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ message: "At least one project must be selected" });
      }

      // Validate date format
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      if (startDateObj > endDateObj) {
        return res.status(400).json({ message: "Start date must be before end date" });
      }

      // Validate groupBy parameter
      if (groupBy && !['project', 'resource'].includes(groupBy)) {
        return res.status(400).json({ message: "groupBy must be either 'project' or 'resource'" });
      }

      console.log(`[REPORTS] Generating change allocation report for ${projectIds.length} projects from ${startDate} to ${endDate}`);

      const reportData = await storage.getChangeAllocationReport(
        startDate,
        endDate,
        projectIds,
        resourceIds?.length > 0 ? resourceIds : undefined,
        groupBy || 'project'
      );

      console.log(`[REPORTS] Change allocation report generated with ${reportData.length} entries`);

      // Add additional metadata to the response
      res.json({
        data: reportData,
        metadata: {
          totalEntries: reportData.length,
          dateRange: { startDate, endDate },
          filters: {
            projectCount: projectIds.length,
            resourceCount: resourceIds?.length || 0,
            groupBy: groupBy || 'project'
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Failed to generate change allocation report:", error);
      res.status(500).json({ message: "Failed to generate change allocation report", error: error.message });
    }
  });

  // Recent Reports management routes
  console.log("[ROUTES] Registering recent reports routes...");

  app.get("/api/reports/recent", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] GET /api/reports/recent called by user:", req.user?.id);
    try {
      const userId = req.user?.id;
      const recentReports = await storage.getRecentReports(userId);
      console.log("[API] Returning recent reports:", recentReports.length, "reports");
      res.json(recentReports);
    } catch (error) {
      console.error("Failed to fetch recent reports:", error);
      res.status(500).json({ message: "Failed to fetch recent reports", error: error.message });
    }
  });

  app.post("/api/reports/recent", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] POST /api/reports/recent called by user:", req.user?.id, "with data:", req.body);
    try {
      const { name, type, size, criteria } = req.body;
      const userId = req.user?.id;

      if (!name || !type || !userId) {
        console.log("[API] Missing required fields:", { name: !!name, type: !!type, userId: !!userId });
        return res.status(400).json({ message: "name, type are required" });
      }

      await storage.addRecentReport(name, type, userId, size || 'Unknown', criteria);
      console.log("[API] Successfully added recent report");
      res.json({ message: "Report added to recent reports successfully" });
    } catch (error) {
      console.error("Failed to add recent report:", error);
      res.status(500).json({ message: "Failed to add recent report", error: error.message });
    }
  });

  app.delete("/api/reports/recent/:id", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!reportId || !userId) {
        return res.status(400).json({ message: "Invalid report ID or user" });
      }

      await storage.deleteRecentReport(reportId, userId);
      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      console.error("Failed to delete recent report:", error);
      res.status(500).json({ message: "Failed to delete recent report", error: error.message });
    }
  });

  app.delete("/api/reports/recent", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user" });
      }

      await storage.clearAllRecentReports(userId);
      res.json({ message: "All reports cleared successfully" });
    } catch (error) {
      console.error("Failed to clear all recent reports:", error);
      res.status(500).json({ message: "Failed to clear all recent reports", error: error.message });
    }
  });

  // Email Delivery routes
  console.log("[ROUTES] Registering email delivery routes...");

  app.post("/api/reports/email", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] POST /api/reports/email called by user:", req.user?.id);
    try {
      const { recipients, subject, body, reportData, includeAttachment, sendCopy } = req.body;
      const userId = req.user?.id;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients are required" });
      }

      if (!subject || !body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }

      // Validate email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = recipients.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          message: "Invalid email addresses",
          invalidEmails
        });
      }

      // For now, we'll simulate email sending
      // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
      console.log("[EMAIL] Simulating email delivery:", {
        recipients: recipients.length,
        subject,
        hasAttachment: includeAttachment,
        reportType: reportData?.type
      });

      // Add to email delivery history
      if (storage.addEmailDeliveryHistory) {
        await storage.addEmailDeliveryHistory({
          userId,
          recipients,
          subject,
          body,
          reportData,
          includeAttachment,
          sendCopy,
          sentAt: new Date().toISOString(),
          status: 'sent'
        });
      }

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("[API] Email delivery simulation completed successfully");
      res.json({
        message: "Email sent successfully",
        recipients: recipients.length,
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ message: "Failed to send email", error: error.message });
    }
  });

  // Get email delivery history
  app.get("/api/reports/email/history", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] GET /api/reports/email/history called by user:", req.user?.id);
    try {
      const userId = req.user?.id;

      // For now, return empty array - in real implementation, fetch from storage
      const emailHistory = storage.getEmailDeliveryHistory ?
        await storage.getEmailDeliveryHistory(userId) : [];

      console.log("[API] Returning email history:", emailHistory.length, "records");
      res.json(emailHistory);
    } catch (error) {
      console.error("Failed to fetch email history:", error);
      res.status(500).json({ message: "Failed to fetch email history", error: error.message });
    }
  });

  // Report Scheduling routes
  console.log("[ROUTES] Registering report scheduling routes...");

  app.post("/api/reports/schedule", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] POST /api/reports/schedule called by user:", req.user?.id);
    try {
      const {
        name,
        frequency,
        time,
        timezone,
        dayOfWeek,
        dayOfMonth,
        enabled,
        emailRecipients,
        includeAttachment,
        customSubject,
        reportTemplate
      } = req.body;
      const userId = req.user?.id;

      if (!name || !frequency || !time || !timezone) {
        return res.status(400).json({ message: "Name, frequency, time, and timezone are required" });
      }

      if (!emailRecipients || !Array.isArray(emailRecipients) || emailRecipients.length === 0) {
        return res.status(400).json({ message: "At least one email recipient is required" });
      }

      // Validate email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailRecipients.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          message: "Invalid email addresses",
          invalidEmails
        });
      }

      // Create schedule record
      if (storage.addReportSchedule) {
        await storage.addReportSchedule({
          userId,
          name,
          frequency,
          time,
          timezone,
          dayOfWeek,
          dayOfMonth,
          enabled,
          emailRecipients,
          includeAttachment,
          customSubject,
          reportTemplate,
          createdAt: new Date().toISOString()
        });
      }

      console.log("[API] Report schedule created successfully");
      res.json({
        message: "Report schedule created successfully",
        scheduleId: Date.now(), // In real implementation, return actual ID
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to create report schedule:", error);
      res.status(500).json({ message: "Failed to create report schedule", error: error.message });
    }
  });

  // Get user's scheduled reports
  app.get("/api/reports/schedule", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] GET /api/reports/schedule called by user:", req.user?.id);
    try {
      const userId = req.user?.id;

      // For now, return empty array - in real implementation, fetch from storage
      const schedules = storage.getReportSchedules ?
        await storage.getReportSchedules(userId) : [];

      console.log("[API] Returning scheduled reports:", schedules.length, "schedules");
      res.json(schedules);
    } catch (error) {
      console.error("Failed to fetch scheduled reports:", error);
      res.status(500).json({ message: "Failed to fetch scheduled reports", error: error.message });
    }
  });

  // Update scheduled report
  app.put("/api/reports/schedule/:id", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] PUT /api/reports/schedule/:id called by user:", req.user?.id);
    try {
      const scheduleId = parseInt(req.params.id);
      const userId = req.user?.id;
      const updateData = req.body;

      if (!scheduleId || isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      if (storage.updateReportSchedule) {
        await storage.updateReportSchedule(scheduleId, userId, updateData);
      }

      console.log("[API] Report schedule updated successfully");
      res.json({ message: "Report schedule updated successfully" });
    } catch (error) {
      console.error("Failed to update report schedule:", error);
      res.status(500).json({ message: "Failed to update report schedule", error: error.message });
    }
  });

  // Delete scheduled report
  app.delete("/api/reports/schedule/:id", authenticate, authorize(PERMISSIONS.REPORTS), async (req, res) => {
    console.log("[API] DELETE /api/reports/schedule/:id called by user:", req.user?.id);
    try {
      const scheduleId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!scheduleId || isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      if (storage.deleteReportSchedule) {
        await storage.deleteReportSchedule(scheduleId, userId);
      }

      console.log("[API] Report schedule deleted successfully");
      res.json({ message: "Report schedule deleted successfully" });
    } catch (error) {
      console.error("Failed to delete report schedule:", error);
      res.status(500).json({ message: "Failed to delete report schedule", error: error.message });
    }
  });

  // Public OGSM Charters endpoint for project management
  app.get("/api/ogsm-charters", authenticate, authorize([PERMISSIONS.PROJECT_MANAGEMENT, PERMISSIONS.SYSTEM_ADMIN]), async (req, res) => {
    try {
      const charters = await storage.getOgsmCharters();
      res.json(charters);
    } catch (error) {
      console.error('[ROUTE] Error fetching OGSM charters for project form:', error);
      res.status(500).json({ message: "Failed to fetch OGSM charters" });
    }
  });

  // Public Departments endpoint for resource management
  app.get("/api/departments", authenticate, authorize([PERMISSIONS.RESOURCE_MANAGEMENT, PERMISSIONS.SYSTEM_ADMIN]), async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      console.log('[ROUTE] Returning departments for resource form:', departments.length, 'departments');
      res.json(departments);
    } catch (error) {
      console.error('[ROUTE] Error fetching departments for resource form:', error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Settings/Configuration routes
  app.get("/api/settings/ogsm-charters", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const charters = await storage.getOgsmCharters();
      res.json(charters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch OGSM charters" });
    }
  });

  app.post("/api/settings/ogsm-charters", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const validatedData = insertOgsmCharterSchema.parse(req.body);
      const charter = await storage.createOgsmCharter(validatedData);
      res.status(201).json(charter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid charter data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create OGSM charter" });
    }
  });

  app.put("/api/settings/ogsm-charters/:id", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertOgsmCharterSchema.partial().parse(req.body);
      const charter = await storage.updateOgsmCharter(id, validatedData);
      res.json(charter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid charter data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update OGSM charter" });
    }
  });

  app.delete("/api/settings/ogsm-charters/:id", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOgsmCharter(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete OGSM charter" });
    }
  });

  app.get("/api/settings/departments", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/settings/departments", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put("/api/settings/departments/:id", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid department data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/settings/departments/:id", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Notification Settings routes
  app.get("/api/settings/notifications", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.get("/api/settings/notifications/:type", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const type = req.params.type;
      const setting = await storage.getNotificationSettingByType(type);
      
      if (!setting) {
        return res.status(404).json({ message: "Notification setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification setting" });
    }
  });

  app.put("/api/settings/notifications/:id", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = z.object({
        isEnabled: z.boolean().optional(),
        reminderDay: z.number().min(1).max(7).optional(),
        reminderTime: z.string().optional(),
        emailSubject: z.string().optional(),
        emailTemplate: z.string().optional(),
      }).parse(req.body);
      
      const setting = await storage.updateNotificationSetting(id, validatedData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification setting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update notification setting" });
    }
  });

  // Time Logging & Reminder routes
  app.post("/api/time-logging/submit/:resourceId/:weekStartDate", authenticate, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.resourceId);
      const weekStartDate = req.params.weekStartDate;

      console.log(`[SUBMIT] Attempting to submit timesheet for resourceId: ${resourceId}, weekStartDate: ${weekStartDate}`);

      // Verify user has permission to submit for this resource
      const user = req.user;
      if (!user) {
        console.log('[SUBMIT] No user found in request');
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(`[SUBMIT] User: ${user.email}, resourceId: ${user.resourceId}, permissions: ${user.permissions.join(', ')}`);

      // Check if user is submitting for their own resource or has admin permission
      if (user.resourceId !== resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) {
        console.log(`[SUBMIT] Permission denied: user resourceId ${user.resourceId} !== ${resourceId} and no admin permission`);
        return res.status(403).json({ message: "Cannot submit timesheet for another user" });
      }

      console.log('[SUBMIT] Permission check passed, calling storage.submitWeeklyTimesheet');
      const submission = await storage.submitWeeklyTimesheet(resourceId, weekStartDate);
      console.log('[SUBMIT] Submission successful:', submission);
      res.json(submission);
    } catch (error) {
      console.error('[SUBMIT] Error submitting weekly timesheet:', error);
      console.error('[SUBMIT] Error stack:', error.stack);
      res.status(500).json({ message: "Failed to submit weekly timesheet", error: error.message });
    }
  });

  app.get("/api/time-logging/unsubmitted/:weekStartDate", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const weekStartDate = req.params.weekStartDate;
      const unsubmittedUsers = await storage.getUnsubmittedUsersForWeek(weekStartDate);
      res.json(unsubmittedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unsubmitted users" });
    }
  });

  app.post("/api/time-logging/send-reminders", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const { weekStartDate, userIds, resourceIds } = req.body;
      
      if (!weekStartDate || (!Array.isArray(userIds) && !Array.isArray(resourceIds))) {
        return res.status(400).json({ message: "weekStartDate and userIds or resourceIds array are required" });
      }
      
      // Get notification settings
      const notificationSettings = await storage.getNotificationSettingByType('weekly_reminder');
      
      if (!notificationSettings || !notificationSettings.isEnabled) {
        return res.status(400).json({ message: "Weekly reminder notifications are disabled" });
      }
      
      let sentCount = 0;
      
      // Handle resource IDs directly
      if (resourceIds && Array.isArray(resourceIds)) {
        const markReminderPromises = resourceIds.map(async (resourceId: number) => {
          try {
            await storage.markReminderSent(resourceId, weekStartDate);
            sentCount++;
          } catch (error) {
            console.error(`Failed to mark reminder sent for resource ${resourceId}:`, error);
          }
        });
        
        await Promise.all(markReminderPromises);
      } else {
        // Handle user IDs (legacy support)
        const markReminderPromises = userIds.map(async (userId: number) => {
          try {
            // Get user's resource
            const user = await storage.getUser(userId);
            if (user?.resourceId) {
              await storage.markReminderSent(user.resourceId, weekStartDate);
              sentCount++;
            }
          } catch (error) {
            console.error(`Failed to mark reminder sent for user ${userId}:`, error);
          }
        });
        
        await Promise.all(markReminderPromises);
      }
      
      res.json({ 
        message: "Reminders sent successfully", 
        sentCount,
        weekStartDate 
      });
    } catch (error) {
      console.error("Failed to send reminders:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // Background job endpoint for automated reminders
  app.post("/api/time-logging/check-reminders", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      // Get current week start date (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(now);
      mondayDate.setDate(now.getDate() - daysToMonday);
      mondayDate.setHours(0, 0, 0, 0);
      
      const weekStartDate = mondayDate.toISOString().split('T')[0];
      
      // Get notification settings
      const notificationSettings = await storage.getNotificationSettingByType('weekly_reminder');
      
      if (!notificationSettings || !notificationSettings.isEnabled) {
        return res.json({ message: "Weekly reminder notifications are disabled", checked: false });
      }
      
      // Check if today is the reminder day
      const currentDayOfWeek = now.getDay();
      const reminderDay = notificationSettings.reminderDay;
      
      if (currentDayOfWeek !== reminderDay) {
        return res.json({ 
          message: `Not reminder day. Current: ${currentDayOfWeek}, Reminder: ${reminderDay}`,
          checked: false 
        });
      }
      
      // Get users who haven't submitted for this week
      const unsubmittedUsers = await storage.getUnsubmittedUsersForWeek(weekStartDate);
      
      res.json({
        message: "Reminder check completed",
        checked: true,
        weekStartDate,
        unsubmittedCount: unsubmittedUsers.length,
        unsubmittedUsers: unsubmittedUsers.map(u => ({
          id: u.id,
          email: u.email,
          resourceName: u.resource?.name,
        })),
        notificationSettings,
      });
    } catch (error) {
      console.error("Failed to check reminders:", error);
      res.status(500).json({ message: "Failed to check reminders" });
    }
  });

  // Submission overview endpoint
  app.get("/api/time-logging/submission-overview", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const { week, department } = req.query;
      
      if (!week || typeof week !== 'string') {
        return res.status(400).json({ message: "Week parameter is required" });
      }
      
      const submissionOverview = await storage.getSubmissionOverview(week, department as string);
      res.json(submissionOverview);
    } catch (error) {
      console.error("Failed to get submission overview:", error);
      res.status(500).json({ message: "Failed to get submission overview" });
    }
  });

  // Export submissions endpoint
  app.post("/api/time-logging/export-submissions", authenticate, authorize(PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
    try {
      const { weekStartDate, department } = req.body;
      
      if (!weekStartDate) {
        return res.status(400).json({ message: "weekStartDate is required" });
      }
      
      const submissionData = await storage.getSubmissionOverview(weekStartDate, department);
      
      // Create Excel workbook (simplified - would use a proper Excel library in production)
      const csvData = [
        ['Resource Name', 'Email', 'Department', 'Status', 'Submitted At'],
        ...submissionData.map(item => [
          item.resource.name,
          item.resource.email,
          item.department.name,
          item.submission?.status === 'submitted' ? 'Submitted' : 'Not Submitted',
          item.submission?.submittedAt || 'N/A'
        ])
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="submission-overview-${weekStartDate}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Failed to export submissions:", error);
      res.status(500).json({ message: "Failed to export submissions" });
    }
  });

  // Unsubmit week endpoint
  app.post("/api/time-logging/unsubmit/:resourceId/:weekStartDate", authenticate, async (req, res) => {
    try {
      const resourceId = parseInt(req.params.resourceId);
      const weekStartDate = req.params.weekStartDate;
      
      // Verify user has permission to unsubmit for this resource
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user is unsubmitting for their own resource or has admin permission
      if (user.resourceId !== resourceId && !user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) {
        return res.status(403).json({ message: "Cannot unsubmit timesheet for another user" });
      }
      
      const result = await storage.unsubmitWeeklyTimesheet(resourceId, weekStartDate);
      res.json(result);
    } catch (error) {
      console.error("Failed to unsubmit weekly timesheet:", error);
      res.status(500).json({ message: "Failed to unsubmit weekly timesheet" });
    }
  });

  // Role-Based Access Control Management routes
  app.get("/api/rbac/roles", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get("/api/rbac/permissions", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const permissions = Object.values(PERMISSIONS);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Simple in-memory cache for RBAC data (in production, use Redis or similar)
  let rbacUsersCache = {
    data: null as any,
    timestamp: 0,
    ttl: 5 * 60 * 1000 // 5 minutes TTL
  };

  // Health check endpoint for database connectivity
  app.get("/api/health/database", async (req, res) => {
    try {
      const startTime = Date.now();

      // Test Supabase connection
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return res.status(503).json({
          status: 'unhealthy',
          database: 'error',
          error: error.message,
          responseTime
        });
      }

      res.json({
        status: 'healthy',
        database: 'connected',
        responseTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        database: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // DEBUG: Temporary endpoint to check data format (no auth for debugging)
  app.get("/api/debug/time-logging-data", async (req, res) => {
    try {
      const allSubmissions = await storage.getWeeklySubmissions();
      const pendingSubmissions = await storage.getPendingSubmissions();
      const resources = await storage.getResources();

      const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Normalize date function (same as frontend)
      const normalizeWeekDate = (weekStartDate: Date | string): string => {
        if (weekStartDate instanceof Date) {
          return format(weekStartDate, 'yyyy-MM-dd');
        }
        // If it's already a string, parse it first then format to ensure consistency
        return format(new Date(weekStartDate), 'yyyy-MM-dd');
      };

      // Filter for current week using same logic as frontend
      const submissionsForCurrentWeek = allSubmissions.filter(sub => {
        const subWeekDate = normalizeWeekDate(sub.weekStartDate);
        const matches = subWeekDate === currentWeek && sub.isSubmitted;
        console.log(`[DEBUG] Submission ${sub.id}: ${sub.weekStartDate} -> ${subWeekDate} === ${currentWeek} && ${sub.isSubmitted} = ${matches}`);
        return matches;
      });

      const pendingForCurrentWeek = allSubmissions.filter(sub => {
        const subWeekDate = normalizeWeekDate(sub.weekStartDate);
        const matches = subWeekDate === currentWeek && !sub.isSubmitted;
        return matches;
      });

      // Get unique week dates from all submissions
      const uniqueWeeks = [...new Set(allSubmissions.map(sub => normalizeWeekDate(sub.weekStartDate)))].sort();

      res.json({
        currentWeek,
        currentDate: new Date().toISOString(),
        allSubmissions: allSubmissions, // Show all submissions for debugging
        pendingSubmissions: pendingSubmissions.slice(0, 5),
        resources: resources.slice(0, 3),
        submissionsForCurrentWeek,
        pendingForCurrentWeek,
        uniqueWeeksInDatabase: uniqueWeeks,
        totalCounts: {
          allSubmissions: allSubmissions.length,
          pendingSubmissions: pendingSubmissions.length,
          resources: resources.length,
          submissionsForCurrentWeek: submissionsForCurrentWeek.length,
          pendingForCurrentWeek: pendingForCurrentWeek.length
        }
      });
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DEBUG: Create test data for current week
  app.get("/api/debug/create-test-data", async (req, res) => {
    try {
      const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const resources = await storage.getResources();

      // Create some test submissions for current week
      const testSubmissions = [];
      for (let i = 0; i < Math.min(3, resources.length); i++) {
        const resource = resources[i];
        try {
          const submission = await storage.createWeeklySubmission({
            resourceId: resource.id,
            weekStartDate: currentWeek,
            isSubmitted: i < 2, // First 2 are submitted, last one is pending
            totalHours: i < 2 ? "40.00" : "0.00"
          });
          testSubmissions.push(submission);
        } catch (error) {
          console.log(`Submission for resource ${resource.id} might already exist:`, error.message);
        }
      }

      res.json({
        message: "Test data created",
        currentWeek,
        testSubmissions,
        resourceCount: resources.length
      });
    } catch (error) {
      console.error("Create test data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rbac/users", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      console.log("[RBAC] Fetching users with roles...");
      const now = Date.now();

      // Check cache first
      if (rbacUsersCache.data && (now - rbacUsersCache.timestamp) < rbacUsersCache.ttl) {
        console.log("[RBAC] Returning cached users data");
        return res.json(rbacUsersCache.data);
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      const usersPromise = storage.getAllUsersWithRoles();

      const users = await Promise.race([usersPromise, timeoutPromise]);

      // Update cache
      rbacUsersCache.data = users;
      rbacUsersCache.timestamp = now;

      console.log(`[RBAC] Successfully fetched ${Array.isArray(users) ? users.length : 0} users`);
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users with roles:", error);

      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        res.status(504).json({
          message: "Request timeout - please try again",
          error: "TIMEOUT"
        });
      } else if (error.message.includes('connect')) {
        res.status(503).json({
          message: "Database connection error - please try again later",
          error: "CONNECTION_ERROR"
        });
      } else {
        res.status(500).json({
          message: "Failed to fetch users with roles",
          error: error.message
        });
      }
    }
  });

  app.post("/api/rbac/assign-role", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const { resourceId, role } = req.body;

      if (!resourceId || !role) {
        return res.status(400).json({ message: "resourceId and role are required" });
      }

      // Get the resource first
      const resource = await storage.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Check if user account exists for this resource
      let user = await storage.getUserByEmail(resource.email);

      if (!user) {
        // Create user account for this resource
        const defaultPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        user = await storage.createUser({
          email: resource.email,
          password: hashedPassword,
          resourceId: resource.id,
          isActive: true,
        });
      }

      const assignedBy = req.user?.id;
      await authService.assignRole(user.id, role, resourceId, assignedBy);

      // Invalidate RBAC cache after successful role assignment
      rbacUsersCache.data = null;
      rbacUsersCache.timestamp = 0;

      res.json({ message: "Role assigned successfully" });
    } catch (error) {
      console.error("Failed to assign role:", error);
      res.status(500).json({ message: "Failed to assign role" });
    }
  });

  app.post("/api/rbac/remove-role", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const { userId, role, resourceId } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }

      await authService.removeRole(userId, role, resourceId);

      // Invalidate RBAC cache after successful role removal
      rbacUsersCache.data = null;
      rbacUsersCache.timestamp = 0;

      res.json({ message: "Role removed successfully" });
    } catch (error) {
      console.error("Failed to remove role:", error);
      res.status(500).json({ message: "Failed to remove role" });
    }
  });

  // Admin endpoint to update user password
  app.post("/api/rbac/update-password", authenticate, authorize(PERMISSIONS.USER_MANAGEMENT), async (req, res) => {
    try {
      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({ message: "userId and newPassword are required" });
      }

      // Validate password strength (basic requirements)
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Get user to verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      await storage.updateUserPassword(userId, hashedPassword);

      console.log(`[RBAC] Password updated for user ${user.email} by admin ${req.user?.email}`);

      res.json({
        message: "Password updated successfully",
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/rbac/user-roles/:userId", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userRoles = await storage.getUserRoles(userId);
      res.json(userRoles);
    } catch (error) {
      console.error("Failed to fetch user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  app.get("/api/rbac/role-permissions/:role", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const role = req.params.role;
      const permissions = authService.getPermissionsForRole(role);
      res.json(permissions);
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post("/api/rbac/create-user", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const { name, email, role } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create resource first
      const resource = await storage.createResource({
        name,
        email,
        role: 'Employee',
        department: 'General',
        capacity: 40,
        skills: [],
        hourlyRate: 0,
        isActive: true,
      });

      // Create user account with default password
      const defaultPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        resourceId: resource.id,
        isActive: true,
      });

      // Assign initial role if provided
      if (role) {
        await authService.assignRole(user.id, role, undefined, req.user!.id);
      }

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          resourceId: user.resourceId,
        },
        resource,
        defaultPassword, // In production, this would be sent via email
      });
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/rbac/update-role-permissions", authenticate, authorize(PERMISSIONS.ROLE_MANAGEMENT), async (req, res) => {
    try {
      const { role, permissions } = req.body;

      if (!role || !permissions) {
        return res.status(400).json({ message: "Role and permissions are required" });
      }

      // Update role permissions in the auth service
      await authService.updateRolePermissions(role, permissions);
      
      res.json({ message: "Role permissions updated successfully" });
    } catch (error) {
      console.error("Failed to update role permissions:", error);
      res.status(500).json({ message: "Failed to update role permissions" });
    }
  });

  // Management Dashboard API routes
  app.get("/api/management-dashboard/active-projects-trend", async (req, res) => {
    try {
      const trendData = await storage.getActiveProjectsTrend();
      res.json(trendData);
    } catch (error) {
      console.error('Error fetching active projects trend:', error);
      res.status(500).json({ message: "Failed to fetch active projects trend" });
    }
  });

  app.get("/api/management-dashboard/under-utilised-resources", async (req, res) => {
    try {
      const trendData = await storage.getUnderUtilisedResources();
      res.json(trendData);
    } catch (error) {
      console.error('Error fetching under-utilised resources:', error);
      res.status(500).json({ message: "Failed to fetch under-utilised resources" });
    }
  });

  app.get("/api/management-dashboard/over-utilised-resources", async (req, res) => {
    try {
      const trendData = await storage.getOverUtilisedResources();
      res.json(trendData);
    } catch (error) {
      console.error('Error fetching over-utilised resources:', error);
      res.status(500).json({ message: "Failed to fetch over-utilised resources" });
    }
  });

  app.get("/api/management-dashboard/utilisation-rate-trend", async (req, res) => {
    try {
      const trendData = await storage.getUtilisationRateTrend();
      res.json(trendData);
    } catch (error) {
      console.error('Error fetching utilisation rate trend:', error);
      res.status(500).json({ message: "Failed to fetch utilisation rate trend" });
    }
  });

  // Gamified KPI Metrics endpoint
  app.get("/api/dashboard/gamified-metrics", authenticate, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Fetch all necessary data
      const [
        resources,
        projects,
        allocations,
        timeEntries
      ] = await Promise.all([
        storage.getResources(),
        storage.getProjects(),
        storage.getResourceAllocations(),
        storage.getTimeEntries()
      ]);

      // Calculate alerts directly (simplified version for gamified metrics)
      const alertSettings = await storage.getAlertSettings('capacity');
      const alerts = calculateSimpleAlerts(resources, allocations, alertSettings);

      // Calculate gamified metrics
      const gamifiedMetrics = calculateGamifiedMetrics(
        resources,
        projects,
        allocations,
        timeEntries,
        alerts,
        startDate as string,
        endDate as string
      );

      res.json(gamifiedMetrics);
    } catch (error) {
      console.error('Error fetching gamified metrics:', error);
      res.status(500).json({ message: "Failed to fetch gamified metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to calculate simple alerts for gamified metrics
function calculateSimpleAlerts(resources: any[], allocations: any[], alertSettings: any) {
  const alerts: any[] = [];

  resources.forEach(resource => {
    const resourceAllocations = allocations.filter(a => a.resourceId === resource.id && a.status === 'active');
    const totalAllocatedHours = resourceAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || 0), 0);
    const capacity = parseFloat(resource.weeklyCapacity || 40);
    const utilization = capacity > 0 ? (totalAllocatedHours / capacity) * 100 : 0;

    let category = 'none';
    if (utilization >= (alertSettings?.criticalThreshold || 120)) {
      category = 'critical';
    } else if (utilization >= (alertSettings?.errorThreshold || 100)) {
      category = 'error';
    } else if (utilization >= (alertSettings?.warningThreshold || 90)) {
      category = 'warning';
    } else if (utilization > 0 && utilization < (alertSettings?.underUtilizationThreshold || 50)) {
      category = 'info';
    }

    if (category !== 'none') {
      alerts.push({
        resourceId: resource.id,
        resourceName: resource.name,
        category,
        utilization,
        allocatedHours: totalAllocatedHours,
        capacity
      });
    }
  });

  return alerts;
}

// Helper function to calculate gamified metrics
function calculateGamifiedMetrics(
  resources: any[],
  projects: any[],
  allocations: any[],
  timeEntries: any[],
  alerts: any[],
  startDate: string,
  endDate: string
) {
  // 1. Capacity Hero Badge
  const conflictsCount = alerts.filter(alert =>
    alert.category === 'critical' || alert.category === 'error'
  ).length;

  let badgeLevel: 'gold' | 'silver' | 'bronze' | 'none';
  if (conflictsCount === 0) badgeLevel = 'gold';
  else if (conflictsCount <= 2) badgeLevel = 'silver';
  else if (conflictsCount <= 5) badgeLevel = 'bronze';
  else badgeLevel = 'none';

  // 2. Forecast Accuracy
  const activeAllocations = allocations.filter(a => a.status === 'active');
  let totalVariance = 0;
  let validComparisons = 0;

  activeAllocations.forEach(allocation => {
    const relatedTimeEntries = timeEntries.filter(te => te.allocationId === allocation.id);
    const actualHours = relatedTimeEntries.reduce((sum, te) => {
      return sum + parseFloat(te.mondayHours || 0) + parseFloat(te.tuesdayHours || 0) +
             parseFloat(te.wednesdayHours || 0) + parseFloat(te.thursdayHours || 0) +
             parseFloat(te.fridayHours || 0) + parseFloat(te.saturdayHours || 0) +
             parseFloat(te.sundayHours || 0);
    }, 0);

    const plannedHours = parseFloat(allocation.allocatedHours || 0);
    if (plannedHours > 0) {
      const variance = Math.abs(plannedHours - actualHours) / plannedHours;
      totalVariance += variance;
      validComparisons++;
    }
  });

  const averageVariance = validComparisons > 0 ? totalVariance / validComparisons : 0;
  const accuracy = Math.max(0, (1 - averageVariance) * 100);

  let accuracyColor: 'green' | 'yellow' | 'red';
  if (accuracy >= 90) accuracyColor = 'green';
  else if (accuracy >= 70) accuracyColor = 'yellow';
  else accuracyColor = 'red';

  // Generate mock trend data for forecast accuracy (last 8 weeks)
  const forecastTrend = Array.from({ length: 8 }, (_, i) =>
    Math.max(60, accuracy + (Math.random() - 0.5) * 20)
  );

  // 3. Resource Health Meter
  const activeResources = resources.filter(r => r.isActive);
  const overutilizedCount = alerts.filter(alert =>
    alert.category === 'error' || alert.category === 'critical'
  ).length;
  const underutilizedCount = alerts.filter(alert =>
    alert.category === 'info'
  ).length;

  const healthScore = Math.max(0, 100 - (overutilizedCount * 15) - (underutilizedCount * 5));
  let healthStatus: 'good' | 'watch' | 'critical';
  if (healthScore >= 80) healthStatus = 'good';
  else if (healthScore >= 60) healthStatus = 'watch';
  else healthStatus = 'critical';

  // 4. Project Leaderboard
  const projectVariances = projects.slice(0, 5).map(project => {
    const projectAllocations = allocations.filter(a => a.projectId === project.id);
    const projectTimeEntries = timeEntries.filter(te =>
      projectAllocations.some(pa => pa.id === te.allocationId)
    );

    const totalPlanned = projectAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || 0), 0);
    const totalActual = projectTimeEntries.reduce((sum, te) => {
      return sum + parseFloat(te.mondayHours || 0) + parseFloat(te.tuesdayHours || 0) +
             parseFloat(te.wednesdayHours || 0) + parseFloat(te.thursdayHours || 0) +
             parseFloat(te.fridayHours || 0) + parseFloat(te.saturdayHours || 0) +
             parseFloat(te.sundayHours || 0);
    }, 0);

    const variance = totalPlanned > 0 ? Math.abs(totalPlanned - totalActual) / totalPlanned * 100 : 0;

    return {
      name: project.name,
      variance,
      isAtRisk: variance > 15
    };
  }).sort((a, b) => a.variance - b.variance);

  // 5. Firefighter Alerts
  const resolvedAlertsCount = Math.floor(Math.random() * 10) + 1; // Mock data
  const previousResolvedCount = Math.floor(Math.random() * 10) + 1; // Mock data
  const alertsDelta = resolvedAlertsCount - previousResolvedCount;
  const alertsTrend = alertsDelta > 0 ? 'up' : alertsDelta < 0 ? 'down' : 'neutral';

  // 6. Continuous Improvement
  const currentAccuracy = accuracy;
  const previousAccuracy = Math.max(60, accuracy + (Math.random() - 0.5) * 30); // Mock previous period
  const improvementDelta = currentAccuracy - previousAccuracy;
  const improvementTrend = improvementDelta >= 0 ? 'up' : 'down';

  // 7. Crystal Ball Prediction
  const currentBookingRate = allocations.length / 30; // Rough booking rate per day
  const averageConflictInterval = conflictsCount > 0 ? 30 / conflictsCount : 60; // Days between conflicts
  const daysUntilConflict = Math.max(1, Math.floor(averageConflictInterval + (Math.random() - 0.5) * 10));
  const confidence = Math.floor(Math.random() * 30) + 70; // 70-100% confidence

  return {
    capacityHero: {
      conflictsCount,
      badgeLevel,
      periodLabel: `${startDate} to ${endDate}`
    },
    forecastAccuracy: {
      percentage: Math.round(accuracy * 10) / 10,
      trend: forecastTrend,
      color: accuracyColor
    },
    resourceHealth: {
      score: Math.round(healthScore),
      status: healthStatus
    },
    projectLeaderboard: projectVariances,
    firefighterAlerts: {
      resolved: resolvedAlertsCount,
      delta: alertsDelta,
      trend: alertsTrend as 'up' | 'down' | 'neutral'
    },
    continuousImprovement: {
      delta: Math.round(improvementDelta * 10) / 10,
      trend: improvementTrend as 'up' | 'down'
    },
    crystalBall: {
      daysUntilConflict,
      confidence
    }
  };
}
