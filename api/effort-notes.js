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

  try {
    console.log(`[EFFORT_NOTES] ${req.method} request to /api/effort-notes`);

    if (req.method === 'POST') {
      return await handleCreateNote(req, res);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[EFFORT_NOTES] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle POST requests - create/update effort note
async function handleCreateNote(req, res) {
  console.log('[EFFORT_NOTES] Starting POST note creation/update');
  console.log('[EFFORT_NOTES] Request body:', req.body);

  // Validate required fields
  const { projectId, resourceId, changeLeadId, note } = req.body;

  if (!projectId || !resourceId || !changeLeadId || note === undefined) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['projectId', 'resourceId', 'changeLeadId', 'note']
    });
  }

  // Validate data types
  const parsedProjectId = parseInt(projectId);
  const parsedResourceId = parseInt(resourceId);
  const parsedChangeLeadId = parseInt(changeLeadId);

  if (isNaN(parsedProjectId) || isNaN(parsedResourceId) || isNaN(parsedChangeLeadId)) {
    return res.status(400).json({
      error: 'Invalid data types',
      message: 'projectId, resourceId, and changeLeadId must be valid numbers'
    });
  }

  try {
    const userId = 1; // Default user ID for public access

    console.log('[EFFORT_NOTES] Saving note with data:', {
      projectId: parsedProjectId,
      resourceId: parsedResourceId,
      changeLeadId: parsedChangeLeadId,
      note: note.substring(0, 100) + (note.length > 100 ? '...' : ''),
      userId
    });

    // Save the note using DatabaseService
    await DatabaseService.saveEffortSummaryNote(
      parsedProjectId,
      parsedResourceId,
      parsedChangeLeadId,
      note,
      userId
    );
    
    console.log('[EFFORT_NOTES] Successfully saved note');

    return res.status(201).json({ message: 'Note saved successfully' });

  } catch (error) {
    console.error('[EFFORT_NOTES] Error saving note:', error);
    
    return res.status(500).json({
      error: 'Failed to save note',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
