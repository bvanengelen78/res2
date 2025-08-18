const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Dashboard handlers
async function handleGetKPIs(req, res) {
  try {
    // Mock KPI data for testing
    const kpis = {
      activeProjects: 12,
      totalProjects: 18,
      availableResources: 8,
      totalResources: 10,
      utilizationRate: 85.5,
      budgetUtilization: 72.3,
      trends: {
        projectsTrend: 5.2,
        resourcesTrend: 2.1,
        utilizationTrend: -1.3,
        budgetTrend: 8.7
      }
    };

    res.json(kpis);
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard KPIs' });
  }
}

async function handleGetAlerts(req, res) {
  try {
    // Mock alerts data for testing
    const alerts = {
      alerts: [
        {
          id: 'overallocation-1',
          type: 'overallocation',
          severity: 'critical',
          resourceId: 1,
          resourceName: 'John Doe',
          message: 'John Doe is overallocated at 125.0%',
          utilization: 125.0,
          capacity: 40,
          allocated: 50,
          createdAt: new Date().toISOString()
        },
        {
          id: 'nearoverallocation-2',
          type: 'near_overallocation',
          severity: 'medium',
          resourceId: 2,
          resourceName: 'Jane Smith',
          message: 'Jane Smith is near capacity at 95.0%',
          utilization: 95.0,
          capacity: 40,
          allocated: 38,
          createdAt: new Date().toISOString()
        }
      ],
      summary: {
        totalAlerts: 2,
        critical: 1,
        high: 0,
        medium: 1,
        low: 0
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(alerts);
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard alerts' });
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
    res.status(500).json({ message: 'Failed to fetch dashboard timeline' });
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
        streak: 14,
        achievements: ['Conflict-Free Week', 'Optimal Planning']
      },
      forecastAccuracy: {
        percentage: 87.5,
        trend: 5.2,
        lastWeekAccuracy: 82.3,
        improvementTip: 'Consider buffer time for complex tasks'
      },
      resourceHealth: {
        score: 92,
        trend: 2.1,
        burnoutRisk: 'low',
        wellnessIndicators: {
          workloadBalance: 'good',
          overtimeFrequency: 'minimal',
          satisfactionScore: 4.2
        }
      },
      projectLeaderboard: [
        {
          id: 1,
          name: 'Alpha Project',
          score: 95,
          status: 'on-track',
          completionRate: 78,
          teamEfficiency: 92
        },
        {
          id: 2,
          name: 'Beta Initiative',
          score: 88,
          status: 'ahead',
          completionRate: 65,
          teamEfficiency: 85
        },
        {
          id: 3,
          name: 'Gamma Release',
          score: 82,
          status: 'on-track',
          completionRate: 45,
          teamEfficiency: 78
        },
        {
          id: 4,
          name: 'Delta Optimization',
          score: 76,
          status: 'at-risk',
          completionRate: 32,
          teamEfficiency: 71
        },
        {
          id: 5,
          name: 'Epsilon Migration',
          score: 71,
          status: 'delayed',
          completionRate: 28,
          teamEfficiency: 68
        }
      ],
      firefighterAlerts: {
        resolved: 8,
        pending: 2,
        avgResolutionTime: '2.3 hours',
        topResolver: 'John Doe',
        recentWins: [
          'Resolved capacity conflict in Engineering',
          'Optimized resource allocation for Q1 projects'
        ]
      },
      crystalBall: {
        daysUntilConflict: 14,
        conflictType: 'capacity',
        affectedResources: 2,
        suggestedAction: 'Consider redistributing tasks from Alpha Project',
        confidence: 85
      }
    };

    res.json(gamifiedMetrics);
  } catch (error) {
    console.error('Dashboard gamified metrics error:', error);
    res.status(500).json({ message: 'Failed to fetch gamified metrics' });
  }
}

// Main dashboard handler that routes to sub-endpoints
module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Parse the URL to determine the endpoint
    const url = new URL(req.url, `http://${req.headers.host}`);
    const endpoint = url.searchParams.get('endpoint');

    // Route to appropriate handler based on endpoint parameter
    switch (endpoint) {
      case 'kpis':
        return await handleGetKPIs(req, res);
      case 'alerts':
        return await handleGetAlerts(req, res);
      case 'timeline':
        return await handleGetTimeline(req, res);
      case 'heatmap':
        return await handleGetHeatmap(req, res);
      case 'gamified-metrics':
        return await handleGetGamifiedMetrics(req, res);
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
    console.error('Dashboard API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
