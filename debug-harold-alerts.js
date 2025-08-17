// Debug script to investigate Harold's alert detection issue

async function debugHaroldAlerts() {
  console.log('🔍 Debugging Harold Lunenburg Alert Detection...\n');

  try {
    // 1. First, get all resources to find Harold
    console.log('1. Fetching all resources...');
    const resourcesResponse = await fetch('http://localhost:5000/api/resources');
    
    if (!resourcesResponse.ok) {
      throw new Error(`Failed to fetch resources: ${resourcesResponse.status}`);
    }
    
    const resources = await resourcesResponse.json();
    console.log(`   Found ${resources.length} total resources`);
    
    // Find Harold
    const harold = resources.find(r => r.name.includes('Harold') || r.name.includes('Lunenburg'));
    
    if (!harold) {
      console.log('❌ Harold Lunenburg not found in resources list');
      console.log('   Available resources:');
      resources.forEach(r => console.log(`   - ${r.name} (ID: ${r.id}, Active: ${r.isActive})`));
      return;
    }
    
    console.log('✅ Found Harold:');
    console.log(`   - ID: ${harold.id}`);
    console.log(`   - Name: ${harold.name}`);
    console.log(`   - Email: ${harold.email}`);
    console.log(`   - Department: ${harold.department}`);
    console.log(`   - Role: ${harold.role}`);
    console.log(`   - Weekly Capacity: ${harold.weeklyCapacity}`);
    console.log(`   - Is Active: ${harold.isActive}`);
    console.log(`   - Is Deleted: ${harold.isDeleted}`);
    
    // 2. Get Harold's allocations
    console.log('\n2. Fetching Harold\'s allocations...');
    const allocationsResponse = await fetch(`http://localhost:5000/api/resources/${harold.id}/allocations`);
    
    if (!allocationsResponse.ok) {
      console.log(`❌ Failed to fetch Harold's allocations: ${allocationsResponse.status}`);
    } else {
      const allocations = await allocationsResponse.json();
      console.log(`   Found ${allocations.length} allocations for Harold`);
      
      let totalHours = 0;
      allocations.forEach((alloc, index) => {
        console.log(`   Allocation ${index + 1}:`);
        console.log(`     - Project: ${alloc.project?.name || 'Unknown'}`);
        console.log(`     - Allocated Hours: ${alloc.allocatedHours}`);
        console.log(`     - Status: ${alloc.status}`);
        console.log(`     - Start Date: ${alloc.startDate}`);
        console.log(`     - End Date: ${alloc.endDate}`);
        
        if (alloc.status === 'active') {
          totalHours += parseFloat(alloc.allocatedHours || '0');
        }
      });
      
      const capacity = parseFloat(harold.weeklyCapacity || '40');
      const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;
      
      console.log(`\n   📊 Harold's Capacity Summary:`);
      console.log(`     - Total Active Hours: ${totalHours}h`);
      console.log(`     - Weekly Capacity: ${capacity}h`);
      console.log(`     - Utilization: ${utilization}%`);
    }
    
    // 3. Get all allocations to see if Harold appears there
    console.log('\n3. Checking all allocations for Harold...');
    const allAllocationsResponse = await fetch('http://localhost:5000/api/allocations');
    
    if (!allAllocationsResponse.ok) {
      console.log(`❌ Failed to fetch all allocations: ${allAllocationsResponse.status}`);
    } else {
      const allAllocations = await allAllocationsResponse.json();
      const haroldAllocations = allAllocations.filter(a => a.resourceId === harold.id);
      
      console.log(`   Found ${haroldAllocations.length} allocations for Harold in global list`);
      
      let activeHours = 0;
      haroldAllocations.forEach(alloc => {
        if (alloc.status === 'active') {
          activeHours += parseFloat(alloc.allocatedHours || '0');
          console.log(`     - Active: ${alloc.allocatedHours}h (Project ID: ${alloc.projectId})`);
        }
      });
      
      console.log(`   Total active hours from global list: ${activeHours}h`);
    }
    
    // 4. Test the alerts endpoint specifically
    console.log('\n4. Testing alerts endpoint...');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    
    if (!alertsResponse.ok) {
      console.log(`❌ Failed to fetch alerts: ${alertsResponse.status}`);
    } else {
      const alertData = await alertsResponse.json();
      
      // Check if Harold appears in any category
      let haroldFound = false;
      alertData.categories.forEach(category => {
        const haroldInCategory = category.resources.find(r => r.id === harold.id);
        if (haroldInCategory) {
          haroldFound = true;
          console.log(`   ✅ Harold found in ${category.type} category:`);
          console.log(`     - Utilization: ${haroldInCategory.utilization}%`);
          console.log(`     - Allocated Hours: ${haroldInCategory.allocatedHours}h`);
          console.log(`     - Capacity: ${haroldInCategory.capacity}h`);
        }
      });
      
      if (!haroldFound) {
        console.log('   ❌ Harold NOT found in any alert category');
        console.log('   📋 Current alert categories:');
        alertData.categories.forEach(cat => {
          console.log(`     - ${cat.type}: ${cat.count} resources`);
        });
      }
    }
    
    console.log('\n🔍 Investigation complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugHaroldAlerts();
