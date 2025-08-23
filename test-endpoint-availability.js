// Test which endpoints are available after deployment

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

const endpoints = [
  '/api/ping',
  '/api/health',
  '/api/login-enterprise-simple',
  '/api/login',
  '/api/auth',
  '/api/me',
  '/api/dashboard',
  '/api/rbac/users',
  '/api/rbac/create-user',
  '/api/rbac/roles'
];

async function testEndpoints() {
  console.log('🔍 Testing Endpoint Availability');
  console.log('=' .repeat(50));

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📋 Testing: ${endpoint}`);
      
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        console.log('   ✅ Available');
      } else if (response.status === 401 || response.status === 403) {
        console.log('   🔒 Available (requires auth)');
      } else if (response.status === 404) {
        console.log('   ❌ Not Found');
      } else if (response.status === 405) {
        console.log('   ⚠️ Method Not Allowed (try POST)');
      } else {
        console.log(`   ⚠️ Other status: ${response.status}`);
      }

      // For some endpoints, try POST method
      if (endpoint.includes('login') && response.status === 405) {
        console.log('   Trying POST method...');
        const postResponse = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test'
          })
        });
        console.log(`   POST Status: ${postResponse.status} ${postResponse.statusText}`);
      }

    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }

  // Test the main application
  console.log('\n📋 Testing: / (main application)');
  try {
    const response = await fetch(BASE_URL);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.status === 200) {
      console.log('   ✅ Main application is accessible');
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
  }
}

testEndpoints().then(() => {
  console.log('\n📊 Endpoint Test Summary');
  console.log('=' .repeat(30));
  console.log('Check the results above to see which endpoints are working.');
  console.log('This will help identify if the deployment was successful.');
}).catch(error => {
  console.error('Test execution failed:', error);
});
