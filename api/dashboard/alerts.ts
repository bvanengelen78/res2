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
    const [resources, allocations, alertSettings] = await Promise.all([
      storage.getResources(),
      storage.getResourceAllocations(),
      storage.getAlertSettings('capacity')
    ]);

    // Apply department filter if specified
    let filteredResources = resources;
    if (department && department !== 'all') {
      filteredResources = resources.filter(r => {
        const resourceDepartment = r.department || r.role || 'General';
        return resourceDepartment === department;
      });
    }

    // Calculate capacity alerts
    const alerts = [];
    const currentDate = new Date();
    
    for (const resource of filteredResources) {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
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
