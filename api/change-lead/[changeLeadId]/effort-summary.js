// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../../lib/supabase');

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
    console.log('[CHANGE_LEAD_EFFORT_SUMMARY] Starting effort summary request');

    // Extract change lead ID from URL
    const { changeLeadId } = req.query;
    const parsedChangeLeadId = parseInt(changeLeadId);

    if (!parsedChangeLeadId || isNaN(parsedChangeLeadId)) {
      return res.status(400).json({ error: 'Invalid change lead ID' });
    }

    // Extract query parameters
    const { startDate, endDate } = req.query;

    console.log('[CHANGE_LEAD_EFFORT_SUMMARY] Query parameters:', {
      changeLeadId: parsedChangeLeadId,
      startDate,
      endDate
    });

    // Fetch effort summary data using DatabaseService
    const effortSummary = await DatabaseService.getChangeLeadEffortSummary(
      parsedChangeLeadId,
      startDate,
      endDate
    );

    console.log('[CHANGE_LEAD_EFFORT_SUMMARY] Found effort summary records:', effortSummary.length);

    return res.json(effortSummary);

  } catch (error) {
    console.error('[CHANGE_LEAD_EFFORT_SUMMARY] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch effort summary',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
