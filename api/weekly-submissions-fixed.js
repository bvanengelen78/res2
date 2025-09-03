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
    console.log('[WEEKLY_SUBMISSIONS] Starting weekly submissions request');

    // Extract query parameters
    const { resourceId, status = 'all', startDate, endDate, department, limit = 100 } = req.query;
    
    console.log('[WEEKLY_SUBMISSIONS] Query parameters:', { 
      resourceId, status, startDate, endDate, department, limit 
    });

    // Fetch resources for generating mock weekly submissions
    const resources = await DatabaseService.getResources();
    console.log('[WEEKLY_SUBMISSIONS] Raw resources count:', resources.length);

    // Filter resources by department if specified
    let filteredResources = resources.filter(resource => resource.isActive);
    if (department && department !== 'all') {
      filteredResources = filteredResources.filter(resource => {
        const resourceDepartment = resource.department || resource.role || 'General';
        return resourceDepartment === department;
      });
    }

    // Filter by specific resource if specified
    if (resourceId) {
      const targetResourceId = parseInt(resourceId);
      filteredResources = filteredResources.filter(resource => resource.id === targetResourceId);
    }

    // Generate mock weekly submissions for the past 8 weeks
    const submissions = [];
    const currentDate = new Date();

    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (currentDate.getDay() - 1) - (weekOffset * 7)); // Monday
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);

      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Apply date range filter if specified
      if (startDate && weekStartStr < startDate) continue;
      if (endDate && weekStartStr > endDate) continue;

      // Create submissions for each resource
      filteredResources.forEach(resource => {
        // Mock submission probability - higher for past weeks
        const isPastWeek = weekEnd < currentDate;
        const hasSubmission = isPastWeek ? Math.random() > 0.2 : Math.random() > 0.6; // 80% for past, 40% for current/future

        if (hasSubmission) {
          const submissionStatus = isPastWeek ?
            (Math.random() > 0.1 ? 'submitted' : 'approved') : // 90% submitted, 10% approved for past weeks
            'draft'; // Current/future weeks are drafts

          // Apply status filter
          if (status !== 'all' && submissionStatus !== status) return;

          const submission = {
            id: `${resource.id}-${weekStartStr}`,
            resourceId: resource.id,
            weekStartDate: weekStartStr,
            status: submissionStatus,
            submittedAt: submissionStatus === 'submitted' || submissionStatus === 'approved' ?
              new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
            totalHours: 35 + Math.random() * 10, // 35-45 hours
            notes: `Week ${weekOffset + 1} submission`,
            resource: {
              id: resource.id,
              name: resource.name,
              email: resource.email,
              department: resource.department || resource.role || 'General',
              role: resource.role
            },
            createdAt: new Date(weekStart.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          };

          submissions.push(submission);
        }
      });
    }

    // Sort by week start date (most recent first) and limit results
    submissions.sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    const limitedSubmissions = submissions.slice(0, parseInt(limit));

    console.log('[WEEKLY_SUBMISSIONS] Generated submissions count:', limitedSubmissions.length);

    return res.json(limitedSubmissions);

  } catch (error) {
    console.error('[WEEKLY_SUBMISSIONS] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch weekly submissions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
