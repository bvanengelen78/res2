// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema
const emailReportSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  reportData: z.object({
    name: z.string(),
    type: z.string(),
    size: z.string(),
    downloadUrl: z.string().optional()
  }),
  includeAttachment: z.boolean().optional().default(false),
  sendCopy: z.boolean().optional().default(false)
});

// Email delivery handler
const emailReportHandler = async (req, res, { user, validatedData }) => {
  const { recipients, subject, body, reportData, includeAttachment, sendCopy } = validatedData;
  
  Logger.info('Processing email delivery request', {
    userId: user.id,
    recipientCount: recipients.length,
    reportName: reportData.name,
    includeAttachment,
    sendCopy
  });

  try {
    // For demo purposes, we'll simulate email sending
    // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
    
    const emailDelivery = {
      id: Date.now(), // Simple ID generation for demo
      recipients,
      subject,
      body,
      reportData,
      includeAttachment,
      sendCopy,
      status: 'sent', // Simulated success
      sentAt: new Date().toISOString(),
      sentBy: user.id
    };

    // Store email delivery record
    const userId = 1; // Default user ID for public access
    const deliveryRecord = await DatabaseService.createEmailDelivery({
      ...emailDelivery,
      userId,
      recipientList: recipients.join(', '),
      reportName: reportData.name,
      reportType: reportData.type
    });

    Logger.info('Email delivery simulated successfully', {
      userId: user.id,
      deliveryId: deliveryRecord.id,
      recipientCount: recipients.length,
      reportName: reportData.name
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return res.json({
      success: true,
      message: `Report "${reportData.name}" has been sent to ${recipients.length} recipient(s)`,
      deliveryId: deliveryRecord.id,
      sentAt: emailDelivery.sentAt,
      recipients: recipients.length,
      status: 'sent'
    });
  } catch (error) {
    Logger.error('Failed to send email report', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to send email report", 
      error: error.message 
    });
  }
};

// Get email delivery history handler
const getEmailHistoryHandler = async (req, res, { user }) => {
  Logger.info('Fetching email delivery history', { userId: user.id });

  try {
    const userId = 1; // Default user ID for public access
    const emailHistory = await DatabaseService.getEmailDeliveryHistory(userId);
    
    Logger.info('Email delivery history fetched successfully', {
      userId: user.id,
      recordCount: emailHistory.length
    });

    return res.json(emailHistory);
  } catch (error) {
    Logger.error('Failed to fetch email delivery history', error, { userId: user.id });
    return res.status(500).json({ 
      message: "Failed to fetch email delivery history", 
      error: error.message 
    });
  }
};

// Main handler that routes based on method and path
const emailHandler = async (req, res, context) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  if (pathname.endsWith('/history')) {
    if (method === 'GET') {
      return getEmailHistoryHandler(req, res, context);
    } else {
      return res.status(405).json({ message: `Method ${method} not allowed for history endpoint` });
    }
  } else {
    if (method === 'POST') {
      return emailReportHandler(req, res, context);
    } else {
      return res.status(405).json({ message: `Method ${method} not allowed` });
    }
  }
};

// Export with middleware
module.exports = withMiddleware(emailHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET', 'POST'],
  validateSchema: null // No validation for this endpoint since it handles multiple methods
});
