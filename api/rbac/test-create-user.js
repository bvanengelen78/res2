// Minimal test endpoint for user creation debugging
// POST /api/rbac/test-create-user

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Test create user endpoint called');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Test environment variables
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV
    };

    console.log('Environment check:', envCheck);

    // Test basic imports
    try {
      const { createClient } = require('@supabase/supabase-js');
      console.log('✅ Supabase import successful');
      
      const bcrypt = require('bcrypt');
      console.log('✅ bcrypt import successful');
      
      const { z } = require('zod');
      console.log('✅ zod import successful');
      
      const crypto = require('crypto');
      console.log('✅ crypto import successful');
      
    } catch (importError) {
      console.error('❌ Import error:', importError);
      return res.status(500).json({
        error: 'Import error',
        message: importError.message,
        stack: importError.stack
      });
    }

    // Test Supabase connection
    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase environment variables');
      }

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Test a simple query
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      console.log('✅ Supabase connection successful');

    } catch (supabaseError) {
      console.error('❌ Supabase error:', supabaseError);
      return res.status(500).json({
        error: 'Supabase connection error',
        message: supabaseError.message,
        stack: supabaseError.stack
      });
    }

    // Test middleware import
    try {
      const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
      console.log('✅ Middleware import successful');
    } catch (middlewareError) {
      console.error('❌ Middleware error:', middlewareError);
      return res.status(500).json({
        error: 'Middleware import error',
        message: middlewareError.message,
        stack: middlewareError.stack
      });
    }

    // Test DatabaseService import
    try {
      const { DatabaseService } = require('../lib/supabase');
      console.log('✅ DatabaseService import successful');
    } catch (dbError) {
      console.error('❌ DatabaseService error:', dbError);
      return res.status(500).json({
        error: 'DatabaseService import error',
        message: dbError.message,
        stack: dbError.stack
      });
    }

    // If we get here, all basic tests passed
    return res.status(200).json({
      success: true,
      message: 'All basic tests passed',
      environment: envCheck,
      timestamp: new Date().toISOString(),
      method: req.method,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
