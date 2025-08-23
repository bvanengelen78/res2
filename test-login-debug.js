// Debug the login endpoint specifically

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testLogin() {
  console.log('🔍 Testing Login Endpoint');
  console.log('=' .repeat(40));

  try {
    console.log('\n📋 Testing /api/login endpoint');
    
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@swisssense.nl',
        password: 'admin'
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);

    const responseText = await response.text();
    console.log(`Raw Response: ${responseText}`);

    if (response.status === 200) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Login successful!');
        console.log(`User: ${data.user?.email}`);
        console.log(`Roles: ${data.user?.roles?.join(', ')}`);
        console.log(`Permissions: ${data.user?.permissions?.length} permissions`);
        console.log(`Token: ${data.tokens?.accessToken ? 'Present' : 'Missing'}`);
      } catch (e) {
        console.log('⚠️ Response not JSON:', e.message);
      }
    } else {
      try {
        const errorData = JSON.parse(responseText);
        console.log(`❌ Login failed: ${errorData.error}`);
        if (errorData.message) {
          console.log(`Details: ${errorData.message}`);
        }
      } catch (e) {
        console.log(`❌ Login failed with non-JSON response: ${responseText}`);
      }
    }

  } catch (error) {
    console.log('💥 Test failed!');
    console.error('Error:', error.message);
  }
}

testLogin();
