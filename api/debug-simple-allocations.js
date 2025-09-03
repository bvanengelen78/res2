// Simple allocations endpoint to test middleware with minimal logic

const { z } = require('zod');
const { withMiddleware, Logger } = require('./lib/middleware');

// Simple validation schema
const simpleQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Minimal handler that just returns static data
const simpleAllocationsHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Simple allocations handler called', {
    userId: user.id,
    validatedData,
    method: req.method,
    url: req.url
  });

  // Return static data to test if middleware works
  const staticAllocations = [
    {
      id: 1,
      projectId: 1,
      resourceId: 1,
      allocatedHours: 40,
      startDate: "2025-09-01",
      endDate: "2025-09-07",
      status: "active"
    },
    {
      id: 2,
      projectId: 2,
      resourceId: 2,
      allocatedHours: 20,
      startDate: "2025-09-01",
      endDate: "2025-09-07",
      status: "active"
    }
  ];

  Logger.info('Returning static allocations', {
    userId: user.id,
    count: staticAllocations.length
  });

  return res.json(staticAllocations);
};

// Export with middleware - same configuration as real allocations
module.exports = withMiddleware(simpleAllocationsHandler, {
  requireAuth: false, // Demo mode
  allowedMethods: ['GET'],
  validateSchema: simpleQuerySchema
});
