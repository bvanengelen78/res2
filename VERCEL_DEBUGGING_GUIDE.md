# Vercel Production Debugging Guide

## Overview
This guide provides step-by-step instructions for debugging user creation issues in the Vercel production environment.

## Debug Endpoints

### 1. Environment Variables Check
**URL:** `https://your-vercel-domain.vercel.app/api/debug/env-check`
**Method:** GET
**Purpose:** Verify that all required environment variables are properly configured

**Expected Response:**
```json
{
  "status": "success",
  "environment": {
    "NODE_ENV": "production",
    "hasSupabaseUrl": true,
    "hasSupabaseServiceKey": true,
    "hasSupabaseAnonKey": true,
    "supabaseUrlLength": 54,
    "serviceKeyLength": 184
  },
  "supabaseTest": {
    "connectionSuccess": true,
    "error": null,
    "hasData": true
  }
}
```

### 2. Database Connectivity Test
**URL:** `https://your-vercel-domain.vercel.app/api/debug/db-test`
**Method:** GET
**Purpose:** Test database connectivity and table access

**Expected Response:**
```json
{
  "status": "success",
  "testResults": {
    "departments": { "success": true, "count": 10 },
    "jobRoles": { "success": true, "count": 17 },
    "userProfiles": { "success": true, "count": 1 },
    "resources": { "success": true, "count": 1 },
    "roles": { "success": true, "count": 3 }
  }
}
```

### 3. Authentication Flow Test
**URL:** `https://your-vercel-domain.vercel.app/api/debug/auth-test`
**Method:** GET
**Headers:** `Authorization: Bearer <your-jwt-token>`
**Purpose:** Test authentication and permission checking

**Expected Response:**
```json
{
  "status": "success",
  "authentication": {
    "userId": "793a35fc-...",
    "email": "admin@swisssense.nl",
    "authenticated": true
  },
  "permissions": {
    "hasUserManagement": true,
    "hasAdminAccess": true,
    "allPermissions": ["user_management", "admin_access", ...]
  }
}
```

## Debugging Steps

### Step 1: Check Environment Variables
1. Navigate to `https://your-vercel-domain.vercel.app/api/debug/env-check`
2. Verify all environment variables are present
3. If any are missing, check Vercel dashboard environment variables

### Step 2: Test Database Connectivity
1. Navigate to `https://your-vercel-domain.vercel.app/api/debug/db-test`
2. Verify all database tables are accessible
3. Check that sample data is returned

### Step 3: Test Authentication
1. Log into your application
2. Open browser developer tools
3. Find the Authorization header from any API request
4. Use that token to call `https://your-vercel-domain.vercel.app/api/debug/auth-test`
5. Verify authentication and permissions

### Step 4: Test User Creation
1. Try to create a user through the UI
2. Check browser console for detailed error messages
3. Check Vercel function logs for server-side errors

## Common Issues and Solutions

### Issue 1: Missing Environment Variables
**Symptoms:** env-check returns `hasSupabaseUrl: false` or `hasSupabaseServiceKey: false`
**Solution:** 
1. Go to Vercel dashboard
2. Navigate to your project settings
3. Add missing environment variables
4. Redeploy the application

### Issue 2: Database Connection Failed
**Symptoms:** db-test returns connection errors
**Solution:**
1. Verify Supabase project is active
2. Check if IP restrictions are blocking Vercel
3. Verify service role key has correct permissions

### Issue 3: Authentication Failed
**Symptoms:** auth-test returns 401 or authentication errors
**Solution:**
1. Check if user session is valid
2. Verify JWT token is being sent correctly
3. Check if user has required permissions

### Issue 4: User Creation Fails
**Symptoms:** User creation returns 500 errors
**Solution:**
1. Check all previous debug endpoints first
2. Verify user doesn't already exist
3. Check if all required fields are provided
4. Review Vercel function logs

## Vercel Function Logs

To view detailed logs:
1. Go to Vercel dashboard
2. Navigate to your project
3. Click on "Functions" tab
4. Click on the failing function
5. View real-time logs

## Environment Variables Required

Ensure these are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `NODE_ENV=production`

## Testing Checklist

- [ ] Environment variables are configured
- [ ] Database connectivity works
- [ ] Authentication flow works
- [ ] User has required permissions
- [ ] All database tables exist and are accessible
- [ ] User creation API endpoint is deployed
- [ ] Frontend can communicate with API
- [ ] Error messages are informative

## Next Steps

If all debug endpoints pass but user creation still fails:
1. Check Vercel function logs for specific errors
2. Verify the exact error message from the frontend
3. Test with a minimal user creation payload
4. Check for any CORS or network issues

## Support

If issues persist, provide:
1. Results from all three debug endpoints
2. Browser console errors
3. Vercel function logs
4. Exact steps to reproduce the issue
