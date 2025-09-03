// Debug endpoint to check middleware configuration in production

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
    console.log('[DEBUG_MIDDLEWARE] Starting middleware debug check');

    // Try to import the middleware
    let middlewareInfo = {};
    
    try {
      const middleware = require('./lib/middleware');
      
      middlewareInfo = {
        imported: true,
        hasWithMiddleware: typeof middleware.withMiddleware === 'function',
        hasLogger: typeof middleware.Logger === 'object',
        hasMockUser: !!middleware.mockUser,
        middlewareType: middleware.mockUser ? 'testing' : 'production',
        defaultRequireAuth: 'unknown'
      };

      // Try to determine default requireAuth by checking the function
      const middlewareString = middleware.withMiddleware.toString();
      if (middlewareString.includes('requireAuth = false')) {
        middlewareInfo.defaultRequireAuth = false;
      } else if (middlewareString.includes('requireAuth = true')) {
        middlewareInfo.defaultRequireAuth = true;
      }

    } catch (error) {
      middlewareInfo = {
        imported: false,
        error: error.message,
        stack: error.stack
      };
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      middleware: middlewareInfo,
      
      // File system info
      filesystem: {
        cwd: process.cwd(),
        middlewarePath: require.resolve('./lib/middleware'),
      },
      
      // Test a simple middleware call
      middlewareTest: null
    };

    // Try to test the middleware directly
    try {
      const middleware = require('./lib/middleware');
      
      // Create a mock request/response to test middleware behavior
      const mockReq = {
        method: 'GET',
        url: '/test',
        headers: {},
        query: {}
      };
      
      let mockResData = null;
      let mockResStatus = 200;
      
      const mockRes = {
        json: (data) => {
          mockResData = data;
          return mockRes;
        },
        status: (code) => {
          mockResStatus = code;
          return mockRes;
        },
        setHeader: () => mockRes,
        end: () => mockRes
      };

      const testHandler = middleware.withMiddleware(
        async (req, res) => {
          return res.json({ 
            success: true, 
            user: req.user,
            requireAuthTest: 'passed'
          });
        },
        { requireAuth: false }
      );

      // This should work without authentication
      await testHandler(mockReq, mockRes);
      
      debugInfo.middlewareTest = {
        success: true,
        responseStatus: mockResStatus,
        responseData: mockResData
      };

    } catch (testError) {
      debugInfo.middlewareTest = {
        success: false,
        error: testError.message,
        stack: testError.stack
      };
    }

    console.log('[DEBUG_MIDDLEWARE] Debug info collected:', debugInfo);

    return res.status(200).json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('[DEBUG_MIDDLEWARE] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
