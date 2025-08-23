// Test user creation endpoint directly without authentication

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testCreateUserDirect() {
  console.log('🧪 Testing Create User Endpoint (Direct)');
  console.log('=' .repeat(50));

  try {
    console.log('\n📋 Testing /api/rbac/create-user without auth');
    
    const testUser = {
      name: 'Test User Direct',
      email: `test.direct.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'Direct',
      password: 'TestPass123!',
      role: 'user',
      department: 'Engineering',
      jobRole: 'Software Engineer',
      capacity: 40
    };

    console.log(`Creating user: ${testUser.email}`);

    const response = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);

    const responseText = await response.text();
    console.log(`Raw Response: ${responseText}`);

    if (response.status === 201) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ User creation successful!');
        console.log(`User ID: ${data.user?.id}`);
        console.log(`Email: ${data.user?.email}`);
        console.log(`Role: ${data.user?.role}`);
        console.log(`Password: ${data.defaultPassword}`);
      } catch (e) {
        console.log('⚠️ Success but response not JSON:', e.message);
      }
    } else if (response.status === 401) {
      console.log('🔒 Authentication required (expected)');
    } else {
      try {
        const errorData = JSON.parse(responseText);
        console.log(`❌ Failed: ${errorData.error}`);
        if (errorData.message) {
          console.log(`Details: ${errorData.message}`);
        }
      } catch (e) {
        console.log(`❌ Failed with non-JSON response: ${responseText}`);
      }
    }

    // Test the simplified endpoint too
    console.log('\n📋 Testing /api/rbac/create-user-simple');
    
    const simpleResponse = await fetch(`${BASE_URL}/api/rbac/create-user-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    console.log(`Simple Status: ${simpleResponse.status} ${simpleResponse.statusText}`);
    
    if (simpleResponse.status === 404) {
      console.log('❌ Simplified endpoint not found (not deployed)');
    } else if (simpleResponse.status === 401) {
      console.log('🔒 Authentication required (expected)');
    } else {
      const simpleText = await simpleResponse.text();
      console.log(`Simple Response: ${simpleText.substring(0, 200)}...`);
    }

  } catch (error) {
    console.log('💥 Test failed!');
    console.error('Error:', error.message);
  }
}

testCreateUserDirect();
