// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const changeAllocationReportSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  projectIds: z.array(z.number()).min(1, 'At least one project must be selected'),
  resourceIds: z.array(z.number()).optional(),
  groupBy: z.enum(['project', 'resource']).optional().default('project')
});

// Change Allocation Report handler
const changeAllocationReportHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate, projectIds, resourceIds, groupBy } = validatedData;
  
  Logger.info('Generating change allocation report', {
    userId: user.id,
    startDate,
    endDate,
    projectCount: projectIds.length,
    resourceCount: resourceIds?.length || 0,
    groupBy
  });

  try {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (startDateObj > endDateObj) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    Logger.info(`Generating change allocation report for ${projectIds.length} projects from ${startDate} to ${endDate}`);

    const reportData = await DatabaseService.getChangeAllocationReport(
      startDate,
      endDate,
      projectIds,
      resourceIds?.length > 0 ? resourceIds : undefined,
      groupBy
    );

    // Calculate summary statistics
    const totalAllocations = reportData.length;
    const totalEstimatedHours = reportData.reduce((sum, r) => sum + parseFloat(r.estimatedHours || 0), 0);
    const totalActualHours = reportData.reduce((sum, r) => sum + parseFloat(r.actualHours || 0), 0);
    const totalDeviation = totalActualHours - totalEstimatedHours;
    const deviationPercentage = totalEstimatedHours > 0 ? (totalDeviation / totalEstimatedHours) * 100 : 0;

    // Group by project or resource
    const groupedData = reportData.reduce((acc, row) => {
      const key = groupBy === 'project' ? row.projectId : row.resourceId;
      const groupName = groupBy === 'project' ? row.projectName : row.resourceName;
      
      if (!acc[key]) {
        acc[key] = {
          id: key,
          name: groupName,
          allocations: [],
          totalEstimated: 0,
          totalActual: 0,
          totalDeviation: 0
        };
      }
      
      acc[key].allocations.push(row);
      acc[key].totalEstimated += parseFloat(row.estimatedHours || 0);
      acc[key].totalActual += parseFloat(row.actualHours || 0);
      acc[key].totalDeviation = acc[key].totalActual - acc[key].totalEstimated;
      
      return acc;
    }, {});

    // Convert to array and add percentages
    const groupedArray = Object.values(groupedData).map(group => ({
      ...group,
      totalEstimated: Math.round(group.totalEstimated * 100) / 100,
      totalActual: Math.round(group.totalActual * 100) / 100,
      totalDeviation: Math.round(group.totalDeviation * 100) / 100,
      deviationPercentage: group.totalEstimated > 0 ? 
        Math.round((group.totalDeviation / group.totalEstimated) * 10000) / 100 : 0
    }));

    const metadata = {
      criteria: {
        startDate,
        endDate,
        projectIds,
        resourceIds: resourceIds || [],
        groupBy
      },
      summary: {
        totalAllocations,
        totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        totalDeviation: Math.round(totalDeviation * 100) / 100,
        deviationPercentage: Math.round(deviationPercentage * 100) / 100,
        groupCount: groupedArray.length
      },
      generatedAt: new Date().toISOString(),
      generatedBy: user.id
    };

    Logger.info('Change allocation report generated successfully', {
      userId: user.id,
      totalAllocations,
      groupCount: groupedArray.length,
      totalEstimatedHours,
      totalActualHours
    });

    return res.json({
      data: groupedArray,
      metadata
    });
  } catch (error) {
    Logger.error('Failed to generate change allocation report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to generate change allocation report", 
      error: error.message 
    });
  }
};

// Export with middleware
module.exports = withMiddleware(changeAllocationReportHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: changeAllocationReportSchema
});
