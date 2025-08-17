// Comprehensive test script for Enhanced Capacity Alerts calculation accuracy
// Tests period-aware calculations for all period types

// Use built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:5000';

// Test periods configuration
const TEST_PERIODS = [
  {
    name: 'Current Week',
    startDate: '2025-01-13', // Monday
    endDate: '2025-01-19',   // Sunday
    expectedWeeks: 1,
    expectedMultiplier: 1
  },
  {
    name: 'Current Month',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    expectedWeeks: 5, // Approximately 5 weeks in January 2025
    expectedMultiplier: 5
  },
  {
    name: 'Current Quarter',
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    expectedWeeks: 13, // Q1 2025
    expectedMultiplier: 13
  },
  {
    name: 'Current Year',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    expectedWeeks: 52,
    expectedMultiplier: 52
  }
];

// Expected calculation constants
const WEEKLY_CAPACITY = 40;
const NON_PROJECT_HOURS = 8;
const WEEKLY_EFFECTIVE_CAPACITY = WEEKLY_CAPACITY - NON_PROJECT_HOURS; // 32h

async function testPeriodCalculations() {
  console.log('🧪 ENHANCED CAPACITY ALERTS - CALCULATION ACCURACY TEST');
  console.log('=' .repeat(70));
  
  let allTestsPassed = true;
  
  for (const period of TEST_PERIODS) {
    console.log(`\n📅 Testing Period: ${period.name}`);
    console.log(`   Date Range: ${period.startDate} to ${period.endDate}`);
    console.log(`   Expected Weeks: ${period.expectedWeeks}`);
    
    try {
      // Test 1: Fetch alerts for the period
      const alertsResponse = await fetch(`${BASE_URL}/api/dashboard/alerts?startDate=${period.startDate}&endDate=${period.endDate}`);
      
      if (!alertsResponse.ok) {
        console.error(`❌ Failed to fetch alerts: ${alertsResponse.status}`);
        allTestsPassed = false;
        continue;
      }
      
      const alertsData = await alertsResponse.json();
      console.log(`   ✅ Alerts API responded successfully`);
      console.log(`   📊 Total alerts: ${alertsData.summary?.totalAlerts || 0}`);
      
      // Test 2: Validate period-aware calculations
      if (alertsData.categories && alertsData.categories.length > 0) {
        for (const category of alertsData.categories) {
          if (category.resources && category.resources.length > 0) {
            console.log(`\n   🔍 Validating ${category.title} (${category.resources.length} resources):`);
            
            for (const resource of category.resources.slice(0, 3)) { // Test first 3 resources
              const expectedPeriodCapacity = WEEKLY_EFFECTIVE_CAPACITY * period.expectedMultiplier;
              const calculatedUtilization = Math.round((resource.allocatedHours / expectedPeriodCapacity) * 100);
              
              console.log(`     • ${resource.name}:`);
              console.log(`       - Allocated Hours: ${resource.allocatedHours}h`);
              console.log(`       - Reported Capacity: ${resource.capacity}h`);
              console.log(`       - Expected Capacity: ${expectedPeriodCapacity}h (${WEEKLY_EFFECTIVE_CAPACITY}h × ${period.expectedMultiplier})`);
              console.log(`       - Reported Utilization: ${resource.utilization}%`);
              console.log(`       - Expected Utilization: ${calculatedUtilization}%`);
              
              // Validate capacity scaling
              if (Math.abs(resource.capacity - expectedPeriodCapacity) > 1) {
                console.log(`       ❌ CAPACITY MISMATCH: Expected ${expectedPeriodCapacity}h, got ${resource.capacity}h`);
                allTestsPassed = false;
              } else {
                console.log(`       ✅ Capacity correctly scaled for period`);
              }
              
              // Validate utilization calculation (allow 1% tolerance for rounding)
              if (Math.abs(resource.utilization - calculatedUtilization) > 1) {
                console.log(`       ❌ UTILIZATION MISMATCH: Expected ${calculatedUtilization}%, got ${resource.utilization}%`);
                allTestsPassed = false;
              } else {
                console.log(`       ✅ Utilization correctly calculated`);
              }
            }
          }
        }
      }
      
      // Test 3: Test detailed breakdown for a specific resource
      if (alertsData.categories && alertsData.categories.length > 0) {
        const firstCategory = alertsData.categories[0];
        if (firstCategory.resources && firstCategory.resources.length > 0) {
          const testResource = firstCategory.resources[0];
          
          console.log(`\n   🔬 Testing detailed breakdown for ${testResource.name}:`);
          
          const breakdownResponse = await fetch(
            `${BASE_URL}/api/dashboard/alerts/resource/${testResource.id}/breakdown?startDate=${period.startDate}&endDate=${period.endDate}&periodType=week`
          );
          
          if (breakdownResponse.ok) {
            const breakdownData = await breakdownResponse.json();
            console.log(`     ✅ Breakdown API responded successfully`);
            console.log(`     📈 Overall utilization: ${breakdownData.summary?.overallUtilization}%`);
            console.log(`     📊 Total periods: ${breakdownData.summary?.totalPeriods}`);
            console.log(`     🧮 Calculation formula: ${breakdownData.summary?.calculationFormula}`);
            
            // Validate period count
            if (Math.abs(breakdownData.summary?.totalPeriods - period.expectedWeeks) > 1) {
              console.log(`     ❌ PERIOD COUNT MISMATCH: Expected ~${period.expectedWeeks}, got ${breakdownData.summary?.totalPeriods}`);
              allTestsPassed = false;
            } else {
              console.log(`     ✅ Period count is correct`);
            }
          } else {
            console.log(`     ❌ Breakdown API failed: ${breakdownResponse.status}`);
            allTestsPassed = false;
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${period.name}:`, error.message);
      allTestsPassed = false;
    }
  }
  
  // Test 4: Cross-period consistency check
  console.log(`\n🔄 Cross-Period Consistency Check:`);
  try {
    const weekResponse = await fetch(`${BASE_URL}/api/dashboard/alerts?startDate=${TEST_PERIODS[0].startDate}&endDate=${TEST_PERIODS[0].endDate}`);
    const monthResponse = await fetch(`${BASE_URL}/api/dashboard/alerts?startDate=${TEST_PERIODS[1].startDate}&endDate=${TEST_PERIODS[1].endDate}`);
    
    if (weekResponse.ok && monthResponse.ok) {
      const weekData = await weekResponse.json();
      const monthData = await monthResponse.json();
      
      console.log(`   📊 Week alerts: ${weekData.summary?.totalAlerts || 0}`);
      console.log(`   📊 Month alerts: ${monthData.summary?.totalAlerts || 0}`);
      console.log(`   ✅ Cross-period data fetched successfully`);
    }
  } catch (error) {
    console.error(`   ❌ Cross-period test failed:`, error.message);
    allTestsPassed = false;
  }
  
  // Final results
  console.log('\n' + '='.repeat(70));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED - Enhanced Capacity Alerts calculations are accurate!');
    console.log('✅ Period aggregation is working correctly');
    console.log('✅ Capacity scaling is working correctly');
    console.log('✅ Utilization calculations are accurate');
    console.log('✅ Detailed breakdowns are functioning properly');
  } else {
    console.log('❌ SOME TESTS FAILED - Review the issues above');
    console.log('🔧 Check the backend calculation logic in /api/dashboard/alerts');
    console.log('🔧 Verify period multiplier calculations');
    console.log('🔧 Ensure weekly allocations data is complete');
  }
  
  return allTestsPassed;
}

// Run the tests
testPeriodCalculations()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testPeriodCalculations };
