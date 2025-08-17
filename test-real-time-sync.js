// Test real-time data synchronization for ResourceFlow dashboard

async function testRealTimeSync() {
  console.log('🔄 Testing Real-time Data Synchronization...\n');

  try {
    // Step 1: Get initial dashboard state
    console.log('📊 Step 1: Getting initial dashboard state...');
    const initialResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    const initialAlerts = await initialResponse.json();
    
    console.log(`   Initial alerts: ${initialAlerts.summary?.totalAlerts || 0}`);
    
    // Find Harold's current status
    let haroldCategory = null;
    let haroldUtilization = null;
    
    initialAlerts.categories?.forEach(category => {
      const harold = category.resources?.find(r => 
        r.name.includes('Harold') || r.name.includes('Lunenburg')
      );
      if (harold) {
        haroldCategory = category.type;
        haroldUtilization = harold.utilization;
      }
    });
    
    console.log(`   Harold initial status: ${haroldCategory} at ${haroldUtilization}%\n`);

    // Step 2: Simulate allocation change for Harold
    console.log('🔧 Step 2: Simulating allocation change for Harold...');

    // We know Harold has allocations on projects 1 and 2, resource ID 17
    const haroldResourceId = 17;
    const testProjectId = 1; // Test with project 1
    const currentWeek = '2025-W29';
    const newHours = 20; // Reduce from 40 to 20 to test alert category change

    console.log(`   Updating Harold's ${currentWeek} allocation on Project ${testProjectId} to ${newHours}h...`);

    const updateResponse = await fetch(`http://localhost:5000/api/projects/${testProjectId}/weekly-allocations`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceId: haroldResourceId,
        weekKey: currentWeek,
        hours: newHours
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update allocation: ${updateResponse.status} - ${errorText}`);
    }

    console.log('   ✅ Allocation updated successfully\n');

    // Step 3: Wait a moment for cache invalidation
    console.log('⏳ Step 3: Waiting for cache invalidation...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Check updated dashboard state
    console.log('📊 Step 4: Checking updated dashboard state...');
    const updatedResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    const updatedAlerts = await updatedResponse.json();
    
    console.log(`   Updated alerts: ${updatedAlerts.summary?.totalAlerts || 0}`);
    
    // Find Harold's new status
    let newHaroldCategory = null;
    let newHaroldUtilization = null;
    
    updatedAlerts.categories?.forEach(category => {
      const harold = category.resources?.find(r => 
        r.name.includes('Harold') || r.name.includes('Lunenburg')
      );
      if (harold) {
        newHaroldCategory = category.type;
        newHaroldUtilization = harold.utilization;
      }
    });
    
    console.log(`   Harold updated status: ${newHaroldCategory} at ${newHaroldUtilization}%\n`);

    // Step 5: Validate synchronization
    console.log('✅ Step 5: Validation Results:');
    
    const alertsChanged = initialAlerts.summary?.totalAlerts !== updatedAlerts.summary?.totalAlerts;
    const haroldCategoryChanged = haroldCategory !== newHaroldCategory;
    const haroldUtilizationChanged = haroldUtilization !== newHaroldUtilization;
    
    console.log(`   Alert count changed: ${alertsChanged ? '✅ YES' : '❌ NO'}`);
    console.log(`   Harold category changed: ${haroldCategoryChanged ? '✅ YES' : '❌ NO'}`);
    console.log(`   Harold utilization changed: ${haroldUtilizationChanged ? '✅ YES' : '❌ NO'}`);
    
    if (alertsChanged || haroldCategoryChanged || haroldUtilizationChanged) {
      console.log('\n🎉 SUCCESS: Real-time synchronization is working!');
      console.log('✨ Dashboard data updates automatically when allocations change');
      console.log('🔄 Cache invalidation system is functioning correctly');
    } else {
      console.log('\n⚠️  WARNING: No changes detected');
      console.log('🔍 This could mean:');
      console.log('   - Cache invalidation is not working');
      console.log('   - The allocation change was too small to affect alerts');
      console.log('   - The system is working but change was not significant enough');
    }

    // Step 6: Restore original allocation
    console.log('\n🔄 Step 6: Restoring original allocation...');
    const restoreResponse = await fetch(`http://localhost:5000/api/projects/${testProjectId}/weekly-allocations`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceId: haroldResourceId,
        weekKey: currentWeek,
        hours: 40 // Restore to original 40h
      })
    });

    if (restoreResponse.ok) {
      console.log('   ✅ Original allocation restored');
    } else {
      console.log('   ⚠️  Failed to restore original allocation');
    }

    console.log('\n📋 Real-time Synchronization Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealTimeSync();
