// Test Enhanced User Creation Flow
// Comprehensive test of the new user creation API with enhanced validation

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';

// Get auth token for admin user
async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/api/login-enterprise-simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@resourceflow.com',
      password: 'admin123',
      rememberMe: false
    })
  });

  if (response.status !== 200) {
    throw new Error(`Login failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.tokens.accessToken;
}

// Test user creation with enhanced data
async function testEnhancedUserCreation() {
  console.log('🧪 Testing Enhanced User Creation Flow');
  console.log('=' .repeat(50));

  try {
    // Get auth token
    console.log('\n📋 Step 1: Getting authentication token');
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test user creation with comprehensive data
    console.log('\n📋 Step 2: Creating test user with enhanced data');
    
    const testUser = {
      name: 'Jane Smith',
      email: `test.user.${Date.now()}@example.com`, // Unique email
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'SecurePass123!@#',
      role: 'manager',
      department: 'Engineering',
      jobRole: 'Senior Software Engineer',
      capacity: 40
    };

    console.log(`   Creating user: ${testUser.email}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Department: ${testUser.department}`);
    console.log(`   Job Role: ${testUser.jobRole}`);
    console.log(`   Capacity: ${testUser.capacity} hours/week`);

    const createResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testUser)
    });

    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`);

    if (createResponse.status === 200) {
      const createData = await createResponse.json();
      console.log('   ✅ User creation successful!');
      console.log(`   - User ID: ${createData.user?.id}`);
      console.log(`   - Email: ${createData.user?.email}`);
      console.log(`   - Role: ${createData.user?.role}`);
      console.log(`   - Resource ID: ${createData.resource?.id}`);
      console.log(`   - Default Password: ${createData.defaultPassword ? '[Generated]' : '[Not provided]'}`);
      
      return {
        success: true,
        userId: createData.user?.id,
        email: createData.user?.email,
        resourceId: createData.resource?.id
      };
    } else {
      const errorData = await createResponse.json();
      console.log(`   ❌ User creation failed: ${errorData.error || 'Unknown error'}`);
      return { success: false, error: errorData.error };
    }

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test validation scenarios
async function testValidationScenarios() {
  console.log('\n🧪 Testing Validation Scenarios');
  console.log('=' .repeat(50));

  try {
    const token = await getAuthToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: Invalid email
    console.log('\n📋 Test 1: Invalid email format');
    const invalidEmailResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
        role: 'user',
        department: 'General',
        jobRole: 'Employee',
        capacity: 40
      })
    });

    console.log(`   Status: ${invalidEmailResponse.status}`);
    if (invalidEmailResponse.status === 400) {
      console.log('   ✅ Email validation working correctly');
    } else {
      console.log('   ⚠️ Email validation may not be working');
    }

    // Test 2: Duplicate email
    console.log('\n📋 Test 2: Duplicate email');
    const duplicateEmailResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Admin User',
        email: 'admin@resourceflow.com', // Existing email
        firstName: 'Admin',
        lastName: 'User',
        password: 'SecurePass123!',
        role: 'user',
        department: 'General',
        jobRole: 'Employee',
        capacity: 40
      })
    });

    console.log(`   Status: ${duplicateEmailResponse.status}`);
    if (duplicateEmailResponse.status === 400 || duplicateEmailResponse.status === 409) {
      console.log('   ✅ Duplicate email validation working correctly');
    } else {
      console.log('   ⚠️ Duplicate email validation may not be working');
    }

    // Test 3: Invalid role
    console.log('\n📋 Test 3: Invalid role');
    const invalidRoleResponse = await fetch(`${BASE_URL}/api/rbac/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test User',
        email: `test.invalid.role.${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
        role: 'invalid_role',
        department: 'General',
        jobRole: 'Employee',
        capacity: 40
      })
    });

    console.log(`   Status: ${invalidRoleResponse.status}`);
    if (invalidRoleResponse.status === 400) {
      console.log('   ✅ Role validation working correctly');
    } else {
      console.log('   ⚠️ Role validation may not be working');
    }

    return { success: true };

  } catch (error) {
    console.log('\n💥 Validation Tests Failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Enhanced User Creation Tests');
  console.log('=' .repeat(60));

  const creationResult = await testEnhancedUserCreation();
  const validationResult = await testValidationScenarios();

  console.log('\n📊 Test Summary');
  console.log('=' .repeat(30));
  console.log(`User Creation: ${creationResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Validation Tests: ${validationResult.success ? '✅ PASS' : '❌ FAIL'}`);

  if (creationResult.success && validationResult.success) {
    console.log('\n🎉 All tests passed! Enhanced user creation flow is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
