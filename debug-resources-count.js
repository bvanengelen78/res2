// Debug script to investigate why only 10 resources appear in Role & Skill Heatmap
// Run with: node debug-resources-count.js

console.log('🔍 Debugging Resources Count in Role & Skill Heatmap\n');

async function debugResourcesCount() {
  try {
    console.log('📊 Step 1: Check Resources API Response');
    
    // Test the resources API endpoint directly
    const resourcesResponse = await fetch('http://localhost:5000/api/resources', {
      headers: {
        'Authorization': 'Bearer test-token', // Try with a token
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   📋 Response status:', resourcesResponse.status);
    console.log('   📋 Response headers:', Object.fromEntries(resourcesResponse.headers.entries()));
    
    if (!resourcesResponse.ok) {
      console.log('   ❌ Resources API failed');
      const errorText = await resourcesResponse.text();
      console.log('   📋 Error response:', errorText);
      
      // Try without authentication
      console.log('\n   🔄 Trying without authentication...');
      const noAuthResponse = await fetch('http://localhost:5000/api/resources');
      console.log('   📋 No-auth response status:', noAuthResponse.status);
      
      if (!noAuthResponse.ok) {
        const noAuthError = await noAuthResponse.text();
        console.log('   📋 No-auth error:', noAuthError);
        return;
      }
      
      const noAuthData = await noAuthResponse.json();
      console.log('   📋 No-auth data type:', typeof noAuthData);
      console.log('   📋 No-auth data keys:', Object.keys(noAuthData));
      return;
    }
    
    const resourcesData = await resourcesResponse.json();
    console.log('   📋 Resources data type:', typeof resourcesData);
    console.log('   📋 Resources data keys:', Object.keys(resourcesData));
    
    // Handle both array and object responses
    const resources = Array.isArray(resourcesData) ? resourcesData : resourcesData.resources || [];
    console.log(`   ✅ Total resources from API: ${resources.length}`);
    
    if (resources.length === 0) {
      console.log('   ❌ No resources found in API response');
      return;
    }
    
    console.log('\n📊 Step 2: Analyze Resource Data');
    console.log('   📋 First few resources:');
    resources.slice(0, 3).forEach((resource, index) => {
      console.log(`      ${index + 1}. ID: ${resource.id}, Name: "${resource.name}", Role: "${resource.role}", Dept: "${resource.department}"`);
    });
    
    console.log('\n📊 Step 3: Check Role Distribution');
    const roleGroups = resources.reduce((acc, resource) => {
      const role = resource.role || resource.department || 'General';
      if (!acc[role]) acc[role] = [];
      acc[role].push(resource);
      return acc;
    }, {});
    
    console.log(`   📋 Total unique roles: ${Object.keys(roleGroups).length}`);
    console.log('   📋 Role distribution:');
    Object.entries(roleGroups).forEach(([role, roleResources]) => {
      console.log(`      ${role}: ${roleResources.length} resource(s)`);
      roleResources.forEach(r => {
        console.log(`         - ${r.name} (ID: ${r.id})`);
      });
    });
    
    const totalResourcesInGroups = Object.values(roleGroups).reduce((sum, group) => sum + group.length, 0);
    console.log(`   📋 Total resources in groups: ${totalResourcesInGroups}`);
    
    console.log('\n📊 Step 4: Check Alerts API');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      console.log(`   📋 Alerts categories: ${alerts.categories?.length || 0}`);
      
      let totalAlertResources = 0;
      const alertResourceIds = new Set();
      
      if (alerts.categories) {
        alerts.categories.forEach(category => {
          console.log(`      ${category.type}: ${category.resources?.length || 0} resources`);
          if (category.resources) {
            category.resources.forEach(r => {
              alertResourceIds.add(r.id);
              totalAlertResources++;
            });
          }
        });
      }
      
      console.log(`   📋 Total resources in alerts: ${totalAlertResources}`);
      console.log(`   📋 Unique resources in alerts: ${alertResourceIds.size}`);
      
      // Check which resources are NOT in alerts
      const resourcesNotInAlerts = resources.filter(r => !alertResourceIds.has(r.id));
      console.log(`   📋 Resources NOT in alerts: ${resourcesNotInAlerts.length}`);
      resourcesNotInAlerts.forEach(r => {
        console.log(`      - ${r.name} (ID: ${r.id}, Role: ${r.role})`);
      });
    } else {
      console.log('   ❌ Alerts API failed');
    }
    
    console.log('\n📊 Step 5: Simulate Component Logic');
    console.log('   🔄 Simulating RoleSkillHeatmap processing...');
    
    // Simulate the component's resourcesWithUtilization logic
    const alertResourceMap = new Map();
    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      if (alerts.categories) {
        alerts.categories.forEach(category => {
          category.resources.forEach(alertResource => {
            alertResourceMap.set(alertResource.id, alertResource);
          });
        });
      }
    }
    
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
    
    console.log(`   📋 Resources after processing: ${resourcesWithUtilization.length}`);
    
    // Group by role
    const processedRoleGroups = resourcesWithUtilization.reduce((acc, resource) => {
      const role = resource.role || resource.department || 'General';
      if (!acc[role]) acc[role] = [];
      acc[role].push(resource);
      return acc;
    }, {});
    
    console.log(`   📋 Role groups after processing: ${Object.keys(processedRoleGroups).length}`);
    console.log('   📋 Final role distribution:');
    Object.entries(processedRoleGroups).forEach(([role, roleResources]) => {
      console.log(`      ${role}: ${roleResources.length} resource(s)`);
    });
    
    const finalTotalResources = Object.values(processedRoleGroups).reduce((sum, group) => sum + group.length, 0);
    console.log(`   📋 Final total resources: ${finalTotalResources}`);
    
    if (finalTotalResources !== resources.length) {
      console.log('   ❌ MISMATCH: Final count does not match original count!');
    } else {
      console.log('   ✅ Resource count preserved through processing');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

debugResourcesCount();
