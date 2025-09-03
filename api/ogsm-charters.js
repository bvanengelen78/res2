// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('./lib/supabase');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[OGSM_CHARTERS] Starting OGSM charters request');

    // Extract query parameters
    const { status = 'active', department } = req.query;

    console.log('[OGSM_CHARTERS] Query parameters:', { status, department });

    // For now, return mock OGSM charters data
    // TODO: Implement real OGSM charters from Supabase when table is available
    const mockCharters = [
      {
        id: 1,
        title: 'Q1 2024 Engineering Charter',
        objective: 'Improve development velocity and code quality',
        goals: [
          'Reduce deployment time by 50%',
          'Achieve 90% test coverage',
          'Implement automated CI/CD pipeline'
        ],
        strategies: [
          'Adopt containerization with Docker',
          'Implement comprehensive testing framework',
          'Set up automated deployment pipelines'
        ],
        measures: [
          'Deployment frequency',
          'Test coverage percentage',
          'Mean time to recovery'
        ],
        department: 'Engineering',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        title: 'Q1 2024 Design Charter',
        objective: 'Enhance user experience and design consistency',
        goals: [
          'Establish design system',
          'Improve user satisfaction by 25%',
          'Reduce design iteration cycles'
        ],
        strategies: [
          'Create comprehensive design system',
          'Conduct regular user research',
          'Implement design review processes'
        ],
        measures: [
          'User satisfaction scores',
          'Design system adoption rate',
          'Time to design approval'
        ],
        department: 'Design',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 3,
        title: 'Q4 2023 Product Charter',
        objective: 'Launch new product features and improve market fit',
        goals: [
          'Launch 3 major features',
          'Increase user engagement by 30%',
          'Achieve product-market fit metrics'
        ],
        strategies: [
          'Agile feature development',
          'User feedback integration',
          'Market analysis and positioning'
        ],
        measures: [
          'Feature adoption rates',
          'User engagement metrics',
          'Customer satisfaction scores'
        ],
        department: 'Product',
        status: 'inactive',
        startDate: '2023-10-01',
        endDate: '2023-12-31',
        createdAt: '2023-10-01T00:00:00.000Z'
      }
    ];

    // Apply filters
    let charters = mockCharters;

    if (status !== 'all') {
      charters = charters.filter(charter => charter.status === status);
    }

    if (department && department !== 'all') {
      charters = charters.filter(charter => charter.department === department);
    }

    console.log('[OGSM_CHARTERS] Filtered charters count:', charters.length);

    return res.json(charters);

  } catch (error) {
    console.error('[OGSM_CHARTERS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch OGSM charters',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
