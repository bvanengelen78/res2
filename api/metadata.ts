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

// Departments handlers
async function handleGetDepartments(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
}

async function handleCreateDepartment(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: department, error } = await supabase
      .from('departments')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
}

// OGSM Charters handlers
async function handleGetOgsmCharters(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: charters, error } = await supabase
      .from('ogsm_charters')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(charters);
  } catch (error) {
    console.error('Get OGSM charters error:', error);
    res.status(500).json({ message: 'Failed to fetch OGSM charters' });
  }
}

async function handleCreateOgsmCharter(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: charter, error } = await supabase
      .from('ogsm_charters')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(charter);
  } catch (error) {
    console.error('Create OGSM charter error:', error);
    res.status(500).json({ message: 'Failed to create OGSM charter' });
  }
}

// Skills handlers
async function handleGetSkills(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(skills);
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
}

async function handleCreateSkill(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: skill, error } = await supabase
      .from('skills')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(skill);
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ message: 'Failed to create skill' });
  }
}

// Roles handlers
async function handleGetRoles(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
}

async function handleCreateRole(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: role, error } = await supabase
      .from('roles')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ message: 'Failed to create role' });
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
    // Handle /api/departments routes
    if (pathParts[1] === 'departments') {
      switch (req.method) {
        case 'GET':
          return await handleGetDepartments(req, res);
        case 'POST':
          return await handleCreateDepartment(req, res);
        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    // Handle /api/ogsm-charters routes
    if (pathParts[1] === 'ogsm-charters') {
      switch (req.method) {
        case 'GET':
          return await handleGetOgsmCharters(req, res);
        case 'POST':
          return await handleCreateOgsmCharter(req, res);
        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    // Handle /api/skills routes
    if (pathParts[1] === 'skills') {
      switch (req.method) {
        case 'GET':
          return await handleGetSkills(req, res);
        case 'POST':
          return await handleCreateSkill(req, res);
        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    // Handle /api/roles routes
    if (pathParts[1] === 'roles') {
      switch (req.method) {
        case 'GET':
          return await handleGetRoles(req, res);
        case 'POST':
          return await handleCreateRole(req, res);
        default:
          return res.status(405).json({ message: 'Method not allowed' });
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Metadata API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
