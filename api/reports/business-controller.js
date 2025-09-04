// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Removed dependencies for simplicity

// Removed validation schema for simplicity

// Business Controller Report handler
const businessControllerReportHandler = async (req, res) => {
  const { startDate, endDate, showOnlyActive = false } = req.body || {};

  console.log('Generating business controller report', {
    startDate,
    endDate,
    showOnlyActive
  });

  try {
    // Mock report data for demo
    const reportData = {
      reportId: `BC-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      summary: {
        totalProjects: 3,
        activeProjects: 3,
        totalResources: 29,
        totalAllocatedHours: 1250,
        averageUtilization: 78.5
      },
      projects: [
        {
          id: 1,
          name: "RoutiGO Transport System",
          status: "active",
          allocatedHours: 450,
          utilization: 85.2,
          resources: 8
        },
        {
          id: 2,
          name: "UX Redesign & Accessibility",
          status: "active",
          allocatedHours: 520,
          utilization: 92.1,
          resources: 12
        },
        {
          id: 3,
          name: "Test Project",
          status: "active",
          allocatedHours: 280,
          utilization: 65.3,
          resources: 9
        }
      ],
      resourceUtilization: [
        { department: "IT Architecture & Delivery", utilization: 89.2, resources: 15 },
        { department: "Supply Chain", utilization: 72.1, resources: 5 },
        { department: "Business Operations", utilization: 68.5, resources: 4 },
        { department: "Retail Support", utilization: 45.2, resources: 3 },
        { department: "Human Resources", utilization: 35.0, resources: 1 },
        { department: "General", utilization: 25.0, resources: 1 }
      ]
    };

    console.log('Business controller report generated successfully', {
      totalProjects: reportData.summary.totalProjects,
      totalResources: reportData.summary.totalResources,
      totalHours: reportData.summary.totalAllocatedHours
    });

    return res.json(reportData);
  } catch (error) {
    console.error('Failed to generate business controller report', error);
    return res.status(500).json({
      message: "Failed to generate business controller report",
      error: error.message
    });
  }
};

// Export without middleware
module.exports = businessControllerReportHandler;
