// Test authentication flow in production
import fetch from 'node-fetch';

async function testProductionAuth() {
  console.log('Testing production authentication flow...\n');

  // Step 1: Test environment check
  console.log('1. Testing environment variables...');
  try {
    const envResponse = await fetch('https://resourcio.vercel.app/api/debug/env-check');
    const envData = await envResponse.json();
    console.log('Environment check:', envData.status);
    console.log('Has Supabase URL:', envData.environment?.hasSupabaseUrl);
    console.log('Has Service Key:', envData.environment?.hasSupabaseServiceKey);
    console.log('Supabase Test:', envData.supabaseTest?.connectionSuccess);
  } catch (error) {
    console.error('Environment check failed:', error.message);
  }

  console.log('\n2. Testing database connectivity...');
  try {
    const dbResponse = await fetch('https://resourcio.vercel.app/api/debug/db-test');
    const dbData = await dbResponse.json();
    console.log('Database test:', dbData.status);
    console.log('Tests passed:', dbData.summary?.passedTests, '/', dbData.summary?.totalTests);
  } catch (error) {
    console.error('Database test failed:', error.message);
  }

  console.log('\n3. Testing authentication endpoint (without token)...');
  try {
    const authResponse = await fetch('https://resourcio.vercel.app/api/debug/auth-test');
    console.log('Auth test status:', authResponse.status);
    const authData = await authResponse.text();
    console.log('Auth test response:', authData);
  } catch (error) {
    console.error('Auth test failed:', error.message);
  }

  console.log('\n4. Testing user creation endpoint (without token)...');
  try {
    const createResponse = await fetch('https://resourcio.vercel.app/api/rbac/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'TestPassword123!',
        role: 'user',
        department: 'Engineering',
        jobRole: 'Software Engineer',
        capacity: 40
      })
    });
    console.log('Create user status:', createResponse.status);
    const createData = await createResponse.text();
    console.log('Create user response:', createData);
  } catch (error) {
    console.error('Create user test failed:', error.message);
  }

  console.log('\n5. Testing with a sample JWT token...');
  // This is a sample token - in real testing, you'd get this from the browser
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.token';
  try {
    const authWithTokenResponse = await fetch('https://resourcio.vercel.app/api/debug/auth-test', {
      headers: {
        'Authorization': `Bearer ${sampleToken}`
      }
    });
    console.log('Auth with token status:', authWithTokenResponse.status);
    const authWithTokenData = await authWithTokenResponse.text();
    console.log('Auth with token response:', authWithTokenData);
  } catch (error) {
    console.error('Auth with token test failed:', error.message);
  }

  console.log('\nTesting complete. Check the results above for authentication issues.');
}

testProductionAuth().catch(console.error);
