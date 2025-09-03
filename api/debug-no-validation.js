// Test endpoint with middleware but no validation schema

const { withMiddleware, Logger } = require('./lib/middleware');

// Handler without validation
const noValidationHandler = async (req, res, { user, validatedData }) => {
  Logger.info('No validation handler called', {
    userId: user.id,
    method: req.method,
    url: req.url,
    query: req.query
  });

  return res.json({
    success: true,
    message: 'Middleware works without validation',
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    query: req.query,
    timestamp: new Date().toISOString()
  });
};

// Export with middleware - NO validation schema
module.exports = withMiddleware(noValidationHandler, {
  requireAuth: false, // Demo mode
  allowedMethods: ['GET']
  // No validateSchema - this might be the issue
});
