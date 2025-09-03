// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../../../../lib/supabase');

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
    console.log('[WEEKLY_SUBMISSIONS] Starting weekly submission request');

    // Extract resource ID and week from URL path
    const { id, week } = req.query;
    const resourceId = parseInt(id);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    if (!week || typeof week !== 'string') {
      return res.status(400).json({ error: 'Invalid week provided' });
    }

    // Extract query parameters
    const { includeDetails = 'true' } = req.query;

    console.log('[WEEKLY_SUBMISSIONS] Query parameters:', {
      resourceId, week, includeDetails
    });

    // First verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);

    if (!resource) {
      console.warn('[WEEKLY_SUBMISSIONS] Resource not found:', resourceId);
      return res.status(404).json({ message: 'Resource not found' });
    }

    // For demo purposes, create a mock weekly submission
    const submission = {
      id: `${resourceId}-${week}`,
      resourceId: resourceId,
      weekStartDate: week,
      status: 'draft', // Default to draft for demo
      submittedAt: null,
      totalHours: 0,
      notes: '',
      isSubmitted: false,
      resource: {
        id: resource.id,
        name: resource.name,
        email: resource.email,
        department: resource.department || resource.role || 'General'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[WEEKLY_SUBMISSIONS] Weekly submission generated:', submission.id);

    return res.json(submission);

  } catch (error) {
    console.error('[WEEKLY_SUBMISSIONS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch weekly submission',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
