// Final validation test for Harold's alert fix

async function validateHaroldFix() {
  console.log('🎯 Final Validation: Harold Alert Fix...\n');

  try {
    const response = await fetch('http://localhost:5000/api/dashboard/alerts');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const alertData = await response.json();
    
    console.log('📊 Enhanced Alerts Summary:');
    console.log(`   - Total Categories: ${alertData.categories?.length || 0}`);
    console.log(`   - Total Alerts: ${alertData.summary?.totalAlerts || 0}`);
    console.log(`   - Critical: ${alertData.summary?.criticalCount || 0}`);
    console.log(`   - Warnings: ${alertData.summary?.warningCount || 0}`);
    console.log(`   - Info: ${alertData.summary?.infoCount || 0}`);
    console.log(`   - Unassigned: ${alertData.summary?.unassignedCount || 0}`);
    
    // Find Harold in the alerts
    let haroldFound = false;
    let haroldCategory = null;
    let haroldUtilization = null;
    
    alertData.categories.forEach(category => {
      const haroldInCategory = category.resources.find(r => 
        r.name.includes('Harold') || r.name.includes('Lunenburg')
      );
      if (haroldInCategory) {
        haroldFound = true;
        haroldCategory = category.type;
        haroldUtilization = haroldInCategory.utilization;
      }
    });
    
    console.log('\n🔍 Harold Lunenburg Status:');
    if (haroldFound) {
      console.log(`   ✅ FOUND in ${haroldCategory} category`);
      console.log(`   📈 Utilization: ${haroldUtilization}%`);
      
      // Validate expected results
      if (haroldCategory === 'critical' && haroldUtilization === 200) {
        console.log('   🎉 PERFECT! Harold correctly shows as Critical Overallocation at 200%');
      } else {
        console.log(`   ⚠️  Unexpected: Expected critical/200%, got ${haroldCategory}/${haroldUtilization}%`);
      }
    } else {
      console.log('   ❌ NOT FOUND in any alert category');
    }
    
    // Show all critical alerts for verification
    const criticalCategory = alertData.categories.find(cat => cat.type === 'critical');
    if (criticalCategory) {
      console.log('\n🔥 Critical Overallocation Resources:');
      criticalCategory.resources.forEach(resource => {
        console.log(`   - ${resource.name}: ${resource.utilization}% (${resource.allocatedHours}h / ${resource.capacity}h)`);
      });
    }
    
    // Validation results
    console.log('\n📋 Validation Results:');
    console.log(`   Harold Detection: ${haroldFound ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Correct Category: ${haroldCategory === 'critical' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Correct Utilization: ${haroldUtilization === 200 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = haroldFound && haroldCategory === 'critical' && haroldUtilization === 200;
    
    if (allPassed) {
      console.log('\n🎉 SUCCESS! Harold alert fix is working correctly!');
      console.log('✨ Harold now appears in Critical Overallocation with 200% utilization');
      console.log('🔧 Weekly allocation data is being properly processed');
      console.log('📊 Enhanced alert system provides comprehensive coverage');
    } else {
      console.log('\n❌ VALIDATION FAILED - Harold alert fix needs more work');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

validateHaroldFix();
