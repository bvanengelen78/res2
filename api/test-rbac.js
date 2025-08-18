const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Mock RBAC functions to test user object structure
function testRBACFunctions(user) {
  const results = {};
  
  try {
    // Test hasPermission equivalent
    results.hasPermission_dashboard = user?.permissions?.includes('dashboard') ?? false;
    results.hasPermission_system_admin = user?.permissions?.includes('system_admin') ?? false;
    
    // Test hasAnyPermission equivalent
    const testPermissions = ['dashboard', 'reports'];
    results.hasAnyPermission = testPermissions.some(permission => 
      user?.permissions?.includes(permission) ?? false
    );
    
    // Test hasRole equivalent
    results.hasRole_admin = user?.roles?.some(r => r.role === 'admin') ?? false;
    results.hasRole_regular_user = user?.roles?.some(r => r.role === 'regular_user') ?? false;
    
    // Test user object structure
    results.userStructure = {
      hasId: !!user?.id,
      hasEmail: !!user?.email,
      hasResourceId: !!user?.resourceId,
      hasRoles: Array.isArray(user?.roles),
      hasPermissions: Array.isArray(user?.permissions),
      rolesCount: user?.roles?.length || 0,
      permissionsCount: user?.permissions?.length || 0,
      firstRole: user?.roles?.[0]?.role || null,
      firstPermission: user?.permissions?.[0] || null
    };
    
    results.success = true;
    results.error = null;
  } catch (error) {
    results.success = false;
    results.error = error.message;
  }
  
  return results;
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
    // Verify authentication
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get the full user object from the token and add the missing fields
    const fullUser = {
      id: user.id,
      email: user.email,
      resourceId: user.resourceId,
      roles: [{ role: 'admin' }], // Default to admin role for testing
      permissions: [
        'time_logging',
        'reports', 
        'change_lead_reports',
        'resource_management',
        'project_management',
        'user_management',
        'system_admin',
        'dashboard',
        'calendar',
        'submission_overview',
        'settings',
        'role_management'
      ],
      resource: {
        id: user.resourceId,
        name: 'Test User',
        role: 'Developer'
      }
    };

    // Test RBAC functions
    const rbacResults = testRBACFunctions(fullUser);

    res.json({
      message: 'RBAC Test Results',
      user: fullUser,
      rbacTests: rbacResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('RBAC test error:', error);
    res.status(500).json({ 
      message: 'RBAC test failed',
      error: error.message 
    });
  }
};
