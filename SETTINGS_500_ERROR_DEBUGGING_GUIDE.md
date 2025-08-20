# Settings API 500 Error Debugging Guide

## 🎯 Current Status
- ✅ **Progress**: Serverless functions deployed (no more 404 errors)
- ❌ **Issue**: 500 Internal Server Error responses from `/api/settings/*` endpoints
- 🔍 **Next**: Systematic debugging to identify root cause

## 🚨 Error Details
```
[API_REQUEST] Request failed: Error: 500: {"error":true,"message":"Internal server error","timestamp":"2025-08-20T13:03:06.375Z"}
```

## 🔍 Systematic Debugging Plan

### Phase 1: Basic Function Testing
1. **Test Health Check Endpoint**
   ```bash
   curl https://your-app.vercel.app/api/settings/health
   ```
   - ✅ Verifies basic serverless function execution
   - ✅ Checks environment variable configuration
   - ✅ Tests middleware and database service imports

2. **Test Simplified Endpoint**
   ```bash
   curl https://your-app.vercel.app/api/settings/ogsm-charters-simple
   ```
   - ✅ Bypasses authentication middleware
   - ✅ Returns mock data directly
   - ✅ Isolates middleware vs data issues

### Phase 2: Environment Variable Verification
Check Vercel dashboard for required environment variables:
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- [ ] `JWT_SECRET` - Secret for JWT token validation
- [ ] `NODE_ENV` - Should be 'production' in Vercel

### Phase 3: Authentication Flow Testing
1. **Test with Valid Token**
   ```bash
   curl https://your-app.vercel.app/api/settings/ogsm-charters \
        -H "Authorization: Bearer YOUR_VALID_JWT_TOKEN"
   ```

2. **Test without Token**
   ```bash
   curl https://your-app.vercel.app/api/settings/ogsm-charters
   ```
   - Should return 401 Unauthorized, not 500

### Phase 4: Vercel Function Logs Analysis
1. **Access Vercel Dashboard**
   - Go to your project in Vercel dashboard
   - Navigate to "Functions" tab
   - Check logs for `/api/settings/ogsm-charters`

2. **Look for Specific Errors**
   - Import/require failures
   - Environment variable issues
   - Database connection errors
   - JWT validation failures

## 🛠️ Debugging Endpoints Added

### 1. Health Check Endpoint
**URL**: `/api/settings/health`
**Purpose**: Comprehensive system diagnostics
**Returns**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "environment": {
      "NODE_ENV": "production",
      "SUPABASE_URL": "configured",
      "JWT_SECRET": "configured"
    },
    "services": {
      "middleware": {"status": "available"},
      "database": {"status": "available"}
    }
  }
}
```

### 2. Simplified OGSM Endpoint
**URL**: `/api/settings/ogsm-charters-simple`
**Purpose**: Bypass middleware for basic testing
**Returns**: Mock data with diagnostic information

## 🔧 Enhanced Logging
All endpoints now include detailed console logging:
- Request method and headers
- Environment variable status
- Import success/failure
- Database connection attempts
- Error stack traces

## 📋 Debugging Checklist

### Immediate Actions
- [ ] Deploy updated functions with enhanced logging
- [ ] Test health check endpoint
- [ ] Test simplified endpoint
- [ ] Check Vercel function logs
- [ ] Verify environment variables in Vercel dashboard

### Root Cause Investigation
- [ ] **Import Failures**: Check if middleware/database imports are failing
- [ ] **Environment Issues**: Verify all required env vars are set in Vercel
- [ ] **Authentication Problems**: Test JWT token validation
- [ ] **Database Connection**: Check Supabase client initialization
- [ ] **CORS Issues**: Verify CORS headers are properly set

### Common Issues & Solutions

#### 1. Missing Environment Variables
**Symptoms**: 500 errors, "configuration missing" in logs
**Solution**: Configure in Vercel dashboard → Settings → Environment Variables

#### 2. Import/Require Failures
**Symptoms**: "Cannot find module" errors in logs
**Solution**: Check file paths and dependencies in package.json

#### 3. JWT Validation Errors
**Symptoms**: 500 errors during authentication
**Solution**: Verify JWT_SECRET matches between client and server

#### 4. Supabase Connection Issues
**Symptoms**: Database-related 500 errors
**Solution**: Verify Supabase credentials and network access

## 🎯 Expected Outcomes

### After Debugging
1. **Health endpoint returns 200** with full diagnostic info
2. **Simplified endpoint returns 200** with mock data
3. **Main endpoints return 401** (authentication required) instead of 500
4. **With valid auth, endpoints return 200** with data

### Success Criteria
- ✅ No more 500 Internal Server Errors
- ✅ Proper 401 responses for unauthenticated requests
- ✅ 200 responses with data for authenticated requests
- ✅ Settings page loads and displays data correctly

## 🚀 Next Steps
1. **Deploy** the enhanced debugging functions
2. **Test** each diagnostic endpoint
3. **Analyze** Vercel function logs
4. **Identify** specific root cause
5. **Fix** the identified issue
6. **Verify** Settings page works end-to-end

---
**🔍 This systematic approach will identify and resolve the 500 errors, making the Settings page fully functional in production.**
