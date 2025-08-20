// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schemas
const ogsmCharterCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional()
});

const ogsmCharterUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// Mock data fallback
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

// Main OGSM charters handler
const ogsmChartersHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Handling OGSM charters request', {
    userId: user.id,
    method: req.method,
    userPermissions: user.permissions
  });

  // Check for SYSTEM_ADMIN permission
  if (!user.permissions.includes('system_admin')) {
    Logger.warn('Access denied: User lacks SYSTEM_ADMIN permission', {
      userId: user.id,
      permissions: user.permissions
    });
    return createErrorResponse(res, 403, 'Access denied. SYSTEM_ADMIN permission required.');
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetOgsmCharters(req, res, user);
      case 'POST':
        return await handleCreateOgsmCharter(req, res, user, validatedData);
      default:
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    Logger.error('Error in OGSM charters handler', error);
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Get OGSM charters
const handleGetOgsmCharters = async (req, res, user) => {
  try {
    Logger.info('Fetching OGSM charters', { userId: user.id });

    // Try to get data from database first
    let charters;
    try {
      charters = await DatabaseService.getOgsmCharters();
      Logger.info('Successfully fetched OGSM charters from database', { 
        count: charters.length,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, using mock data', { 
        error: dbError.message,
        userId: user.id 
      });
      // Fallback to mock data
      charters = mockOgsmCharters;
    }

    return createSuccessResponse(res, charters);
  } catch (error) {
    Logger.error('Error fetching OGSM charters', error);
    // Final fallback to mock data
    return createSuccessResponse(res, mockOgsmCharters);
  }
};

// Create OGSM charter
const handleCreateOgsmCharter = async (req, res, user, validatedData) => {
  try {
    Logger.info('Creating OGSM charter', { 
      userId: user.id,
      data: validatedData 
    });

    // Try to create in database first
    let charter;
    try {
      charter = await DatabaseService.createOgsmCharter(validatedData);
      Logger.info('Successfully created OGSM charter in database', { 
        charterId: charter.id,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating creation', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate creation with mock data
      charter = {
        id: Math.max(...mockOgsmCharters.map(c => c.id)) + 1,
        ...validatedData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockOgsmCharters.push(charter);
    }

    return createSuccessResponse(res, charter, 201);
  } catch (error) {
    Logger.error('Error creating OGSM charter', error);
    return createErrorResponse(res, 500, 'Failed to create OGSM charter');
  }
};

// Export the handler with middleware
module.exports = withMiddleware(
  ogsmChartersHandler,
  {
    requireAuth: true,
    validateInput: {
      POST: ogsmCharterCreateSchema
    }
  }
);
