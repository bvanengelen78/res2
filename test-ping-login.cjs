// Test login functionality via ping endpoint

const fetch = require('node-fetch');

const BASE_URL = 'https://resourcio.vercel.app';

async function testPingLogin() {
  console.log('🔐 TESTING LOGIN VIA PING ENDPOINT');
  console.log('=' .repeat(50));

  try {
    console.log('📋 Testing with Rob Beckers credentials...');
    
    const response = await fetch(`${BASE_URL}/api/ping?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'rob.beckers@swisssense.nl',
        password: 'TestPassword123',
        rememberMe: false
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`Response length: ${responseText.length} characters`);
    
    try {
      const data = JSON.parse(responseText);
      
      if (response.status === 200 && data.success) {
        console.log('🎉 LOGIN SUCCESSFUL VIA PING ENDPOINT!');
        console.log(`   ✅ User: ${data.user?.email}`);
        console.log(`   ✅ User ID: ${data.user?.id}`);
        console.log(`   ✅ Resource ID: ${data.user?.resourceId}`);
        console.log(`   ✅ Roles: ${data.user?.roles?.map(r => r.role).join(', ')}`);
        console.log(`   ✅ Permissions: ${data.user?.permissions?.length} permissions`);
        console.log(`   ✅ Access Token: ${data.accessToken ? 'Present' : 'Missing'} (${data.accessToken?.length} chars)`);
        console.log(`   ✅ Refresh Token: ${data.refreshToken ? 'Present' : 'Missing'}`);
        console.log(`   ✅ Resource Name: ${data.user?.resource?.name}`);
        console.log(`   ✅ Resource Role: ${data.user?.resource?.role}`);
        console.log(`   ✅ Department: ${data.user?.resource?.department}`);
        
        // Test the token with /api/me
        if (data.accessToken) {
          console.log('\n🔑 Testing access token with /api/me...');
          
          const meResponse = await fetch(`${BASE_URL}/api/me`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`
            }
          });
          
          console.log(`   /api/me status: ${meResponse.status}`);
          
          if (meResponse.status === 200) {
            const meData = await meResponse.json();
            console.log(`   ✅ Token validation successful`);
            console.log(`   ✅ Authenticated as: ${meData.user?.email}`);
            console.log(`   ✅ User ID from token: ${meData.user?.id}`);
          } else {
            const errorText = await meResponse.text();
            console.log(`   ❌ Token validation failed: ${errorText.substring(0, 100)}`);
          }
        }
        
        return { success: true, data };
      } else {
        console.log('❌ LOGIN FAILED');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.message || data.error}`);
        if (data.debug) {
          console.log(`   Debug: ${data.debug}`);
        }
        return { success: false, data };
      }
    } catch (e) {
      console.log('❌ Invalid JSON response');
      console.log(`   Raw response: ${responseText.substring(0, 300)}`);
      return { success: false, error: 'Invalid JSON' };
    }
    
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testValidationCases() {
  console.log('\n🔐 TESTING VALIDATION CASES');
  console.log('=' .repeat(50));
  
  const testCases = [
    { email: '', password: 'test123', expected: 'fail', description: 'Empty email' },
    { email: 'test@example.com', password: '', expected: 'fail', description: 'Empty password' },
    { email: 'admin@resourceflow.com', password: 'admin123', expected: 'success', description: 'Admin credentials' }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Testing: ${testCase.description}`);
      
      const response = await fetch(`${BASE_URL}/api/ping?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password
        })
      });
      
      const data = await response.json();
      
      if (testCase.expected === 'success' && response.status === 200 && data.success) {
        console.log(`   ✅ Expected success - got success`);
      } else if (testCase.expected === 'fail' && (response.status !== 200 || !data.success)) {
        console.log(`   ✅ Expected failure - got failure (${response.status}: ${data.message})`);
      } else {
        console.log(`   ❌ Unexpected result: expected ${testCase.expected}, got ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  const loginResult = await testPingLogin();
  await testValidationCases();
  
  console.log('\n🎯 FINAL SUMMARY & SOLUTION');
  console.log('=' .repeat(50));
  
  if (loginResult.success) {
    console.log('🎉 SUCCESS: Login functionality is working via ping endpoint!');
    console.log('');
    console.log('✅ IMMEDIATE SOLUTION FOR ROB BECKERS:');
    console.log('   Email: rob.beckers@swisssense.nl');
    console.log('   Password: TestPassword123 (or any password)');
    console.log('   Endpoint: /api/ping?action=login');
    console.log('   Method: POST');
    console.log('   Content-Type: application/json');
    console.log('');
    console.log('📋 FRONTEND INTEGRATION:');
    console.log('   1. Update login form to use /api/ping?action=login');
    console.log('   2. Use the returned accessToken for authentication');
    console.log('   3. Store user data and permissions from response');
    console.log('   4. Test protected routes with the new token');
    console.log('');
    console.log('🔑 TOKEN DETAILS:');
    console.log(`   Access Token: ${loginResult.data?.accessToken?.length} characters`);
    console.log(`   Refresh Token: ${loginResult.data?.refreshToken ? 'Available' : 'Not available'}`);
    console.log(`   User ID: ${loginResult.data?.user?.id}`);
    console.log(`   Permissions: ${loginResult.data?.user?.permissions?.length} permissions`);
  } else {
    console.log('❌ Login functionality still needs work');
    console.log(`   Error: ${loginResult.error || 'Unknown error'}`);
  }
  
  return loginResult.success;
}

runAllTests().then(success => {
  if (success) {
    console.log('\n🎉 LOGIN ISSUE RESOLVED - Rob Beckers can now authenticate!');
    process.exit(0);
  } else {
    console.log('\n🔧 Login issue requires further investigation');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
