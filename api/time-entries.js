// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const timeEntriesQuerySchema = z.object({
  resourceId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'all']).optional().default('all'),
  limit: z.string().transform(val => parseInt(val)).optional().default(100)
});

// Main time entries handler
const timeEntriesHandler = async (req, res, { user, validatedData }) => {
  const { resourceId, projectId, startDate, endDate, status, limit } = validatedData;
  
  Logger.info('Fetching time entries', {
    userId: user.id,
    resourceId,
    projectId,
    startDate,
    endDate,
    status,
    limit
  });

  try {
    // For now, return mock time entries data
    // TODO: Implement real time entries from Supabase when table is available
    const mockTimeEntries = [
      {
        id: 1,
        resourceId: parseInt(resourceId) || 1,
        projectId: parseInt(projectId) || 1,
        date: startDate || '2024-01-15',
        hours: 8,
        description: 'Frontend development work',
        status: 'submitted',
        createdAt: '2024-01-15T09:00:00.000Z',
        updatedAt: '2024-01-15T17:00:00.000Z'
      },
      {
        id: 2,
        resourceId: parseInt(resourceId) || 1,
        projectId: parseInt(projectId) || 2,
        date: startDate || '2024-01-16',
        hours: 6,
        description: 'API integration',
        status: 'approved',
        createdAt: '2024-01-16T09:00:00.000Z',
        updatedAt: '2024-01-16T15:00:00.000Z'
      }
    ];

    // Apply filters
    let filteredEntries = mockTimeEntries;

    if (resourceId) {
      filteredEntries = filteredEntries.filter(entry => entry.resourceId === parseInt(resourceId));
    }

    if (projectId) {
      filteredEntries = filteredEntries.filter(entry => entry.projectId === parseInt(projectId));
    }

    if (status !== 'all') {
      filteredEntries = filteredEntries.filter(entry => entry.status === status);
    }

    if (startDate && endDate) {
      filteredEntries = filteredEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
      });
    }

    // Apply limit
    filteredEntries = filteredEntries.slice(0, limit);

    Logger.info('Time entries fetched successfully', {
      userId: user.id,
      count: filteredEntries.length,
      filters: { resourceId, projectId, status }
    });

    return res.json(filteredEntries);
  } catch (error) {
    Logger.error('Failed to fetch time entries', error, { userId: user.id });
    return createErrorResponse(res, 500, 'Failed to fetch time entries');
  }
};

// Export with middleware
module.exports = withMiddleware(timeEntriesHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: timeEntriesQuerySchema
});
