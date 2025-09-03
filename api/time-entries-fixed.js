// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('./lib/supabase');

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
    console.log('[TIME_ENTRIES] Starting time entries request');

    // Extract query parameters
    const { resourceId, projectId, startDate, endDate, status = 'all', limit = 100 } = req.query;
    
    console.log('[TIME_ENTRIES] Query parameters:', { 
      resourceId, projectId, startDate, endDate, status, limit 
    });

    // Fetch time entries from Supabase
    let timeEntries = await DatabaseService.getTimeEntries();
    console.log('[TIME_ENTRIES] Raw time entries count:', timeEntries.length);
    
    // Apply filters
    if (resourceId) {
      timeEntries = timeEntries.filter(entry => entry.resourceId === parseInt(resourceId));
      console.log('[TIME_ENTRIES] After resourceId filter:', timeEntries.length);
    }

    if (projectId) {
      timeEntries = timeEntries.filter(entry => entry.projectId === parseInt(projectId));
      console.log('[TIME_ENTRIES] After projectId filter:', timeEntries.length);
    }

    if (status !== 'all') {
      timeEntries = timeEntries.filter(entry => entry.status === status);
      console.log('[TIME_ENTRIES] After status filter:', timeEntries.length);
    }

    if (startDate && endDate) {
      const filterStartDate = new Date(startDate);
      const filterEndDate = new Date(endDate);
      console.log('[TIME_ENTRIES] Date filter:', { filterStartDate, filterEndDate });
      
      timeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= filterStartDate && entryDate <= filterEndDate;
      });
      console.log('[TIME_ENTRIES] After date filter:', timeEntries.length);
    }

    // Apply limit
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      timeEntries = timeEntries.slice(0, limitNum);
      console.log('[TIME_ENTRIES] After limit:', timeEntries.length);
    }

    console.log('[TIME_ENTRIES] Final time entries count:', timeEntries.length);

    return res.json(timeEntries);

  } catch (error) {
    console.error('[TIME_ENTRIES] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch time entries',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
