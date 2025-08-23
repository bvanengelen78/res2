// Test token validation with the debug endpoint
import fetch from 'node-fetch';

async function testTokenValidation() {
  console.log('Testing token validation...\n');

  // Test the token debug endpoint with a sample token
  console.log('1. Testing token-debug endpoint...');
  try {
    const response = await fetch('https://resourcio.vercel.app/api/debug/token-debug', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.token'
      }
    });
    
    const data = await response.json();
    console.log('Token debug response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Token debug test failed:', error.message);
  }

  console.log('\n2. Testing auth-test endpoint with sample token...');
  try {
    const response = await fetch('https://resourcio.vercel.app/api/debug/auth-test', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.token'
      }
    });
    
    console.log('Auth test status:', response.status);
    const data = await response.text();
    console.log('Auth test response:', data);
  } catch (error) {
    console.error('Auth test failed:', error.message);
  }

  console.log('\nTesting complete. Use the browser to get a real token and test with that.');
}

testTokenValidation().catch(console.error);
