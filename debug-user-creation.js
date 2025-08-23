// Debug script to test user creation API
const fetch = require('node-fetch');

async function testUserCreation() {
  try {
    console.log('Testing user creation API...');
    
    // Test data
    const testUser = {
      name: "Test User",
      email: "test.user@example.com",
      firstName: "Test",
      lastName: "User",
      password: "TestPassword123!",
      role: "user",
      department: "Engineering",
      jobRole: "Software Engineer",
      capacity: 40
    };

    console.log('Sending request to /api/rbac/create-user...');
    console.log('Test data:', testUser);

    const response = await fetch('http://localhost:3000/api/rbac/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, this would need a valid auth token
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testUser)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Success! User created:', data);
    } else {
      console.error('Error response:', responseText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testUserCreation();
