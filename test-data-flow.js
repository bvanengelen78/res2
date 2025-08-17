// Test script to verify data flow to new dashboard components
// Using built-in fetch (Node.js 18+)

async function testDataFlow() {
  console.log('🔍 Testing ResourceFlow Dashboard Data Flow...\n');
  
  try {
    // Test KPIs endpoint
    console.log('📊 Testing KPIs endpoint...');
    const kpisResponse = await fetch('http://localhost:5000/api/dashboard/kpis');
    const kpis = await kpisResponse.json();
    console.log('✅ KPIs:', {
      activeProjects: kpis.activeProjects,
      availableResources: kpis.availableResources,
      conflicts: kpis.conflicts
    });
    
    // Test Alerts endpoint
    console.log('\n🚨 Testing Alerts endpoint...');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    const alerts = await alertsResponse.json();
    console.log('✅ Alerts Summary:', alerts.summary);
    
    // Look for Harold in alerts
    console.log('\n🔍 Searching for Harold Lunenburg...');
    let haroldFound = false;
    
    alerts.categories.forEach(category => {
      const harold = category.resources.find(r => 
        r.name.toLowerCase().includes('harold') || 
        r.name.toLowerCase().includes('lunenburg')
      );
      
      if (harold) {
        haroldFound = true;
        console.log(`🎯 HAROLD FOUND in ${category.type.toUpperCase()} category:`);
        console.log(`   - Name: ${harold.name}`);
        console.log(`   - Utilization: ${harold.utilization}%`);
        console.log(`   - Allocated: ${harold.allocatedHours}h`);
        console.log(`   - Capacity: ${harold.capacity}h`);
        console.log(`   - Department: ${harold.department}`);
        console.log(`   - Role: ${harold.role}`);
      }
    });
    
    if (!haroldFound) {
      console.log('❌ Harold Lunenburg not found in alerts data');
      console.log('📋 Available resources in alerts:');
      alerts.categories.forEach(category => {
        console.log(`   ${category.type}: ${category.resources.map(r => r.name).join(', ')}`);
      });
    }
    
    // Test Resources endpoint
    console.log('\n👥 Testing Resources endpoint...');
    const resourcesResponse = await fetch('http://localhost:5000/api/resources');
    const resources = await resourcesResponse.json();
    console.log(`✅ Resources: ${resources.length} total`);
    
    const haroldInResources = resources.find(r => 
      r.name.toLowerCase().includes('harold') || 
      r.name.toLowerCase().includes('lunenburg')
    );
    
    if (haroldInResources) {
      console.log('🎯 Harold in resources:', {
        name: haroldInResources.name,
        id: haroldInResources.id,
        department: haroldInResources.department,
        role: haroldInResources.role,
        weeklyCapacity: haroldInResources.weeklyCapacity,
        hasUtilization: 'utilization' in haroldInResources
      });
    }
    
    // Test Timeline endpoint
    console.log('\n📅 Testing Timeline endpoint...');
    const timelineResponse = await fetch('http://localhost:5000/api/dashboard/timeline');
    const timeline = await timelineResponse.json();
    console.log(`✅ Timeline: ${timeline.length} projects`);
    
    if (timeline.length > 0) {
      console.log('📋 Sample project:', {
        name: timeline[0].name,
        completion: timeline[0].completion,
        status: timeline[0].status,
        priority: timeline[0].priority,
        resourceCount: timeline[0].resourceCount
      });
    }
    
    // Component Data Validation
    console.log('\n🧩 Component Data Validation:');
    
    // Actionable Insights Panel
    const criticalResources = alerts.categories.find(cat => cat.type === 'critical')?.resources || [];
    const errorResources = alerts.categories.find(cat => cat.type === 'error')?.resources || [];
    const bottlenecks = [...criticalResources, ...errorResources].slice(0, 3);
    
    console.log(`✅ Actionable Insights - Top Bottlenecks: ${bottlenecks.length}`);
    bottlenecks.forEach((resource, i) => {
      console.log(`   ${i + 1}. ${resource.name} (${resource.utilization}%)`);
    });
    
    // Smart Notifications Panel
    const capacityAlerts = [...criticalResources, ...errorResources].filter(r => r.utilization > 90);
    console.log(`✅ Smart Notifications - Capacity Alerts: ${capacityAlerts.length}`);
    
    // Role & Skill Heatmap
    const allAlertResources = [];
    alerts.categories.forEach(cat => allAlertResources.push(...cat.resources));
    const roleGroups = allAlertResources.reduce((acc, r) => {
      const role = r.role || r.department || 'General';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    console.log(`✅ Role & Skill Heatmap - Role Groups:`, roleGroups);
    
    // Project Health Scoring
    const projectsWithCompletion = timeline.filter(p => p.completion !== undefined);
    console.log(`✅ Project Health Scoring - Projects with completion: ${projectsWithCompletion.length}`);
    
    // Enhanced Timeline
    console.log(`✅ Enhanced Timeline - Projects: ${timeline.length}`);
    
    console.log('\n🎉 Data Flow Test Complete!');
    
    if (haroldFound) {
      console.log('\n✅ SUCCESS: Harold Lunenburg found and should appear in Actionable Insights');
    } else {
      console.log('\n❌ ISSUE: Harold Lunenburg not found in alerts data');
      console.log('💡 Check if Harold exists in database and has allocations');
    }
    
  } catch (error) {
    console.error('❌ Error testing data flow:', error.message);
  }
}

// Run the test
testDataFlow();
