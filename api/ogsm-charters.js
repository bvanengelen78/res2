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

// Mock OGSM charters data (matching the structure from local development server)
const mockOgsmCharters = [
  {
    id: 1,
    title: 'Q1 2024 Engineering Charter',
    name: 'Q1 2024 Engineering Charter',
    description: 'Strategic objectives for engineering team in Q1 2024',
    objectives: [
      'Improve system performance by 30%',
      'Reduce technical debt by 25%',
      'Implement new CI/CD pipeline'
    ],
    goals: [
      'Deploy performance monitoring tools',
      'Refactor legacy codebase modules',
      'Establish automated testing framework'
    ],
    strategies: [
      'Adopt microservices architecture',
      'Implement code review best practices',
      'Invest in developer tooling and training'
    ],
    measures: [
      'Page load time < 2 seconds',
      'Code coverage > 80%',
      'Deployment frequency: daily'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    title: 'Q1 2024 Product Charter',
    name: 'Q1 2024 Product Charter',
    description: 'Product development and user experience goals for Q1 2024',
    objectives: [
      'Increase user engagement by 40%',
      'Launch 3 new major features',
      'Improve user satisfaction score to 4.5+'
    ],
    goals: [
      'Implement user analytics dashboard',
      'Release mobile app beta version',
      'Conduct user research sessions'
    ],
    strategies: [
      'User-centered design approach',
      'Agile development methodology',
      'Continuous user feedback integration'
    ],
    measures: [
      'Daily active users growth',
      'Feature adoption rates',
      'Net Promoter Score (NPS)'
    ],
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
    const ogsmCharters = await DatabaseService.getOgsmCharters();

    // If no data from Supabase, fall back to mock data for development
    if (ogsmCharters.length === 0) {
      console.warn('No OGSM charters found in Supabase, falling back to mock data');
      return res.json(mockOgsmCharters);
    }

    res.json(ogsmCharters);
  } catch (error) {
    console.error('OGSM Charters API error:', error);
    // Fall back to mock data on error
    console.warn('Supabase error, falling back to mock data');
    res.json(mockOgsmCharters);
  }
};
