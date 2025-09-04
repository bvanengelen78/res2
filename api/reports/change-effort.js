// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const changeEffortReportSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  projectId: z.number().optional()
});

// Change Effort Report handler
const changeEffortReportHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate, projectId } = validatedData;
  
  Logger.info('Generating change effort report', {
    userId: user.id,
    startDate,
    endDate,
    projectId
  });

  try {
    const rawData = await DatabaseService.getChangeEffortReport(startDate, endDate, projectId);

    // Group the data by change/project
    const changeMap = new Map();

    rawData.forEach(row => {
      const changeKey = `${row.changeId}-${row.projectId}`;
      
      if (!changeMap.has(changeKey)) {
        changeMap.set(changeKey, {
          changeId: row.changeId,
          projectId: row.projectId,
          changeTitle: row.changeTitle,
          projectName: row.projectName,
          projectType: row.projectType,
          changeStatus: row.changeStatus,
          changeLead: row.changeLead,
          director: row.director,
          stream: row.stream,
          startDate: row.startDate,
          endDate: row.endDate,
          resources: []
        });
      }

      const change = changeMap.get(changeKey);
      
      // Find existing resource or create new one
      let resource = change.resources.find(r => r.resourceId === row.resourceId);
      if (!resource) {
        resource = {
          resourceId: row.resourceId,
          resourceName: row.resourceName,
          resourceEmail: row.resourceEmail,
          department: row.department,
          role: row.role,
          estimatedHours: 0,
          actualHours: 0,
          weeklyBreakdown: []
        };
        change.resources.push(resource);
      }

      // Add estimated and actual hours
      resource.estimatedHours += parseFloat(row.estimatedHours || 0);
      resource.actualHours += parseFloat(row.actualHours || 0);

      // Add weekly breakdown if available
      if (row.weekStartDate && row.weeklyActualHours) {
        resource.weeklyBreakdown.push({
          weekStartDate: row.weekStartDate,
          estimatedHours: parseFloat(row.weeklyEstimatedHours || 0),
          actualHours: parseFloat(row.weeklyActualHours || 0)
        });
      }
    });

    // Calculate totals for each change
    const result = Array.from(changeMap.values()).map(change => {
      const totalEstimatedHours = change.resources.reduce((sum, r) => sum + r.estimatedHours, 0);
      const totalActualHours = change.resources.reduce((sum, r) => sum + r.actualHours, 0);
      const totalDeviation = totalActualHours - totalEstimatedHours;
      const totalDeviationPercentage = totalEstimatedHours > 0 ? (totalDeviation / totalEstimatedHours) * 100 : 0;

      return {
        ...change,
        totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        totalDeviation: Math.round(totalDeviation * 100) / 100,
        totalDeviationPercentage: Math.round(totalDeviationPercentage * 100) / 100,
      };
    });

    Logger.info('Change effort report generated successfully', {
      userId: user.id,
      totalChanges: result.length,
      totalRawRecords: rawData.length,
      projectFilter: projectId || 'all'
    });

    return res.json(result);
  } catch (error) {
    Logger.error('Failed to generate change effort report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to generate change effort report", 
      error: error.message 
    });
  }
};

// Export with middleware
module.exports = withMiddleware(changeEffortReportHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: changeEffortReportSchema
});
