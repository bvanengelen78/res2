// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Mock data for testing
const mockOgsmCharters = [
  {
    id: 1,
    name: "Q1 2024 Digital Transformation",
    description: "Focus on modernizing our technology stack and improving digital capabilities",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
  },
  {
    id: 2,
    name: "Q2 2024 Customer Experience",
    description: "Enhance customer satisfaction through improved service delivery",
    isActive: true,
    createdAt: new Date("2024-04-01T00:00:00Z"),
    updatedAt: new Date("2024-04-10T00:00:00Z"),
  },
  {
    id: 3,
    name: "Q3 2024 Operational Excellence",
    description: "Streamline processes and improve operational efficiency",
    isActive: true,
    createdAt: new Date("2024-07-01T00:00:00Z"),
    updatedAt: new Date("2024-07-05T00:00:00Z"),
  },
];

/**
 * Simplified OGSM charters endpoint for debugging
 * Bypasses middleware to test basic serverless function functionality
 */
module.exports = async (req, res) => {
  try {
    console.log('[OGSM_SIMPLE] Starting simplified endpoint', {
      method: req.method,
      timestamp: new Date().toISOString(),
      url: req.url,
      headers: Object.keys(req.headers)
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      console.log('[OGSM_SIMPLE] Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      console.log('[OGSM_SIMPLE] Method not allowed', { method: req.method });
      return res.status(405).json({
        error: true,
        message: `Method ${req.method} not allowed`,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[OGSM_SIMPLE] Processing GET request');

    // Test environment variables
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'configured' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing'
    };

    console.log('[OGSM_SIMPLE] Environment status', envStatus);

    // Test basic imports
    let importStatus = {};
    try {
      const { withMiddleware } = require('../lib/middleware');
      importStatus.middleware = 'success';
    } catch (err) {
      importStatus.middleware = `failed: ${err.message}`;
      console.error('[OGSM_SIMPLE] Middleware import failed', err);
    }

    try {
      const { DatabaseService } = require('../lib/supabase');
      importStatus.database = 'success';
    } catch (err) {
      importStatus.database = `failed: ${err.message}`;
      console.error('[OGSM_SIMPLE] Database import failed', err);
    }

    // Return mock data with diagnostic info
    const response = {
      success: true,
      data: mockOgsmCharters,
      meta: {
        timestamp: new Date().toISOString(),
        environment: envStatus,
        imports: importStatus,
        source: 'mock_data',
        count: mockOgsmCharters.length
      }
    };

    console.log('[OGSM_SIMPLE] Returning successful response', {
      dataCount: mockOgsmCharters.length,
      hasEnvironment: !!envStatus,
      hasImports: !!importStatus
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[OGSM_SIMPLE] Critical error in simplified endpoint', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    try {
      return res.status(500).json({
        error: true,
        message: `Internal server error: ${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'simplified_endpoint_error'
      });
    } catch (responseError) {
      console.error('[OGSM_SIMPLE] Failed to send error response', responseError);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Simplified endpoint failed: ${error.message}`);
    }
  }
};
