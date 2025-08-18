const jwt = require('jsonwebtoken');
const { DatabaseService } = require('./lib/supabase');

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

// Mock data
const mockProjects = [
  {
    id: 1, name: 'Project Alpha', description: 'Frontend redesign project', status: 'active',
    startDate: '2024-01-01', endDate: '2024-06-30', budget: 50000, priority: 'high',
    department: 'Engineering', allocations: []
  },
  {
    id: 2, name: 'Project Beta', description: 'API modernization initiative', status: 'active',
    startDate: '2024-02-15', endDate: '2024-08-15', budget: 75000, priority: 'medium',
    department: 'Engineering', allocations: []
  },
  {
    id: 3, name: 'Project Gamma', description: 'User experience research', status: 'planning',
    startDate: '2024-03-01', endDate: '2024-05-31', budget: 25000, priority: 'low',
    department: 'Design', allocations: []
  }
];

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const projects = await DatabaseService.getProjects();
    if (projects.length === 0) {
      console.warn('No projects found in Supabase, falling back to mock data');
      return res.json(mockProjects);
    }
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.json(mockProjects);
  }
};
