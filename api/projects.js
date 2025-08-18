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

// Mock data
const mockProjects = [
  {
    id: 1,
    name: 'Project Alpha',
    description: 'Frontend redesign project',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 50000,
    priority: 'high',
    department: 'Engineering',
    allocations: []
  },
  {
    id: 2,
    name: 'Project Beta',
    description: 'API modernization initiative',
    status: 'active',
    startDate: '2024-02-15',
    endDate: '2024-08-15',
    budget: 75000,
    priority: 'medium',
    department: 'Engineering',
    allocations: []
  },
  {
    id: 3,
    name: 'Project Gamma',
    description: 'User experience research',
    status: 'planning',
    startDate: '2024-03-01',
    endDate: '2024-05-31',
    budget: 25000,
    priority: 'low',
    department: 'Design',
    allocations: []
  }
];

// Project handlers
async function handleGetProjects(req, res) {
  try {
    res.json(mockProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
}

async function handleGetProject(req, res, id) {
  try {
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const project = mockProjects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Add mock allocations and time entries
    const projectWithDetails = {
      ...project,
      allocations: [
        {
          id: 1,
          resourceId: 1,
          hoursPerWeek: 20,
          startDate: project.startDate,
          endDate: project.endDate,
          resource: {
            id: 1,
            name: 'John Doe',
            role: 'Frontend Developer'
          }
        }
      ],
      time_entries: [
        {
          id: 1,
          resourceId: 1,
          weekStartDate: '2024-01-01',
          mondayHours: '8.00',
          tuesdayHours: '8.00',
          wednesdayHours: '4.00',
          thursdayHours: '0.00',
          fridayHours: '0.00',
          resource: {
            id: 1,
            name: 'John Doe'
          }
        }
      ]
    };

    res.json(projectWithDetails);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
}

async function handleCreateProject(req, res) {
  try {
    const newProject = {
      id: mockProjects.length + 1,
      ...req.body,
      status: req.body.status || 'planning',
      allocations: []
    };
    
    mockProjects.push(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
}

async function handleUpdateProject(req, res, id) {
  try {
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      ...req.body,
      id: projectId // Ensure ID doesn't change
    };

    res.json(mockProjects[projectIndex]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
}

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
  const pathParts = pathname.split('/').filter(Boolean);
  
  try {
    // Handle /api/projects routes
    if (pathParts[1] === 'projects') {
      const projectId = pathParts[2];
      
      if (!projectId) {
        // /api/projects
        switch (req.method) {
          case 'GET':
            return await handleGetProjects(req, res);
          case 'POST':
            return await handleCreateProject(req, res);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      } else {
        // /api/projects/:id
        switch (req.method) {
          case 'GET':
            return await handleGetProject(req, res, projectId);
          case 'PUT':
            return await handleUpdateProject(req, res, projectId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
