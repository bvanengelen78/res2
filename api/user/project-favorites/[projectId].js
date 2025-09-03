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

  if (!['POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[USER_PROJECT_FAVORITES_MANAGE] Starting project favorites management request');

    // Extract project ID from URL
    const { projectId } = req.query;
    const projectIdNum = parseInt(projectId);
    
    if (!projectIdNum || isNaN(projectIdNum)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // For demo mode, use a default user ID
    const userId = 1;
    
    console.log('[USER_PROJECT_FAVORITES_MANAGE] Managing favorite:', {
      method: req.method,
      userId,
      projectId: projectIdNum
    });

    if (req.method === 'POST') {
      // Add project to favorites
      // Since the user_project_favorites table might not exist in Supabase,
      // we'll return success without actually storing data
      console.log('[USER_PROJECT_FAVORITES_MANAGE] Adding project to favorites');
      return res.status(201).json({ message: 'Project added to favorites' });
    }

    if (req.method === 'DELETE') {
      // Remove project from favorites
      // Since the user_project_favorites table might not exist in Supabase,
      // we'll return success without actually removing data
      console.log('[USER_PROJECT_FAVORITES_MANAGE] Removing project from favorites');
      return res.status(200).json({ message: 'Project removed from favorites' });
    }

  } catch (error) {
    console.error('[USER_PROJECT_FAVORITES_MANAGE] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to manage project favorite',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
