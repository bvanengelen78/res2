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
    console.log('[TIME_LOGGING_SUBMIT] Starting time logging submission request');

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
    const { notes, totalHours } = req.body || {};

    console.log('[TIME_LOGGING_SUBMIT] Submission parameters:', {
      resourceId: resourceIdNum, week, notes, totalHours
    });

    // For demo purposes, create a mock submission response
    const submission = {
      id: Date.now(), // Mock ID
      resourceId: resourceIdNum,
      week,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      notes: notes || '',
      totalHours: totalHours || 0
    };

    console.log('[TIME_LOGGING_SUBMIT] Submission created:', submission.id);

    return res.status(201).json(submission);

  } catch (error) {
    console.error('[TIME_LOGGING_SUBMIT] Error:', error);

    return res.status(500).json({
      error: 'Failed to submit weekly timesheet',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
