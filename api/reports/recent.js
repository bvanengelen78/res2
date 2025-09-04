// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schemas
const createRecentReportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  type: z.string().min(1, 'Report type is required'),
  size: z.string().optional(),
  criteria: z.object({}).optional()
});

// GET handler for fetching recent reports
const getRecentReportsHandler = async (req, res, { user }) => {
  Logger.info('Fetching recent reports', { userId: user.id });

  try {
    const userId = 1; // Default user ID for public access
    const recentReports = await DatabaseService.getRecentReports(userId);
    
    Logger.info('Recent reports fetched successfully', {
      userId: user.id,
      reportCount: recentReports.length
    });

    return res.json(recentReports);
  } catch (error) {
    Logger.error('Failed to fetch recent reports', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to fetch recent reports", 
      error: error.message 
    });
  }
};

// POST handler for creating recent reports
const createRecentReportHandler = async (req, res, { user, validatedData }) => {
  const { name, type, size, criteria } = validatedData;
  
  Logger.info('Creating recent report', {
    userId: user.id,
    name,
    type,
    size
  });

  try {
    const userId = 1; // Default user ID for public access
    const reportData = {
      name,
      type,
      size: size || 'Unknown',
      criteria: criteria || {},
      userId,
      createdAt: new Date().toISOString()
    };

    const newReport = await DatabaseService.createRecentReport(reportData);
    
    Logger.info('Recent report created successfully', {
      userId: user.id,
      reportId: newReport.id,
      name
    });

    return res.json(newReport);
  } catch (error) {
    Logger.error('Failed to create recent report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to create recent report", 
      error: error.message 
    });
  }
};

// DELETE handler for removing specific recent report
const deleteRecentReportHandler = async (req, res, { user }) => {
  const reportId = parseInt(req.query.id);
  
  if (!reportId || isNaN(reportId)) {
    return res.status(400).json({ message: "Invalid report ID" });
  }

  Logger.info('Deleting recent report', {
    userId: user.id,
    reportId
  });

  try {
    const userId = 1; // Default user ID for public access
    await DatabaseService.deleteRecentReport(reportId, userId);
    
    Logger.info('Recent report deleted successfully', {
      userId: user.id,
      reportId
    });

    return res.json({ message: "Report deleted successfully" });
  } catch (error) {
    Logger.error('Failed to delete recent report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to delete recent report", 
      error: error.message 
    });
  }
};

// DELETE handler for clearing all recent reports
const clearRecentReportsHandler = async (req, res, { user }) => {
  Logger.info('Clearing all recent reports', { userId: user.id });

  try {
    const userId = 1; // Default user ID for public access
    await DatabaseService.clearRecentReports(userId);
    
    Logger.info('All recent reports cleared successfully', { userId: user.id });

    return res.json({ message: "All reports cleared successfully" });
  } catch (error) {
    Logger.error('Failed to clear recent reports', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to clear recent reports", 
      error: error.message 
    });
  }
};

// Main handler that routes based on method
const recentReportsHandler = async (req, res, context) => {
  const method = req.method;
  
  switch (method) {
    case 'GET':
      if (req.query.id) {
        return deleteRecentReportHandler(req, res, context);
      }
      return getRecentReportsHandler(req, res, context);
    
    case 'POST':
      return createRecentReportHandler(req, res, context);
    
    case 'DELETE':
      if (req.query.id) {
        return deleteRecentReportHandler(req, res, context);
      }
      return clearRecentReportsHandler(req, res, context);
    
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(recentReportsHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET', 'POST', 'DELETE'],
  validateSchema: null // No validation for this endpoint since it handles multiple methods
});
