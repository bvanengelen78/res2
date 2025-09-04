// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const dashboardReportSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required')
});

// Dashboard Report handler
const dashboardReportHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate } = validatedData;
  
  Logger.info('Generating dashboard report', {
    userId: user.id,
    startDate,
    endDate
  });

  try {
    // Fetch all necessary data
    const [
      resources,
      projects,
      allocations,
      timeEntries,
      recentReports
    ] = await Promise.all([
      DatabaseService.getResources(),
      DatabaseService.getProjects(),
      DatabaseService.getResourceAllocations(),
      DatabaseService.getTimeEntries(),
      DatabaseService.getRecentReports ? DatabaseService.getRecentReports() : []
    ]);

    // Calculate dashboard metrics
    const totalResources = resources.length;
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalAllocations = allocations.length;

    // Calculate utilization metrics
    const totalCapacity = resources.reduce((sum, r) => sum + parseFloat(r.weeklyCapacity || 40), 0);
    const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || 0), 0);
    const overallUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Calculate time entry metrics
    const totalLoggedHours = timeEntries.reduce((sum, te) => sum + parseFloat(te.hours || 0), 0);
    const uniqueResourcesLogging = new Set(timeEntries.map(te => te.resourceId)).size;

    // Project type breakdown
    const projectTypeBreakdown = projects.reduce((acc, p) => {
      const type = p.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Department breakdown
    const departmentBreakdown = resources.reduce((acc, r) => {
      const dept = r.department || r.role || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    // Resource utilization distribution
    const utilizationDistribution = {
      underutilized: 0, // < 70%
      optimal: 0,       // 70-90%
      overutilized: 0,  // 90-100%
      critical: 0       // > 100%
    };

    resources.forEach(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || 0), 0);
      const capacity = parseFloat(resource.weeklyCapacity || 40);
      const utilization = capacity > 0 ? (totalHours / capacity) * 100 : 0;

      if (utilization < 70) {
        utilizationDistribution.underutilized++;
      } else if (utilization <= 90) {
        utilizationDistribution.optimal++;
      } else if (utilization <= 100) {
        utilizationDistribution.overutilized++;
      } else {
        utilizationDistribution.critical++;
      }
    });

    // Recent activity summary
    const recentActivity = {
      newProjects: projects.filter(p => {
        const createdDate = new Date(p.createdAt || p.startDate);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= weekAgo;
      }).length,
      newAllocations: allocations.filter(a => {
        const createdDate = new Date(a.createdAt || a.startDate);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= weekAgo;
      }).length,
      recentReports: recentReports.length
    };

    const dashboardData = {
      summary: {
        totalResources,
        totalProjects,
        activeProjects,
        totalAllocations,
        totalCapacity: Math.round(totalCapacity * 100) / 100,
        totalAllocated: Math.round(totalAllocated * 100) / 100,
        overallUtilization: Math.round(overallUtilization * 100) / 100,
        totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
        uniqueResourcesLogging
      },
      breakdowns: {
        projectTypes: projectTypeBreakdown,
        departments: departmentBreakdown,
        utilizationDistribution
      },
      recentActivity,
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: startDate,
        periodEnd: endDate,
        dataFreshness: {
          resources: resources.length > 0 ? 'current' : 'empty',
          projects: projects.length > 0 ? 'current' : 'empty',
          allocations: allocations.length > 0 ? 'current' : 'empty',
          timeEntries: timeEntries.length > 0 ? 'current' : 'empty'
        }
      }
    };

    Logger.info('Dashboard report generated successfully', {
      userId: user.id,
      totalResources,
      totalProjects,
      totalAllocations,
      overallUtilization
    });

    return res.json(dashboardData);
  } catch (error) {
    Logger.error('Failed to generate dashboard report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to generate dashboard report", 
      error: error.message 
    });
  }
};

// Export with middleware
module.exports = withMiddleware(dashboardReportHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: dashboardReportSchema
});
