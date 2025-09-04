// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

// GET handler for fetching recent reports
const getRecentReportsHandler = async (req, res) => {
  console.log('Fetching recent reports');

  try {
    const userId = 1; // Default user ID for public access
    const recentReports = await DatabaseService.getRecentReports(userId);

    console.log('Recent reports fetched successfully', {
      reportCount: recentReports.length
    });

    return res.json(recentReports);
  } catch (error) {
    console.error('Failed to fetch recent reports', error);
    return res.status(500).json({
      message: "Failed to fetch recent reports",
      error: error.message
    });
  }
};

// POST handler for creating recent reports
const createRecentReportHandler = async (req, res) => {
  const { name, type, size, criteria } = req.body;

  console.log('Creating recent report', {
    name,
    type,
    size
  });

  try {
    const userId = 1; // Default user ID for public access
    const reportData = {
      name,
      type,
      size: size || 'Unknown',
      criteria: criteria || {},
      userId,
      createdAt: new Date().toISOString()
    };

    const newReport = await DatabaseService.createRecentReport(reportData);

    console.log('Recent report created successfully', {
      reportId: newReport.id,
      name
    });

    return res.json(newReport);
  } catch (error) {
    console.error('Failed to create recent report', error);
    return res.status(500).json({
      message: "Failed to create recent report",
      error: error.message
    });
  }
};

// DELETE handler for removing specific recent report
const deleteRecentReportHandler = async (req, res) => {
  const reportId = parseInt(req.query.id);

  if (!reportId || isNaN(reportId)) {
    return res.status(400).json({ message: "Invalid report ID" });
  }

  console.log('Deleting recent report', {
    reportId
  });

  try {
    const userId = 1; // Default user ID for public access
    await DatabaseService.deleteRecentReport(reportId, userId);

    console.log('Recent report deleted successfully', {
      reportId
    });

    return res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error('Failed to delete recent report', error);
    return res.status(500).json({
      message: "Failed to delete recent report",
      error: error.message
    });
  }
};

// DELETE handler for clearing all recent reports
const clearRecentReportsHandler = async (req, res) => {
  console.log('Clearing all recent reports');

  try {
    const userId = 1; // Default user ID for public access
    await DatabaseService.clearRecentReports(userId);

    console.log('All recent reports cleared successfully');

    return res.json({ message: "All reports cleared successfully" });
  } catch (error) {
    console.error('Failed to clear recent reports', error);
    return res.status(500).json({
      message: "Failed to clear recent reports",
      error: error.message
    });
  }
};

// Main handler that routes based on method
const recentReportsHandler = async (req, res) => {
  const method = req.method;

  switch (method) {
    case 'GET':
      if (req.query.id) {
        return deleteRecentReportHandler(req, res);
      }
      return getRecentReportsHandler(req, res);

    case 'POST':
      return createRecentReportHandler(req, res);

    case 'DELETE':
      if (req.query.id) {
        return deleteRecentReportHandler(req, res);
      }
      return clearRecentReportsHandler(req, res);

    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export without middleware for simplicity
module.exports = recentReportsHandler;
