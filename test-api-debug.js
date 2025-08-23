// Debug API Endpoint Issues
// Simple test to check what's happening with the create-user endpoint

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

// Get auth token for admin user
async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/api/login-enterprise-simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@resourceflow.com',
      password: 'admin123',
      rememberMe: false
    })
  });

  if (response.status !== 200) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.tokens.accessToken;
}

// Test API endpoint with detailed error logging
async function debugCreateUserAPI() {
  console.log('🔍 Debugging Create User API Endpoint');
  console.log('=' .repeat(50));

  try {
    // Get auth token
    console.log('\n📋 Step 1: Getting authentication token');
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test with minimal valid data
    console.log('\n📋 Step 2: Testing with minimal valid data');
    
    const minimalUser = {
      name: 'Test User',
      email: `test.minimal.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPass123!',
      role: 'user'
    };

    console.log(`   Testing with: ${JSON.stringify(minimalUser, null, 2)}`);

    const response = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(minimalUser)
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);

    // Try to get response text first
    const responseText = await response.text();
    console.log(`   Raw Response: ${responseText}`);

    // Try to parse as JSON if possible
    try {
      const responseData = JSON.parse(responseText);
      console.log(`   Parsed Response: ${JSON.stringify(responseData, null, 2)}`);
    } catch (parseError) {
      console.log(`   ⚠️ Response is not valid JSON: ${parseError.message}`);
    }

    // Test OPTIONS request (CORS preflight)
    console.log('\n📋 Step 3: Testing CORS preflight');
    const optionsResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log(`   OPTIONS Status: ${optionsResponse.status}`);
    console.log(`   CORS Headers: ${JSON.stringify(Object.fromEntries(optionsResponse.headers), null, 2)}`);

    // Test without auth to see if we get proper 401
    console.log('\n📋 Step 4: Testing without authentication');
    const noAuthResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalUser)
    });

    console.log(`   No Auth Status: ${noAuthResponse.status}`);
    const noAuthText = await noAuthResponse.text();
    console.log(`   No Auth Response: ${noAuthText}`);

    return { success: true };

  } catch (error) {
    console.log('\n💥 Debug Failed!');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Test other RBAC endpoints for comparison
async function testOtherRBACEndpoints() {
  console.log('\n🔍 Testing Other RBAC Endpoints for Comparison');
  console.log('=' .repeat(50));

  try {
    const token = await getAuthToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test /api/rbac/users
    console.log('\n📋 Testing /api/rbac/users');
    const usersResponse = await fetch(`${BASE_URL}/api/rbac/users`, { headers });
    console.log(`   Status: ${usersResponse.status}`);
    
    if (usersResponse.status === 200) {
      const usersData = await usersResponse.json();
      console.log(`   ✅ Users endpoint working - returned ${usersData.data?.length || 0} users`);
    } else {
      const usersText = await usersResponse.text();
      console.log(`   ❌ Users endpoint failed: ${usersText}`);
    }

    // Test /api/rbac/roles
    console.log('\n📋 Testing /api/rbac/roles');
    const rolesResponse = await fetch(`${BASE_URL}/api/rbac/roles`, { headers });
    console.log(`   Status: ${rolesResponse.status}`);
    
    if (rolesResponse.status === 200) {
      const rolesData = await rolesResponse.json();
      console.log(`   ✅ Roles endpoint working - returned ${rolesData.data?.length || 0} roles`);
    } else {
      const rolesText = await rolesResponse.text();
      console.log(`   ❌ Roles endpoint failed: ${rolesText}`);
    }

    return { success: true };

  } catch (error) {
    console.log('\n💥 Other endpoints test failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all debug tests
async function runDebugTests() {
  console.log('🚀 Starting API Debug Tests');
  console.log('=' .repeat(60));

  const createUserResult = await debugCreateUserAPI();
  const otherEndpointsResult = await testOtherRBACEndpoints();

  console.log('\n📊 Debug Summary');
  console.log('=' .repeat(30));
  console.log(`Create User Debug: ${createUserResult.success ? '✅ COMPLETE' : '❌ FAILED'}`);
  console.log(`Other Endpoints: ${otherEndpointsResult.success ? '✅ COMPLETE' : '❌ FAILED'}`);

  if (createUserResult.success && otherEndpointsResult.success) {
    console.log('\n🎉 Debug tests completed. Check the output above for issues.');
  } else {
    console.log('\n💥 Some debug tests failed. Check the errors above.');
  }
}

runDebugTests().catch(error => {
  console.error('Debug execution failed:', error);
  process.exit(1);
});
