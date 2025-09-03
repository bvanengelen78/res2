// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

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
    console.log('[ALLOCATION_DETAIL] Starting allocation detail request');

    // Extract allocation ID from URL
    const { id } = req.query;
    const allocationId = parseInt(id);

    if (!allocationId || isNaN(allocationId)) {
      return res.status(400).json({ error: 'Invalid allocation ID' });
    }

    console.log('[ALLOCATION_DETAIL] Fetching allocation:', allocationId);

    // Fetch the specific allocation
    const allocations = await DatabaseService.getResourceAllocations();
    const allocation = allocations.find(a => a.id === allocationId);

    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    console.log('[ALLOCATION_DETAIL] Found allocation for resource:', allocation.resourceId);

    return res.json(allocation);

  } catch (error) {
    console.error('[ALLOCATION_DETAIL] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch allocation details',
      message: error.message,
      timestamp: new Date().toISOString()
    });

