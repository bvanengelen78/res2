// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

// Removed validation schema for simplicity

// Calculate heatmap data from real Supabase data
const calculateHeatmapData = async (filters = {}) => {
  try {
    // Fetch real data from Supabase
    const [resources, projects, allocations] = await Promise.all([
      DatabaseService.getResources(),
      DatabaseService.getProjects(),
      DatabaseService.getResourceAllocations()
    ]);

    console.log('Calculating heatmap data from real data', {
      resourcesCount: resources.length,
      projectsCount: projects.length,
      allocationsCount: allocations.length
    });

    // Apply department filter to resources if specified
    const filteredResources = filters.department && filters.department !== 'all'
      ? resources.filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === filters.department;
        })
      : resources;

    // Calculate resource utilization heatmap
    const resourceHeatmap = filteredResources.map(resource => {
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const totalHours = resourceAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const utilization = resource.weeklyCapacity > 0 ? (totalHours / resource.weeklyCapacity) * 100 : 0;
      
      // Determine heat level based on utilization
      let heatLevel = 'low';
      if (utilization > 100) heatLevel = 'critical';
      else if (utilization > 85) heatLevel = 'high';
      else if (utilization > 60) heatLevel = 'medium';

      return {
        id: resource.id,
        name: resource.name,
        department: resource.department || resource.role || 'General',
        utilization: Math.round(utilization * 10) / 10,
        capacity: resource.weeklyCapacity,
        allocated: totalHours,
        heatLevel,
        projects: resourceAllocations.length
      };
    });

    // Calculate project heatmap
    const projectHeatmap = projects.map(project => {
      const projectAllocations = allocations.filter(a => a.projectId === project.id);
      const totalHours = projectAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const teamSize = new Set(projectAllocations.map(a => a.resourceId)).size;
      
      // Determine heat level based on team size and hours
      let heatLevel = 'low';
      if (teamSize > 8 || totalHours > 200) heatLevel = 'critical';
      else if (teamSize > 5 || totalHours > 120) heatLevel = 'high';
      else if (teamSize > 2 || totalHours > 60) heatLevel = 'medium';

      return {
        id: project.id,
        name: project.name,
        department: project.department || 'General',
        teamSize,
        totalHours,
        heatLevel,
        status: project.status,
        priority: project.priority
      };
    });

    // Calculate department heatmap
    const departmentMap = new Map();
    filteredResources.forEach(resource => {
      const dept = resource.department || resource.role || 'General';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          name: dept,
          resources: 0,
          totalCapacity: 0,
          totalAllocated: 0,
          projects: new Set()
        });
      }
      
      const deptData = departmentMap.get(dept);
      deptData.resources++;
      deptData.totalCapacity += resource.weeklyCapacity || 40;
      
      const resourceAllocations = allocations.filter(a => a.resourceId === resource.id);
      const resourceHours = resourceAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      deptData.totalAllocated += resourceHours;
      
      resourceAllocations.forEach(a => deptData.projects.add(a.projectId));
    });

    const departmentHeatmap = Array.from(departmentMap.values()).map(dept => {
      const utilization = dept.totalCapacity > 0 ? (dept.totalAllocated / dept.totalCapacity) * 100 : 0;
      
      let heatLevel = 'low';
      if (utilization > 100) heatLevel = 'critical';
      else if (utilization > 85) heatLevel = 'high';
      else if (utilization > 60) heatLevel = 'medium';

      return {
        ...dept,
        projects: dept.projects.size,
        utilization: Math.round(utilization * 10) / 10,
        heatLevel
      };
    });

    const heatmapData = {
      resources: resourceHeatmap,
      projects: projectHeatmap,
      departments: departmentHeatmap,
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: filters.startDate || new Date().toISOString(),
        periodEnd: filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        department: filters.department || 'all',
        view: filters.view || 'resource'
      }
    };

    console.log('Heatmap data calculated successfully', {
      resourcesCount: resourceHeatmap.length,
      projectsCount: projectHeatmap.length,
      departmentsCount: departmentHeatmap.length
    });

    return heatmapData;
  } catch (error) {
    console.error('Failed to calculate heatmap data', error);
    throw error;
  }
};

// Main heatmap handler
const heatmapHandler = async (req, res) => {
  const { startDate, endDate, department, view = 'resource' } = req.query || {};

  console.log('Fetching dashboard heatmap', {
    department,
    view,
    dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'current period'
  });

  try {
    const heatmapData = await calculateHeatmapData({
      startDate,
      endDate,
      department,
      view
    });

    return res.json(heatmapData);
  } catch (error) {
    console.error('Failed to fetch dashboard heatmap', error);
    
    // Return safe fallback data structure
    const fallbackHeatmap = {
      resources: [],
      projects: [],
      departments: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        department: department || 'all',
        view: view || 'resource'
      }
    };

    return res.json(fallbackHeatmap);
  }
};

// Export without middleware
module.exports = heatmapHandler;
