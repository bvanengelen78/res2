#!/usr/bin/env node

/**
 * Comprehensive test to verify the authentication error fix
 */

import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔧 Authentication Error Fix Verification\n');

async function testHealthEndpoint() {
  console.log('1️⃣ Testing Health Check Endpoint...');
  
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      console.log('   ✅ Health check passed');
      console.log('   📊 Database status:', data.database);
      return true;
    } else {
      console.log('   ❌ Health check failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

async function testSuccessfulLogin() {
  console.log('\n2️⃣ Testing Successful Authentication...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@resourceflow.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.user && data.tokens) {
      console.log('   ✅ Login successful');
      console.log('   👤 User:', data.user.email);
      console.log('   🔑 Token received:', data.tokens.accessToken ? 'Yes' : 'No');
      console.log('   🛡️  Roles:', data.user.roles.map(r => r.role).join(', '));
      return true;
    } else {
      console.log('   ❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Login error:', error.message);
    return false;
  }
}

async function testFailedLogin() {
  console.log('\n3️⃣ Testing Failed Authentication (Invalid Credentials)...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401 && data.message === 'Invalid email or password') {
      console.log('   ✅ Failed login handled correctly');
      console.log('   📝 Error message:', data.message);
      console.log('   🔢 Status code:', response.status);
      return true;
    } else {
      console.log('   ❌ Unexpected response:', data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Test error:', error.message);
    return false;
  }
}

async function testMissingFields() {
  console.log('\n4️⃣ Testing Missing Fields Validation...');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@resourceflow.com'
        // Missing password
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.message.includes('required')) {
      console.log('   ✅ Missing fields validation working');
      console.log('   📝 Error message:', data.message);
      return true;
    } else {
      console.log('   ❌ Validation not working:', data);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Test error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive authentication tests...\n');
  
  const results = {
    health: await testHealthEndpoint(),
    successLogin: await testSuccessfulLogin(),
    failedLogin: await testFailedLogin(),
    validation: await testMissingFields()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('   Health Check:', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('   Successful Login:', results.successLogin ? '✅ PASS' : '❌ FAIL');
  console.log('   Failed Login Handling:', results.failedLogin ? '✅ PASS' : '❌ FAIL');
  console.log('   Field Validation:', results.validation ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Authentication error has been successfully resolved');
    console.log('✅ Error handling improvements are working correctly');
    console.log('✅ The application is ready for use');
  } else {
    console.log('\n❌ Some tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Run the tests
runAllTests().catch(console.error);
