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

  try {
    console.log(`[EFFORT_NOTES_DETAIL] ${req.method} request to /api/effort-notes/[projectId]/[resourceId]/[changeLeadId]`);

    // Extract IDs from URL
    const { projectId, resourceId, changeLeadId } = req.query;
    const parsedProjectId = parseInt(projectId);
    const parsedResourceId = parseInt(resourceId);
    const parsedChangeLeadId = parseInt(changeLeadId);

    if (isNaN(parsedProjectId) || isNaN(parsedResourceId) || isNaN(parsedChangeLeadId)) {
      return res.status(400).json({ error: 'Invalid parameters - all IDs must be valid numbers' });
    }

    if (req.method === 'GET') {
      return await handleGetNote(req, res, parsedProjectId, parsedResourceId, parsedChangeLeadId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteNote(req, res, parsedProjectId, parsedResourceId, parsedChangeLeadId);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[EFFORT_NOTES_DETAIL] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle GET requests - fetch specific note
async function handleGetNote(req, res, projectId, resourceId, changeLeadId) {
  console.log('[EFFORT_NOTES_DETAIL] Fetching note for:', { projectId, resourceId, changeLeadId });

  try {
    // Get the note using DatabaseService
    const note = await DatabaseService.getEffortSummaryNote(projectId, resourceId, changeLeadId);
    
    console.log('[EFFORT_NOTES_DETAIL] Found note:', note ? 'exists' : 'not found');
    
    return res.json({ note: note || "" });

  } catch (error) {
    console.error('[EFFORT_NOTES_DETAIL] Error fetching note:', error);
    return res.status(500).json({
      error: 'Failed to fetch note',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle DELETE requests - delete note
async function handleDeleteNote(req, res, projectId, resourceId, changeLeadId) {
  console.log('[EFFORT_NOTES_DETAIL] Deleting note for:', { projectId, resourceId, changeLeadId });

  try {
    // Delete the note using DatabaseService
    await DatabaseService.deleteEffortSummaryNote(projectId, resourceId, changeLeadId);
    
    console.log('[EFFORT_NOTES_DETAIL] Successfully deleted note');
    
    return res.status(200).json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('[EFFORT_NOTES_DETAIL] Error deleting note:', error);
    return res.status(500).json({
      error: 'Failed to delete note',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
