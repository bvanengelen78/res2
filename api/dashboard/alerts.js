// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

// Standardized effective capacity calculation constant (matches frontend)
const DEFAULT_NON_PROJECT_HOURS = 8; // Meetings, admin, etc.

// Calculate capacity alerts from real Supabase data
const calculateCapacityAlerts = async (filters = {}) => {
  try {
    // Fetch real data from Supabase with fallback to basic methods
    const { startDate, endDate, department } = filters;

    console.log('Starting capacity alerts calculation', { filters });

    const [resources, projects, allocations] = await Promise.all([
      DatabaseService.getResources(),
      // Use basic methods for now to avoid period filtering issues
      DatabaseService.getProjects(),
      DatabaseService.getResourceAllocations()
    ]);

    console.log('Calculating capacity alerts from real data', {
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

    // Calculate resource utilization and identify conflicts using effective capacity
    const resourceUtilization = filteredResources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours || 0), 0);

      const weeklyCapacity = parseFloat(resource.weeklyCapacity) || 40;
      const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
      const utilization = effectiveCapacity > 0 ? (totalHours / effectiveCapacity) * 100 : 0;
      
      // Get conflicting projects
      const conflictingProjects = resourceAllocations
        .map(a => projects.find(p => p.id === a.projectId))
        .filter(p => p)
        .map(p => p.name);

      return {
        resource,
        utilization,
        totalHours,
        conflictingProjects,
        overallocationHours: Math.max(0, totalHours - parseFloat(resource.weeklyCapacity))
      };
    });

    // Categorize alerts by severity
    const criticalAlerts = resourceUtilization
      .filter(ru => ru.utilization > 120)
      .map(ru => ({
        id: `critical-${ru.resource.id}`,
        resourceId: ru.resource.id,
        resourceName: ru.resource.name,
        department: ru.resource.department || ru.resource.role || 'General',
        currentUtilization: Math.round(ru.utilization * 10) / 10,
        threshold: 100.0,
        weeklyCapacity: parseFloat(ru.resource.weeklyCapacity),
        allocatedHours: ru.totalHours,
        conflictDetails: {
          overallocationHours: ru.overallocationHours,
          conflictingProjects: ru.conflictingProjects,
          suggestedActions: [
            `Redistribute ${ru.overallocationHours}h from high-priority projects`,
            'Consider hiring additional resources',
            'Negotiate project timeline extensions'
          ]
        },
        severity: 'critical',
        createdAt: new Date().toISOString()
      }));

    const warningAlerts = resourceUtilization
      .filter(ru => ru.utilization > 90 && ru.utilization <= 120)
      .map(ru => ({
        id: `warning-${ru.resource.id}`,
        resourceId: ru.resource.id,
        resourceName: ru.resource.name,
        department: ru.resource.department || ru.resource.role || 'General',
        currentUtilization: Math.round(ru.utilization * 10) / 10,
        threshold: 90.0,
        weeklyCapacity: parseFloat(ru.resource.weeklyCapacity),
        allocatedHours: ru.totalHours,
        conflictDetails: {
          overallocationHours: ru.overallocationHours,
          conflictingProjects: ru.conflictingProjects,
          suggestedActions: [
            'Monitor closely for capacity breaches',
            'Prepare backup resources',
            'Consider workload redistribution'
          ]
        },
        severity: 'warning',
        createdAt: new Date().toISOString()
      }));

    const infoAlerts = resourceUtilization
      .filter(ru => ru.utilization > 75 && ru.utilization <= 90)
      .map(ru => ({
        id: `info-${ru.resource.id}`,
        resourceId: ru.resource.id,
        resourceName: ru.resource.name,
        department: ru.resource.department || ru.resource.role || 'General',
        currentUtilization: Math.round(ru.utilization * 10) / 10,
        threshold: 75.0,
        weeklyCapacity: parseFloat(ru.resource.weeklyCapacity),
        allocatedHours: ru.totalHours,
        conflictDetails: {
          overallocationHours: 0,
          conflictingProjects: ru.conflictingProjects,
          suggestedActions: [
            'Resource approaching capacity',
            'Plan for future allocation carefully'
          ]
        },
        severity: 'info',
        createdAt: new Date().toISOString()
      }));

    // Build categories structure matching AlertCategory interface
    const categories = [];

    if (criticalAlerts.length > 0) {
      categories.push({
        type: 'critical',
        title: 'Critical Capacity Issues',
        description: 'Resources exceeding 120% capacity requiring immediate attention',
        count: criticalAlerts.length,
        resources: criticalAlerts.map(alert => ({
          id: alert.resourceId,
          name: alert.resourceName,
          utilization: alert.currentUtilization,
          allocatedHours: alert.allocatedHours,
          capacity: parseFloat(alert.weeklyCapacity),
          department: alert.department
        })),
        threshold: 120,
        color: 'red',
        icon: 'alert-circle'
      });
    }

    if (warningAlerts.length > 0) {
      categories.push({
        type: 'warning',
        title: 'Capacity Warnings',
        description: 'Resources approaching capacity limits (90-120%)',
        count: warningAlerts.length,
        resources: warningAlerts.map(alert => ({
          id: alert.resourceId,
          name: alert.resourceName,
          utilization: alert.currentUtilization,
          allocatedHours: alert.allocatedHours,
          capacity: parseFloat(alert.weeklyCapacity),
          department: alert.department
        })),
        threshold: 90,
        color: 'yellow',
        icon: 'alert-triangle'
      });
    }

    if (infoAlerts.length > 0) {
      categories.push({
        type: 'info',
        title: 'Capacity Information',
        description: 'Resources with moderate utilization (75-90%)',
        count: infoAlerts.length,
        resources: infoAlerts.map(alert => ({
          id: alert.resourceId,
          name: alert.resourceName,
          utilization: alert.currentUtilization,
          allocatedHours: alert.allocatedHours,
          capacity: parseFloat(alert.weeklyCapacity),
          department: alert.department
        })),
        threshold: 75,
        color: 'blue',
        icon: 'info'
      });
    }

    // Apply severity filter
    const filteredCategories = filters.severity === 'all' 
      ? categories 
      : categories.filter(cat => cat.type === filters.severity);

    const alertsData = {
      categories: filteredCategories,
      summary: {
        totalAlerts: criticalAlerts.length + warningAlerts.length + infoAlerts.length,
        criticalCount: criticalAlerts.length,
        warningCount: warningAlerts.length,
        infoCount: infoAlerts.length,
        unassignedCount: 0 // Not applicable for capacity alerts
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: filters.startDate || new Date().toISOString(),
        periodEnd: filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        department: filters.department || 'all'
      }
    };

    console.log('Capacity alerts calculated successfully', {
      totalAlerts: alertsData.summary.totalAlerts,
      critical: criticalAlerts.length,
      warning: warningAlerts.length,
      info: infoAlerts.length,
      department: filters.department
    });

    return alertsData;
  } catch (error) {
    console.error('Failed to calculate capacity alerts', error);
    throw error;
  }
};

// Main alerts handler
const alertsHandler = async (req, res) => {
  // Handle query parameters directly
  const { startDate, endDate, department, severity = 'all' } = req.query || {};

  console.log('Fetching capacity alerts', {
    department,
    severity,
    dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'current period',
    queryParams: req.query
  });

  try {
    const alerts = await calculateCapacityAlerts({
      startDate,
      endDate,
      department,
      severity
    });

    console.log('Capacity alerts calculated successfully', {
      totalAlerts: alerts.summary.totalAlerts
    });

    return res.json(alerts);
  } catch (error) {
    console.error('Failed to fetch capacity alerts', error, {
      errorMessage: error.message,
      errorStack: error.stack
    });

    // Return safe fallback data structure
    const fallbackAlerts = {
      categories: [],
      summary: {
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        unassignedCount: 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        department: department || 'all',
        error: 'Fallback data due to calculation error'
      }
    };

    return res.json(fallbackAlerts);
  }
};

// Export without middleware for simplicity
module.exports = alertsHandler;
