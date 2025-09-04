// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const businessControllerReportSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  showOnlyActive: z.boolean().optional().default(false)
});

// Business Controller Report handler
const businessControllerReportHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate, showOnlyActive } = validatedData;
  
  Logger.info('Generating business controller report', {
    userId: user.id,
    startDate,
    endDate,
    showOnlyActive
  });

  try {
    const reportData = await DatabaseService.getBusinessControllerReport(startDate, endDate, showOnlyActive);

    // Calculate summary statistics
    const totalChanges = new Set(reportData.map(r => r.changeId)).size;
    const totalResources = new Set(reportData.map(r => r.resourceId)).size;
    const totalHours = reportData.reduce((sum, r) => sum + r.totalActualHours, 0);
    const avgHoursPerChange = totalChanges > 0 ? totalHours / totalChanges : 0;

    // Calculate department breakdown
    const departmentBreakdown = reportData.reduce((acc, r) => {
      const dept = r.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = { hours: 0, resources: new Set(), changes: new Set() };
      }
      acc[dept].hours += r.totalActualHours;
      acc[dept].resources.add(r.resourceId);
      acc[dept].changes.add(r.changeId);
      return acc;
    }, {});

    // Convert sets to counts for response
    Object.keys(departmentBreakdown).forEach(dept => {
      departmentBreakdown[dept].resourceCount = departmentBreakdown[dept].resources.size;
      departmentBreakdown[dept].changeCount = departmentBreakdown[dept].changes.size;
      delete departmentBreakdown[dept].resources;
      delete departmentBreakdown[dept].changes;
    });

    // Calculate role breakdown
    const roleBreakdown = reportData.reduce((acc, r) => {
      const role = r.role || 'Unassigned';
      if (!acc[role]) {
        acc[role] = { hours: 0, resources: new Set(), changes: new Set() };
      }
      acc[role].hours += r.totalActualHours;
      acc[role].resources.add(r.resourceId);
      acc[role].changes.add(r.changeId);
      return acc;
    }, {});

    // Convert sets to counts for response
    Object.keys(roleBreakdown).forEach(role => {
      roleBreakdown[role].resourceCount = roleBreakdown[role].resources.size;
      roleBreakdown[role].changeCount = roleBreakdown[role].changes.size;
      delete roleBreakdown[role].resources;
      delete roleBreakdown[role].changes;
    });

    const summary = {
      totalChanges,
      totalResources,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerChange: Math.round(avgHoursPerChange * 100) / 100,
      avgHoursPerResource: totalResources > 0 ? Math.round((totalHours / totalResources) * 100) / 100 : 0,
      departmentBreakdown,
      roleBreakdown,
      reportPeriod: {
        startDate,
        endDate,
        showOnlyActive
      },
      generatedAt: new Date().toISOString()
    };

    Logger.info('Business controller report generated successfully', {
      userId: user.id,
      totalRecords: reportData.length,
      totalChanges,
      totalResources,
      totalHours
    });

    return res.json({ reportData, summary });
  } catch (error) {
    Logger.error('Failed to generate business controller report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to generate business controller report", 
      error: error.message 
    });
  }
};

// Export with middleware
module.exports = withMiddleware(businessControllerReportHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: businessControllerReportSchema
});
