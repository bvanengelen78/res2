// Test the simplified create-user endpoint

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

async function testSimpleCreateUser() {
  console.log('🧪 Testing Simplified Create User Endpoint');
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

    // Test user creation with simplified endpoint
    console.log('\n📋 Step 2: Testing simplified create-user endpoint');
    
    const testUser = {
      name: 'Test User Simple',
      email: `test.simple.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'Simple',
      password: 'TestPass123!',
      role: 'user',
      department: 'Engineering',
      jobRole: 'Software Engineer',
      capacity: 40
    };

    console.log(`   Creating user: ${testUser.email}`);

    const createResponse = await fetch(`${BASE_URL}/api/rbac/create-user-simple`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testUser)
    });

    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(createResponse.headers), null, 2)}`);

    const responseText = await createResponse.text();
    console.log(`   Raw Response: ${responseText}`);

    if (createResponse.status === 201) {
      try {
        const createData = JSON.parse(responseText);
        console.log('   ✅ User creation successful!');
        console.log(`   - User ID: ${createData.user?.id}`);
        console.log(`   - Email: ${createData.user?.email}`);
        console.log(`   - Role: ${createData.user?.role}`);
        console.log(`   - Resource ID: ${createData.resource?.id}`);
        
        return { success: true, data: createData };
      } catch (parseError) {
        console.log('   ⚠️ Success but response not JSON:', parseError.message);
        return { success: true, rawResponse: responseText };
      }
    } else {
      try {
        const errorData = JSON.parse(responseText);
        console.log(`   ❌ User creation failed: ${errorData.error || 'Unknown error'}`);
        if (errorData.details) {
          console.log(`   Details: ${errorData.details}`);
        }
        return { success: false, error: errorData };
      } catch (parseError) {
        console.log(`   ❌ User creation failed with non-JSON response: ${responseText}`);
        return { success: false, error: responseText };
      }
    }

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testSimpleCreateUser().then(result => {
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(30));
  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (result.success) {
    console.log('\n🎉 Simplified endpoint test successful!');
    console.log('The user creation logic is working correctly.');
    console.log('The issue with the main endpoint is likely in the middleware.');
  } else {
    console.log('\n💥 Simplified endpoint test failed.');
    console.log('This indicates an issue with the core user creation logic.');
    if (result.error) {
      console.log('Error details:', result.error);
    }
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
