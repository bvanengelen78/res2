// Test Simple RBAC Endpoint
import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testSimpleRBAC() {
  console.log('🧪 Testing Simple RBAC Test Endpoint');
  console.log('=' .repeat(40));

  try {
    console.log('\n📋 Testing /api/rbac-test');
    const response = await fetch(`${BASE_URL}/api/rbac-test`);
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('   📊 Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('   ✅ Simple RBAC endpoint working!');
      return true;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Failed: ${errorText}`);
      return false;
    }

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    return false;
  }
}

testSimpleRBAC();
