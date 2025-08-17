import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
function verifyToken(req: VercelRequest): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Project handlers
async function handleGetProjects(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        allocations:resource_allocations(
          *,
          resource:resources(*)
        )
      `)
      .order('name');

    if (error) throw error;
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
}

async function handleGetProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        allocations:resource_allocations(
          *,
          resource:resources(*)
        ),
        time_entries:time_entries(
          *,
          resource:resources(*)
        )
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Project not found' });
      }
      throw error;
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
}

async function handleCreateProject(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
}

async function handleUpdateProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(req.body)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
}

async function handleDeleteProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
}

// Project allocations handlers
async function handleGetProjectAllocations(req: VercelRequest, res: VercelResponse, projectId: string) {
  try {
    const id = parseInt(projectId);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { data: allocations, error } = await supabase
      .from('resource_allocations')
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .eq('projectId', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(allocations);
  } catch (error) {
    console.error('Get project allocations error:', error);
    res.status(500).json({ message: 'Failed to fetch project allocations' });
  }
}

async function handleCreateProjectAllocation(req: VercelRequest, res: VercelResponse, projectId: string) {
  try {
    const id = parseInt(projectId);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const allocationData = { ...req.body, projectId: id };
    
    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .insert(allocationData)
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Create project allocation error:', error);
    res.status(500).json({ message: 'Failed to create project allocation' });
  }
}

// Project effort report handler
async function handleGetProjectEffortReport(req: VercelRequest, res: VercelResponse, projectId: string) {
  try {
    const id = parseInt(projectId);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Get time entries for the project
    const { data: timeEntries, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        resource:resources(*)
      `)
      .eq('projectId', id)
      .order('weekStartDate', { ascending: false });

    if (error) throw error;

    // Calculate effort summary
    const effortSummary = timeEntries.reduce((acc, entry) => {
      const totalHours = 
        parseFloat(entry.mondayHours || '0') +
        parseFloat(entry.tuesdayHours || '0') +
        parseFloat(entry.wednesdayHours || '0') +
        parseFloat(entry.thursdayHours || '0') +
        parseFloat(entry.fridayHours || '0') +
        parseFloat(entry.saturdayHours || '0') +
        parseFloat(entry.sundayHours || '0');

      acc.totalHours += totalHours;
      acc.entries.push({
        ...entry,
        totalHours
      });

      return acc;
    }, { totalHours: 0, entries: [] });

    res.json(effortSummary);
  } catch (error) {
    console.error('Get project effort report error:', error);
    res.status(500).json({ message: 'Failed to fetch project effort report' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  const pathParts = pathname.split('/').filter(Boolean);
  
  try {
    // Handle /api/projects routes
    if (pathParts[1] === 'projects') {
      const projectId = pathParts[2];
      const subPath = pathParts[3];
      
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
      } else if (subPath === 'allocations') {
        // /api/projects/:id/allocations
        switch (req.method) {
          case 'GET':
            return await handleGetProjectAllocations(req, res, projectId);
          case 'POST':
            return await handleCreateProjectAllocation(req, res, projectId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      } else if (subPath === 'effort-report') {
        // /api/projects/:id/effort-report
        if (req.method === 'GET') {
          return await handleGetProjectEffortReport(req, res, projectId);
        } else {
          return res.status(405).json({ message: 'Method not allowed' });
        }
      } else {
        // /api/projects/:id
        switch (req.method) {
          case 'GET':
            return await handleGetProject(req, res, projectId);
          case 'PUT':
            return await handleUpdateProject(req, res, projectId);
          case 'DELETE':
            return await handleDeleteProject(req, res, projectId);
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
}
