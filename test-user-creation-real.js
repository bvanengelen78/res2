// Test script for user creation API with real authentication
import fetch from 'node-fetch';

async function testUserCreationWithAuth() {
  try {
    console.log('Testing user creation API with authentication...');
    
    // First, let's test the simple endpoint
    const testUser = {
      name: "Test User Real",
      email: "test.real@example.com",
      firstName: "Test",
      lastName: "Real",
      password: "TestPassword123!",
      role: "user",
      department: "Engineering",
      jobRole: "Software Engineer",
      capacity: 40
    };

    console.log('Sending request to http://localhost:5000/api/rbac/create-user...');
    console.log('Test data:', JSON.stringify(testUser, null, 2));

    // For testing, we'll use a mock token - in real usage this would come from Supabase auth
    const response = await fetch('http://localhost:5000/api/rbac/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This would need to be a real Supabase JWT token
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM1MDQ2NzY4LCJpYXQiOjE3MzUwNDMxNjgsImlzcyI6Imh0dHBzOi8vdXNja2tyb3Zvc3FpamRtZ21uYWouc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6Ijc5M2EzNWZjLTNlZGYtNDMzNS1iMzQ2LWU0MjI0ZmY3MWJiOCIsImVtYWlsIjoiYWRtaW5Ac3dpc3NzZW5zZS5ubCIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzM1MDQzMTY4fV0sInNlc3Npb25faWQiOiJkNzJkNzJhNy1hNzE5LTQ5YzMtOTNhNy1hNzE5ZjE5YzMzYTciLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.fake-signature-for-testing'
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
testUserCreationWithAuth();
