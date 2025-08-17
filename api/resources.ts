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

// Resources handlers
async function handleGetResources(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Failed to fetch resources' });
  }
}

async function handleGetResource(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const { data: resource, error } = await supabase
      .from('resources')
      .select(`
        *,
        allocations:resource_allocations(
          *,
          project:projects(*)
        )
      `)
      .eq('id', resourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Resource not found' });
      }
      throw error;
    }

    res.json(resource);
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({ message: 'Failed to fetch resource' });
  }
}

async function handleCreateResource(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: resource, error } = await supabase
      .from('resources')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(resource);
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ message: 'Failed to create resource' });
  }
}

async function handleUpdateResource(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const { data: resource, error } = await supabase
      .from('resources')
      .update(req.body)
      .eq('id', resourceId)
      .select()
      .single();

    if (error) throw error;
    res.json(resource);
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ message: 'Failed to update resource' });
  }
}

async function handleDeleteResource(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (error) throw error;
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ message: 'Failed to delete resource' });
  }
}

// Allocations handlers
async function handleGetAllocations(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: allocations, error } = await supabase
      .from('resource_allocations')
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(allocations);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
}

async function handleCreateAllocation(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .insert(req.body)
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Create allocation error:', error);
    res.status(500).json({ message: 'Failed to create allocation' });
  }
}

async function handleUpdateAllocation(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const allocationId = parseInt(id);
    if (isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }

    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .update(req.body)
      .eq('id', allocationId)
      .select(`
        *,
        resource:resources(*),
        project:projects(*)
      `)
      .single();

    if (error) throw error;
    res.json(allocation);
  } catch (error) {
    console.error('Update allocation error:', error);
    res.status(500).json({ message: 'Failed to update allocation' });
  }
}

async function handleDeleteAllocation(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    const allocationId = parseInt(id);
    if (isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation ID' });
    }

    const { error } = await supabase
      .from('resource_allocations')
      .delete()
      .eq('id', allocationId);

    if (error) throw error;
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Delete allocation error:', error);
    res.status(500).json({ message: 'Failed to delete allocation' });
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
          case 'PUT':
            return await handleUpdateResource(req, res, resourceId);
          case 'DELETE':
            return await handleDeleteResource(req, res, resourceId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    // Handle /api/allocations routes
    if (pathParts[1] === 'allocations') {
      const allocationId = pathParts[2];
      
      if (!allocationId) {
        // /api/allocations
        switch (req.method) {
          case 'GET':
            return await handleGetAllocations(req, res);
          case 'POST':
            return await handleCreateAllocation(req, res);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      } else {
        // /api/allocations/:id
        switch (req.method) {
          case 'PUT':
            return await handleUpdateAllocation(req, res, allocationId);
          case 'DELETE':
            return await handleDeleteAllocation(req, res, allocationId);
          default:
            return res.status(405).json({ message: 'Method not allowed' });
        }
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Resources API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
