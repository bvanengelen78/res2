# 🔍 Recent Reports Debugging Guide

## Issue: Generated reports not appearing in Recent Reports section

### 🚨 **CRITICAL FIRST STEP: Database Setup**

The `recent_reports` table must be created first. Please run this SQL in your **Supabase SQL Editor**:

```sql
-- Create the recent_reports table
CREATE TABLE IF NOT EXISTS recent_reports (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    generated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    size TEXT,
    criteria JSONB,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recent_reports_generated_by ON recent_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_recent_reports_generated_at ON recent_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_reports_type ON recent_reports(type);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recent_reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE recent_reports_id_seq TO authenticated;
```

### 🔧 **Step-by-Step Debugging**

#### 1. **Check Browser Console**
Open Developer Tools (F12) → Console tab, then generate a report. Look for:

```javascript
// Expected console logs:
"Adding report to recent reports..." // With report data
"Successfully added report to recent reports:" // With response

// Error logs to watch for:
"Failed to add report to recent reports:" // API call failed
"Failed to fetch recent reports:" // GET request failed
```

#### 2. **Check Network Tab**
Open Developer Tools → Network tab, then generate a report. Look for:

- **POST `/api/reports/recent`** - Should return 200 status
- **GET `/api/reports/recent`** - Should be called after POST and return array

#### 3. **Test API Endpoints Manually**

**Test GET endpoint:**
```bash
# In browser console or Postman
fetch('/api/reports/recent', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('Recent reports:', data));
```

**Test POST endpoint:**
```bash
# In browser console
fetch('/api/reports/recent', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Report',
    type: 'Change Allocation',
    size: '1.0 MB',
    criteria: { test: true }
  })
})
.then(res => res.json())
.then(data => console.log('Add report result:', data));
```

#### 4. **Check Server Logs**
Look for these log messages in your server console:

```
[STORAGE] Report added to recent reports: Test Report (Change Allocation)
Error fetching recent reports: [error details]
Failed to add recent report: [error details]
```

#### 5. **Verify Database Connection**
Test if the table exists:

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM recent_reports;
```

If this fails, the table doesn't exist yet.

### 🎯 **Common Issues & Solutions**

#### Issue 1: Table doesn't exist
**Solution:** Run the SQL migration above in Supabase SQL Editor

#### Issue 2: Permission denied
**Solution:** Check RLS policies in Supabase:
```sql
-- Disable RLS temporarily for testing
ALTER TABLE recent_reports DISABLE ROW LEVEL SECURITY;
```

#### Issue 3: User ID not found
**Solution:** Check authentication:
```javascript
// In browser console
console.log('Current user:', localStorage.getItem('auth-token'));
```

#### Issue 4: API route not found
**Solution:** Restart the development server after code changes

### 🧪 **Quick Test Procedure**

1. **Database Setup**: Run the SQL migration
2. **Restart Server**: Stop and start your development server
3. **Clear Cache**: Hard refresh the browser (Ctrl+Shift+R)
4. **Generate Report**: Use the Change Allocation Report modal
5. **Check Console**: Look for the debug logs we added
6. **Check Network**: Verify API calls are made
7. **Check Database**: Query the table directly

### 🔍 **Enhanced Debugging**

I've added enhanced logging to the Change Allocation Report Modal. When you generate a report, you should see:

1. **Console log**: "Adding report to recent reports..." with the data being sent
2. **Console log**: "Successfully added report to recent reports:" with the response
3. **Automatic refresh**: The recent reports list should refresh automatically

### 📊 **Expected Data Flow**

```
1. User clicks "Generate" in Change Allocation Report Modal
2. Excel file is generated and downloaded
3. POST /api/reports/recent is called with report metadata
4. Server adds report to recent_reports table
5. onReportGenerated callback triggers refetchRecentReports()
6. GET /api/reports/recent is called to refresh the list
7. Recent Reports section updates with new report
```

### 🚀 **Next Steps**

1. **Run the SQL migration** (most important!)
2. **Restart your development server**
3. **Generate a test report** and check browser console
4. **Report back** with any error messages you see

The implementation is complete - we just need to ensure the database table exists and the API calls are working properly.
