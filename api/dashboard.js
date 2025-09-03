/**
 * Dashboard API Endpoint with Real Data Delegation
 *
 * This endpoint serves as a compatibility layer that:
 * 1. Delegates to real Supabase-integrated endpoints when available
 * 2. Falls back to mock data only if real endpoints fail
 * 3. Supports both query parameter routing (?endpoint=kpis) and direct routing (/api/dashboard/kpis)
 *
 * Priority: Real Supabase data > Mock fallback data
 */

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');

// Dashboard handlers
async function handleGetKPIs(req, res) {
  try {
    // Mock KPI data with proper trend data structure that frontend expects
    const kpis = {
      activeProjects: 12,
      totalProjects: 18,
      availableResources: 8,
      totalResources: 10,
      utilization: 85.5, // Changed from utilizationRate to match frontend
      conflicts: 2, // Added conflicts that frontend expects
      // Proper trendData structure with arrays for sparklines
      trendData: {
        activeProjects: {
          current_value: 12,
          previous_value: 10,
          period_label: 'from last week',
          trend_data: [8, 9, 10, 11, 12, 13, 12] // Array for sparkline
        },
        availableResources: {
          current_value: 8,
          previous_value: 7,
          period_label: 'from last week',
          trend_data: [6, 7, 7, 8, 8, 9, 8] // Array for sparkline
        },
        utilization: {
          current_value: 85.5,
          previous_value: 82.2,
          period_label: 'from last week',
          trend_data: [78.5, 80.1, 82.2, 83.5, 85.1, 86.2, 85.5] // Array for sparkline
        },
        conflicts: {
          current_value: 2,
          previous_value: 3,
          period_label: 'from last week',
          trend_data: [4, 3, 3, 2, 2, 1, 2] // Array for sparkline
        }
      }
    };

    res.json(kpis);
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    // Return safe fallback data structure to prevent frontend errors
    res.status(200).json({
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
          trend_data: [0, 0, 0, 0, 0, 0, 0] // Always provide array
        },
        availableResources: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0] // Always provide array
        },
        utilization: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0] // Always provide array
        },
        conflicts: {
          current_value: 0,
          previous_value: 0,
          period_label: 'no data',
          trend_data: [0, 0, 0, 0, 0, 0, 0] // Always provide array
        }
      }
    });
  }
}

async function handleGetAlerts(req, res) {
  try {
    // Mock alerts data matching EnhancedCapacityAlerts interface
    const alerts = {
      categories: [
        {
          type: 'critical',
          title: 'Critical Capacity Issues',
          count: 1,
          alerts: [
            {
              id: 'critical-1',
              resourceId: 1,
              resourceName: 'John Doe',
              department: 'Engineering',
              currentUtilization: 125.0,
              threshold: 100.0,
              weeklyCapacity: 40,
              allocatedHours: 50,
              conflictDetails: {
                overallocationHours: 10,
                conflictingProjects: ['Alpha Project', 'Beta Initiative'],
                suggestedActions: ['Redistribute 10h from Alpha Project', 'Consider hiring additional developer']
              },
              severity: 'critical',
              createdAt: new Date().toISOString()
            }
          ]
        },
        {
          type: 'warning',
          title: 'Capacity Warnings',
          count: 1,
          alerts: [
            {
              id: 'warning-1',
              resourceId: 2,
              resourceName: 'Jane Smith',
              department: 'Engineering',
              currentUtilization: 95.0,
              threshold: 90.0,
              weeklyCapacity: 40,
              allocatedHours: 38,
              conflictDetails: {
                overallocationHours: 0,
                conflictingProjects: ['Gamma Release'],
                suggestedActions: ['Monitor closely', 'Prepare backup resources']
              },
              severity: 'warning',
              createdAt: new Date().toISOString()
            }
          ]
        }
      ],
      summary: {
        totalAlerts: 2,
        criticalCount: 1,
        warningCount: 1,
        infoCount: 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    res.json(alerts);
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    // Return safe fallback data structure to prevent frontend errors
    res.status(200).json({
      categories: [], // Always provide empty array
      summary: {
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString()
      }
    });
  }
}

async function handleGetTimeline(req, res) {
  try {
    // Mock timeline data for testing
    const timeline = [
      {
        id: 1,
        name: 'Project Alpha',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        status: 'active',
        allocatedHours: 120,
        allocations: [
          {
            id: 1,
            resourceId: 1,
            resourceName: 'John Doe',
            hoursPerWeek: 20
          }
        ]
      },
      {
        id: 2,
        name: 'Project Beta',
        startDate: '2024-02-15',
        endDate: '2024-08-15',
        status: 'active',
        allocatedHours: 80,
        allocations: [
          {
            id: 2,
            resourceId: 2,
            resourceName: 'Jane Smith',
            hoursPerWeek: 15
          }
        ]
      }
    ];

    res.json(timeline);
  } catch (error) {
    console.error('Dashboard timeline error:', error);
    // Return safe fallback data structure to prevent frontend errors
    res.status(200).json([]);
  }
}

async function handleGetHeatmap(req, res) {
  try {
    // Mock heatmap data for testing
    const heatmap = [
      {
        role: 'Frontend Developer',
        resources: [
          {
            id: 1,
            name: 'John Doe',
            allocated: 30,
            utilization: 75.0
          }
        ],
        totalCapacity: 40,
        totalAllocated: 30,
        utilization: 75.0
      },
      {
        role: 'Backend Developer',
        resources: [
          {
            id: 2,
            name: 'Jane Smith',
            allocated: 38,
            utilization: 95.0
          }
        ],
        totalCapacity: 40,
        totalAllocated: 38,
        utilization: 95.0
      }
    ];

    res.json(heatmap);
  } catch (error) {
    console.error('Dashboard heatmap error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard heatmap' });
  }
}

// Handle gamified metrics
async function handleGetGamifiedMetrics(req, res) {
  try {
    // Return the correct GamifiedMetrics interface structure that the frontend expects
    const gamifiedMetrics = {
      capacityHero: {
        conflictsCount: 0,
        badgeLevel: 'gold',
        periodLabel: 'This Month' // Added missing periodLabel
      },
      forecastAccuracy: {
        percentage: 87.5,
        trend: [82, 84, 86, 87.5, 89, 87.5], // Changed to array for chart
        color: 'green' // Added missing color property
      },
      resourceHealth: {
        score: 92,
        status: 'good' // Added missing status property
      },
      projectLeaderboard: [
        {
          name: 'Alpha Project',
          variance: 2.3,
          isAtRisk: false
        },
        {
          name: 'Beta Initiative',
          variance: 5.7,
          isAtRisk: false
        },
        {
          name: 'Gamma Release',
          variance: 12.1,
          isAtRisk: true
        },
        {
          name: 'Delta Optimization',
          variance: 8.9,
          isAtRisk: false
        },
        {
          name: 'Epsilon Migration',
          variance: 15.2,
          isAtRisk: true
        }
      ],
      firefighterAlerts: {
        resolved: 8,
        delta: 3,
        trend: 'up'
      },
      continuousImprovement: {
        delta: 5.2,
        trend: 'up'
      },
      crystalBall: {
        daysUntilConflict: 14,
        confidence: 85
      }
    };

    res.json(gamifiedMetrics);
  } catch (error) {
    console.error('Dashboard gamified metrics error:', error);
    // Return safe fallback data structure to prevent frontend errors
    res.status(200).json({
      capacityHero: {
        conflictsCount: 0,
        badgeLevel: 'none',
        periodLabel: 'This Month'
      },
      forecastAccuracy: {
        percentage: 0,
        trend: [0, 0, 0, 0, 0, 0, 0], // Always provide array
        color: 'gray'
      },
      resourceHealth: {
        score: 0,
        status: 'critical'
      },
      projectLeaderboard: [], // Always provide empty array
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
    });
  }
}

// Input validation schema
const dashboardQuerySchema = z.object({
  endpoint: z.string().optional().default('kpis')
});

// Main dashboard handler that routes to sub-endpoints
const dashboardHandler = async (req, res, { user, validatedData }) => {
  const { endpoint } = validatedData;

  Logger.info('Dashboard API request', {
    userId: user.id,
    endpoint,
    method: req.method
  });

  try {

    // Route to appropriate handler based on endpoint parameter
    // IMPORTANT: Delegate to real Supabase-integrated endpoints when available
    switch (endpoint) {
      case 'kpis':
        try {
          // Delegate to real KPIs endpoint with Supabase integration
          const kpisHandler = require('./dashboard/kpis.js');
          return await kpisHandler(req, res);
        } catch (error) {
          console.error('Failed to delegate to real KPIs endpoint, using fallback:', error);
          return await handleGetKPIs(req, res);
        }
      case 'alerts':
        try {
          // Delegate to real alerts endpoint with Supabase integration
          const alertsHandler = require('./dashboard/alerts.js');
          return await alertsHandler(req, res);
        } catch (error) {
          console.error('Failed to delegate to real alerts endpoint, using fallback:', error);
          return await handleGetAlerts(req, res);
        }
      case 'heatmap':
        try {
          // Delegate to real heatmap endpoint with Supabase integration
          const heatmapHandler = require('./dashboard/heatmap.js');
          return await heatmapHandler(req, res);
        } catch (error) {
          console.error('Failed to delegate to real heatmap endpoint, using fallback:', error);
          return await handleGetHeatmap(req, res);
        }
      case 'gamified-metrics':
        try {
          // Delegate to real gamified metrics endpoint with Supabase integration
          const gamifiedHandler = require('./dashboard/gamified-metrics.js');
          return await gamifiedHandler(req, res);
        } catch (error) {
          console.error('Failed to delegate to real gamified metrics endpoint, using fallback:', error);
          return await handleGetGamifiedMetrics(req, res);
        }
      case 'timeline':
        return await handleGetTimeline(req, res);
      default:
        return res.json({
          message: 'Dashboard API',
          endpoints: [
            '/api/dashboard?endpoint=kpis',
            '/api/dashboard?endpoint=alerts',
            '/api/dashboard?endpoint=timeline',
            '/api/dashboard?endpoint=heatmap',
            '/api/dashboard?endpoint=gamified-metrics'
          ],
          user: user
        });
    }
  } catch (error) {
    Logger.error('Dashboard API error', {
      userId: user.id,
      endpoint,
      error: error.message,
      stack: error.stack
    });
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(dashboardHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: dashboardQuerySchema
});
