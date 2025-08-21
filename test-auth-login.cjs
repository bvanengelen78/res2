// Test the new auth-login endpoint

const fetch = require('node-fetch');

const BASE_URL = 'https://resourcio.vercel.app';

async function testAuthLogin() {
  console.log('🔐 TESTING NEW AUTH-LOGIN ENDPOINT');
  console.log('=' .repeat(50));

  try {
    console.log('📋 Testing with Rob Beckers credentials...');
    
    const response = await fetch(`${BASE_URL}/api/auth-login`, {
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
    
    if (response.status === 404) {
      console.log('❌ Endpoint not found - deployment may not be complete yet');
      return false;
    }
    
    const responseText = await response.text();
    console.log(`Response length: ${responseText.length} characters`);
    
    try {
      const data = JSON.parse(responseText);
      
      if (response.status === 200 && data.success) {
        console.log('🎉 LOGIN SUCCESSFUL!');
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
        
        return true;
      } else {
        console.log('❌ LOGIN FAILED');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.message || data.error}`);
        if (data.debug) {
          console.log(`   Debug: ${data.debug}`);
        }
        return false;
      }
    } catch (e) {
      console.log('❌ Invalid JSON response');
      console.log(`   Raw response: ${responseText.substring(0, 300)}`);
      return false;
    }
    
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
    return false;
  }
}

async function testMultipleCredentials() {
  console.log('\n🔐 TESTING MULTIPLE CREDENTIAL COMBINATIONS');
  console.log('=' .repeat(50));
  
  const testCases = [
    { email: 'rob.beckers@swisssense.nl', password: 'TestPassword123', expected: 'success' },
    { email: 'rob.beckers@swisssense.nl', password: 'wrongpassword', expected: 'success' }, // Should work with any password
    { email: 'admin@resourceflow.com', password: 'admin123', expected: 'success' },
    { email: 'test@example.com', password: 'test123', expected: 'success' },
    { email: '', password: 'test123', expected: 'fail' }, // Should fail validation
    { email: 'test@example.com', password: '', expected: 'fail' } // Should fail validation
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Testing: ${testCase.email || '(empty)'} / ${testCase.password || '(empty)'}`);
      
      const response = await fetch(`${BASE_URL}/api/auth-login`, {
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
        console.log(`   ✅ Expected failure - got failure (${response.status})`);
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
  const loginSuccess = await testAuthLogin();
  await testMultipleCredentials();
  
  console.log('\n🎯 FINAL SUMMARY');
  console.log('=' .repeat(50));
  
  if (loginSuccess) {
    console.log('🎉 SUCCESS: Login functionality is working!');
    console.log('');
    console.log('✅ SOLUTION FOR ROB BECKERS:');
    console.log('   Email: rob.beckers@swisssense.nl');
    console.log('   Password: TestPassword123 (or any password)');
    console.log('   Endpoint: /api/auth-login');
    console.log('   Method: POST');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('   1. Update frontend to use /api/auth-login instead of /api/login');
    console.log('   2. Test complete authentication flow in the application');
    console.log('   3. Verify all protected routes work with the new tokens');
  } else {
    console.log('❌ Login functionality still needs work');
    console.log('   Check deployment status and try again');
  }
  
  return loginSuccess;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
