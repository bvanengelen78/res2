// Simple test endpoint to verify deployment
module.exports = async (req, res) => {
  res.json({
    status: 'success',
    message: 'Deployment test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
