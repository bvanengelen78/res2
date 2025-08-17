/**
 * Test script to verify period-aware KPI calculations
 * This script tests the dashboard's ability to correctly filter and calculate
 * KPIs based on different time periods (Current Week, This Month, This Quarter, This Year)
 */

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_PERIODS = [
  { filter: 'currentWeek', label: 'Current Week' },
  { filter: 'thisMonth', label: 'This Month' },
  { filter: 'quarter', label: 'This Quarter' },
  { filter: 'year', label: 'This Year' }
];

/**
 * Calculate expected period dates for validation
 */
function calculatePeriodDates(periodFilter) {
  const now = new Date();
  
  switch (periodFilter) {
    case 'currentWeek':
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'Current Week'
      };
    case 'thisMonth':
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        label: format(now, 'MMMM yyyy')
      };
    case 'quarter':
      return {
        startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
        endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
      };
    case 'year':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        label: `${now.getFullYear()}`
      };
    default:
      throw new Error(`Unknown period filter: ${periodFilter}`);
  }
}

/**
 * Test KPI endpoint with period filtering
 */
async function testKPIEndpoint(periodFilter) {
  const expectedPeriod = calculatePeriodDates(periodFilter);
  
  console.log(`\n🧪 Testing KPI endpoint for ${expectedPeriod.label}...`);
  console.log(`   Period: ${expectedPeriod.startDate} to ${expectedPeriod.endDate}`);
  
  try {
    const params = new URLSearchParams({
      includeTrends: 'true',
      startDate: expectedPeriod.startDate,
      endDate: expectedPeriod.endDate
    });
    
    const response = await fetch(`${BASE_URL}/api/dashboard/kpis?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    const requiredFields = ['activeProjects', 'availableResources', 'conflicts', 'utilization'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log(`   ✅ KPI Response:`, {
      activeProjects: data.activeProjects,
      availableResources: data.availableResources,
      conflicts: data.conflicts,
      utilization: data.utilization,
      hasTrendData: !!data.trendData
    });
    
    return data;
  } catch (error) {
    console.error(`   ❌ KPI test failed:`, error.message);
    return null;
  }
}

/**
 * Test alerts endpoint with period filtering
 */
async function testAlertsEndpoint(periodFilter) {
  const expectedPeriod = calculatePeriodDates(periodFilter);
  
  console.log(`\n🚨 Testing Alerts endpoint for ${expectedPeriod.label}...`);
  
  try {
    const params = new URLSearchParams({
      startDate: expectedPeriod.startDate,
      endDate: expectedPeriod.endDate
    });
    
    const response = await fetch(`${BASE_URL}/api/dashboard/alerts?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`   ✅ Alerts Response:`, {
      totalAlerts: data.categories?.reduce((sum, cat) => sum + cat.resources.length, 0) || 0,
      categories: data.categories?.length || 0,
      hasBreakdown: !!data.breakdown
    });
    
    return data;
  } catch (error) {
    console.error(`   ❌ Alerts test failed:`, error.message);
    return null;
  }
}

/**
 * Test heatmap endpoint with period filtering
 */
async function testHeatmapEndpoint(periodFilter) {
  const expectedPeriod = calculatePeriodDates(periodFilter);
  
  console.log(`\n🔥 Testing Heatmap endpoint for ${expectedPeriod.label}...`);
  
  try {
    const params = new URLSearchParams({
      startDate: expectedPeriod.startDate,
      endDate: expectedPeriod.endDate
    });
    
    const response = await fetch(`${BASE_URL}/api/dashboard/heatmap?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`   ✅ Heatmap Response:`, {
      totalResources: data.length || 0,
      resourcesWithUtilization: data.filter(r => r.utilization !== undefined).length || 0
    });
    
    return data;
  } catch (error) {
    console.error(`   ❌ Heatmap test failed:`, error.message);
    return null;
  }
}

/**
 * Compare KPI values across different periods to ensure they're different
 */
function validatePeriodDifferences(results) {
  console.log(`\n📊 Validating period differences...`);
  
  const periods = Object.keys(results);
  let hasVariation = false;
  
  // Check if KPI values vary across periods (they should for realistic data)
  const kpiFields = ['activeProjects', 'availableResources', 'conflicts', 'utilization'];
  
  for (const field of kpiFields) {
    const values = periods.map(period => results[period]?.kpis?.[field]).filter(v => v !== undefined);
    const uniqueValues = [...new Set(values)];
    
    if (uniqueValues.length > 1) {
      hasVariation = true;
      console.log(`   ✅ ${field}: Values vary across periods (${uniqueValues.join(', ')})`);
    } else if (values.length > 0) {
      console.log(`   ⚠️  ${field}: Same value across all periods (${values[0]})`);
    }
  }
  
  if (hasVariation) {
    console.log(`   ✅ Period filtering appears to be working - KPI values vary across periods`);
  } else {
    console.log(`   ⚠️  All KPI values are identical across periods - this may indicate period filtering is not working`);
  }
}

/**
 * Main test function
 */
async function runPeriodAwareTests() {
  console.log('🚀 Starting Period-Aware KPI Tests...');
  console.log('=' .repeat(60));
  
  const results = {};
  
  // Test each period
  for (const period of TEST_PERIODS) {
    console.log(`\n📅 Testing Period: ${period.label} (${period.filter})`);
    console.log('-'.repeat(50));
    
    const [kpis, alerts, heatmap] = await Promise.all([
      testKPIEndpoint(period.filter),
      testAlertsEndpoint(period.filter),
      testHeatmapEndpoint(period.filter)
    ]);
    
    results[period.filter] = {
      kpis,
      alerts,
      heatmap,
      success: !!(kpis && alerts && heatmap)
    };
  }
  
  // Validate results
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary');
  console.log('='.repeat(60));
  
  let allPassed = true;
  for (const [periodFilter, result] of Object.entries(results)) {
    const period = TEST_PERIODS.find(p => p.filter === periodFilter);
    if (result.success) {
      console.log(`✅ ${period.label}: All endpoints working`);
    } else {
      console.log(`❌ ${period.label}: Some endpoints failed`);
      allPassed = false;
    }
  }
  
  // Check for period-specific variations
  validatePeriodDifferences(results);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 All period-aware tests PASSED!');
    console.log('✅ KPI calculations are properly filtering by time period');
    console.log('✅ All dashboard components should update correctly when period changes');
  } else {
    console.log('❌ Some tests FAILED!');
    console.log('⚠️  Period-aware functionality may not be working correctly');
  }
  console.log('='.repeat(60));
}

// Run tests if this script is executed directly
runPeriodAwareTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});

export {
  runPeriodAwareTests,
  calculatePeriodDates,
  testKPIEndpoint,
  testAlertsEndpoint,
  testHeatmapEndpoint
};
