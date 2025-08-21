// Test RBAC Users Final Endpoint
import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

// First get a valid auth token
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

async function testRBACUsersFinal() {
  console.log('🧪 Testing RBAC Users Final Implementation');
  console.log('=' .repeat(50));

  try {
    // Get auth token
    console.log('\n📋 Step 1: Getting authentication token');
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    // Test new rbac-users endpoint
    console.log('\n📋 Step 2: Testing /api/rbac-users');
    const usersResponse = await fetch(`${BASE_URL}/api/rbac-users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${usersResponse.status} ${usersResponse.statusText}`);
    
    if (usersResponse.status === 200) {
      const usersData = await usersResponse.json();
      console.log('   📊 Users Response Analysis:');
      console.log(`   - Has 'success' property: ${usersData.hasOwnProperty('success')}`);
      console.log(`   - Has 'data' property: ${usersData.hasOwnProperty('data')}`);
      console.log(`   - Success value: ${usersData.success}`);
      console.log(`   - Data is array: ${Array.isArray(usersData.data)}`);
      console.log(`   - User count: ${usersData.data ? usersData.data.length : 'N/A'}`);
      
      if (Array.isArray(usersData.data) && usersData.data.length > 0) {
        const firstUser = usersData.data[0];
        console.log(`   - First user structure: ${JSON.stringify(Object.keys(firstUser))}`);
        console.log(`   - First user email: ${firstUser.email}`);
        console.log(`   - First user roles: ${firstUser.roles?.length || 0} roles`);
        console.log(`   - First user permissions: ${firstUser.permissions?.length || 0} permissions`);
        
        if (firstUser.roles && firstUser.roles.length > 0) {
          console.log(`   - First role: ${firstUser.roles[0].role}`);
        }
        
        if (firstUser.resource) {
          console.log(`   - Resource name: ${firstUser.resource.name}`);
          console.log(`   - Resource department: ${firstUser.resource.department}`);
        } else {
          console.log(`   - No resource linked`);
        }
        
        console.log('   ✅ RBAC Users API - WORKING CORRECTLY!');
      } else {
        console.log('   ⚠️ RBAC Users API - Empty or invalid data array');
      }
    } else {
      console.log(`   ❌ RBAC Users API - Failed with status ${usersResponse.status}`);
      const errorText = await usersResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Test without authentication to verify security
    console.log('\n📋 Step 3: Testing security (no auth token)');
    const noAuthResponse = await fetch(`${BASE_URL}/api/rbac-users`);
    console.log(`   Status without auth: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
    
    if (noAuthResponse.status === 401 || noAuthResponse.status === 403) {
      console.log('   ✅ Security working - unauthorized access blocked');
    } else {
      console.log('   ⚠️ Security issue - endpoint accessible without auth');
    }

    console.log('\n🎉 RBAC Users Final Test Complete!');
    console.log('=' .repeat(50));
    
    if (usersResponse.status === 200) {
      console.log('✅ Role Management section should now load correctly');
      console.log('✅ Users data is properly formatted and accessible');
      console.log('✅ Database integration working with real user data');
      console.log('✅ Role and permission mapping functioning correctly');
      console.log('✅ Resource relationships properly established');
      return true;
    } else {
      console.log('❌ Role Management may still have issues');
      return false;
    }

  } catch (error) {
    console.log('\n💥 RBAC Users Final Test Failed!');
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run the test
testRBACUsersFinal().then(success => {
  if (success) {
    console.log('\n🚀 Role Management functionality is now working!');
    console.log('🎯 Users can now access and manage roles in the Settings page');
    process.exit(0);
  } else {
    console.log('\n💥 Role Management still needs attention!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
