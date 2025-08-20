// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schemas
const ogsmCharterUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// Mock data fallback (shared with main endpoint)
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

// Main OGSM charter by ID handler
const ogsmCharterByIdHandler = async (req, res, { user, validatedData }) => {
  const charterId = parseInt(req.query.id);
  
  if (!charterId) {
    return createErrorResponse(res, 400, 'Invalid charter ID');
  }

  Logger.info('Handling OGSM charter by ID request', {
    userId: user.id,
    method: req.method,
    charterId,
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
        return await handleGetOgsmCharter(req, res, user, charterId);
      case 'PUT':
        return await handleUpdateOgsmCharter(req, res, user, charterId, validatedData);
      case 'DELETE':
        return await handleDeleteOgsmCharter(req, res, user, charterId);
      default:
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    Logger.error('Error in OGSM charter by ID handler', error);
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Get single OGSM charter
const handleGetOgsmCharter = async (req, res, user, charterId) => {
  try {
    Logger.info('Fetching OGSM charter by ID', { userId: user.id, charterId });

    // Try to get data from database first
    let charter;
    try {
      charter = await DatabaseService.getOgsmCharter(charterId);
      if (charter) {
        Logger.info('Successfully fetched OGSM charter from database', { 
          charterId,
          userId: user.id 
        });
        return createSuccessResponse(res, charter);
      }
    } catch (dbError) {
      Logger.warn('Database unavailable, using mock data', { 
        error: dbError.message,
        userId: user.id 
      });
    }

    // Fallback to mock data
    charter = mockOgsmCharters.find(c => c.id === charterId);
    if (!charter) {
      return createErrorResponse(res, 404, 'OGSM charter not found');
    }

    return createSuccessResponse(res, charter);
  } catch (error) {
    Logger.error('Error fetching OGSM charter', error);
    return createErrorResponse(res, 500, 'Failed to fetch OGSM charter');
  }
};

// Update OGSM charter
const handleUpdateOgsmCharter = async (req, res, user, charterId, validatedData) => {
  try {
    Logger.info('Updating OGSM charter', { 
      userId: user.id,
      charterId,
      data: validatedData 
    });

    // Try to update in database first
    let charter;
    try {
      charter = await DatabaseService.updateOgsmCharter(charterId, validatedData);
      Logger.info('Successfully updated OGSM charter in database', { 
        charterId,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating update', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate update with mock data
      const index = mockOgsmCharters.findIndex(c => c.id === charterId);
      if (index === -1) {
        return createErrorResponse(res, 404, 'OGSM charter not found');
      }
      
      charter = {
        ...mockOgsmCharters[index],
        ...validatedData,
        updatedAt: new Date(),
      };
      mockOgsmCharters[index] = charter;
    }

    return createSuccessResponse(res, charter);
  } catch (error) {
    Logger.error('Error updating OGSM charter', error);
    return createErrorResponse(res, 500, 'Failed to update OGSM charter');
  }
};

// Delete OGSM charter
const handleDeleteOgsmCharter = async (req, res, user, charterId) => {
  try {
    Logger.info('Deleting OGSM charter', { 
      userId: user.id,
      charterId 
    });

    // Try to delete in database first
    try {
      await DatabaseService.deleteOgsmCharter(charterId);
      Logger.info('Successfully deleted OGSM charter in database', { 
        charterId,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating deletion', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate deletion with mock data
      const index = mockOgsmCharters.findIndex(c => c.id === charterId);
      if (index === -1) {
        return createErrorResponse(res, 404, 'OGSM charter not found');
      }
      
      mockOgsmCharters[index].isActive = false;
      mockOgsmCharters[index].updatedAt = new Date();
    }

    return res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting OGSM charter', error);
    return createErrorResponse(res, 500, 'Failed to delete OGSM charter');
  }
};

// Export the handler with middleware
module.exports = withMiddleware(
  ogsmCharterByIdHandler,
  {
    requireAuth: true,
    validateInput: {
      PUT: ogsmCharterUpdateSchema
    }
  }
);
