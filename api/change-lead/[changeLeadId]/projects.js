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
    console.log('[CHANGE_LEAD_PROJECTS] Starting projects request');

    // Extract change lead ID from URL
    const { changeLeadId } = req.query;
    const parsedChangeLeadId = parseInt(changeLeadId);

    if (!parsedChangeLeadId || isNaN(parsedChangeLeadId)) {
      return res.status(400).json({ error: 'Invalid change lead ID' });
    }

    console.log('[CHANGE_LEAD_PROJECTS] Fetching projects for change lead:', parsedChangeLeadId);

    // Fetch projects by change lead using DatabaseService
    const projects = await DatabaseService.getProjectsByChangeLead(parsedChangeLeadId);

    console.log('[CHANGE_LEAD_PROJECTS] Found projects:', projects.length);

    return res.json(projects);

  } catch (error) {
    console.error('[CHANGE_LEAD_PROJECTS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch change lead projects',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
