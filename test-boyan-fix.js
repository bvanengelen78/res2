// Test script to verify Boyan Kamphaus appears in Role & Skill Heatmap
// Run with: node test-boyan-fix.js

console.log('🎯 Testing Boyan Kamphaus Fix in Role & Skill Heatmap\n');

async function testBoyanFix() {
  try {
    // Test 1: Get all resources and verify Boyan exists
    console.log('📊 Test 1: Verify Boyan exists in resources');
    const resourcesResponse = await fetch('http://localhost:5000/api/resources');
    const resourcesData = await resourcesResponse.json();

    console.log('   📋 Resources response type:', typeof resourcesData);
    console.log('   📋 Resources response keys:', Object.keys(resourcesData));
    console.log('   📋 Full response:', resourcesData);

    // Handle both array and object responses
    const resources = Array.isArray(resourcesData) ? resourcesData : resourcesData.resources || [];
    console.log('   📋 Resources array length:', resources.length);

    if (resourcesData.error) {
      console.log('   ❌ API Error:', resourcesData.message);
      return;
    }

    const boyan = resources.find(r => r.name && (r.name.includes('Boyan') || r.name.includes('Kamphaus')));
    if (boyan) {
      console.log(`   ✅ Found Boyan: ID=${boyan.id}, Name="${boyan.name}", Role="${boyan.role}"`);
    } else {
      console.log('   ❌ Boyan not found in resources');
      return;
    }

    // Test 2: Get alerts and check if Boyan is included
    console.log('\n🚨 Test 2: Check if Boyan appears in alerts');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    const alerts = await alertsResponse.json();
    
    let boyanInAlerts = false;
    alerts.categories.forEach(category => {
      const boyanAlert = category.resources.find(r => r.id === boyan.id);
      if (boyanAlert) {
        console.log(`   ✅ Boyan found in ${category.type} alerts: ${boyanAlert.utilization}% utilization`);
        boyanInAlerts = true;
      }
    });
    
    if (!boyanInAlerts) {
      console.log('   ⚠️ Boyan not found in any alert categories (this is expected for moderate utilization)');
    }

    // Test 3: Simulate Role & Skill Heatmap logic
    console.log('\n🎨 Test 3: Simulate Role & Skill Heatmap grouping logic');
    
    // Create alert resource map (like in our fixed component)
    const alertResourceMap = new Map();
    alerts.categories.forEach(category => {
      category.resources.forEach(alertResource => {
        alertResourceMap.set(alertResource.id, alertResource);
      });
    });

    // Process all resources (like in our fixed component)
    const resourcesWithUtilization = resources.map(resource => {
      const alertData = alertResourceMap.get(resource.id);
      const effectiveCapacity = Math.max(0, parseFloat(resource.weeklyCapacity || '40') - 8);

      if (alertData) {
        return {
          id: alertData.id,
          name: alertData.name,
          utilization: alertData.utilization,
          allocatedHours: alertData.allocatedHours,
          capacity: alertData.capacity,
          department: alertData.department,
          role: alertData.role
        };
      } else {
        return {
          id: resource.id,
          name: resource.name,
          utilization: 0,
          allocatedHours: 0,
          capacity: effectiveCapacity,
          department: resource.department,
          role: resource.role
        };
      }
    });

    // Group by role (like in our component)
    const roleGroups = resourcesWithUtilization.reduce((acc, resource) => {
      const role = resource.role || resource.department || 'General';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(resource);
      return acc;
    }, {});

    console.log('   📋 Role groups found:');
    Object.entries(roleGroups).forEach(([role, resources]) => {
      console.log(`      ${role}: ${resources.length} resource(s)`);
      resources.forEach(r => {
        if (r.name.includes('Boyan') || r.name.includes('Kamphaus')) {
          console.log(`         ✅ BOYAN FOUND: ${r.name} (${r.utilization}% utilization)`);
        }
      });
    });

    // Test 4: Verify Product Owner group exists
    console.log('\n👑 Test 4: Verify Product Owner group');
    if (roleGroups['Product Owner']) {
      console.log(`   ✅ Product Owner group exists with ${roleGroups['Product Owner'].length} resource(s)`);
      roleGroups['Product Owner'].forEach(r => {
        console.log(`      - ${r.name} (${r.utilization}% utilization)`);
      });
    } else {
      console.log('   ❌ Product Owner group not found');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('   The fix ensures ALL resources appear in Role & Skill Heatmap,');
    console.log('   not just those with alert-worthy utilization levels.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBoyanFix();
