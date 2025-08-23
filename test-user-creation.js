// Test script for user creation API
import fetch from 'node-fetch';

async function testUserCreation() {
  try {
    console.log('Testing user creation API...');
    
    // First, let's test if the endpoint is accessible
    const testUser = {
      name: "Test User API",
      email: "test.api@example.com",
      firstName: "Test",
      lastName: "User",
      password: "TestPassword123!",
      role: "user",
      department: "Engineering",
      jobRole: "Software Engineer",
      capacity: 40
    };

    console.log('Sending request to http://localhost:5000/api/rbac/create-user...');
    console.log('Test data:', JSON.stringify(testUser, null, 2));

    const response = await fetch('http://localhost:5000/api/rbac/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This would need a real auth token in production
        'Authorization': 'Bearer fake-token-for-testing'
      },
      body: JSON.stringify(testUser)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Success! User creation response:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('✅ Success! Raw response:', responseText);
      }
    } else {
      console.error('❌ Error response:', responseText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.error('Could not parse error response as JSON');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testUserCreation();
