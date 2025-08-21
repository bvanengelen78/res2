// Comprehensive API Health Audit
// Maps all API endpoints and tests their availability in production

const BASE_URL = 'https://resourcio.vercel.app';

// Map of all API endpoints that should exist based on frontend usage
const API_ENDPOINTS = {
  // Authentication endpoints
  auth: [
    { path: '/api/login', method: 'POST', description: 'User login', critical: true },
    { path: '/api/logout', method: 'POST', description: 'User logout', critical: true },
    { path: '/api/me', method: 'GET', description: 'Get current user', critical: true },
    { path: '/api/register', method: 'POST', description: 'User registration', critical: true },
    { path: '/api/refresh', method: 'POST', description: 'Refresh token', critical: true },
  ],

  // RBAC endpoints
  rbac: [
    { path: '/api/rbac-users', method: 'GET', description: 'Get users with roles', critical: true },
    { path: '/api/rbac/users', method: 'GET', description: 'Alternative users endpoint', critical: false },
    { path: '/api/rbac/assign-role', method: 'POST', description: 'Assign role to user', critical: true },
    { path: '/api/rbac/remove-role', method: 'POST', description: 'Remove role from user', critical: true },
    { path: '/api/rbac/roles', method: 'GET', description: 'Get available roles', critical: true },
  ],

  // Resource management
  resources: [
    { path: '/api/resources', method: 'GET', description: 'Get all resources', critical: true },
    { path: '/api/resources', method: 'POST', description: 'Create resource', critical: true },
    { path: '/api/resources/1', method: 'GET', description: 'Get specific resource', critical: true },
    { path: '/api/resources/1', method: 'PUT', description: 'Update resource', critical: true },
  ],

  // Project management
  projects: [
    { path: '/api/projects', method: 'GET', description: 'Get all projects', critical: true },
    { path: '/api/projects', method: 'POST', description: 'Create project', critical: true },
    { path: '/api/projects/1', method: 'GET', description: 'Get specific project', critical: true },
    { path: '/api/projects/1', method: 'PUT', description: 'Update project', critical: true },
  ],

  // Time tracking
  timeTracking: [
    { path: '/api/time-entries', method: 'GET', description: 'Get time entries', critical: true },
    { path: '/api/time-entries', method: 'POST', description: 'Create time entry', critical: true },
    { path: '/api/weekly-submissions', method: 'GET', description: 'Get weekly submissions', critical: true },
    { path: '/api/weekly-submissions/pending', method: 'GET', description: 'Get pending submissions', critical: true },
  ],

  // Dashboard endpoints
  dashboard: [
    { path: '/api/dashboard', method: 'GET', description: 'Dashboard data', critical: true },
    { path: '/api/dashboard/kpis', method: 'GET', description: 'Dashboard KPIs', critical: true },
    { path: '/api/dashboard/alerts', method: 'GET', description: 'Dashboard alerts', critical: true },
    { path: '/api/dashboard/heatmap', method: 'GET', description: 'Dashboard heatmap', critical: true },
    { path: '/api/dashboard/gamified-metrics', method: 'GET', description: 'Gamified metrics', critical: false },
  ],

  // Settings endpoints
  settings: [
    { path: '/api/departments', method: 'GET', description: 'Get departments', critical: true },
    { path: '/api/settings/departments', method: 'GET', description: 'Settings departments', critical: false },
    { path: '/api/settings/notifications', method: 'GET', description: 'Notification settings', critical: false },
    { path: '/api/ogsm-charters', method: 'GET', description: 'OGSM charters', critical: false },
  ],

  // MISSING CRITICAL ENDPOINTS (identified from server/routes.ts)
  missing: [
    { path: '/api/admin/users/:userId/reset-password', method: 'POST', description: 'Admin password reset', critical: true, status: 'MISSING' },
    { path: '/api/admin/users/:userId/password-audit', method: 'GET', description: 'Password audit trail', critical: false, status: 'MISSING' },
    { path: '/api/rbac/update-password', method: 'POST', description: 'Update user password', critical: true, status: 'MISSING' },
    { path: '/api/rbac/create-user', method: 'POST', description: 'Create new user', critical: true, status: 'MISSING' },
  ],

  // Health and debug endpoints
  health: [
    { path: '/api/health', method: 'GET', description: 'API health check', critical: false },
    { path: '/api/ping', method: 'GET', description: 'Simple ping', critical: false },
    { path: '/api/supabase-health', method: 'GET', description: 'Supabase health', critical: false },
  ]
};

// Test a single endpoint
async function testEndpoint(endpoint, authToken = null) {
  const url = `${BASE_URL}${endpoint.path}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const options = {
      method: endpoint.method,
      headers,
    };

    // Add test data for POST requests
    if (endpoint.method === 'POST') {
      if (endpoint.path.includes('login')) {
        options.body = JSON.stringify({
          email: 'admin@resourceflow.com',
          password: 'admin123'
        });
      } else if (endpoint.path.includes('reset-password')) {
        options.body = JSON.stringify({});
      }
    }

    const response = await fetch(url, options);
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.status,
      statusText: response.statusText,
      available: response.status !== 404,
      critical: endpoint.critical,
      description: endpoint.description,
      error: null
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: 'ERROR',
      statusText: error.message,
      available: false,
      critical: endpoint.critical,
      description: endpoint.description,
      error: error.message
    };
  }
}

// Main audit function
async function runAPIHealthAudit() {
  console.log('🔍 COMPREHENSIVE API HEALTH AUDIT');
  console.log('=' .repeat(70));
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = {
    summary: {
      total: 0,
      available: 0,
      missing: 0,
      critical_missing: 0,
      errors: 0
    },
    categories: {},
    critical_issues: [],
    recommendations: []
  };

  // Test each category
  for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
    console.log(`\n📋 Testing ${category.toUpperCase()} endpoints:`);
    console.log('-'.repeat(50));

    const categoryResults = [];

    for (const endpoint of endpoints) {
      if (endpoint.status === 'MISSING') {
        // Skip testing known missing endpoints
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 404,
          statusText: 'Not Found',
          available: false,
          critical: endpoint.critical,
          description: endpoint.description,
          error: 'Endpoint not implemented in serverless functions'
        };
        categoryResults.push(result);
        console.log(`   ❌ ${endpoint.method} ${endpoint.path} - MISSING (${endpoint.description})`);
      } else {
        const result = await testEndpoint(endpoint);
        categoryResults.push(result);
        
        const icon = result.available ? '✅' : '❌';
        const status = result.status === 'ERROR' ? 'ERROR' : result.status;
        console.log(`   ${icon} ${result.method} ${result.endpoint} - ${status} (${result.description})`);
      }

      // Update summary
      results.summary.total++;
      if (categoryResults[categoryResults.length - 1].available) {
        results.summary.available++;
      } else {
        results.summary.missing++;
        if (categoryResults[categoryResults.length - 1].critical) {
          results.summary.critical_missing++;
          results.critical_issues.push(categoryResults[categoryResults.length - 1]);
        }
      }
      if (categoryResults[categoryResults.length - 1].error) {
        results.summary.errors++;
      }
    }

    results.categories[category] = categoryResults;
  }

  // Generate summary and recommendations
  console.log('\n🎯 AUDIT SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Total endpoints tested: ${results.summary.total}`);
  console.log(`Available endpoints: ${results.summary.available}`);
  console.log(`Missing endpoints: ${results.summary.missing}`);
  console.log(`Critical missing endpoints: ${results.summary.critical_missing}`);
  console.log(`Endpoints with errors: ${results.summary.errors}`);

  if (results.critical_issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
    console.log('-'.repeat(50));
    results.critical_issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.method} ${issue.endpoint}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Status: ${issue.status} - ${issue.statusText}`);
      console.log(`   Impact: Critical functionality unavailable`);
      console.log('');
    });
  }

  // Generate recommendations
  if (results.summary.critical_missing > 0) {
    results.recommendations.push('URGENT: Implement missing critical endpoints in Vercel serverless functions');
  }
  if (results.summary.missing > results.summary.critical_missing) {
    results.recommendations.push('Implement remaining missing endpoints for complete functionality');
  }
  if (results.summary.errors > 0) {
    results.recommendations.push('Investigate and fix endpoints returning errors');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(50));
  results.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  return results;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAPIHealthAudit, testEndpoint, API_ENDPOINTS };
}

// Run audit if called directly
if (require.main === module) {
  runAPIHealthAudit().then(results => {
    if (results.summary.critical_missing > 0) {
      console.log('\n🔥 CRITICAL API ISSUES DETECTED - IMMEDIATE ACTION REQUIRED');
      process.exit(1);
    } else {
      console.log('\n✅ API HEALTH AUDIT COMPLETE');
      process.exit(0);
    }
  }).catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}
