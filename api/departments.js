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

// Mock departments data (matching the structure from local development server)
const mockDepartments = [
  {
    id: 1,
    name: 'Engineering',
    description: 'Software development and technical architecture',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Design',
    description: 'User experience and visual design',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'Product',
    description: 'Product management and strategy',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 4,
    name: 'Marketing',
    description: 'Marketing and business development',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
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
    // Use real Supabase data instead of mock data
    const departments = await DatabaseService.getDepartments();

    // If no data from Supabase, fall back to mock data for development
    if (departments.length === 0) {
      console.warn('No departments found in Supabase, falling back to mock data');
      return res.json(mockDepartments);
    }

    res.json(departments);
  } catch (error) {
    console.error('Departments API error:', error);
    // Fall back to mock data on error
    console.warn('Supabase error, falling back to mock data');
    res.json(mockDepartments);
  }
};
