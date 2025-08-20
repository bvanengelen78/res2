// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const kpisQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  department: z.string().optional(),
  includeTrends: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true)
});

// Calculate KPIs from real Supabase data
const calculateKPIs = async (filters = {}) => {
  try {
    // Fetch real data from Supabase
    const [resources, projects, allocations] = await Promise.all([
      DatabaseService.getResources(),
      DatabaseService.getProjects(),
      DatabaseService.getResourceAllocations()
    ]);

    Logger.info('Calculating KPIs from real data', {
      resourcesCount: resources.length,
      projectsCount: projects.length,
      allocationsCount: allocations.length
    });

    // Apply department filter to resources if specified
    const filteredResources = filters.department && filters.department !== 'all'
      ? resources.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === filters.department;
        })
      : resources;

    // Calculate KPIs
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalProjects = projects.length;
    const availableResources = filteredResources.filter(r => r.isActive).length;
    const totalResources = filteredResources.length;

    // Calculate utilization rate
    const totalCapacity = filteredResources.reduce((sum, r) => sum + (r.weeklyCapacity || 40), 0);
    const totalAllocated = allocations
      .filter(a => filteredResources.some(r => r.id === a.resourceId))
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);
    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Calculate conflicts (resources over 100% capacity)
    const resourceUtilization = filteredResources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const utilization = resource.weeklyCapacity > 0 ? (totalHours / resource.weeklyCapacity) * 100 : 0;
      return { resource, utilization };
    });
    
    const conflicts = resourceUtilization.filter(ru => ru.utilization > 100).length;

    // Generate trend data (mock for now, TODO: implement historical data)
    const generateTrendData = (currentValue, variance = 0.1) => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const variation = (Math.random() - 0.5) * variance * currentValue;
        data.push(Math.max(0, Math.round((currentValue + variation) * 10) / 10));
      }
      return data;
    };

    const kpis = {
      activeProjects,
      totalProjects,
      availableResources,
      totalResources,
      utilization: Math.round(utilizationRate * 10) / 10,
      conflicts,
      budgetUtilization: 72.3, // TODO: Calculate from real budget data
      trendData: {
        activeProjects: {
          current_value: activeProjects,
          previous_value: Math.max(0, activeProjects - Math.floor(Math.random() * 3)),
          period_label: 'from last week',
          trend_data: generateTrendData(activeProjects, 0.2)
        },
        availableResources: {
          current_value: availableResources,
          previous_value: Math.max(0, availableResources - Math.floor(Math.random() * 2)),
          period_label: 'from last week',
          trend_data: generateTrendData(availableResources, 0.15)
        },
        utilization: {
          current_value: Math.round(utilizationRate * 10) / 10,
          previous_value: Math.max(0, Math.round((utilizationRate - (Math.random() * 10)) * 10) / 10),
          period_label: 'from last week',
          trend_data: generateTrendData(utilizationRate, 0.1)
        },
        conflicts: {
          current_value: conflicts,
          previous_value: Math.max(0, conflicts + Math.floor(Math.random() * 3) - 1),
          period_label: 'from last week',
          trend_data: generateTrendData(conflicts, 0.5)
        }
      }
    };

    Logger.info('KPIs calculated successfully', {
      activeProjects,
      utilization: utilizationRate,
      conflicts,
      department: filters.department
    });

    return kpis;
  } catch (error) {
    Logger.error('Failed to calculate KPIs', error);
    throw error;
  }
};

// Main KPIs handler
const kpisHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate, department, includeTrends } = validatedData;
  
  Logger.info('Fetching dashboard KPIs', {
    userId: user.id,
    department,
    includeTrends,
    dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
  });

  try {
    const kpis = await calculateKPIs({
      startDate,
      endDate,
      department,
      includeTrends
    });

    return res.json(kpis);
  } catch (error) {
    Logger.error('Failed to fetch KPIs', error, { userId: user.id });
    
    // Return safe fallback data structure to prevent frontend errors
    const fallbackKpis = {
      activeProjects: 0,
      totalProjects: 0,
      availableResources: 0,
      totalResources: 0,
      utilization: 0,
      conflicts: 0,
      budgetUtilization: 0,
      trendData: {
        activeProjects: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0]
        },
        availableResources: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0]
        },
        utilization: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0]
        },
        conflicts: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0]
        }
      }
    };

    return res.json(fallbackKpis);
  }
};

// Export with middleware
module.exports = withMiddleware(kpisHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: kpisQuerySchema
});
