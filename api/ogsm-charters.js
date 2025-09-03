// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const ogsmChartersQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  department: z.string().optional()
});

// Main OGSM charters handler
const ogsmChartersHandler = async (req, res, { user, validatedData }) => {
  const { status, department } = validatedData;

  Logger.info('Fetching OGSM charters', {
    userId: user.id,
    status,
    department
  });

  // Always return a safe response, never throw errors to middleware
  let charters = [];

  try {
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
    charters = mockCharters;

    if (status !== 'all') {
      charters = charters.filter(charter => charter.status === status);
    }

    if (department && department !== 'all') {
      charters = charters.filter(charter => charter.department === department);
    }

  } catch (error) {
    Logger.error('Failed to fetch OGSM charters', error, { userId: user.id });
    // Don't throw - just use empty array as fallback
    charters = [];
  }

  Logger.info('OGSM charters fetched successfully', {
    userId: user.id,
    count: charters.length,
    filters: { status, department }
  });

  // Always return a valid array (never throw errors to middleware)
  return res.json(charters);
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(ogsmChartersHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: ogsmChartersQuerySchema
});
