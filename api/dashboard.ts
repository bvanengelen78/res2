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

// Dashboard KPIs handler
async function handleGetKPIs(req: VercelRequest, res: VercelResponse) {
  try {
    const { department, startDate, endDate } = req.query;

    // Fetch all necessary data
    const [
      { data: resources },
      { data: projects },
      { data: allocations }
    ] = await Promise.all([
      supabase.from('resources').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('resource_allocations').select('*')
    ]);

    // Apply department filter to resources if specified
    const filteredResources = department && department !== 'all'
      ? resources?.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === department;
        }) || []
      : resources || [];

    // Calculate KPIs
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
    const totalProjects = projects?.length || 0;
    const availableResources = filteredResources.filter(r => r.status === 'active').length;
    const totalResources = filteredResources.length;

    // Calculate utilization
    const totalCapacity = filteredResources.reduce((sum, r) => sum + (r.weeklyCapacity || 40), 0);
    const totalAllocated = allocations
      ?.filter(a => filteredResources.some(r => r.id === a.resourceId))
      .reduce((sum, a) => sum + a.hoursPerWeek, 0) || 0;
    
    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Calculate budget utilization (simplified)
    const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
    const budgetUtilization = totalBudget > 0 ? 75 : 0; // Placeholder calculation

    res.json({
      activeProjects,
      totalProjects,
      availableResources,
      totalResources,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
      trends: {
        projectsTrend: 5.2,
        resourcesTrend: 2.1,
        utilizationTrend: -1.3,
        budgetTrend: 8.7
      }
    });
  } catch (error) {
    console.error('Dashboard KPIs error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard KPIs' });
  }
}

// Dashboard alerts handler
async function handleGetAlerts(req: VercelRequest, res: VercelResponse) {
  try {
    const { department, startDate, endDate } = req.query;

    // Fetch all necessary data
    const [
      { data: resources },
      { data: allocations }
    ] = await Promise.all([
      supabase.from('resources').select('*'),
      supabase.from('resource_allocations').select('*')
    ]);

    // Apply department filter if specified
    let filteredResources = resources || [];
    if (department && department !== 'all') {
      filteredResources = resources?.filter(r => {
        const resourceDepartment = r.department || r.role || 'General';
        return resourceDepartment === department;
      }) || [];
    }

    // Calculate capacity alerts
    const alerts = [];
    const currentDate = new Date();
    
    for (const resource of filteredResources) {
      const resourceAllocations = allocations?.filter(a => a.resourceId === resource.id) || [];
      const totalAllocated = resourceAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const capacity = resource.weeklyCapacity || 40;
      const utilization = (totalAllocated / capacity) * 100;

      if (utilization > 100) {
        alerts.push({
          id: `overallocation-${resource.id}`,
          type: 'overallocation',
          severity: utilization > 120 ? 'critical' : 'high',
          resourceId: resource.id,
          resourceName: resource.name,
          message: `${resource.name} is overallocated at ${utilization.toFixed(1)}%`,
          utilization: utilization,
          capacity: capacity,
          allocated: totalAllocated,
          createdAt: currentDate.toISOString()
        });
      } else if (utilization > 90) {
        alerts.push({
          id: `nearoverallocation-${resource.id}`,
          type: 'near_overallocation',
          severity: 'medium',
          resourceId: resource.id,
          resourceName: resource.name,
          message: `${resource.name} is near capacity at ${utilization.toFixed(1)}%`,
          utilization: utilization,
          capacity: capacity,
          allocated: totalAllocated,
          createdAt: currentDate.toISOString()
        });
      }
    }

    // Calculate summary
    const summary = {
      totalAlerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    res.json({
      alerts,
      summary,
      lastUpdated: currentDate.toISOString()
    });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard alerts' });
  }
}

// Dashboard timeline handler
async function handleGetTimeline(req: VercelRequest, res: VercelResponse) {
  try {
    const { department, startDate: filterStartDate, endDate: filterEndDate } = req.query;

    const [
      { data: projects },
      { data: allocations },
      { data: resources }
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('resource_allocations').select('*'),
      supabase.from('resources').select('*')
    ]);

    // Apply department filter if specified
    let filteredAllocations = allocations || [];
    if (department && department !== 'all') {
      const filteredResourceIds = resources
        ?.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === department;
        })
        .map(r => r.id) || [];

      filteredAllocations = allocations?.filter(a => filteredResourceIds.includes(a.resourceId)) || [];
    }

    // Build timeline data
    const timelineData = projects?.map(project => {
      const projectAllocations = filteredAllocations.filter(a => a.projectId === project.id);
      const totalAllocated = projectAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      
      return {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        allocatedHours: totalAllocated,
        allocations: projectAllocations.map(a => {
          const resource = resources?.find(r => r.id === a.resourceId);
          return {
            ...a,
            resourceName: resource?.name || 'Unknown'
          };
        })
      };
    }) || [];

    res.json(timelineData);
  } catch (error) {
    console.error('Dashboard timeline error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard timeline' });
  }
}

// Dashboard heatmap handler
async function handleGetHeatmap(req: VercelRequest, res: VercelResponse) {
  try {
    const { department, startDate, endDate } = req.query;

    const [
      { data: resources },
      { data: allocations }
    ] = await Promise.all([
      supabase.from('resources').select('*'),
      supabase.from('resource_allocations').select('*')
    ]);

    // Apply department filter if specified
    let filteredResources = resources || [];
    if (department && department !== 'all') {
      filteredResources = resources?.filter(r => {
        const resourceDepartment = r.department || r.role || 'General';
        return resourceDepartment === department;
      }) || [];
    }

    // Group by role and calculate utilization
    const roleGroups = filteredResources.reduce((acc, resource) => {
      const role = resource.jobRole || resource.role || 'General';
      if (!acc[role]) {
        acc[role] = {
          role,
          resources: [],
          totalCapacity: 0,
          totalAllocated: 0
        };
      }

      const resourceAllocations = allocations?.filter(a => a.resourceId === resource.id) || [];
      const allocated = resourceAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const capacity = resource.weeklyCapacity || 40;

      acc[role].resources.push({
        ...resource,
        allocated,
        utilization: capacity > 0 ? (allocated / capacity) * 100 : 0
      });
      acc[role].totalCapacity += capacity;
      acc[role].totalAllocated += allocated;

      return acc;
    }, {} as any);

    // Calculate role-level utilization
    const heatmapData = Object.values(roleGroups).map((group: any) => ({
      ...group,
      utilization: group.totalCapacity > 0 ? (group.totalAllocated / group.totalCapacity) * 100 : 0
    }));

    res.json(heatmapData);
  } catch (error) {
    console.error('Dashboard heatmap error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard heatmap' });
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
    // Handle /api/dashboard routes
    if (pathParts[1] === 'dashboard') {
      const endpoint = pathParts[2];
      
      if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
      }
      
      switch (endpoint) {
        case 'kpis':
          return await handleGetKPIs(req, res);
        case 'alerts':
          return await handleGetAlerts(req, res);
        case 'timeline':
          return await handleGetTimeline(req, res);
        case 'heatmap':
          return await handleGetHeatmap(req, res);
        default:
          return res.status(404).json({ message: 'Dashboard endpoint not found' });
      }
    }
    
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
