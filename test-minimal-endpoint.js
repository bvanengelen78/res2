// Test the minimal endpoint to debug function invocation issues

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testMinimalEndpoint() {
  console.log('🧪 Testing Minimal Create User Endpoint');
  console.log('=' .repeat(50));

  try {
    // Test GET request first
    console.log('\n📋 Step 1: Testing GET request');
    const getResponse = await fetch(`${BASE_URL}/api/rbac/test-create-user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   GET Status: ${getResponse.status} ${getResponse.statusText}`);
    
    if (getResponse.status === 200) {
      const getData = await getResponse.json();
      console.log('   ✅ GET request successful');
      console.log(`   Response: ${JSON.stringify(getData, null, 2)}`);
    } else {
      const getError = await getResponse.text();
      console.log(`   ❌ GET request failed: ${getError}`);
    }

    // Test POST request
    console.log('\n📋 Step 2: Testing POST request');
    const postResponse = await fetch(`${BASE_URL}/api/rbac/test-create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'data',
        name: 'Test User',
        email: 'test@example.com'
      })
    });

    console.log(`   POST Status: ${postResponse.status} ${postResponse.statusText}`);
    
    if (postResponse.status === 200) {
      const postData = await postResponse.json();
      console.log('   ✅ POST request successful');
      console.log(`   Response: ${JSON.stringify(postData, null, 2)}`);
    } else {
      const postError = await postResponse.text();
      console.log(`   ❌ POST request failed: ${postError}`);
    }

    // Test OPTIONS request (CORS preflight)
    console.log('\n📋 Step 3: Testing OPTIONS request');
    const optionsResponse = await fetch(`${BASE_URL}/api/rbac/test-create-user`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log(`   OPTIONS Status: ${optionsResponse.status}`);
    console.log(`   CORS Headers: ${JSON.stringify(Object.fromEntries(optionsResponse.headers), null, 2)}`);

    return { success: true };

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
testMinimalEndpoint().then(result => {
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(30));
  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (result.success) {
    console.log('\n🎉 Minimal endpoint test completed successfully!');
    console.log('This means the serverless function environment is working.');
    console.log('The issue is likely in the create-user endpoint logic.');
  } else {
    console.log('\n💥 Minimal endpoint test failed.');
    console.log('This indicates a fundamental serverless function issue.');
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
