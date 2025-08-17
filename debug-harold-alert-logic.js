// Debug Harold's alert logic locally

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function debugHaroldAlertLogic() {
  console.log('🔍 Debugging Harold Alert Logic Locally...\n');

  try {
    // Get Harold's allocation data
    const allocationsResponse = await fetch('http://localhost:5000/api/allocations');
    if (!allocationsResponse.ok) {
      throw new Error(`Failed to fetch allocations: ${allocationsResponse.status}`);
    }
    
    const allAllocations = await allocationsResponse.json();
    
    // Find Harold's allocation (Resource ID 17)
    const haroldAllocations = allAllocations.filter(a => a.resourceId === 17);
    
    console.log(`Found ${haroldAllocations.length} allocations for Harold (ID: 17)`);
    
    if (haroldAllocations.length === 0) {
      console.log('❌ No allocations found for Harold');
      return;
    }
    
    // Simulate the alert logic
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);
    const currentWeekKey = `${currentYear}-W${currentWeek.toString().padStart(2, '0')}`;
    const alternateWeekKey = `W${currentWeek.toString().padStart(2, '0')}`;
    
    console.log(`Current week analysis: ${currentWeekKey} (alternate: ${alternateWeekKey})`);
    
    let totalHours = 0;
    
    haroldAllocations.forEach((allocation, index) => {
      console.log(`\nAllocation ${index + 1}:`);
      console.log(`  - Project ID: ${allocation.projectId}`);
      console.log(`  - Base Hours: ${allocation.allocatedHours}`);
      console.log(`  - Status: ${allocation.status}`);
      console.log(`  - Has Weekly Data: ${!!(allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object')}`);
      
      if (allocation.status !== 'active') {
        console.log(`  - ⚠️ SKIPPED: Not active (status: ${allocation.status})`);
        return;
      }
      
      let hours = 0;
      
      if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
        console.log(`  - Weekly Allocations:`, allocation.weeklyAllocations);
        
        const weeklyHours = allocation.weeklyAllocations[currentWeekKey] || 
                           allocation.weeklyAllocations[alternateWeekKey] ||
                           0;
        hours = parseFloat(weeklyHours.toString());
        
        console.log(`  - Weekly Hours for ${currentWeekKey}: ${allocation.weeklyAllocations[currentWeekKey] || 'Not found'}`);
        console.log(`  - Weekly Hours for ${alternateWeekKey}: ${allocation.weeklyAllocations[alternateWeekKey] || 'Not found'}`);
        console.log(`  - Calculated Weekly Hours: ${hours}`);
        
        // If no current week data, use base allocation
        if (hours === 0) {
          hours = parseFloat(allocation.allocatedHours || '0');
          console.log(`  - Using base hours as fallback: ${hours}`);
        }
      } else {
        hours = parseFloat(allocation.allocatedHours || '0');
        console.log(`  - Using base hours (no weekly data): ${hours}`);
      }
      
      totalHours += hours;
      console.log(`  - Hours added: ${hours}, Running total: ${totalHours}`);
    });
    
    // Calculate utilization
    const capacity = 40; // Harold's weekly capacity
    const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;
    
    console.log(`\n📊 Harold's Final Calculation:`);
    console.log(`  - Total Hours: ${totalHours}h`);
    console.log(`  - Capacity: ${capacity}h`);
    console.log(`  - Utilization: ${utilization}%`);
    
    // Determine alert category
    const criticalThreshold = 120;
    const errorThreshold = 100;
    const warningThreshold = 90;
    const underUtilizationThreshold = 50;
    
    let category = 'none';
    if (utilization >= criticalThreshold) {
      category = 'critical';
    } else if (utilization >= errorThreshold) {
      category = 'error';
    } else if (utilization >= warningThreshold) {
      category = 'warning';
    } else if (utilization > 0 && utilization < underUtilizationThreshold) {
      category = 'info';
    } else if (utilization === 0) {
      category = 'unassigned';
    }
    
    console.log(`\n🎯 Expected Alert Category: ${category}`);
    console.log(`  - Critical (≥${criticalThreshold}%): ${utilization >= criticalThreshold ? '✅' : '❌'}`);
    console.log(`  - Error (≥${errorThreshold}%): ${utilization >= errorThreshold ? '✅' : '❌'}`);
    console.log(`  - Warning (≥${warningThreshold}%): ${utilization >= warningThreshold ? '✅' : '❌'}`);
    console.log(`  - Info (<${underUtilizationThreshold}%): ${utilization > 0 && utilization < underUtilizationThreshold ? '✅' : '❌'}`);
    console.log(`  - Unassigned (0%): ${utilization === 0 ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugHaroldAlertLogic();
