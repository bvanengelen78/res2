// Comprehensive investigation of Harold's data structure

async function investigateHaroldData() {
  console.log('🔍 Comprehensive Harold Data Investigation...\n');

  try {
    // 1. Check the heatmap endpoint which shows the UI data
    console.log('1. Checking heatmap data (UI source)...');
    const heatmapResponse = await fetch('http://localhost:5000/api/dashboard/heatmap');
    
    if (heatmapResponse.ok) {
      const heatmapData = await heatmapResponse.json();
      const harold = heatmapData.find(r => r.name.includes('Harold') || r.name.includes('Lunenburg'));
      
      if (harold) {
        console.log('✅ Harold found in heatmap data:');
        console.log(`   - Name: ${harold.name}`);
        console.log(`   - ID: ${harold.id}`);
        console.log(`   - Utilization: ${harold.utilization}%`);
        console.log(`   - Allocated Hours: ${harold.allocatedHours}`);
        console.log(`   - Capacity: ${harold.capacity}`);
        console.log(`   - Weekly Data:`, harold.weeklyData || 'Not available');
      } else {
        console.log('❌ Harold not found in heatmap data');
      }
    } else {
      console.log(`❌ Failed to fetch heatmap data: ${heatmapResponse.status}`);
    }

    // 2. Check all allocations endpoint
    console.log('\n2. Checking all allocations...');
    const allocationsResponse = await fetch('http://localhost:5000/api/allocations');
    
    if (allocationsResponse.ok) {
      const allAllocations = await allocationsResponse.json();
      console.log(`   Total allocations: ${allAllocations.length}`);
      
      // Find Harold's allocations by searching for his name in resources
      const haroldAllocations = [];
      
      // We need to match by resource ID, but first let's see the structure
      console.log('\n   Sample allocation structure:');
      if (allAllocations.length > 0) {
        const sample = allAllocations[0];
        console.log('   Sample allocation keys:', Object.keys(sample));
        console.log('   Sample allocation:', JSON.stringify(sample, null, 2));
      }
      
      // Look for allocations that might be Harold's
      // We'll need to cross-reference with resource data
      console.log('\n   Looking for potential Harold allocations...');
      allAllocations.forEach((alloc, index) => {
        if (index < 5) { // Show first 5 for analysis
          console.log(`   Allocation ${index + 1}:`);
          console.log(`     - Resource ID: ${alloc.resourceId}`);
          console.log(`     - Project ID: ${alloc.projectId}`);
          console.log(`     - Allocated Hours: ${alloc.allocatedHours}`);
          console.log(`     - Status: ${alloc.status}`);
          console.log(`     - Weekly Allocations:`, alloc.weeklyAllocations ? 'Present' : 'Not present');
          if (alloc.weeklyAllocations) {
            console.log(`       Weekly data keys:`, Object.keys(alloc.weeklyAllocations));
          }
        }
      });
      
    } else {
      console.log(`❌ Failed to fetch allocations: ${allocationsResponse.status}`);
    }

    // 3. Try to get Harold's specific resource data
    console.log('\n3. Attempting to find Harold\'s resource ID...');
    
    // We'll try some common IDs or look for patterns
    const potentialIds = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30]; // Common ID ranges
    
    for (const id of potentialIds) {
      try {
        const resourceResponse = await fetch(`http://localhost:5000/api/resources/${id}`);
        if (resourceResponse.ok) {
          const resourceData = await resourceResponse.json();
          if (resourceData.name && (resourceData.name.includes('Harold') || resourceData.name.includes('Lunenburg'))) {
            console.log(`✅ Found Harold with ID ${id}:`);
            console.log(`   - Name: ${resourceData.name}`);
            console.log(`   - Email: ${resourceData.email}`);
            console.log(`   - Department: ${resourceData.department}`);
            console.log(`   - Weekly Capacity: ${resourceData.weeklyCapacity}`);
            console.log(`   - Is Active: ${resourceData.isActive}`);
            console.log(`   - Allocations count: ${resourceData.allocations?.length || 0}`);
            
            if (resourceData.allocations && resourceData.allocations.length > 0) {
              console.log('   - Allocation details:');
              resourceData.allocations.forEach((alloc, idx) => {
                console.log(`     ${idx + 1}. Project: ${alloc.project?.name || alloc.projectId}`);
                console.log(`        Hours: ${alloc.allocatedHours}, Status: ${alloc.status}`);
                console.log(`        Weekly Allocations:`, alloc.weeklyAllocations ? 'Present' : 'Not present');
                if (alloc.weeklyAllocations) {
                  console.log(`        Weekly data:`, alloc.weeklyAllocations);
                }
              });
            }
            break;
          }
        }
      } catch (e) {
        // Skip errors for non-existent resources
      }
    }

    console.log('\n🔍 Investigation complete!');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

investigateHaroldData();
