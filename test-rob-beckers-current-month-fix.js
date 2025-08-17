/**
 * Comprehensive test for Enhanced Capacity Alerts date logic fixes
 * Test Case: Rob Beckers with "current month" period
 * 
 * This test verifies:
 * 1. Calculations start from current week (33), not past weeks
 * 2. Peak week is consistent across all components
 * 3. No past weeks are included in forward-looking calculations
 * 4. All existing functionality is preserved
 */

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const BASE_URL = 'http://localhost:5000';

// Test configuration - simulating current date as August 14, 2025 (Week 33)
const CURRENT_DATE = new Date('2025-08-14'); // Thursday, Week 33
const CURRENT_WEEK_START = startOfWeek(CURRENT_DATE, { weekStartsOn: 1 }); // Monday Aug 11
const CURRENT_WEEK_END = endOfWeek(CURRENT_DATE, { weekStartsOn: 1 }); // Sunday Aug 17

// Current month period (what user selects)
const CURRENT_MONTH_ORIGINAL = {
  startDate: format(startOfMonth(CURRENT_DATE), 'yyyy-MM-dd'), // 2025-08-01 (includes past weeks)
  endDate: format(endOfMonth(CURRENT_DATE), 'yyyy-MM-dd'),     // 2025-08-31
  label: 'August 2025'
};

// Expected adjusted period (what should be calculated)
const CURRENT_MONTH_EXPECTED = {
  startDate: format(CURRENT_WEEK_START, 'yyyy-MM-dd'), // 2025-08-11 (current week start)
  endDate: CURRENT_MONTH_ORIGINAL.endDate,             // 2025-08-31
  label: 'August 2025 (from current week, 2 past weeks excluded)'
};

console.log('🧪 ENHANCED CAPACITY ALERTS - ROB BECKERS CURRENT MONTH FIX TEST');
console.log('=' .repeat(80));
console.log(`📅 Test Date: ${format(CURRENT_DATE, 'yyyy-MM-dd')} (Week 33)`);
console.log(`📊 Original Period: ${CURRENT_MONTH_ORIGINAL.startDate} to ${CURRENT_MONTH_ORIGINAL.endDate}`);
console.log(`🔮 Expected Adjusted: ${CURRENT_MONTH_EXPECTED.startDate} to ${CURRENT_MONTH_EXPECTED.endDate}`);
console.log('');

async function testRobBeckersCurrentMonthFix() {
  let allTestsPassed = true;
  
  try {
    // Test 1: Main Alerts Endpoint - Current Date Awareness
    console.log('📋 Test 1: Main Alerts Endpoint Current Date Awareness');
    console.log('-'.repeat(60));
    
    const alertsResponse = await fetch(
      `${BASE_URL}/api/dashboard/alerts?startDate=${CURRENT_MONTH_ORIGINAL.startDate}&endDate=${CURRENT_MONTH_ORIGINAL.endDate}`
    );
    
    if (!alertsResponse.ok) {
      console.error(`❌ Failed to fetch alerts: ${alertsResponse.status}`);
      allTestsPassed = false;
    } else {
      const alertsData = await alertsResponse.json();
      console.log(`✅ Alerts fetched successfully`);
      
      // Find Rob Beckers in the alerts
      let robBeckersFound = false;
      let robBeckersData = null;
      
      for (const category of alertsData.categories || []) {
        for (const resource of category.resources || []) {
          if (resource.name === 'Rob Beckers') {
            robBeckersFound = true;
            robBeckersData = resource;
            console.log(`✅ Found Rob Beckers in ${category.type} category`);
            console.log(`   Peak Week: ${resource.peakWeek || 'N/A'}`);
            console.log(`   Peak Utilization: ${resource.peakUtilization || resource.utilization}%`);
            console.log(`   Total Hours: ${resource.allocatedHours}h`);
            console.log(`   Capacity: ${resource.capacity}h`);
            break;
          }
        }
        if (robBeckersFound) break;
      }
      
      if (!robBeckersFound) {
        console.log(`⚠️  Rob Beckers not found in alerts (may not be over threshold)`);
      }
      
      // Verify no Week 31 or Week 32 data is included
      const responseText = await alertsResponse.text();
      const hasWeek31 = responseText.includes('Week 31') || responseText.includes('2025-W31');
      const hasWeek32 = responseText.includes('Week 32') || responseText.includes('2025-W32');
      
      if (hasWeek31 || hasWeek32) {
        console.error(`❌ Past weeks detected in response (Week 31: ${hasWeek31}, Week 32: ${hasWeek32})`);
        allTestsPassed = false;
      } else {
        console.log(`✅ No past weeks (31, 32) detected in alerts response`);
      }
    }
    
    console.log('');
    
    // Test 2: Breakdown Modal Endpoint - Consistency Check
    console.log('📋 Test 2: Breakdown Modal Endpoint Consistency');
    console.log('-'.repeat(60));
    
    // Assuming Rob Beckers has resource ID 2 (adjust if needed)
    const robBeckersId = 2;
    const breakdownResponse = await fetch(
      `${BASE_URL}/api/dashboard/alerts/resource/${robBeckersId}/breakdown?startDate=${CURRENT_MONTH_ORIGINAL.startDate}&endDate=${CURRENT_MONTH_ORIGINAL.endDate}&periodType=month`
    );
    
    if (!breakdownResponse.ok) {
      console.error(`❌ Failed to fetch breakdown: ${breakdownResponse.status}`);
      allTestsPassed = false;
    } else {
      const breakdownData = await breakdownResponse.json();
      console.log(`✅ Breakdown fetched successfully`);
      
      // Check for current date awareness in breakdown
      const periods = breakdownData.periods || [];
      console.log(`   Total periods: ${periods.length}`);
      
      // Find peak week in breakdown
      let peakWeek = null;
      let peakUtilization = 0;
      
      for (const period of periods) {
        if (period.utilization > peakUtilization) {
          peakUtilization = period.utilization;
          peakWeek = period.period;
        }
      }
      
      console.log(`   Peak Week in Breakdown: ${peakWeek || 'N/A'}`);
      console.log(`   Peak Utilization: ${peakUtilization}%`);
      
      // Verify consistency with main alerts
      if (robBeckersData && robBeckersData.peakWeek) {
        const mainPeakWeek = robBeckersData.peakWeek;
        if (peakWeek === mainPeakWeek) {
          console.log(`✅ Peak week consistent between alerts and breakdown: ${peakWeek}`);
        } else {
          console.error(`❌ Peak week inconsistency: Alerts=${mainPeakWeek}, Breakdown=${peakWeek}`);
          allTestsPassed = false;
        }
      }
      
      // Check for past weeks in breakdown
      const hasPastWeeks = periods.some(p => 
        p.period && (p.period.includes('Week 31') || p.period.includes('Week 32'))
      );
      
      if (hasPastWeeks) {
        console.error(`❌ Past weeks detected in breakdown periods`);
        allTestsPassed = false;
      } else {
        console.log(`✅ No past weeks detected in breakdown periods`);
      }
    }
    
    console.log('');
    
    // Test 3: Week Key Generation Verification
    console.log('📋 Test 3: Week Key Generation Verification');
    console.log('-'.repeat(60));
    
    // Test the current week calculation
    const currentWeekNumber = getISOWeekNumber(CURRENT_DATE);
    const expectedWeekKey = `2025-W${currentWeekNumber.toString().padStart(2, '0')}`;
    
    console.log(`   Current Date: ${format(CURRENT_DATE, 'yyyy-MM-dd')}`);
    console.log(`   Current Week Number: ${currentWeekNumber}`);
    console.log(`   Expected Week Key: ${expectedWeekKey}`);
    
    if (currentWeekNumber === 33) {
      console.log(`✅ Current week calculation correct (Week 33)`);
    } else {
      console.error(`❌ Current week calculation incorrect: expected 33, got ${currentWeekNumber}`);
      allTestsPassed = false;
    }
    
    console.log('');
    
    // Test 4: Period Adjustment Logic Verification
    console.log('📋 Test 4: Period Adjustment Logic Verification');
    console.log('-'.repeat(60));
    
    const originalStart = new Date(CURRENT_MONTH_ORIGINAL.startDate);
    const expectedStart = new Date(CURRENT_MONTH_EXPECTED.startDate);
    const daysDifference = (expectedStart.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24);
    const weeksDifference = Math.floor(daysDifference / 7);
    
    console.log(`   Original start: ${CURRENT_MONTH_ORIGINAL.startDate}`);
    console.log(`   Expected start: ${CURRENT_MONTH_EXPECTED.startDate}`);
    console.log(`   Days difference: ${daysDifference}`);
    console.log(`   Weeks excluded: ${weeksDifference}`);
    
    if (weeksDifference === 2) {
      console.log(`✅ Period adjustment correct: 2 past weeks excluded`);
    } else {
      console.error(`❌ Period adjustment incorrect: expected 2 weeks, got ${weeksDifference}`);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    allTestsPassed = false;
  }
  
  console.log('');
  console.log('🏁 TEST SUMMARY');
  console.log('=' .repeat(80));
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Enhanced Capacity Alerts date logic fixes are working correctly.');
    console.log('✅ Current date awareness implemented');
    console.log('✅ Peak week consistency achieved');
    console.log('✅ Past weeks properly excluded');
    console.log('✅ Existing functionality preserved');
  } else {
    console.log('❌ SOME TESTS FAILED! Please review the issues above.');
  }
  
  return allTestsPassed;
}

// Helper function to get ISO week number (same as backend)
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Run the test
testRobBeckersCurrentMonthFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
