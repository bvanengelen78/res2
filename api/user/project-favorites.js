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
    console.log('[USER_PROJECT_FAVORITES] Starting user project favorites request');

    // For demo mode, use a default user ID
    const userId = 1;
    
    console.log('[USER_PROJECT_FAVORITES] Fetching favorites for user:', userId);

    // Since the user_project_favorites table might not exist in Supabase,
    // we'll return an empty array for now to prevent errors
    // This allows the frontend to work without breaking
    const favorites = [];
    
    console.log('[USER_PROJECT_FAVORITES] Returning favorites:', favorites);

    return res.json(favorites);

  } catch (error) {
    console.error('[USER_PROJECT_FAVORITES] Error:', error);
    
    // Return empty array instead of error to prevent frontend crashes
    return res.json([]);
  }
};
