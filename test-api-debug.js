#!/usr/bin/env node

/**
 * Debug script to test the /api/resources/:id/allocations endpoint
 * This helps identify JSON parsing issues and response problems
 */

async function testAllocationsAPI() {
  console.log('🔍 Testing Resource Allocations API...\n');

  try {
    // Test without authentication first
    console.log('1. Testing endpoint accessibility...');
    const testResponse = await fetch('http://localhost:5000/api/resources/16/allocations');
    console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(testResponse.headers.entries()));
    
    if (testResponse.status === 401) {
      console.log('   ✅ Endpoint requires authentication (expected)');
    } else {
      console.log('   ⚠️  Unexpected response - endpoint should require auth');
    }

    // Test with malformed resource ID
    console.log('\n2. Testing with invalid resource ID...');
    const invalidResponse = await fetch('http://localhost:5000/api/resources/invalid/allocations');
    console.log(`   Status: ${invalidResponse.status} ${invalidResponse.statusText}`);

    // Test response content type and body
    console.log('\n3. Testing response format...');
    const contentType = testResponse.headers.get('content-type');
    const contentLength = testResponse.headers.get('content-length');
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Content-Length: ${contentLength}`);

    // Try to read the response body
    try {
      const responseText = await testResponse.text();
      console.log(`   Response body length: ${responseText.length}`);
      console.log(`   Response body: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      if (responseText.trim()) {
        try {
          const parsed = JSON.parse(responseText);
          console.log('   ✅ Response is valid JSON');
        } catch (parseError) {
          console.log('   ❌ Response is not valid JSON:', parseError.message);
        }
      } else {
        console.log('   ⚠️  Response body is empty');
      }
    } catch (bodyError) {
      console.log('   ❌ Failed to read response body:', bodyError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Start the server: npm start');
  console.log('2. Login to get an auth token');
  console.log('3. Test with authentication:');
  console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/resources/16/allocations');
  console.log('4. Check server logs for detailed error information');
}

async function testWithAuth() {
  console.log('\n🔐 Testing with Authentication...');
  console.log('To test with authentication:');
  console.log('1. Open browser developer tools');
  console.log('2. Go to Application/Storage > Local Storage');
  console.log('3. Find "auth_token" value');
  console.log('4. Replace "YOUR_TOKEN_HERE" in this script');
  console.log('5. Uncomment the test code below\n');

  // Uncomment and replace YOUR_TOKEN_HERE with actual token
  /*
  const token = 'YOUR_TOKEN_HERE';
  try {
    const response = await fetch('http://localhost:5000/api/resources/16/allocations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Auth test status: ${response.status} ${response.statusText}`);
    console.log(`Auth test headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Found ${data.length} allocations`);
      console.log('Sample allocation:', data[0]);
    } else {
      const errorText = await response.text();
      console.log(`❌ Error response:`, errorText);
    }
  } catch (error) {
    console.log(`❌ Auth test failed:`, error.message);
  }
  */
}

// Run the tests
testAllocationsAPI().then(() => testWithAuth());
