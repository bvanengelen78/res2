// Test script to verify resource allocations endpoint

console.log('🔍 Testing Resource Allocations Endpoint...\n');

async function testAllocationsEndpoint() {
  try {
    console.log('📡 Testing /api/resources/:id/allocations endpoint...');
    
    // First, get the list of resources to find valid IDs
    console.log('   Getting list of resources...');
    const resourcesResponse = await fetch('http://localhost:5000/api/resources');
    
    if (resourcesResponse.status === 401) {
      console.log('   ⚠️  Resources endpoint requires authentication');
      console.log('   To test properly, you need to:');
      console.log('   1. Login to the application');
      console.log('   2. Get the token from localStorage');
      console.log('   3. Add it to this script');
      return;
    }
    
    if (!resourcesResponse.ok) {
      console.log(`   ❌ Failed to fetch resources: ${resourcesResponse.status} ${resourcesResponse.statusText}`);
      return;
    }
    
    const resources = await resourcesResponse.json();
    console.log(`   ✅ Found ${resources.length} resources`);
    
    if (resources.length === 0) {
      console.log('   ⚠️  No resources found to test with');
      return;
    }
    
    // Test allocations endpoint for the first few resources
    const testResources = resources.slice(0, 3);
    
    for (const resource of testResources) {
      console.log(`\n   Testing allocations for ${resource.name} (ID: ${resource.id})...`);
      
      const allocationsResponse = await fetch(`http://localhost:5000/api/resources/${resource.id}/allocations`);
      console.log(`   Response status: ${allocationsResponse.status} ${allocationsResponse.statusText}`);
      
      if (allocationsResponse.status === 401) {
        console.log('   ⚠️  Requires authentication');
      } else if (allocationsResponse.status === 403) {
        console.log('   ⚠️  Access forbidden (need admin or resource owner permissions)');
      } else if (allocationsResponse.ok) {
        const allocations = await allocationsResponse.json();
        console.log(`   ✅ Found ${allocations.length} allocations`);
        
        if (allocations.length > 0) {
          console.log('   Sample allocation:', {
            id: allocations[0].id,
            projectName: allocations[0].project?.name || 'Unknown',
            resourceId: allocations[0].resourceId,
            allocatedHours: allocations[0].allocatedHours,
            startDate: allocations[0].startDate,
            endDate: allocations[0].endDate,
            status: allocations[0].status
          });
        }
      } else {
        console.log(`   ❌ Failed: ${allocationsResponse.status} ${allocationsResponse.statusText}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testWithAuth() {
  console.log('\n🔐 Testing with Authentication...');
  console.log('   To test with authentication:');
  console.log('   1. Open browser developer tools');
  console.log('   2. Go to Application/Storage > Local Storage');
  console.log('   3. Find "auth_token" value');
  console.log('   4. Replace "YOUR_TOKEN_HERE" in this script');
  console.log('   5. Uncomment the test code below');
  
  // Example with authentication:
  // const token = 'YOUR_TOKEN_HERE';
  // const response = await fetch('http://localhost:5000/api/resources/1/allocations', {
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Content-Type': 'application/json'
  //   }
  // });
  // console.log(`   Auth response status: ${response.status}`);
  // if (response.ok) {
  //   const allocations = await response.json();
  //   console.log(`   ✅ Found ${allocations.length} allocations with auth`);
  // }
}

async function testEndpointStructure() {
  console.log('\n📋 Expected Endpoint Behavior...');
  console.log('   GET /api/resources/:id/allocations');
  console.log('   - Requires authentication (Bearer token)');
  console.log('   - Requires authorization:');
  console.log('     * System admin (system_admin permission)');
  console.log('     * Resource owner (own resource)');
  console.log('     * Resource manager (resource_management permission)');
  console.log('   - Returns array of allocations with project details');
  console.log('   - Each allocation includes:');
  console.log('     * id, resourceId, projectId, allocatedHours');
  console.log('     * startDate, endDate, status, role');
  console.log('     * project: { id, name, description, ... }');
}

// Run tests
testAllocationsEndpoint();
testWithAuth();
testEndpointStructure();

console.log('\n💡 Debugging Tips:');
console.log('   1. Check browser console for [MobileTimeLogging] debug logs');
console.log('   2. Check browser console for [ProjectHourGrid] debug logs');
console.log('   3. Verify selectedResourceId is being passed correctly');
console.log('   4. Check network tab for API requests and responses');
console.log('   5. Ensure admin user has proper permissions');
console.log('   6. Check server logs for authentication/authorization errors');
