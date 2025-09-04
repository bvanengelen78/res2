// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schemas
const createScheduleSchema = z.object({
  reportType: z.string().min(1, 'Report type is required'),
  reportName: z.string().min(1, 'Report name is required'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  criteria: z.object({}).optional(),
  isActive: z.boolean().optional().default(true),
  nextRunDate: z.string().optional()
});

const updateScheduleSchema = z.object({
  reportType: z.string().optional(),
  reportName: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  recipients: z.array(z.string().email()).optional(),
  criteria: z.object({}).optional(),
  isActive: z.boolean().optional(),
  nextRunDate: z.string().optional()
});

// Create scheduled report handler
const createScheduleHandler = async (req, res, { user, validatedData }) => {
  const { reportType, reportName, frequency, recipients, criteria, isActive, nextRunDate } = validatedData;
  
  Logger.info('Creating scheduled report', {
    userId: user.id,
    reportType,
    reportName,
    frequency,
    recipientCount: recipients.length
  });

  try {
    const userId = 1; // Default user ID for public access
    
    // Calculate next run date if not provided
    const calculatedNextRunDate = nextRunDate || calculateNextRunDate(frequency);
    
    const scheduleData = {
      reportType,
      reportName,
      frequency,
      recipients: recipients.join(', '),
      criteria: criteria || {},
      isActive: isActive !== false,
      nextRunDate: calculatedNextRunDate,
      userId,
      createdAt: new Date().toISOString(),
      lastRunDate: null,
      runCount: 0
    };

    const newSchedule = await DatabaseService.createReportSchedule(scheduleData);
    
    Logger.info('Scheduled report created successfully', {
      userId: user.id,
      scheduleId: newSchedule.id,
      reportName,
      nextRunDate: calculatedNextRunDate
    });

    return res.json(newSchedule);
  } catch (error) {
    Logger.error('Failed to create scheduled report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to create scheduled report", 
      error: error.message 
    });
  }
};

// Get scheduled reports handler
const getSchedulesHandler = async (req, res, { user }) => {
  Logger.info('Fetching scheduled reports', { userId: user.id });

  try {
    const userId = 1; // Default user ID for public access
    const schedules = await DatabaseService.getReportSchedules(userId);
    
    Logger.info('Scheduled reports fetched successfully', {
      userId: user.id,
      scheduleCount: schedules.length
    });

    return res.json(schedules);
  } catch (error) {
    Logger.error('Failed to fetch scheduled reports', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to fetch scheduled reports", 
      error: error.message 
    });
  }
};

// Update scheduled report handler
const updateScheduleHandler = async (req, res, { user, validatedData }) => {
  const scheduleId = parseInt(req.query.id);
  
  if (!scheduleId || isNaN(scheduleId)) {
    return res.status(400).json({ message: "Invalid schedule ID" });
  }

  Logger.info('Updating scheduled report', {
    userId: user.id,
    scheduleId,
    updates: Object.keys(validatedData)
  });

  try {
    const userId = 1; // Default user ID for public access
    
    // Prepare update data
    const updateData = { ...validatedData };
    if (updateData.recipients && Array.isArray(updateData.recipients)) {
      updateData.recipients = updateData.recipients.join(', ');
    }
    if (updateData.frequency && !updateData.nextRunDate) {
      updateData.nextRunDate = calculateNextRunDate(updateData.frequency);
    }
    updateData.updatedAt = new Date().toISOString();

    const updatedSchedule = await DatabaseService.updateReportSchedule(scheduleId, updateData, userId);
    
    Logger.info('Scheduled report updated successfully', {
      userId: user.id,
      scheduleId
    });

    return res.json(updatedSchedule);
  } catch (error) {
    Logger.error('Failed to update scheduled report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to update scheduled report", 
      error: error.message 
    });
  }
};

// Delete scheduled report handler
const deleteScheduleHandler = async (req, res, { user }) => {
  const scheduleId = parseInt(req.query.id);
  
  if (!scheduleId || isNaN(scheduleId)) {
    return res.status(400).json({ message: "Invalid schedule ID" });
  }

  Logger.info('Deleting scheduled report', {
    userId: user.id,
    scheduleId
  });

  try {
    const userId = 1; // Default user ID for public access
    await DatabaseService.deleteReportSchedule(scheduleId, userId);
    
    Logger.info('Scheduled report deleted successfully', {
      userId: user.id,
      scheduleId
    });

    return res.json({ message: "Scheduled report deleted successfully" });
  } catch (error) {
    Logger.error('Failed to delete scheduled report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to delete scheduled report", 
      error: error.message 
    });
  }
};

// Helper function to calculate next run date
const calculateNextRunDate = (frequency) => {
  const now = new Date();
  const nextRun = new Date(now);
  
  switch (frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      nextRun.setMonth(now.getMonth() + 3);
      break;
    default:
      nextRun.setDate(now.getDate() + 1); // Default to daily
  }
  
  return nextRun.toISOString();
};

// Main handler that routes based on method
const scheduleHandler = async (req, res, context) => {
  const method = req.method;
  const scheduleId = req.query.id;
  
  switch (method) {
    case 'GET':
      return getSchedulesHandler(req, res, context);
    
    case 'POST':
      return createScheduleHandler(req, res, context);
    
    case 'PUT':
      if (!scheduleId) {
        return res.status(400).json({ message: "Schedule ID is required for updates" });
      }
      return updateScheduleHandler(req, res, context);
    
    case 'DELETE':
      if (!scheduleId) {
        return res.status(400).json({ message: "Schedule ID is required for deletion" });
      }
      return deleteScheduleHandler(req, res, context);
    
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(scheduleHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  validateSchema: (req) => {
    if (req.method === 'POST') {
      return createScheduleSchema.parse(req.body);
    } else if (req.method === 'PUT') {
      return updateScheduleSchema.parse(req.body);
    }
    return {}; // No validation needed for GET/DELETE
  }
});
