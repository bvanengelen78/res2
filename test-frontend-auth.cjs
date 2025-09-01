const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testFrontendAuth() {
  console.log('🧪 Testing Frontend Authentication Integration');
  console.log('==============================================');

  try {
    // Step 1: Login to get token
    console.log('\n1. 🔐 Login to get authentication token...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swisssense.nl',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    const token = loginData.token;

    // Step 2: Test all RBAC endpoints that the frontend uses
    const endpoints = [
      { path: '/api/rbac/user-profiles', method: 'GET', description: 'User profiles' },
      { path: '/api/rbac/roles-hierarchy', method: 'GET', description: 'Roles hierarchy' },
      { path: '/api/rbac/permissions', method: 'GET', description: 'Permissions' },
    ];

    for (const endpoint of endpoints) {
      console.log(`\n2. 🧪 Testing ${endpoint.description} (${endpoint.path})...`);
      
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${endpoint.description} failed`);
        console.error('Error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error:', errorJson);
        } catch (e) {
          // Not JSON, that's fine
        }
      } else {
        const data = await response.json();
        console.log(`✅ ${endpoint.description} successful`);
        console.log(`Data structure:`, Object.keys(data));
        if (data.data && Array.isArray(data.data)) {
          console.log(`Array length: ${data.data.length}`);
        }
      }
    }

    // Step 3: Test a mutation endpoint
    console.log('\n3. 🧪 Testing mutation endpoint (assign role)...');
    
    // First get a user to test with
    const usersResponse = await fetch(`${BASE_URL}/api/rbac/user-profiles`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const users = usersData.data || [];
      
      if (users.length > 0) {
        const testUser = users.find(u => u.email !== 'admin@swisssense.nl') || users[0];
        console.log(`Testing with user: ${testUser.email} (${testUser.id})`);

        // Test assign role (this should work even if user already has the role)
        const assignResponse = await fetch(`${BASE_URL}/api/rbac/assign-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: testUser.id,
            roleName: 'user', // Safe role to assign
          }),
        });

        console.log(`Assign role response: ${assignResponse.status} ${assignResponse.statusText}`);

        if (!assignResponse.ok) {
          const errorText = await assignResponse.text();
          console.error('❌ Assign role failed');
          console.error('Error response:', errorText);
        } else {
          const assignData = await assignResponse.json();
          console.log('✅ Assign role successful');
          console.log('Response:', assignData);
        }
      } else {
        console.log('⚠️  No users found to test mutations with');
      }
    }

    console.log('\n🎉 Frontend authentication integration test completed!');

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFrontendAuth().catch(console.error);
