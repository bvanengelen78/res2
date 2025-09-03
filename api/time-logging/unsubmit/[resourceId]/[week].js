// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../../../lib/supabase');

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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[TIME_LOGGING_UNSUBMIT] Starting time logging unsubmission request');

    // Extract resource ID and week from URL path
    const { resourceId, week } = req.query;
    const resourceIdNum = parseInt(resourceId);

    if (!resourceIdNum || isNaN(resourceIdNum)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    if (!week || typeof week !== 'string') {
      return res.status(400).json({ error: 'Invalid week provided' });
    }

    // Extract request body
    const { reason } = req.body || {};

    console.log('[TIME_LOGGING_UNSUBMIT] Unsubmission parameters:', {
      resourceId: resourceIdNum, week, reason
    });

    // For demo purposes, create a mock unsubmission response
    const unsubmission = {
      id: Date.now(), // Mock ID
      resourceId: resourceIdNum,
      week,
      status: 'draft',
      unsubmittedAt: new Date().toISOString(),
      reason: reason || 'Unsubmitted for corrections'
    };

    console.log('[TIME_LOGGING_UNSUBMIT] Unsubmission processed:', unsubmission.id);

    return res.json(unsubmission);

  } catch (error) {
    console.error('[TIME_LOGGING_UNSUBMIT] Error:', error);

    return res.status(500).json({
      error: 'Failed to unsubmit weekly timesheet',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
