// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('./lib/middleware');

// Input validation schema
const testQuerySchema = z.object({
  endpoint: z.string().optional().default('all')
});

// Test endpoint to verify API behavior in production
const testEndpointsHandler = async (req, res, { user, validatedData }) => {
  const { endpoint } = validatedData;
  
  Logger.info('Testing API endpoints', {
    userId: user?.id || 'anonymous',
    endpoint,
    environment: process.env.NODE_ENV || 'unknown'
  });

  const testResults = {
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    supabaseConfig: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET
    },
    endpoints: {}
  };

  // Test each endpoint's fallback behavior
  const endpointsToTest = [
    'resources',
    'projects', 
    'allocations',
    'departments',
    'time-entries',
    'ogsm-charters'
  ];

  for (const endpointName of endpointsToTest) {
    try {
      // Import the endpoint module
      const endpointModule = require(`./${endpointName}`);
      
      // Create a mock request/response to test the endpoint
      const mockReq = {
        method: 'GET',
        url: `/api/${endpointName}`,
        query: {},
        headers: {
          authorization: 'Bearer test-token'
        }
      };
      
      let responseData = null;
      let responseStatus = 200;
      
      const mockRes = {
        json: (data) => {
          responseData = data;
          return mockRes;
        },
        status: (code) => {
          responseStatus = code;
          return mockRes;
        }
      };

      // Test the endpoint (this will likely fail due to auth, but we can see the structure)
      try {
        await endpointModule(mockReq, mockRes);
      } catch (error) {
        // Expected to fail due to auth/validation, but we can check the error structure
      }

      testResults.endpoints[endpointName] = {
        status: 'tested',
        responseType: responseData ? typeof responseData : 'unknown',
        isArray: Array.isArray(responseData),
        hasLength: responseData && typeof responseData.length !== 'undefined',
        responseStatus
      };

    } catch (error) {
      testResults.endpoints[endpointName] = {
        status: 'error',
        error: error.message,
        responseType: 'unknown',
        isArray: false,
        hasLength: false
      };
    }
  }

  // Test dashboard endpoints
  const dashboardEndpoints = ['kpis', 'alerts', 'gamified-metrics', 'heatmap'];
  
  for (const endpointName of dashboardEndpoints) {
    try {
      const endpointModule = require(`./dashboard/${endpointName}`);
      
      testResults.endpoints[`dashboard/${endpointName}`] = {
        status: 'module_loaded',
        responseType: 'unknown',
        isArray: false,
        hasLength: false
      };

    } catch (error) {
      testResults.endpoints[`dashboard/${endpointName}`] = {
        status: 'error',
        error: error.message,
        responseType: 'unknown',
        isArray: false,
        hasLength: false
      };
    }
  }

  return res.json(testResults);
};

// Export with middleware (no auth required for testing)
module.exports = withMiddleware(testEndpointsHandler, {
  requireAuth: false,
  allowedMethods: ['GET'],
  validateSchema: testQuerySchema
});
