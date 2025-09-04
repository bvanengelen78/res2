// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../../lib/supabase');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[CHANGE_LEAD_EXPORT] Starting export request');

    // Extract change lead ID from URL
    const { changeLeadId } = req.query;
    const parsedChangeLeadId = parseInt(changeLeadId);

    if (!parsedChangeLeadId || isNaN(parsedChangeLeadId)) {
      return res.status(400).json({ error: 'Invalid change lead ID' });
    }

    // Extract request body parameters
    const { startDate, endDate, projectId } = req.body;

    console.log('[CHANGE_LEAD_EXPORT] Request parameters:', {
      changeLeadId: parsedChangeLeadId,
      startDate,
      endDate,
      projectId
    });

    // Fetch effort data using DatabaseService
    const effortData = await DatabaseService.getChangeLeadEffortSummary(
      parsedChangeLeadId,
      startDate,
      endDate
    );

    console.log('[CHANGE_LEAD_EXPORT] Found effort data records:', effortData.length);

    // Generate CSV content for Excel compatibility
    const csvHeaders = [
      "Project ID",
      "Project Name",
      "Project Description",
      "Project Status",
      "Project Priority",
      "Project Start Date",
      "Project End Date",
      "Estimated Hours",
      "Resource Name",
      "Resource Email",
      "Allocated Hours",
      "Allocation Status",
      "Allocation Role",
      "Actual Hours",
      "Deviation"
    ];

    const csvRows = [csvHeaders.join(',')];

    effortData.forEach(item => {
      const row = [
        item.projectId || '',
        `"${(item.projectName || '').replace(/"/g, '""')}"`,
        `"${(item.projectDescription || '').replace(/"/g, '""')}"`,
        item.projectStatus || '',
        item.projectPriority || '',
        item.projectStartDate || '',
        item.projectEndDate || '',
        item.estimatedHours || 0,
        `"${(item.resourceName || '').replace(/"/g, '""')}"`,
        item.resourceEmail || '',
        item.allocatedHours || 0,
        item.allocationStatus || '',
        `"${(item.allocationRole || '').replace(/"/g, '""')}"`,
        item.actualHours || 0,
        (item.actualHours || 0) - (item.allocatedHours || 0)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="change-lead-report-${new Date().toISOString().split('T')[0]}.csv"`);

    console.log('[CHANGE_LEAD_EXPORT] Successfully generated CSV with', csvRows.length - 1, 'data rows');

    return res.send(csvContent);

  } catch (error) {
    console.error('[CHANGE_LEAD_EXPORT] Error:', error);

    return res.status(500).json({
      error: 'Failed to export data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
