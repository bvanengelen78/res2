// Simple test endpoint for reports
module.exports = async (req, res) => {
  res.json({
    status: 'success',
    message: 'Reports test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });
};
