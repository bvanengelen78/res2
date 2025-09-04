// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

// Standardized effective capacity calculation constant (matches frontend)
const DEFAULT_NON_PROJECT_HOURS = 8; // Meetings, admin, etc.

// Data validation functions
const validateResourceData = (resources) => {
  if (!Array.isArray(resources)) {
    throw new Error('Resources data must be an array');
  }

  return resources.filter(resource => {
    if (!resource || typeof resource !== 'object') {
      console.warn('Invalid resource object found, skipping', { resource });
      return false;
    }

    if (!resource.id || !resource.name) {
      console.warn('Resource missing required fields (id, name), skipping', {
        id: resource.id,
        name: resource.name
      });
      return false;
    }

    // Validate and sanitize weeklyCapacity
    if (resource.weeklyCapacity) {
      const capacity = parseFloat(resource.weeklyCapacity);
      if (isNaN(capacity) || capacity < 0 || capacity > 168) { // Max 24h * 7 days
        console.warn('Invalid weeklyCapacity, using default 40h', {
          resourceId: resource.id,
          weeklyCapacity: resource.weeklyCapacity
        });
        resource.weeklyCapacity = 40;
      } else {
        resource.weeklyCapacity = capacity;
      }
    } else {
      resource.weeklyCapacity = 40; // Default
    }

    // Ensure isActive is boolean
    resource.isActive = Boolean(resource.isActive);

    return true;
  });
};

const validateProjectData = (projects) => {
  if (!Array.isArray(projects)) {
    throw new Error('Projects data must be an array');
  }

  return projects.filter(project => {
    if (!project || typeof project !== 'object') {
      console.warn('Invalid project object found, skipping', { project });
      return false;
    }

    if (!project.id || !project.name) {
      console.warn('Project missing required fields (id, name), skipping', {
        id: project.id,
        name: project.name
      });
      return false;
    }

    // Validate dates
    if (project.startDate && !isValidDate(project.startDate)) {
      console.warn('Invalid project startDate, skipping project', {
        projectId: project.id,
        startDate: project.startDate
      });
      return false;
    }

    if (project.endDate && !isValidDate(project.endDate)) {
      console.warn('Invalid project endDate, skipping project', {
        projectId: project.id,
        endDate: project.endDate
      });
      return false;
    }

    // Ensure status is valid
    if (!project.status) {
      project.status = 'active'; // Default
    }

    return true;
  });
};

const validateAllocationData = (allocations) => {
  if (!Array.isArray(allocations)) {
    throw new Error('Allocations data must be an array');
  }

  return allocations.filter(allocation => {
    if (!allocation || typeof allocation !== 'object') {
      console.warn('Invalid allocation object found, skipping', { allocation });
      return false;
    }

    if (!allocation.id || !allocation.resourceId || !allocation.projectId) {
      console.warn('Allocation missing required fields, skipping', {
        id: allocation.id,
        resourceId: allocation.resourceId,
        projectId: allocation.projectId
      });
      return false;
    }

    // Validate and sanitize allocated hours
    if (allocation.allocatedHours) {
      const hours = parseFloat(allocation.allocatedHours);
      if (isNaN(hours) || hours < 0 || hours > 168) { // Max 24h * 7 days
        console.warn('Invalid allocatedHours, setting to 0', {
          allocationId: allocation.id,
          allocatedHours: allocation.allocatedHours
        });
        allocation.allocatedHours = 0;
      } else {
        allocation.allocatedHours = hours;
      }
    }

    // Validate weekly allocations if present
    if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
      const validatedWeeklyAllocations = {};
      Object.entries(allocation.weeklyAllocations).forEach(([week, hours]) => {
        const validHours = parseFloat(hours);
        if (!isNaN(validHours) && validHours >= 0 && validHours <= 24) {
          validatedWeeklyAllocations[week] = validHours;
        } else {
          Logger.warn('Invalid weekly allocation hours, skipping week', {
            allocationId: allocation.id,
            week,
            hours
          });
        }
      });
      allocation.weeklyAllocations = validatedWeeklyAllocations;
    }

    // Validate dates
    if (allocation.startDate && !isValidDate(allocation.startDate)) {
      Logger.warn('Invalid allocation startDate, skipping allocation', {
        allocationId: allocation.id,
        startDate: allocation.startDate
      });
      return false;
    }

    if (allocation.endDate && !isValidDate(allocation.endDate)) {
      Logger.warn('Invalid allocation endDate, skipping allocation', {
        allocationId: allocation.id,
        endDate: allocation.endDate
      });
      return false;
    }

    return true;
  });
};

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

const validateKpiCalculationInputs = (startDate, endDate, department) => {
  // Validate date range
  if (startDate && !isValidDate(startDate)) {
    throw new Error(`Invalid startDate: ${startDate}`);
  }

  if (endDate && !isValidDate(endDate)) {
    throw new Error(`Invalid endDate: ${endDate}`);
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new Error('startDate cannot be after endDate');
    }

    // Check for reasonable date range (not more than 2 years)
    const diffInDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffInDays > 730) {
      throw new Error('Date range cannot exceed 2 years');
    }
  }

  // Validate department
  if (department && typeof department !== 'string') {
    throw new Error('Department must be a string');
  }
};

// Helper function to calculate date ranges for historical trend data
const getHistoricalPeriods = (endDate, periodsCount = 7) => {
  const periods = [];
  const end = new Date(endDate);

  for (let i = 0; i < periodsCount; i++) {
    const periodEnd = new Date(end);
    periodEnd.setDate(periodEnd.getDate() - (i * 7)); // Weekly periods

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 6); // 7-day period

    periods.unshift({
      startDate: periodStart.toISOString().split('T')[0],
      endDate: periodEnd.toISOString().split('T')[0]
    });
  }

  return periods;
};

// Helper function to calculate KPIs for a specific period (for historical data)
const calculateKPIsForPeriod = (resources, projects, allocations, startDate, endDate, department) => {
  // Apply department filter to resources if specified
  const filteredResources = department && department !== 'all'
    ? resources.filter(r => {
        const resourceDepartment = r.department || r.role || 'General';
        return resourceDepartment === department;
      })
    : resources;

  // Apply period filtering to projects and allocations
  const periodFilteredProjects = projects.filter(project =>
    isProjectActiveInPeriod(project, startDate, endDate)
  );

  const periodFilteredAllocations = filterAllocationsByPeriod(allocations, startDate, endDate);

  // Calculate KPIs with period-aware data
  const activeProjects = periodFilteredProjects.length;

  // Calculate effective capacity
  const totalEffectiveCapacity = filteredResources.reduce((sum, r) => {
    const weeklyCapacity = parseFloat(r.weeklyCapacity) || 40;
    const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
    return sum + effectiveCapacity;
  }, 0);

  // Calculate total allocated hours from period-filtered allocations
  const totalAllocated = periodFilteredAllocations
    .filter(a => filteredResources.some(r => r.id === a.resourceId))
    .reduce((sum, a) => {
      let allocationHours = 0;
      if (a.allocatedHours && a.allocatedHours > 0) {
        allocationHours = parseFloat(a.allocatedHours) || 0;
      } else if (a.weeklyAllocations && typeof a.weeklyAllocations === 'object') {
        allocationHours = Object.values(a.weeklyAllocations).reduce((weekSum, hours) => weekSum + (parseFloat(hours) || 0), 0);
      }
      return sum + allocationHours;
    }, 0);

  const utilizationRate = totalEffectiveCapacity > 0 ? (totalAllocated / totalEffectiveCapacity) * 100 : 0;

  // Calculate available resources and conflicts
  const resourceUtilizationMap = new Map();
  filteredResources.forEach(resource => {
    const resourceAllocations = periodFilteredAllocations.filter(a => a.resourceId === resource.id);
    const totalHours = resourceAllocations.reduce((sum, a) => {
      let allocationHours = 0;
      if (a.allocatedHours && a.allocatedHours > 0) {
        allocationHours = parseFloat(a.allocatedHours) || 0;
      } else if (a.weeklyAllocations && typeof a.weeklyAllocations === 'object') {
        allocationHours = Object.values(a.weeklyAllocations).reduce((weekSum, hours) => weekSum + (parseFloat(hours) || 0), 0);
      }
      return sum + allocationHours;
    }, 0);

    const weeklyCapacity = parseFloat(resource.weeklyCapacity) || 40;
    const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
    const utilization = effectiveCapacity > 0 ? (totalHours / effectiveCapacity) * 100 : 0;

    resourceUtilizationMap.set(resource.id, { resource, utilization, totalHours, effectiveCapacity });
  });

  const availableResources = Array.from(resourceUtilizationMap.values())
    .filter(ru => ru.resource.isActive && ru.utilization < 100).length;

  const conflicts = Array.from(resourceUtilizationMap.values())
    .filter(ru => ru.resource.isActive && ru.utilization > 100).length;

  return {
    activeProjects,
    availableResources,
    utilization: Math.round(utilizationRate * 10) / 10,
    conflicts
  };
};

// Removed validation schema for simplicity

// Helper function to check if a date range overlaps with the filter period
const dateRangeOverlaps = (itemStartDate, itemEndDate, filterStartDate, filterEndDate) => {
  if (!filterStartDate || !filterEndDate) return true; // No period filter applied

  const itemStart = new Date(itemStartDate);
  const itemEnd = new Date(itemEndDate);
  const filterStart = new Date(filterStartDate);
  const filterEnd = new Date(filterEndDate);

  // Check if there's any overlap between the date ranges
  return itemStart <= filterEnd && itemEnd >= filterStart;
};

// Helper function to check if a project is active within the specified period
const isProjectActiveInPeriod = (project, startDate, endDate) => {
  if (!startDate || !endDate) {
    return project.status === 'active';
  }

  // Project is active in period if:
  // 1. It has active status AND
  // 2. Its date range overlaps with the filter period
  return project.status === 'active' &&
         dateRangeOverlaps(project.startDate, project.endDate, startDate, endDate);
};

// Helper function to filter allocations by period
const filterAllocationsByPeriod = (allocations, startDate, endDate) => {
  if (!startDate || !endDate) return allocations;

  return allocations.filter(allocation =>
    dateRangeOverlaps(allocation.startDate, allocation.endDate, startDate, endDate)
  );
};

// Calculate KPIs from real Supabase data with period-aware filtering
const calculateKPIs = async (filters = {}) => {
  try {
    const { startDate, endDate, department } = filters;

    // Validate inputs
    validateKpiCalculationInputs(startDate, endDate, department);

    // Fetch real data from Supabase with optimized period filtering
    const [rawResources, rawProjects, rawAllocations] = await Promise.all([
      DatabaseService.getResources(),
      startDate && endDate ?
        DatabaseService.getProjectsByPeriod(startDate, endDate) :
        DatabaseService.getProjects(),
      startDate && endDate ?
        DatabaseService.getResourceAllocationsByPeriod(startDate, endDate) :
        DatabaseService.getResourceAllocations()
    ]);

    // Validate and sanitize data
    const resources = validateResourceData(rawResources);
    const projects = validateProjectData(rawProjects);
    const allocations = validateAllocationData(rawAllocations);

    Logger.info('Calculating KPIs from real data with period filtering', {
      resourcesCount: resources.length,
      projectsCount: projects.length,
      allocationsCount: allocations.length,
      periodFilter: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
    });

    // Apply department filter to resources if specified
    const filteredResources = department && department !== 'all'
      ? resources.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === department;
        })
      : resources;

    // Projects and allocations are already period-filtered at database level
    // Apply additional filtering only if needed for edge cases
    const periodFilteredProjects = startDate && endDate ?
      projects.filter(project => isProjectActiveInPeriod(project, startDate, endDate)) :
      projects.filter(p => p.status === 'active');

    const periodFilteredAllocations = startDate && endDate ?
      filterAllocationsByPeriod(allocations, startDate, endDate) :
      allocations;

    // Calculate KPIs with period-aware data
    const activeProjects = periodFilteredProjects.length;
    const totalProjects = projects.length; // Total projects regardless of period
    // Calculate effective capacity (total capacity - non-project hours) with validation
    let totalEffectiveCapacity = 0;
    try {
      totalEffectiveCapacity = filteredResources.reduce((sum, r) => {
        if (!r || typeof r.weeklyCapacity !== 'number') {
          Logger.warn('Invalid resource for capacity calculation, skipping', { resourceId: r?.id });
          return sum;
        }

        const weeklyCapacity = r.weeklyCapacity;
        const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);

        if (effectiveCapacity < 0 || effectiveCapacity > 160) { // Sanity check
          Logger.warn('Unusual effective capacity calculated', {
            resourceId: r.id,
            weeklyCapacity,
            effectiveCapacity
          });
        }

        return sum + effectiveCapacity;
      }, 0);

      if (totalEffectiveCapacity < 0) {
        Logger.warn('Negative total effective capacity calculated, setting to 0');
        totalEffectiveCapacity = 0;
      }
    } catch (error) {
      Logger.error('Error calculating total effective capacity', error);
      totalEffectiveCapacity = 0;
    }

    // Calculate total allocated hours from period-filtered allocations with validation
    let totalAllocated = 0;
    try {
      totalAllocated = periodFilteredAllocations
        .filter(a => {
          if (!a || !a.resourceId) {
            Logger.warn('Invalid allocation found, skipping', { allocation: a });
            return false;
          }
          return filteredResources.some(r => r.id === a.resourceId);
        })
        .reduce((sum, a) => {
          let allocationHours = 0;

          try {
            if (a.allocatedHours && a.allocatedHours > 0) {
              allocationHours = parseFloat(a.allocatedHours) || 0;
            } else if (a.weeklyAllocations && typeof a.weeklyAllocations === 'object') {
              allocationHours = Object.values(a.weeklyAllocations).reduce((weekSum, hours) => {
                const validHours = parseFloat(hours) || 0;
                if (validHours < 0 || validHours > 24) {
                  Logger.warn('Invalid weekly allocation hours', {
                    allocationId: a.id,
                    hours: validHours
                  });
                  return weekSum;
                }
                return weekSum + validHours;
              }, 0);
            }

            // Sanity check for allocation hours
            if (allocationHours < 0 || allocationHours > 168) { // Max 24h * 7 days
              Logger.warn('Unusual allocation hours calculated', {
                allocationId: a.id,
                allocationHours
              });
              allocationHours = Math.max(0, Math.min(168, allocationHours));
            }
          } catch (error) {
            Logger.warn('Error calculating allocation hours, skipping allocation', {
              allocationId: a.id,
              error: error.message
            });
            allocationHours = 0;
          }

          return sum + allocationHours;
        }, 0);

      if (totalAllocated < 0) {
        Logger.warn('Negative total allocated hours calculated, setting to 0');
        totalAllocated = 0;
      }
    } catch (error) {
      Logger.error('Error calculating total allocated hours', error);
      totalAllocated = 0;
    }

    // Calculate utilization rate with validation
    let utilizationRate = 0;
    try {
      if (totalEffectiveCapacity > 0) {
        utilizationRate = (totalAllocated / totalEffectiveCapacity) * 100;

        // Sanity check for utilization rate
        if (utilizationRate < 0) {
          Logger.warn('Negative utilization rate calculated, setting to 0');
          utilizationRate = 0;
        } else if (utilizationRate > 1000) { // More than 1000% seems unrealistic
          Logger.warn('Extremely high utilization rate calculated', { utilizationRate });
        }
      }
    } catch (error) {
      Logger.error('Error calculating utilization rate', error);
      utilizationRate = 0;
    }

    // Calculate available resources (those with < 100% utilization in the period) with validation
    const resourceUtilizationMap = new Map();
    filteredResources.forEach(resource => {
      const resourceAllocations = periodFilteredAllocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => {
        let allocationHours = 0;
        if (a.allocatedHours && a.allocatedHours > 0) {
          allocationHours = parseFloat(a.allocatedHours) || 0;
        } else if (a.weeklyAllocations && typeof a.weeklyAllocations === 'object') {
          allocationHours = Object.values(a.weeklyAllocations).reduce((weekSum, hours) => weekSum + (parseFloat(hours) || 0), 0);
        }
        return sum + allocationHours;
      }, 0);

      const weeklyCapacity = parseFloat(resource.weeklyCapacity) || 40;
      const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
      const utilization = effectiveCapacity > 0 ? (totalHours / effectiveCapacity) * 100 : 0;

      resourceUtilizationMap.set(resource.id, { resource, utilization, totalHours, effectiveCapacity });
    });

    const availableResources = Array.from(resourceUtilizationMap.values())
      .filter(ru => ru.resource.isActive && ru.utilization < 100).length;
    const totalResources = filteredResources.filter(r => r.isActive).length;


    // Ensure utilizationRate is a valid number
    const finalUtilizationRate = isNaN(utilizationRate) ? 0 : utilizationRate;

    // Calculate conflicts (resources over 100% effective capacity in the period)
    const conflicts = Array.from(resourceUtilizationMap.values())
      .filter(ru => ru.resource.isActive && ru.utilization > 100).length;

    // Generate real historical trend data
    const generateHistoricalTrendData = async (metricName, currentValue) => {
      try {
        // Get historical periods (last 7 weeks)
        const historicalPeriods = getHistoricalPeriods(endDate || new Date().toISOString().split('T')[0], 7);

        const trendData = [];
        for (const period of historicalPeriods) {
          const historicalKPIs = calculateKPIsForPeriod(
            resources,
            projects,
            allocations,
            period.startDate,
            period.endDate,
            department
          );

          // Get the specific metric value
          let value = 0;
          switch (metricName) {
            case 'activeProjects':
              value = historicalKPIs.activeProjects;
              break;
            case 'availableResources':
              value = historicalKPIs.availableResources;
              break;
            case 'utilization':
              value = historicalKPIs.utilization;
              break;
            case 'conflicts':
              value = historicalKPIs.conflicts;
              break;
            default:
              value = currentValue;
          }

          trendData.push(value);
        }

        return trendData;
      } catch (error) {
        Logger.warn(`Failed to generate historical trend data for ${metricName}, using fallback`, error);
        // Fallback to simple trend based on current value
        return Array.from({ length: 7 }, (_, i) => {
          const variation = (i - 3) * 0.1 * currentValue;
          return Math.max(0, Math.round((currentValue + variation) * 10) / 10);
        });
      }
    };

    // Calculate previous period values for comparison
    const getPreviousPeriodValue = (metricName, currentValue) => {
      try {
        // Calculate for previous week
        const previousWeekEnd = new Date(endDate || new Date().toISOString().split('T')[0]);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekStart.getDate() - 6);

        const previousKPIs = calculateKPIsForPeriod(
          resources,
          projects,
          allocations,
          previousWeekStart.toISOString().split('T')[0],
          previousWeekEnd.toISOString().split('T')[0],
          department
        );

        switch (metricName) {
          case 'activeProjects':
            return previousKPIs.activeProjects;
          case 'availableResources':
            return previousKPIs.availableResources;
          case 'utilization':
            return previousKPIs.utilization;
          case 'conflicts':
            return previousKPIs.conflicts;
          default:
            return currentValue;
        }
      } catch (error) {
        Logger.warn(`Failed to calculate previous period value for ${metricName}`, error);
        return Math.max(0, currentValue - 1); // Simple fallback
      }
    };

    // Generate real trend data using fallback calculation (historical KPI table not yet created)
    const fallbackTrends = {
      activeProjects: await generateHistoricalTrendData('activeProjects', activeProjects),
      availableResources: await generateHistoricalTrendData('availableResources', availableResources),
      utilization: await generateHistoricalTrendData('utilization', Math.round(finalUtilizationRate * 10) / 10),
      conflicts: await generateHistoricalTrendData('conflicts', conflicts)
    };

    // Validate and sanitize final KPI values
    const sanitizedKpis = {
      activeProjects: Math.max(0, Math.floor(activeProjects) || 0),
      totalProjects: Math.max(0, Math.floor(totalProjects) || 0),
      availableResources: Math.max(0, Math.floor(availableResources) || 0),
      totalResources: Math.max(0, Math.floor(totalResources) || 0),
      utilization: Math.max(0, Math.round((finalUtilizationRate || 0) * 10) / 10),
      conflicts: Math.max(0, Math.floor(conflicts) || 0),
    };

    // Additional validation checks
    if (sanitizedKpis.activeProjects > sanitizedKpis.totalProjects) {
      Logger.warn('Active projects exceeds total projects, adjusting', {
        activeProjects: sanitizedKpis.activeProjects,
        totalProjects: sanitizedKpis.totalProjects
      });
      sanitizedKpis.activeProjects = sanitizedKpis.totalProjects;
    }

    if (sanitizedKpis.availableResources > sanitizedKpis.totalResources) {
      Logger.warn('Available resources exceeds total resources, adjusting', {
        availableResources: sanitizedKpis.availableResources,
        totalResources: sanitizedKpis.totalResources
      });
      sanitizedKpis.availableResources = sanitizedKpis.totalResources;
    }

    const kpis = {
      ...sanitizedKpis,
      trendData: {
        activeProjects: {
          current_value: activeProjects,
          previous_value: getPreviousPeriodValue('activeProjects', activeProjects),
          period_label: 'from last week',
          trend_data: fallbackTrends.activeProjects
        },
        availableResources: {
          current_value: availableResources,
          previous_value: getPreviousPeriodValue('availableResources', availableResources),
          period_label: 'from last week',
          trend_data: fallbackTrends.availableResources
        },
        utilization: {
          current_value: Math.round(finalUtilizationRate * 10) / 10,
          previous_value: getPreviousPeriodValue('utilization', Math.round(finalUtilizationRate * 10) / 10),
          period_label: 'from last week',
          trend_data: fallbackTrends.utilization
        },
        conflicts: {
          current_value: conflicts,
          previous_value: getPreviousPeriodValue('conflicts', conflicts),
          period_label: 'from last week',
          trend_data: fallbackTrends.conflicts
        }
      }
    };

    Logger.info('KPIs calculated successfully with period filtering', {
      activeProjects,
      totalProjects,
      availableResources,
      totalResources,
      utilization: finalUtilizationRate,
      conflicts,
      totalAllocated,
      totalEffectiveCapacity,
      department: filters.department,
      periodFilter: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
    });

    // Auto-save KPI snapshot disabled until historical_kpis table is created
    // TODO: Enable when historical_kpis table exists in database

    return kpis;
  } catch (error) {
    Logger.error('Failed to calculate KPIs', error);
    throw error;
  }
};

// Main KPIs handler
const kpisHandler = async (req, res) => {
  const { startDate, endDate, department, includeTrends } = req.query || {};

  console.log('Fetching dashboard KPIs', {
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
    console.error('Failed to fetch KPIs', error);
    
    // Return safe fallback data structure to prevent frontend errors
    const fallbackKpis = {
      activeProjects: 0,
      totalProjects: 0,
      availableResources: 0,
      totalResources: 0,
      utilization: 0,
      conflicts: 0,
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
module.exports = kpisHandler;
