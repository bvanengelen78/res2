// Quick test of the fixed user creation endpoint

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function quickTest() {
  console.log('🧪 Quick Test: Enhanced User Creation API');
  console.log('=' .repeat(50));

  try {
    // Get auth token
    console.log('\n📋 Step 1: Authentication');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swisssense.nl',
        password: 'admin',
        rememberMe: false
      })
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.tokens.accessToken;
    console.log('✅ Authentication successful');

    // Test user creation
    console.log('\n📋 Step 2: User Creation Test');
    const testUser = {
      name: 'Test User Enhanced',
      email: `test.enhanced.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'Enhanced',
      password: 'SecurePass123!@#',
      role: 'user',
      department: 'Engineering',
      jobRole: 'Software Engineer',
      capacity: 40
    };

    console.log(`   Testing with: ${testUser.email}`);

    const createResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`);

    if (createResponse.status === 201) {
      const createData = await createResponse.json();
      console.log('   ✅ SUCCESS: User creation working!');
      console.log(`   - User ID: ${createData.user?.id}`);
      console.log(`   - Email: ${createData.user?.email}`);
      console.log(`   - Role: ${createData.user?.role || createData.assignedRole}`);
      console.log(`   - Resource ID: ${createData.resource?.id}`);
      console.log(`   - Password Generated: ${createData.defaultPassword ? 'Yes' : 'No'}`);
      
      return { success: true, data: createData };
    } else {
      const errorText = await createResponse.text();
      console.log(`   ❌ FAILED: ${errorText}`);
      
      // Try to parse as JSON for better error details
      try {
        const errorData = JSON.parse(errorText);
        console.log(`   Error Details: ${JSON.stringify(errorData, null, 2)}`);
      } catch (e) {
        console.log(`   Raw Error: ${errorText}`);
      }
      
      return { success: false, error: errorText, status: createResponse.status };
    }

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
quickTest().then(result => {
  console.log('\n📊 Quick Test Summary');
  console.log('=' .repeat(30));
  
  if (result.success) {
    console.log('🎉 ENHANCED USER CREATION IS WORKING!');
    console.log('✅ The API endpoint is now functional');
    console.log('✅ Ready for browser testing');
    console.log('\nNext Steps:');
    console.log('1. Test the UI components in Chrome with Browser MCP');
    console.log('2. Verify the complete user creation workflow');
    console.log('3. Test form validation and error handling');
  } else {
    console.log('💥 API STILL HAS ISSUES');
    console.log(`❌ Status: ${result.status || 'Unknown'}`);
    console.log(`❌ Error: ${result.error}`);
    console.log('\nDebugging needed:');
    console.log('1. Check Vercel function logs');
    console.log('2. Verify environment variables');
    console.log('3. Test with simplified endpoint');
  }
}).catch(error => {
  console.error('Test execution failed:', error);
});
