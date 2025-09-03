// Test endpoint to debug middleware specifically

const { z } = require('zod');
const { withMiddleware, Logger } = require('./lib/middleware');

// Simple validation schema (same as allocations)
const testQuerySchema = z.object({
  resourceId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  department: z.string().optional()
});

// Simple test handler
const testHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Test handler called', {
    userId: user.id,
    validatedData,
    method: req.method,
    url: req.url
  });

  try {
    // Test DatabaseService call
    const { DatabaseService } = require('./lib/supabase');
    const allocations = await DatabaseService.getResourceAllocations();
    
    return res.json({
      success: true,
      message: 'Middleware test successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      validatedData,
      dataTest: {
        allocationCount: allocations.length,
        sampleAllocation: allocations.length > 0 ? allocations[0] : null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    Logger.error('Test handler error', {
      userId: user.id,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with middleware - same configuration as allocations
module.exports = withMiddleware(testHandler, {
  requireAuth: false, // Demo mode
  allowedMethods: ['GET'],
  validateSchema: testQuerySchema
});
