// Simple RBAC Test Endpoint
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 1,
          email: 'admin@resourceflow.com',
          resourceId: null,
          roles: [{ id: 1, role: 'admin', resourceId: null }],
          permissions: ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management'],
          resource: null
        }
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
