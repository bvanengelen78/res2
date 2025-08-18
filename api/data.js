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

const mockDepartments = [
  {
    id: 1, name: 'Engineering', description: 'Software development and technical architecture',
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2, name: 'Design', description: 'User experience and visual design',
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 3, name: 'Product', description: 'Product management and strategy',
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 4, name: 'Marketing', description: 'Marketing and business development',
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

const mockOgsmCharters = [
  {
    id: 1, title: 'Q1 2024 Engineering Charter', name: 'Q1 2024 Engineering Charter',
    description: 'Strategic objectives for engineering team in Q1 2024',
    objectives: ['Improve system performance by 30%', 'Reduce technical debt by 25%', 'Implement new CI/CD pipeline'],
    goals: ['Deploy performance monitoring tools', 'Refactor legacy codebase modules', 'Establish automated testing framework'],
    strategies: ['Adopt microservices architecture', 'Implement code review best practices', 'Invest in developer tooling and training'],
    measures: ['Page load time < 2 seconds', 'Code coverage > 80%', 'Deployment frequency: daily'],
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2, title: 'Q1 2024 Product Charter', name: 'Q1 2024 Product Charter',
    description: 'Product development and user experience goals for Q1 2024',
    objectives: ['Increase user engagement by 40%', 'Launch 3 new major features', 'Improve user satisfaction score to 4.5+'],
    goals: ['Implement user analytics dashboard', 'Release mobile app beta version', 'Conduct user research sessions'],
    strategies: ['User-centered design approach', 'Agile development methodology', 'Continuous user feedback integration'],
    measures: ['Daily active users growth', 'Feature adoption rates', 'Net Promoter Score (NPS)'],
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

// Resources handler
async function handleResources(req, res) {
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
}

// Projects handler
async function handleProjects(req, res) {
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
}

// Departments handler
async function handleDepartments(req, res) {
  try {
    const departments = await DatabaseService.getDepartments();
    if (departments.length === 0) {
      console.warn('No departments found in Supabase, falling back to mock data');
      return res.json(mockDepartments);
    }
    res.json(departments);
  } catch (error) {
    console.error('Departments API error:', error);
    res.json(mockDepartments);
  }
}

// OGSM Charters handler
async function handleOgsmCharters(req, res) {
  try {
    const ogsmCharters = await DatabaseService.getOgsmCharters();
    if (ogsmCharters.length === 0) {
      console.warn('No OGSM charters found in Supabase, falling back to mock data');
      return res.json(mockOgsmCharters);
    }
    res.json(ogsmCharters);
  } catch (error) {
    console.error('OGSM Charters API error:', error);
    res.json(mockOgsmCharters);
  }
}

// Main handler with routing
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Route based on pathname
    switch (pathname) {
      case '/api/resources':
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        return await handleResources(req, res);
        
      case '/api/projects':
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        return await handleProjects(req, res);
        
      case '/api/departments':
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        return await handleDepartments(req, res);
        
      case '/api/ogsm-charters':
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        return await handleOgsmCharters(req, res);
        
      default:
        return res.status(404).json({ message: 'Not found' });
    }
  } catch (error) {
    console.error('Data API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
