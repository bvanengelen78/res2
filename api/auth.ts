import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helpers
function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

function verifyToken(token: string): any | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Route handlers
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        resource:resources(*)
      `)
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { user: { id: user.id, email: user.email, resourceId: user.resourceId } },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        resource: user.resource,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, password, resourceId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        passwordHash,
        resourceId,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { user: { id: user.id, email: user.email, resourceId: user.resourceId } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get fresh user data
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        *,
        resource:resources(*)
      `)
      .eq('id', user.id)
      .single();

    if (error || !userData) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        resourceId: userData.resourceId,
        resource: userData.resource,
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const userId = decoded.userId;

    // Generate new access token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { user: { id: user.id, email: user.email, resourceId: user.resourceId } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      tokens: {
        accessToken,
        refreshToken, // Keep the same refresh token
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: "Token refresh failed" });
  }
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  try {
    // In a real implementation, you might invalidate the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  const path = pathname.replace('/api/auth', '');
  const route = `${req.method}:${path}`;

  try {
    switch (route) {
      case 'POST:/login':
        return await handleLogin(req, res);
      case 'POST:/register':
        return await handleRegister(req, res);
      case 'GET:/me':
        return await handleMe(req, res);
      case 'POST:/refresh':
        return await handleRefresh(req, res);
      case 'POST:/logout':
        return await handleLogout(req, res);
      default:
        return res.status(404).json({ message: 'Not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
