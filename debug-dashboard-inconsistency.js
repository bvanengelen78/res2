// Debug script to investigate dashboard data inconsistency
// This script tests both KPI and alerts endpoints to identify the discrepancy

async function debugDashboardInconsistency() {
  console.log('🔍 Debugging Dashboard Data Inconsistency\n');
  
  try {
    // Test KPIs endpoint
    console.log('📊 Testing KPIs endpoint...');
    const kpiResponse = await fetch(`http://localhost:5000/api/dashboard/kpis?debug=true&t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!kpiResponse.ok) {
      console.log(`❌ KPI endpoint failed: ${kpiResponse.status}`);
      return;
    }
    
    const kpiData = await kpiResponse.json();
    console.log('✅ KPI Data:');
    console.log(`   - Active Projects: ${kpiData.activeProjects}`);
    console.log(`   - Available Resources: ${kpiData.availableResources}`);
    console.log(`   - Conflicts: ${kpiData.conflicts} ⚠️`);
    console.log(`   - Utilization: ${kpiData.utilization}%\n`);
    
    // Test Alerts endpoint
    console.log('🚨 Testing Alerts endpoint...');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    
    if (!alertsResponse.ok) {
      console.log(`❌ Alerts endpoint failed: ${alertsResponse.status}`);
      return;
    }
    
    const alertsData = await alertsResponse.json();
    console.log('✅ Alerts Data:');
    console.log(`   - Total Alerts: ${alertsData.summary.totalAlerts} ⚠️`);
    console.log(`   - Critical: ${alertsData.summary.criticalCount}`);
    console.log(`   - Warning: ${alertsData.summary.warningCount}`);
    console.log(`   - Info: ${alertsData.summary.infoCount}`);
    console.log(`   - Unassigned: ${alertsData.summary.unassignedCount}\n`);
    
    // Analyze the discrepancy
    console.log('🔍 ANALYSIS:');
    console.log(`   - KPI Conflicts Count: ${kpiData.conflicts}`);
    console.log(`   - Alerts Total Count: ${alertsData.summary.totalAlerts}`);
    console.log(`   - Discrepancy: ${Math.abs(kpiData.conflicts - alertsData.summary.totalAlerts)}\n`);
    
    if (kpiData.conflicts !== alertsData.summary.totalAlerts) {
      console.log('❌ INCONSISTENCY DETECTED!');
      console.log('   The KPI conflicts count does not match the total alerts count.\n');
      
      // Detailed category breakdown
      console.log('📋 Alert Categories Breakdown:');
      alertsData.categories.forEach(category => {
        console.log(`   - ${category.type.toUpperCase()}: ${category.count} resources`);
        if (category.resources.length > 0) {
          category.resources.forEach(resource => {
            console.log(`     • ${resource.name}: ${resource.utilization.toFixed(1)}% (${resource.allocatedHours}h/${resource.capacity}h)`);
          });
        }
      });
      
      // Calculate what KPI should count
      let kpiShouldCount = 0;
      alertsData.categories.forEach(category => {
        category.resources.forEach(resource => {
          if (resource.utilization > 100) {
            kpiShouldCount++;
          }
        });
      });
      
      console.log(`\n🎯 Resources with >100% utilization: ${kpiShouldCount}`);
      console.log(`   This should match the KPI conflicts count of ${kpiData.conflicts}`);
      
      if (kpiShouldCount !== kpiData.conflicts) {
        console.log('❌ CALCULATION ERROR: KPI calculation logic may be incorrect');
      } else {
        console.log('✅ KPI calculation is correct, but alerts display may be filtering incorrectly');
      }
      
    } else {
      console.log('✅ No inconsistency detected - counts match!');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugDashboardInconsistency();
