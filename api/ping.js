module.exports = (req, res) => {
  res.json({ message: 'pong', timestamp: Date.now() });
};
