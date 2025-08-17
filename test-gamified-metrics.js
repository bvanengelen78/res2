// Test script for gamified metrics API endpoint

async function testGamifiedMetrics() {
  console.log('🎮 Testing Gamified Metrics API Endpoint...\n');

  try {
    // Test the API endpoint
    console.log('📊 Testing /api/dashboard/gamified-metrics endpoint...');
    
    const response = await fetch('http://localhost:5000/api/dashboard/gamified-metrics?startDate=2024-01-01&endDate=2024-12-31', {
      headers: {
        'Authorization': 'Bearer test-token', // This will likely fail auth, but we can see the error
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Gamified metrics data:');
      console.log('   📋 Data structure:');
      console.log(`     - Capacity Hero: ${JSON.stringify(data.capacityHero, null, 2)}`);
      console.log(`     - Forecast Accuracy: ${JSON.stringify(data.forecastAccuracy, null, 2)}`);
      console.log(`     - Resource Health: ${JSON.stringify(data.resourceHealth, null, 2)}`);
      console.log(`     - Project Leaderboard: ${data.projectLeaderboard?.length || 0} projects`);
      console.log(`     - Firefighter Alerts: ${JSON.stringify(data.firefighterAlerts, null, 2)}`);
      console.log(`     - Continuous Improvement: ${JSON.stringify(data.continuousImprovement, null, 2)}`);
      console.log(`     - Crystal Ball: ${JSON.stringify(data.crystalBall, null, 2)}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:');
      console.log(`   ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n🔐 Authentication required. This is expected for the test.');
        console.log('   The endpoint exists and is protected by authentication.');
      } else if (response.status === 500) {
        console.log('\n💥 Server error. Check the server logs for details.');
      } else {
        console.log(`\n❓ Unexpected status: ${response.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔌 Server is not running. Please start the server with:');
      console.log('   npm run dev');
    }
  }
}

// Run the test
testGamifiedMetrics();
