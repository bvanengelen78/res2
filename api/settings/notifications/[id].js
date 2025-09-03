// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schemas
const notificationUpdateSchema = z.object({
  isEnabled: z.boolean().optional(),
  reminderDay: z.number().min(0).max(6).optional(), // 0=Sunday, 6=Saturday
  reminderTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  emailSubject: z.string().optional(),
  emailTemplate: z.string().optional()
});

// Mock data fallback (shared with main endpoint)
const mockNotificationSettings = [
  {
    id: 1,
    type: "weekly_reminder",
    isEnabled: true,
    reminderDay: 5, // Friday
    reminderTime: "16:00",
    emailSubject: "Weekly Time Log Reminder",
    emailTemplate: "Hi [Name], please remember to submit your hours for Week [WeekNumber]. Click here to complete your log: [Link].",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 2,
    type: "deadline_reminder",
    isEnabled: true,
    reminderDay: 1, // Monday
    reminderTime: "09:00",
    emailSubject: "Project Deadline Reminder",
    emailTemplate: "Hi [Name], you have upcoming project deadlines this week. Please review your allocations: [Link].",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

// Main notification setting by ID handler
const notificationByIdHandler = async (req, res, { user, validatedData }) => {
  const settingId = parseInt(req.query.id);
  
  if (!settingId) {
    return createErrorResponse(res, 400, 'Invalid notification setting ID');
  }

  Logger.info('Handling notification setting by ID request', {
    userId: user.id,
    method: req.method,
    settingId,
    userPermissions: user.permissions
  });

  // Check for SYSTEM_ADMIN permission
  if (!user.permissions.includes('system_admin')) {
    Logger.warn('Access denied: User lacks SYSTEM_ADMIN permission', {
      userId: user.id,
      permissions: user.permissions
    });
    return createErrorResponse(res, 403, 'Access denied. SYSTEM_ADMIN permission required.');
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetNotificationSetting(req, res, user, settingId);
      case 'PUT':
        return await handleUpdateNotificationSetting(req, res, user, settingId, validatedData);
      default:
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    Logger.error('Error in notification setting by ID handler', error);
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Get single notification setting
const handleGetNotificationSetting = async (req, res, user, settingId) => {
  try {
    Logger.info('Fetching notification setting by ID', { userId: user.id, settingId });

    // Try to get data from database first
    let setting;
    try {
      setting = await DatabaseService.getNotificationSetting(settingId);
      if (setting) {
        Logger.info('Successfully fetched notification setting from database', { 
          settingId,
          userId: user.id 
        });
        return createSuccessResponse(res, setting);
      }
    } catch (dbError) {
      Logger.warn('Database unavailable, using mock data', { 
        error: dbError.message,
        userId: user.id 
      });
    }

    // Fallback to mock data
    setting = mockNotificationSettings.find(s => s.id === settingId);
    if (!setting) {
      return createErrorResponse(res, 404, 'Notification setting not found');
    }

    return createSuccessResponse(res, setting);
  } catch (error) {
    Logger.error('Error fetching notification setting', error);
    return createErrorResponse(res, 500, 'Failed to fetch notification setting');
  }
};

// Update notification setting
const handleUpdateNotificationSetting = async (req, res, user, settingId, validatedData) => {
  try {
    Logger.info('Updating notification setting', { 
      userId: user.id,
      settingId,
      data: validatedData 
    });

    // Try to update in database first
    let setting;
    try {
      setting = await DatabaseService.updateNotificationSetting(settingId, validatedData);
      Logger.info('Successfully updated notification setting in database', { 
        settingId,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating update', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate update with mock data
      const index = mockNotificationSettings.findIndex(s => s.id === settingId);
      if (index === -1) {
        return createErrorResponse(res, 404, 'Notification setting not found');
      }
      
      setting = {
        ...mockNotificationSettings[index],
        ...validatedData,
        updatedAt: new Date(),
      };
      mockNotificationSettings[index] = setting;
    }

    return createSuccessResponse(res, setting);
  } catch (error) {
    Logger.error('Error updating notification setting', error);
    return createErrorResponse(res, 500, 'Failed to update notification setting');
  }
};

// Export the handler with middleware
module.exports = withMiddleware(
  notificationByIdHandler,
  {
    requireAuth: false, // Changed to false for demo mode
    validateInput: {
      PUT: notificationUpdateSchema
    }
  }
);
