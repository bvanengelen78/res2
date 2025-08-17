// Test script to check the actual API response structure

async function testGamifiedApiResponse() {
  console.log('🎮 Testing Gamified Metrics API Response Structure...\n');

  try {
    // First, let's get a valid auth token by logging in
    console.log('🔐 Step 1: Getting authentication token...');
    
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@resourceflow.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.tokens?.accessToken;
    
    if (!token) {
      console.log('❌ No access token received');
      return;
    }
    
    console.log('✅ Authentication successful');
    
    // Now test the gamified metrics endpoint
    console.log('\n📊 Step 2: Testing gamified metrics endpoint...');
    
    const response = await fetch('http://localhost:5000/api/dashboard/gamified-metrics?startDate=2024-01-01&endDate=2024-12-31', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Validate data structure
      console.log('\n🔍 Data Structure Validation:');
      console.log(`   - capacityHero: ${data.capacityHero ? '✅' : '❌'}`);
      console.log(`   - forecastAccuracy: ${data.forecastAccuracy ? '✅' : '❌'}`);
      console.log(`   - resourceHealth: ${data.resourceHealth ? '✅' : '❌'}`);
      console.log(`   - projectLeaderboard: ${data.projectLeaderboard ? '✅' : '❌'}`);
      console.log(`   - firefighterAlerts: ${data.firefighterAlerts ? '✅' : '❌'}`);
      console.log(`   - continuousImprovement: ${data.continuousImprovement ? '✅' : '❌'}`);
      console.log(`   - crystalBall: ${data.crystalBall ? '✅' : '❌'}`);
      
      // Check specific properties
      if (data.capacityHero) {
        console.log(`\n   Capacity Hero Details:`);
        console.log(`     - conflictsCount: ${data.capacityHero.conflictsCount}`);
        console.log(`     - badgeLevel: ${data.capacityHero.badgeLevel}`);
        console.log(`     - periodLabel: ${data.capacityHero.periodLabel}`);
      }
      
      if (data.forecastAccuracy) {
        console.log(`\n   Forecast Accuracy Details:`);
        console.log(`     - percentage: ${data.forecastAccuracy.percentage}`);
        console.log(`     - trend: ${Array.isArray(data.forecastAccuracy.trend) ? 'Array' : 'Not Array'}`);
        console.log(`     - color: ${data.forecastAccuracy.color}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:');
      console.log(`   ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGamifiedApiResponse();
