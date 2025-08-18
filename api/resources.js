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
const mockResources = [
  {
    id: 1, name: 'John Doe', email: 'john.doe@company.com', role: 'Frontend Developer',
    jobRole: 'Senior Developer', department: 'Engineering', weeklyCapacity: 40,
    status: 'active', skills: ['React', 'TypeScript', 'CSS'], allocations: []
  },
  {
    id: 2, name: 'Jane Smith', email: 'jane.smith@company.com', role: 'Backend Developer',
    jobRole: 'Senior Developer', department: 'Engineering', weeklyCapacity: 40,
    status: 'active', skills: ['Node.js', 'PostgreSQL', 'API Design'], allocations: []
  },
  {
    id: 3, name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'UI/UX Designer',
    jobRole: 'Designer', department: 'Design', weeklyCapacity: 40,
    status: 'active', skills: ['Figma', 'User Research', 'Prototyping'], allocations: []
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
    const resources = await DatabaseService.getResources();
    if (resources.length === 0) {
      console.warn('No resources found in Supabase, falling back to mock data');
      return res.json(mockResources);
    }
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.json(mockResources);
  }
};
