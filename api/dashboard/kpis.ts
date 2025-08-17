import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, requireAuth, type AuthenticatedRequest } from '../_lib/auth';
import { storage } from '../_lib/storage';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = requireAuth(req, res);
    if (!user) return;

    const { department, startDate, endDate } = req.query;

    // Fetch all necessary data
    const [resources, projects, allocations] = await Promise.all([
      storage.getResources(),
      storage.getProjects(),
      storage.getResourceAllocations()
    ]);

    // Apply department filter to resources if specified
    const filteredResources = department && department !== 'all'
      ? resources.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === department;
        })
      : resources;

    // Calculate KPIs
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalProjects = projects.length;
    const availableResources = filteredResources.filter(r => r.status === 'active').length;
    const totalResources = filteredResources.length;

    // Calculate utilization
    const totalCapacity = filteredResources.reduce((sum, r) => sum + (r.weeklyCapacity || 40), 0);
    const totalAllocated = allocations
      .filter(a => filteredResources.some(r => r.id === a.resourceId))
      .reduce((sum, a) => sum + a.hoursPerWeek, 0);
    
    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

    // Calculate budget utilization (simplified)
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
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
