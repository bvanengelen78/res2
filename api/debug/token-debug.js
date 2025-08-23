// Token Debug Endpoint - Shows what token is being received
// GET /api/debug/token-debug

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[TOKEN-DEBUG] Request headers:', req.headers);

    const authHeader = req.headers.authorization;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader || null,
      authHeaderLength: authHeader ? authHeader.length : 0,
      startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
      tokenLength: authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).length : 0,
      tokenPreview: authHeader && authHeader.startsWith('Bearer ') ? 
        authHeader.substring(7, 27) + '...' : null,
      allHeaders: Object.keys(req.headers),
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer
    };

    console.log('[TOKEN-DEBUG] Debug info:', debugInfo);

    // If we have a token, try to decode it (without verification) to see its structure
    let tokenInfo = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Decode JWT without verification to see its structure
        const parts = token.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          tokenInfo = {
            header,
            payload: {
              iss: payload.iss,
              sub: payload.sub,
              aud: payload.aud,
              exp: payload.exp,
              iat: payload.iat,
              email: payload.email,
              role: payload.role,
              // Don't expose sensitive data
              hasOtherClaims: Object.keys(payload).length > 6
            },
            isExpired: payload.exp ? Date.now() / 1000 > payload.exp : false,
            expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
          };
        }
      } catch (decodeError) {
        tokenInfo = {
          error: 'Failed to decode token',
          message: decodeError.message
        };
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Token debug information',
      debug: debugInfo,
      tokenInfo
    });

  } catch (error) {
    console.error('[TOKEN-DEBUG] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      message: 'Token debug failed'
    });
  }
};
