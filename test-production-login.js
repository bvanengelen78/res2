import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`📄 Response:`, text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    
    if (response.ok) {
      console.log(`✅ ${endpoint} - SUCCESS`);
      try {
        const json = JSON.parse(text);
        return { success: true, data: json };
      } catch {
        return { success: true, data: text };
      }
    } else {
      console.log(`❌ ${endpoint} - FAILED`);
      return { success: false, error: text };
    }
  } catch (error) {
    console.log(`💥 ${endpoint} - ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Production Login Tests');
  console.log('=' .repeat(50));
  
  const credentials = {
    email: 'admin@resourceflow.com',
    password: 'admin123',
    rememberMe: false
  };
  
  // Test 1: Environment Debug
  await testEndpoint('/api/env-debug');
  
  // Test 2: Supabase Health
  await testEndpoint('/api/supabase-health');
  
  // Test 3: Login Debug
  await testEndpoint('/api/login-debug', 'POST', credentials);
  
  // Test 4: Login Simple
  await testEndpoint('/api/login-simple', 'POST', credentials);
  
  // Test 5: Main Login
  await testEndpoint('/api/login', 'POST', credentials);

  // Test 6: Production Login
  await testEndpoint('/api/login-production', 'POST', credentials);

  // Test 7: Enterprise Login
  await testEndpoint('/api/login-enterprise', 'POST', credentials);

  console.log('\n🏁 Tests completed');
}

runTests().catch(console.error);
