// Test script to check Boyan Kamphaus's role data
console.log('🔍 Testing Boyan Kamphaus Role Data...\n');

async function testBoyanRole() {
  try {
    // Test Resources endpoint
    console.log('📊 Fetching all resources...');
    const resourcesResponse = await fetch('http://localhost:5000/api/resources');
    
    if (!resourcesResponse.ok) {
      console.log(`❌ Resources endpoint failed: ${resourcesResponse.status}`);
      return;
    }
    
    const resources = await resourcesResponse.json();
    console.log(`✅ Found ${resources.length} total resources`);
    
    // Find Boyan Kamphaus
    const boyan = resources.find(r => 
      r.name.toLowerCase().includes('boyan') || 
      r.name.toLowerCase().includes('kamphaus')
    );
    
    if (boyan) {
      console.log('\n🎯 BOYAN KAMPHAUS FOUND:');
      console.log(`   ID: ${boyan.id}`);
      console.log(`   Name: ${boyan.name}`);
      console.log(`   Email: ${boyan.email}`);
      console.log(`   Role: "${boyan.role}"`);
      console.log(`   Department: "${boyan.department}"`);
      console.log(`   Weekly Capacity: ${boyan.weeklyCapacity}`);
      console.log(`   Is Active: ${boyan.isActive}`);
      
      // Check if role is exactly "Product Owner"
      if (boyan.role === 'Product Owner') {
        console.log('   ✅ Role is correctly set to "Product Owner"');
      } else {
        console.log(`   ❌ Role is NOT "Product Owner", it's "${boyan.role}"`);
        console.log('   🔧 This explains why Product Owner role is missing from heatmap!');
      }
    } else {
      console.log('❌ Boyan Kamphaus not found in resources');
      console.log('\n📋 Available resources:');
      resources.forEach(r => {
        console.log(`   - ID: ${r.id}, Name: ${r.name}, Role: ${r.role}`);
      });
    }
    
    // Test Alerts endpoint to see what's being processed
    console.log('\n🚨 Testing Alerts endpoint...');
    const alertsResponse = await fetch('http://localhost:5000/api/dashboard/alerts');
    
    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      console.log('✅ Alerts endpoint responding');
      
      // Look for Boyan in alerts
      let boyanInAlerts = null;
      alerts.categories.forEach(category => {
        const boyanAlert = category.resources.find(r => 
          r.name.toLowerCase().includes('boyan') || 
          r.name.toLowerCase().includes('kamphaus')
        );
        if (boyanAlert) {
          boyanInAlerts = boyanAlert;
          console.log(`\n🎯 BOYAN IN ALERTS (${category.type.toUpperCase()}):`)
          console.log(`   Name: ${boyanAlert.name}`);
          console.log(`   Role: "${boyanAlert.role || 'undefined'}"`);
          console.log(`   Department: "${boyanAlert.department || 'undefined'}"`);
          console.log(`   Utilization: ${boyanAlert.utilization}%`);
        }
      });
      
      if (!boyanInAlerts) {
        console.log('❌ Boyan not found in alerts data');
      }
    } else {
      console.log(`❌ Alerts endpoint failed: ${alertsResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBoyanRole();
