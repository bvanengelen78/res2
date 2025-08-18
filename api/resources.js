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
const mockResources = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Frontend Developer',
    jobRole: 'Senior Developer',
    department: 'Engineering',
    weeklyCapacity: 40,
    status: 'active',
    skills: ['React', 'TypeScript', 'CSS'],
    allocations: []
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'Backend Developer',
    jobRole: 'Senior Developer',
    department: 'Engineering',
    weeklyCapacity: 40,
    status: 'active',
    skills: ['Node.js', 'PostgreSQL', 'API Design'],
    allocations: []
  },
  {
    id: 3,
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    role: 'UI/UX Designer',
    jobRole: 'Designer',
    department: 'Design',
    weeklyCapacity: 40,
    status: 'active',
    skills: ['Figma', 'User Research', 'Prototyping'],
    allocations: []
  }
];

const mockAllocations = [
  {
    id: 1,
    resourceId: 1,
    projectId: 1,
    hoursPerWeek: 20,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    status: 'active'
  },
  {
    id: 2,
    resourceId: 2,
    projectId: 2,
    hoursPerWeek: 15,
    startDate: '2024-02-15',
    endDate: '2024-08-15',
    status: 'active'
  }
];

// Resources handlers
async function handleGetResources(req, res) {
  try {
    res.json(mockResources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
}

async function handleGetResource(req, res, id) {
  try {
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = mockResources.find(r => r.id === resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Add allocations to the resource
    const resourceAllocations = mockAllocations.filter(a => a.resourceId === resourceId);
    const resourceWithAllocations = {
      ...resource,
      allocations: resourceAllocations
    };

    res.json(resourceWithAllocations);
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({ message: 'Failed to fetch resource' });
  }
}

async function handleCreateResource(req, res) {
  try {
    const newResource = {
      id: mockResources.length + 1,
      ...req.body,
      status: 'active',
      allocations: []
    };
    
    mockResources.push(newResource);
    res.status(201).json(newResource);
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ message: 'Failed to create resource' });
  }
}

// Allocations handlers
async function handleGetAllocations(req, res) {
  try {
    const allocationsWithDetails = mockAllocations.map(allocation => {
      const resource = mockResources.find(r => r.id === allocation.resourceId);
      return {
        ...allocation,
        resource: resource || null,
        project: {
          id: allocation.projectId,
          name: `Project ${allocation.projectId}`,
          status: 'active'
        }
      };
    });

    res.json(allocationsWithDetails);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
}

async function handleCreateAllocation(req, res) {
  try {
    const newAllocation = {
      id: mockAllocations.length + 1,
      ...req.body,
      status: 'active'
    };
    
    mockAllocations.push(newAllocation);
    
    const resource = mockResources.find(r => r.id === newAllocation.resourceId);
    const allocationWithDetails = {
      ...newAllocation,
      resource: resource || null,
      project: {
        id: newAllocation.projectId,
        name: `Project ${newAllocation.projectId}`,
        status: 'active'
      }
    };

    res.status(201).json(allocationWithDetails);
  } catch (error) {
    console.error('Create allocation error:', error);
    res.status(500).json({ message: 'Failed to create allocation' });
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
    // Handle /api/resources routes
    if (pathParts[1] === 'resources') {
      const resourceId = pathParts[2];
      
      if (!resourceId) {
        // /api/resources
        switch (req.method) {
          case 'GET':
            return await handleGetResources(req, res);
          case 'POST':
            return await handleCreateResource(req, res);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      } else {
        // /api/resources/:id
        switch (req.method) {
          case 'GET':
            return await handleGetResource(req, res, resourceId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    // Handle /api/allocations routes
    if (pathParts[1] === 'allocations') {
      switch (req.method) {
        case 'GET':
          return await handleGetAllocations(req, res);
        case 'POST':
          return await handleCreateAllocation(req, res);
        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Resources API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
