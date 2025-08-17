import { config } from "dotenv";
import express from "express";
import { registerRoutes } from "../server/routes.js";

// Load environment variables
config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Register API routes
let routesRegistered = false;

const initializeRoutes = async () => {
  if (!routesRegistered) {
    try {
      await registerRoutes(app);
      routesRegistered = true;
      console.log('API routes registered successfully');
    } catch (error) {
      console.error('Failed to register routes:', error);
      throw error;
    }
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serverless function handler
export default async function handler(req, res) {
  try {
    // Initialize routes on first request
    await initializeRoutes();
    
    // Handle the request with Express
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
