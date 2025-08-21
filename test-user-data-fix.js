// Test User Data Fix
// Verify that admin@resourceflow.com now returns correct user data instead of "Test User"

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';
const TEST_CREDENTIALS = {
  email: 'admin@resourceflow.com',
  password: 'admin123',
  rememberMe: false
};

async function testUserDataFix() {
  console.log('🧪 Testing User Data Fix for admin@resourceflow.com');
  console.log('=' .repeat(60));

  try {
    // Test login and check user data
    console.log('\n📋 Step 1: Login and check user data response');
    
    const response = await fetch(`${BASE_URL}/api/login-enterprise-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    if (response.status !== 200) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    const data = await response.json();
    
    console.log('\n📊 Login Response Analysis:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   User Email: ${data.user.email}`);
    console.log(`   Resource ID: ${data.user.resourceId}`);
    console.log(`   Resource Name: ${data.user.resource.name}`);
    console.log(`   Resource Role: ${data.user.resource.role}`);
    console.log(`   User Roles: ${data.user.roles.map(r => r.role).join(', ')}`);
    console.log(`   Permissions Count: ${data.user.permissions.length}`);

    // Verify the fix
    console.log('\n🔍 Verification Results:');
    
    const expectedName = 'Admin'; // Should be derived from 'admin@resourceflow.com'
    const expectedRole = 'Administrator'; // Should be set for admin emails
    
    const nameCorrect = data.user.resource.name === expectedName;
    const roleCorrect = data.user.resource.role === expectedRole;
    const notTestUser = data.user.resource.name !== 'Test User';
    
    console.log(`   ✅ Resource Name: ${data.user.resource.name} ${nameCorrect ? '(CORRECT)' : '(INCORRECT - Expected: ' + expectedName + ')'}`);
    console.log(`   ✅ Resource Role: ${data.user.resource.role} ${roleCorrect ? '(CORRECT)' : '(INCORRECT - Expected: ' + expectedRole + ')'}`);
    console.log(`   ✅ Not Test User: ${notTestUser ? 'YES (FIXED)' : 'NO (STILL BROKEN)'}`);
    
    // Overall result
    if (nameCorrect && roleCorrect && notTestUser) {
      console.log('\n🎉 USER DATA FIX - SUCCESS!');
      console.log('✅ Dashboard will now display "Admin" instead of "Test User"');
      console.log('✅ Greeting will show "Good morning, Admin!" instead of "Good morning, Test!"');
      console.log('✅ Header will display "Admin" instead of "Test User"');
      console.log('✅ Role shows "Administrator" instead of "Developer"');
    } else {
      console.log('\n❌ USER DATA FIX - FAILED!');
      console.log('❌ Dashboard will still show incorrect user data');
      
      if (!notTestUser) {
        console.log('❌ Still returning "Test User" - fallback logic not working');
      }
      if (!nameCorrect) {
        console.log(`❌ Name should be "${expectedName}" but got "${data.user.resource.name}"`);
      }
      if (!roleCorrect) {
        console.log(`❌ Role should be "${expectedRole}" but got "${data.user.resource.role}"`);
      }
    }

    // Test other email patterns
    console.log('\n🧪 Testing Email Pattern Recognition:');
    
    // Test the createDisplayNameFromEmail logic
    const testEmails = [
      'admin@resourceflow.com',
      'john.doe@company.com',
      'jane_smith@company.com',
      'testuser@company.com'
    ];
    
    console.log('   Email Pattern Tests (simulated):');
    testEmails.forEach(email => {
      const localPart = email.split('@')[0];
      let displayName;
      
      if (localPart.includes('.')) {
        displayName = localPart
          .split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      } else if (localPart.includes('_')) {
        displayName = localPart
          .split('_')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      } else {
        displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
      }
      
      console.log(`   📧 ${email} → "${displayName}"`);
    });

    return {
      success: nameCorrect && roleCorrect && notTestUser,
      data: {
        resourceName: data.user.resource.name,
        resourceRole: data.user.resource.role,
        userEmail: data.user.email,
        userId: data.user.id
      }
    };

  } catch (error) {
    console.log('\n💥 Test Failed!');
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testUserDataFix().then(result => {
  if (result.success) {
    console.log('\n🚀 User data mismatch issue has been resolved!');
    process.exit(0);
  } else {
    console.log('\n💥 User data mismatch issue still exists!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
