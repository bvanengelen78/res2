// Test RBAC Debug Endpoint
import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testRBACDebug() {
  console.log('🧪 Testing RBAC Debug Endpoint');
  console.log('=' .repeat(40));

  try {
    // Test debug endpoint without auth first
    console.log('\n📋 Testing /api/rbac/users-debug (no auth)');
    const debugResponse = await fetch(`${BASE_URL}/api/rbac/users-debug`);
    
    console.log(`   Status: ${debugResponse.status} ${debugResponse.statusText}`);
    
    const debugData = await debugResponse.json();
    console.log('   📊 Debug Response:');
    console.log(JSON.stringify(debugData, null, 2));

    return true;

  } catch (error) {
    console.log('\n💥 Debug Test Failed!');
    console.error('❌ Error:', error.message);
    return false;
  }
}

testRBACDebug();
