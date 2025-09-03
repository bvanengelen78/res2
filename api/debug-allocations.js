// Debug endpoint to test allocations specifically without middleware

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
    console.log('[DEBUG_ALLOCATIONS] Starting allocations test');

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      query: req.query,
      
      // Test DatabaseService import
      databaseServiceTest: null,
      
      // Test allocations query
      allocationsQueryTest: null,
      
      // Test with middleware
      middlewareTest: null
    };

    // Test 1: DatabaseService import and allocations query
    try {
      const { DatabaseService } = require('./lib/supabase');
      
      debugInfo.databaseServiceTest = {
        imported: true,
        hasGetResourceAllocations: typeof DatabaseService.getResourceAllocations === 'function'
      };
      
      // Try to call getResourceAllocations
      const allocations = await DatabaseService.getResourceAllocations();
      debugInfo.allocationsQueryTest = {
        success: true,
        allocationCount: allocations ? allocations.length : 0,
        sampleData: allocations && allocations.length > 0 ? allocations[0] : null
      };
      
    } catch (error) {
      debugInfo.allocationsQueryTest = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 2: Try to import and test middleware
    try {
      const { withMiddleware, Logger } = require('./lib/middleware');
      
      debugInfo.middlewareTest = {
        imported: true,
        hasWithMiddleware: typeof withMiddleware === 'function',
        hasLogger: typeof Logger === 'object'
      };
      
      // Test creating a simple middleware-wrapped function
      const testHandler = async (req, res, { user, validatedData }) => {
        return { user: user, validatedData: validatedData };
      };
      
      const wrappedHandler = withMiddleware(testHandler, {
        requireAuth: false,
        allowedMethods: ['GET']
      });
      
      debugInfo.middlewareTest.wrapperCreated = typeof wrappedHandler === 'function';
      
    } catch (error) {
      debugInfo.middlewareTest = {
        imported: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 3: Try to simulate the actual allocations endpoint logic
    try {
      const { DatabaseService } = require('./lib/supabase');
      const { startDate, endDate, resourceId, projectId, status = 'active', department } = req.query;
      
      console.log('[DEBUG_ALLOCATIONS] Query parameters:', { startDate, endDate, resourceId, projectId, status, department });
      
      // Fetch allocations from Supabase (same as real endpoint)
      let allocations = await DatabaseService.getResourceAllocations();
      console.log('[DEBUG_ALLOCATIONS] Raw allocations count:', allocations.length);
      
      // Apply filters (same logic as real endpoint)
      if (resourceId) {
        allocations = allocations.filter(allocation => allocation.resourceId === parseInt(resourceId));
        console.log('[DEBUG_ALLOCATIONS] After resourceId filter:', allocations.length);
      }

      if (projectId) {
        allocations = allocations.filter(allocation => allocation.projectId === parseInt(projectId));
        console.log('[DEBUG_ALLOCATIONS] After projectId filter:', allocations.length);
      }

      if (status !== 'all') {
        allocations = allocations.filter(allocation => allocation.status === status);
        console.log('[DEBUG_ALLOCATIONS] After status filter:', allocations.length);
      }

      if (startDate && endDate) {
        const filterStartDate = new Date(startDate);
        const filterEndDate = new Date(endDate);
        console.log('[DEBUG_ALLOCATIONS] Date filter:', { filterStartDate, filterEndDate });
        
        allocations = allocations.filter(allocation => {
          const allocationStart = new Date(allocation.startDate);
          const allocationEnd = new Date(allocation.endDate);
          
          // Include allocations that overlap with the filter period
          return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
        });
        console.log('[DEBUG_ALLOCATIONS] After date filter:', allocations.length);
      }

      debugInfo.endpointSimulationTest = {
        success: true,
        finalAllocationCount: allocations.length,
        sampleFilteredData: allocations.length > 0 ? allocations[0] : null,
        appliedFilters: { resourceId, projectId, status, startDate, endDate, department }
      };
      
    } catch (error) {
      debugInfo.endpointSimulationTest = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    console.log('[DEBUG_ALLOCATIONS] Debug info collected:', debugInfo);

    return res.status(200).json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('[DEBUG_ALLOCATIONS] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
