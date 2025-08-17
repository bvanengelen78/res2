// Test script to verify admin resource selector functionality

console.log('🔍 Testing Admin Resource Selector API...\n');

async function testResourcesEndpoint() {
  try {
    console.log('📡 Testing /api/resources endpoint...');
    
    // Test without authentication first
    console.log('   Testing without auth...');
    const noAuthResponse = await fetch('http://localhost:5000/api/resources');
    console.log(`   Response status: ${noAuthResponse.status} ${noAuthResponse.statusText}`);
    
    if (noAuthResponse.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log('   ⚠️  Endpoint accessible without auth - this might be a security issue');
    }
    
    // Test with authentication (you'll need to provide a valid token)
    console.log('\n   Testing with auth (you need to provide a valid token)...');
    console.log('   To test with auth, you need to:');
    console.log('   1. Login to the application');
    console.log('   2. Get the token from localStorage');
    console.log('   3. Add it to this script');
    
    // Example of how to test with auth:
    // const token = 'your-jwt-token-here';
    // const authResponse = await fetch('http://localhost:5000/api/resources', {
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    //   }
    // });
    // console.log(`   Auth response status: ${authResponse.status}`);
    // if (authResponse.ok) {
    //   const resources = await authResponse.json();
    //   console.log(`   ✅ Found ${resources.length} resources`);
    //   console.log('   Sample resources:', resources.slice(0, 3).map(r => ({ id: r.id, name: r.name, isActive: r.isActive })));
    // }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testPermissions() {
  console.log('\n🔐 Testing Permission Requirements...');
  console.log('   The /api/resources endpoint requires one of these permissions:');
  console.log('   - resource_management');
  console.log('   - time_logging');
  console.log('   - system_admin');
  console.log('\n   Admin users should have either:');
  console.log('   - system_admin permission');
  console.log('   - resource_management permission');
}

async function testResourceStructure() {
  console.log('\n📋 Expected Resource Structure...');
  console.log('   Each resource should have:');
  console.log('   - id: number');
  console.log('   - name: string');
  console.log('   - email: string');
  console.log('   - isActive: boolean');
  console.log('   - isDeleted: boolean');
  console.log('   - role: string');
  console.log('   - department: string');
  console.log('   - weeklyCapacity: string');
}

// Run tests
testResourcesEndpoint();
testPermissions();
testResourceStructure();

console.log('\n💡 Debugging Tips:');
console.log('   1. Check browser console for [AdminResourceSelector] debug logs');
console.log('   2. Verify user has admin permissions (system_admin or resource_management)');
console.log('   3. Check network tab for /api/resources request');
console.log('   4. Ensure authentication token is valid');
console.log('   5. Check server logs for authentication/authorization errors');
