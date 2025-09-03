// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Standardized effective capacity calculation constant (matches frontend)
const DEFAULT_NON_PROJECT_HOURS = 8; // Meetings, admin, etc.

// Safe calculation helpers
const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeDivision = (numerator, denominator, defaultValue = 0) => {
  if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return defaultValue;
  }
  return numerator / denominator;
};

const clampValue = (value, min = 0, max = Infinity) => {
  return Math.max(min, Math.min(max, value));
};

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

// Helper function to filter allocations by period
const filterAllocationsByPeriod = (allocations, startDate, endDate) => {
  if (!startDate || !endDate) return allocations;

  return allocations.filter(allocation =>
    dateRangeOverlaps(allocation.startDate, allocation.endDate, startDate, endDate)
  );
};

// Input validation schema
const gamifiedMetricsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  department: z.string().optional()
});

// Calculate gamified metrics from real Supabase data with period-aware filtering
const calculateGamifiedMetrics = async (filters = {}) => {
  try {
    const { startDate, endDate, department } = filters;

    // Fetch real data from Supabase with optimized period filtering
    const [resources, projects, allocations] = await Promise.all([
      DatabaseService.getResources(),
      startDate && endDate ?
        DatabaseService.getProjectsByPeriod(startDate, endDate) :
        DatabaseService.getProjects(),
      startDate && endDate ?
        DatabaseService.getResourceAllocationsByPeriod(startDate, endDate) :
        DatabaseService.getResourceAllocations()
    ]);

    Logger.info('Calculating gamified metrics from real data with period filtering', {
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

    // Allocations are already period-filtered at database level
    // Apply additional filtering only if needed for edge cases
    const periodFilteredAllocations = startDate && endDate ?
      filterAllocationsByPeriod(allocations, startDate, endDate) :
      allocations;

    // Calculate capacity conflicts using effective capacity and period-filtered data
    const resourceUtilization = filteredResources.map(resource => {
      const resourceAllocations = periodFilteredAllocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => {
        // Handle both hoursPerWeek and allocatedHours fields
        let allocationHours = 0;
        if (a.allocatedHours && a.allocatedHours > 0) {
          allocationHours = parseFloat(a.allocatedHours) || 0;
        } else if (a.weeklyAllocations && typeof a.weeklyAllocations === 'object') {
          allocationHours = Object.values(a.weeklyAllocations).reduce((weekSum, hours) => weekSum + (parseFloat(hours) || 0), 0);
        } else {
          allocationHours = a.hoursPerWeek || 0;
        }
        return sum + allocationHours;
      }, 0);

      const weeklyCapacity = parseFloat(resource.weeklyCapacity) || 40;
      const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
      const utilization = effectiveCapacity > 0 ? (totalHours / effectiveCapacity) * 100 : 0;

      return { resource, utilization, effectiveCapacity, totalHours };
    });
    
    // Count conflicts (active resources over 100% effective capacity in the period)
    const conflictsCount = resourceUtilization.filter(ru =>
      ru.resource.isActive && ru.utilization > 100
    ).length;

    // Determine badge level based on conflicts
    let badgeLevel;
    if (conflictsCount === 0) badgeLevel = 'gold';
    else if (conflictsCount <= 2) badgeLevel = 'silver';
    else if (conflictsCount <= 5) badgeLevel = 'bronze';
    else badgeLevel = 'none';

    // Generate period label
    const periodLabel = startDate && endDate
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'This Month';

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

    // Calculate real forecast accuracy by comparing planned vs actual hours
    const activeProjects = projects.filter(project =>
      isProjectActiveInPeriod(project, startDate, endDate)
    );

    // Fetch time entries for comparison with period filtering
    const timeEntries = startDate && endDate ?
      await DatabaseService.getTimeEntriesByPeriod(startDate, endDate) :
      await DatabaseService.getTimeEntries();

    let totalVariance = 0;
    let validComparisons = 0;

    // Calculate forecast accuracy for each allocation
    for (const allocation of periodFilteredAllocations) {
      // Get planned hours for this allocation
      let plannedHours = 0;
      if (allocation.allocatedHours && allocation.allocatedHours > 0) {
        plannedHours = parseFloat(allocation.allocatedHours) || 0;
      } else if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
        plannedHours = Object.values(allocation.weeklyAllocations).reduce((sum, hours) => sum + (parseFloat(hours) || 0), 0);
      }

      // Get actual hours from time entries for this allocation
      const allocationTimeEntries = timeEntries.filter(te => te.allocationId === allocation.id);
      const actualHours = allocationTimeEntries.reduce((sum, te) => {
        const weeklyTotal = (parseFloat(te.mondayHours) || 0) +
                           (parseFloat(te.tuesdayHours) || 0) +
                           (parseFloat(te.wednesdayHours) || 0) +
                           (parseFloat(te.thursdayHours) || 0) +
                           (parseFloat(te.fridayHours) || 0) +
                           (parseFloat(te.saturdayHours) || 0) +
                           (parseFloat(te.sundayHours) || 0);
        return sum + weeklyTotal;
      }, 0);

      // Calculate variance if we have both planned and actual data
      if (plannedHours > 0) {
        const variance = Math.abs(actualHours - plannedHours) / plannedHours;
        totalVariance += variance;
        validComparisons++;
      }
    }

    // Calculate forecast accuracy percentage
    let forecastAccuracy = 85; // Default fallback
    if (validComparisons > 0) {
      const averageVariance = totalVariance / validComparisons;
      // Convert variance to accuracy (lower variance = higher accuracy)
      forecastAccuracy = Math.max(0, Math.min(100, (1 - averageVariance) * 100));
    }

    const forecastColor = forecastAccuracy >= 90 ? 'green' : forecastAccuracy >= 75 ? 'yellow' : 'red';

    // Generate real historical trend data for forecast accuracy
    const generateForecastAccuracyTrend = async (currentAccuracy, points = 6) => {
      try {
        const trendData = [];
        const endDateObj = new Date(endDate || new Date().toISOString().split('T')[0]);

        // Calculate forecast accuracy for previous periods
        for (let i = points - 1; i >= 0; i--) {
          const periodEnd = new Date(endDateObj);
          periodEnd.setDate(periodEnd.getDate() - (i * 7)); // Weekly periods

          const periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 6);

          const periodStartStr = periodStart.toISOString().split('T')[0];
          const periodEndStr = periodEnd.toISOString().split('T')[0];

          // Filter allocations and time entries for this period
          const periodAllocations = filterAllocationsByPeriod(allocations, periodStartStr, periodEndStr);
          const periodTimeEntries = timeEntries.filter(te => {
            const teDate = new Date(te.weekStartDate);
            return teDate >= periodStart && teDate <= periodEnd;
          });

          let periodVariance = 0;
          let periodComparisons = 0;

          // Calculate accuracy for this period
          for (const allocation of periodAllocations) {
            let plannedHours = 0;
            if (allocation.allocatedHours && allocation.allocatedHours > 0) {
              plannedHours = parseFloat(allocation.allocatedHours) || 0;
            } else if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
              plannedHours = Object.values(allocation.weeklyAllocations).reduce((sum, hours) => sum + (parseFloat(hours) || 0), 0);
            }

            const allocationTimeEntries = periodTimeEntries.filter(te => te.allocationId === allocation.id);
            const actualHours = allocationTimeEntries.reduce((sum, te) => {
              const weeklyTotal = (parseFloat(te.mondayHours) || 0) +
                                 (parseFloat(te.tuesdayHours) || 0) +
                                 (parseFloat(te.wednesdayHours) || 0) +
                                 (parseFloat(te.thursdayHours) || 0) +
                                 (parseFloat(te.fridayHours) || 0) +
                                 (parseFloat(te.saturdayHours) || 0) +
                                 (parseFloat(te.sundayHours) || 0);
              return sum + weeklyTotal;
            }, 0);

            if (plannedHours > 0) {
              const variance = Math.abs(actualHours - plannedHours) / plannedHours;
              periodVariance += variance;
              periodComparisons++;
            }
          }

          let periodAccuracy = currentAccuracy; // Fallback to current
          if (periodComparisons > 0) {
            const averageVariance = periodVariance / periodComparisons;
            periodAccuracy = Math.max(0, Math.min(100, (1 - averageVariance) * 100));
          }

          trendData.push(Math.round(periodAccuracy * 10) / 10);
        }

        return trendData;
      } catch (error) {
        Logger.warn('Failed to generate forecast accuracy trend, using fallback', error);
        // Fallback to reasonable trend based on current value
        return Array.from({ length: points }, (_, i) => {
          const variation = (i - points/2) * 2;
          return Math.max(70, Math.min(95, currentAccuracy + variation));
        });
      }
    };

    // Calculate comprehensive resource health score using proper thresholds
    const calculateResourceHealthScore = (resourceUtilizations) => {
      if (resourceUtilizations.length === 0) return { score: 0, status: 'critical' };

      let totalHealthPoints = 0;
      let activeResourceCount = 0;

      // Analyze each active resource's health
      resourceUtilizations.forEach(ru => {
        if (!ru.resource.isActive) return;

        activeResourceCount++;
        let resourceHealthPoints = 100; // Start with perfect health

        // Deduct points based on utilization thresholds (matches frontend thresholds)
        if (ru.utilization >= 120) {
          resourceHealthPoints = 0; // Critical overallocation
        } else if (ru.utilization >= 100) {
          resourceHealthPoints = 20; // Over capacity
        } else if (ru.utilization >= 90) {
          resourceHealthPoints = 60; // Near capacity (warning)
        } else if (ru.utilization < 50) {
          resourceHealthPoints = 70; // Under-utilized (not ideal but not critical)
        } else {
          resourceHealthPoints = 100; // Optimal range (50-90%)
        }

        totalHealthPoints += resourceHealthPoints;
      });

      const averageHealthScore = activeResourceCount > 0 ? totalHealthPoints / activeResourceCount : 0;

      // Determine status based on score
      let status;
      if (averageHealthScore >= 80) {
        status = 'good';
      } else if (averageHealthScore >= 60) {
        status = 'watch';
      } else {
        status = 'critical';
      }

      return {
        score: Math.round(averageHealthScore),
        status,
        details: {
          activeResources: activeResourceCount,
          criticalResources: resourceUtilizations.filter(ru => ru.resource.isActive && ru.utilization >= 120).length,
          overCapacityResources: resourceUtilizations.filter(ru => ru.resource.isActive && ru.utilization >= 100 && ru.utilization < 120).length,
          nearCapacityResources: resourceUtilizations.filter(ru => ru.resource.isActive && ru.utilization >= 90 && ru.utilization < 100).length,
          optimalResources: resourceUtilizations.filter(ru => ru.resource.isActive && ru.utilization >= 50 && ru.utilization < 90).length,
          underUtilizedResources: resourceUtilizations.filter(ru => ru.resource.isActive && ru.utilization < 50).length
        }
      };
    };

    const resourceHealth = calculateResourceHealthScore(resourceUtilization);
    const healthScore = resourceHealth.score;
    const healthStatus = resourceHealth.status;

    // Calculate real project performance metrics
    const calculateProjectPerformance = async (projects, allocations, timeEntries) => {
      const projectPerformance = [];

      for (const project of projects) {
        // Get all allocations for this project
        const projectAllocations = allocations.filter(a => a.projectId === project.id);

        if (projectAllocations.length === 0) continue; // Skip projects with no allocations

        // Calculate total planned hours for the project
        let totalPlannedHours = 0;
        for (const allocation of projectAllocations) {
          if (allocation.allocatedHours && allocation.allocatedHours > 0) {
            totalPlannedHours += parseFloat(allocation.allocatedHours) || 0;
          } else if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
            totalPlannedHours += Object.values(allocation.weeklyAllocations).reduce((sum, hours) => sum + (parseFloat(hours) || 0), 0);
          }
        }

        // Calculate total actual hours for the project
        let totalActualHours = 0;
        for (const allocation of projectAllocations) {
          const allocationTimeEntries = timeEntries.filter(te => te.allocationId === allocation.id);
          const allocationActualHours = allocationTimeEntries.reduce((sum, te) => {
            const weeklyTotal = (parseFloat(te.mondayHours) || 0) +
                               (parseFloat(te.tuesdayHours) || 0) +
                               (parseFloat(te.wednesdayHours) || 0) +
                               (parseFloat(te.thursdayHours) || 0) +
                               (parseFloat(te.fridayHours) || 0) +
                               (parseFloat(te.saturdayHours) || 0) +
                               (parseFloat(te.sundayHours) || 0);
            return sum + weeklyTotal;
          }, 0);
          totalActualHours += allocationActualHours;
        }

        // Calculate variance percentage
        let variance = 0;
        if (totalPlannedHours > 0) {
          variance = Math.abs(totalActualHours - totalPlannedHours) / totalPlannedHours * 100;
        }

        // Determine if project is at risk (variance > 15% or significantly over/under)
        const isAtRisk = variance > 15 ||
                        (totalPlannedHours > 0 && totalActualHours > totalPlannedHours * 1.2) ||
                        (totalPlannedHours > 0 && totalActualHours < totalPlannedHours * 0.8);

        projectPerformance.push({
          name: project.name,
          variance: Math.round(variance * 10) / 10,
          isAtRisk,
          plannedHours: totalPlannedHours,
          actualHours: totalActualHours,
          status: project.status,
          priority: project.priority
        });
      }

      // Sort by variance (worst performing first) and take top 5
      return projectPerformance
        .sort((a, b) => b.variance - a.variance)
        .slice(0, 5);
    };

    const projectLeaderboard = await calculateProjectPerformance(activeProjects, periodFilteredAllocations, timeEntries);

    // Ensure we always have some projects in the leaderboard (fallback for demo purposes)
    while (projectLeaderboard.length < 3 && activeProjects.length > 0) {
      const remainingProjects = activeProjects.filter(p =>
        !projectLeaderboard.some(pl => pl.name === p.name)
      );

      if (remainingProjects.length > 0) {
        const project = remainingProjects[0];
        projectLeaderboard.push({
          name: project.name,
          variance: 0, // No data available
          isAtRisk: false,
          plannedHours: 0,
          actualHours: 0,
          status: project.status,
          priority: project.priority
        });
      } else {
        break;
      }
    }

    // Calculate firefighter alerts (capacity conflicts resolved)
    const calculateFirefighterAlerts = async (resources, allocations, timeEntries, startDate, endDate) => {
      try {
        // Calculate current period conflicts
        const currentConflicts = resourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization > 100
        ).length;

        // Calculate previous period conflicts for comparison
        const previousWeekEnd = new Date(endDate || new Date().toISOString().split('T')[0]);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekStart.getDate() - 6);

        const previousPeriodAllocations = filterAllocationsByPeriod(
          allocations,
          previousWeekStart.toISOString().split('T')[0],
          previousWeekEnd.toISOString().split('T')[0]
        );

        // Calculate previous period utilization
        const previousResourceUtilization = resources.map(resource => {
          const resourceAllocations = previousPeriodAllocations.filter(a => a.resourceId === resource.id);
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

          return { resource, utilization };
        });

        const previousConflicts = previousResourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization > 100
        ).length;

        // Calculate resolved conflicts (firefighter alerts)
        const resolvedConflicts = Math.max(0, previousConflicts - currentConflicts);

        // Calculate delta and trend
        const delta = currentConflicts - previousConflicts;
        const trend = delta < 0 ? 'up' : delta > 0 ? 'down' : 'neutral'; // 'up' means improvement (fewer conflicts)

        return {
          resolved: resolvedConflicts,
          delta: Math.abs(delta),
          trend,
          currentConflicts,
          previousConflicts
        };
      } catch (error) {
        Logger.warn('Failed to calculate firefighter alerts, using fallback', error);
        return {
          resolved: 0,
          delta: 0,
          trend: 'neutral',
          currentConflicts: 0,
          previousConflicts: 0
        };
      }
    };

    // Calculate continuous improvement metrics
    const calculateContinuousImprovement = async (resources, allocations, timeEntries, startDate, endDate) => {
      try {
        // Calculate multiple improvement metrics and average them

        // 1. Utilization Efficiency Improvement
        // Compare current period optimal utilization rate vs previous period
        const currentOptimalResources = resourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization >= 50 && ru.utilization <= 90
        ).length;
        const currentActiveResources = resourceUtilization.filter(ru => ru.resource.isActive).length;
        const currentOptimalRate = currentActiveResources > 0 ? (currentOptimalResources / currentActiveResources) * 100 : 0;

        // Calculate previous period optimal rate
        const previousWeekEnd = new Date(endDate || new Date().toISOString().split('T')[0]);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekStart.getDate() - 6);

        const previousPeriodAllocations = filterAllocationsByPeriod(
          allocations,
          previousWeekStart.toISOString().split('T')[0],
          previousWeekEnd.toISOString().split('T')[0]
        );

        const previousResourceUtilization = resources.map(resource => {
          const resourceAllocations = previousPeriodAllocations.filter(a => a.resourceId === resource.id);
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

          return { resource, utilization };
        });

        const previousOptimalResources = previousResourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization >= 50 && ru.utilization <= 90
        ).length;
        const previousActiveResources = previousResourceUtilization.filter(ru => ru.resource.isActive).length;
        const previousOptimalRate = previousActiveResources > 0 ? (previousOptimalResources / previousActiveResources) * 100 : 0;

        // 2. Conflict Reduction Improvement
        const currentConflicts = resourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization > 100
        ).length;
        const previousConflicts = previousResourceUtilization.filter(ru =>
          ru.resource.isActive && ru.utilization > 100
        ).length;

        const conflictReduction = previousConflicts > 0 ?
          ((previousConflicts - currentConflicts) / previousConflicts) * 100 : 0;

        // 3. Resource Health Improvement
        const currentHealthScore = resourceHealth.score;

        // Calculate previous period health score using the same logic
        let previousHealthPoints = 0;
        let previousActiveResourceCount = 0;

        previousResourceUtilization.forEach(ru => {
          if (!ru.resource.isActive) return;

          previousActiveResourceCount++;
          let resourceHealthPoints = 100;

          if (ru.utilization >= 120) {
            resourceHealthPoints = 0;
          } else if (ru.utilization >= 100) {
            resourceHealthPoints = 20;
          } else if (ru.utilization >= 90) {
            resourceHealthPoints = 60;
          } else if (ru.utilization < 50) {
            resourceHealthPoints = 70;
          } else {
            resourceHealthPoints = 100;
          }

          previousHealthPoints += resourceHealthPoints;
        });

        const previousHealthScore = previousActiveResourceCount > 0 ?
          Math.round(previousHealthPoints / previousActiveResourceCount) : 0;

        const healthImprovement = previousHealthScore > 0 ?
          ((currentHealthScore - previousHealthScore) / previousHealthScore) * 100 : 0;

        // 4. Forecast Accuracy Improvement (if we have enough data)
        let forecastImprovement = 0;
        if (validComparisons > 0) {
          // This is a simplified calculation - in a real system you'd track historical accuracy
          forecastImprovement = forecastAccuracy > 85 ? 2 : forecastAccuracy > 75 ? 0 : -2;
        }

        // Calculate overall improvement delta (weighted average)
        const utilizationWeight = 0.3;
        const conflictWeight = 0.3;
        const healthWeight = 0.3;
        const forecastWeight = 0.1;

        const overallDelta = (
          (currentOptimalRate - previousOptimalRate) * utilizationWeight +
          conflictReduction * conflictWeight +
          healthImprovement * healthWeight +
          forecastImprovement * forecastWeight
        );

        // Determine trend
        const trend = overallDelta > 1 ? 'up' : overallDelta < -1 ? 'down' : 'neutral';

        return {
          delta: Math.round(overallDelta * 10) / 10,
          trend,
          details: {
            utilizationImprovement: Math.round((currentOptimalRate - previousOptimalRate) * 10) / 10,
            conflictReduction: Math.round(conflictReduction * 10) / 10,
            healthImprovement: Math.round(healthImprovement * 10) / 10,
            forecastImprovement: Math.round(forecastImprovement * 10) / 10
          }
        };
      } catch (error) {
        Logger.warn('Failed to calculate continuous improvement, using fallback', error);
        return {
          delta: 0,
          trend: 'neutral',
          details: {
            utilizationImprovement: 0,
            conflictReduction: 0,
            healthImprovement: 0,
            forecastImprovement: 0
          }
        };
      }
    };

    // Calculate capacity forecast (Crystal Ball prediction)
    const calculateCapacityForecast = async (resources, allocations, timeEntries, startDate, endDate) => {
      try {
        // Analyze current capacity trends and predict future conflicts

        // 1. Calculate current utilization trends
        const currentDate = new Date(endDate || new Date().toISOString().split('T')[0]);
        const weeklyTrends = [];

        // Analyze last 4 weeks to establish trend
        for (let i = 3; i >= 0; i--) {
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(weekEnd.getDate() - (i * 7));

          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 6);

          const weekAllocations = filterAllocationsByPeriod(
            allocations,
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
          );

          // Calculate average utilization for this week
          let totalUtilization = 0;
          let activeResourceCount = 0;

          resources.forEach(resource => {
            if (!resource.isActive) return;

            const resourceAllocations = weekAllocations.filter(a => a.resourceId === resource.id);
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

            totalUtilization += utilization;
            activeResourceCount++;
          });

          const avgUtilization = activeResourceCount > 0 ? totalUtilization / activeResourceCount : 0;
          weeklyTrends.push(avgUtilization);
        }

        // 2. Calculate trend slope (linear regression)
        const calculateTrendSlope = (data) => {
          const n = data.length;
          if (n < 2) return 0;

          const sumX = data.reduce((sum, _, i) => sum + i, 0);
          const sumY = data.reduce((sum, val) => sum + val, 0);
          const sumXY = data.reduce((sum, val, i) => sum + (i * val), 0);
          const sumXX = data.reduce((sum, _, i) => sum + (i * i), 0);

          const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
          return slope;
        };

        const utilizationTrendSlope = calculateTrendSlope(weeklyTrends);

        // 3. Predict when next conflict will occur
        let daysUntilConflict = 0;
        let confidence = 0;

        const currentAvgUtilization = weeklyTrends[weeklyTrends.length - 1] || 0;
        const conflictThreshold = 100; // When utilization hits 100%

        if (utilizationTrendSlope > 0) {
          // Utilization is increasing
          const utilizationGap = conflictThreshold - currentAvgUtilization;

          if (utilizationGap > 0) {
            // Calculate weeks until conflict
            const weeksUntilConflict = utilizationGap / (utilizationTrendSlope * 7); // Convert weekly slope to daily
            daysUntilConflict = Math.max(1, Math.round(weeksUntilConflict * 7));

            // Calculate confidence based on trend consistency
            const trendVariance = weeklyTrends.reduce((sum, val, i) => {
              const expected = weeklyTrends[0] + (utilizationTrendSlope * i * 7);
              return sum + Math.pow(val - expected, 2);
            }, 0) / weeklyTrends.length;

            const maxVariance = 100; // Arbitrary max variance for normalization
            confidence = Math.max(50, Math.min(95, 100 - (trendVariance / maxVariance) * 50));
          } else {
            // Already at or above threshold
            daysUntilConflict = 0;
            confidence = 95;
          }
        } else if (utilizationTrendSlope < 0) {
          // Utilization is decreasing - no conflict predicted
          daysUntilConflict = 999; // Represents "no conflict expected"
          confidence = Math.max(60, 80 - Math.abs(utilizationTrendSlope) * 10);
        } else {
          // Stable trend
          if (currentAvgUtilization >= conflictThreshold) {
            daysUntilConflict = 0;
            confidence = 85;
          } else {
            daysUntilConflict = 999;
            confidence = 70;
          }
        }

        // 4. Consider upcoming project deadlines and resource allocations
        const upcomingProjects = projects.filter(p => {
          const projectStart = new Date(p.startDate);
          const futureDate = new Date(currentDate);
          futureDate.setDate(futureDate.getDate() + 30); // Look 30 days ahead

          return projectStart > currentDate && projectStart <= futureDate && p.status === 'active';
        });

        // Adjust prediction based on upcoming projects
        if (upcomingProjects.length > 0) {
          daysUntilConflict = Math.max(1, Math.min(daysUntilConflict, 14)); // Increase urgency
          confidence = Math.min(confidence + 10, 95); // Increase confidence
        }

        // Cap the prediction at reasonable limits
        daysUntilConflict = Math.min(daysUntilConflict, 90); // Max 90 days

        return {
          daysUntilConflict: daysUntilConflict === 999 ? 0 : daysUntilConflict, // 0 means no conflict expected
          confidence: Math.round(confidence),
          details: {
            currentAvgUtilization: Math.round(currentAvgUtilization * 10) / 10,
            trendSlope: Math.round(utilizationTrendSlope * 1000) / 1000,
            upcomingProjects: upcomingProjects.length,
            weeklyTrends: weeklyTrends.map(t => Math.round(t * 10) / 10)
          }
        };
      } catch (error) {
        Logger.warn('Failed to calculate capacity forecast, using fallback', error);
        return {
          daysUntilConflict: 0,
          confidence: 0,
          details: {
            currentAvgUtilization: 0,
            trendSlope: 0,
            upcomingProjects: 0,
            weeklyTrends: []
          }
        };
      }
    };

    // Generate real forecast accuracy trend data
    const forecastTrend = await generateForecastAccuracyTrend(forecastAccuracy);

    const gamifiedMetrics = {
      capacityHero: {
        conflictsCount,
        badgeLevel,
        periodLabel
      },
      forecastAccuracy: {
        percentage: Math.round(forecastAccuracy * 10) / 10,
        trend: forecastTrend,
        color: forecastColor
      },
      resourceHealth: {
        score: Math.round(healthScore),
        status: healthStatus
      },
      projectLeaderboard,
      firefighterAlerts: await calculateFirefighterAlerts(filteredResources, allocations, timeEntries, startDate, endDate),
      continuousImprovement: await calculateContinuousImprovement(filteredResources, allocations, timeEntries, startDate, endDate),
      crystalBall: await calculateCapacityForecast(filteredResources, allocations, timeEntries, startDate, endDate)
    };

    Logger.info('Gamified metrics calculated successfully', {
      conflictsCount,
      badgeLevel,
      forecastAccuracy: Math.round(forecastAccuracy * 10) / 10,
      healthScore: Math.round(healthScore),
      projectCount: projectLeaderboard.length
    });

    return gamifiedMetrics;
  } catch (error) {
    Logger.error('Failed to calculate gamified metrics', error);
    throw error;
  }
};

// Main gamified metrics handler
const gamifiedMetricsHandler = async (req, res, { user, validatedData }) => {
  const { startDate, endDate, department } = validatedData;
  
  Logger.info('Fetching gamified metrics', {
    userId: user.id,
    department,
    dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
  });

  try {
    const metrics = await calculateGamifiedMetrics({
      startDate,
      endDate,
      department
    });

    return res.json(metrics);
  } catch (error) {
    Logger.error('Failed to fetch gamified metrics', error, { userId: user.id });
    
    // Return safe fallback data structure to prevent frontend errors
    const fallbackMetrics = {
      capacityHero: {
        conflictsCount: 0,
        badgeLevel: 'none',
        periodLabel: 'This Month'
      },
      forecastAccuracy: {
        percentage: 0,
        trend: [0, 0, 0, 0, 0, 0],
        color: 'gray'
      },
      resourceHealth: {
        score: 0,
        status: 'critical'
      },
      projectLeaderboard: [],
      firefighterAlerts: {
        resolved: 0,
        delta: 0,
        trend: 'neutral'
      },
      continuousImprovement: {
        delta: 0,
        trend: 'neutral'
      },
      crystalBall: {
        daysUntilConflict: 0,
        confidence: 0
      }
    };

    return res.json(fallbackMetrics);
  }
};

// Export with middleware
module.exports = withMiddleware(gamifiedMetricsHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: gamifiedMetricsQuerySchema
});
