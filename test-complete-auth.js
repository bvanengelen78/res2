#!/usr/bin/env node

/**
 * Test Complete Authentication Flow
 * 
 * This script tests the complete authentication flow including session creation
 */

import { config } from 'dotenv';
import { storage } from './server/storage';
import { authService } from './server/auth';

// Load environment variables
config();

console.log('🧪 Testing Complete ResourceFlow Authentication Flow');
console.log('==================================================');

async function testCompleteAuthFlow() {
  try {
    console.log('\n🔐 Testing complete login flow...');
    
    const credentials = {
      email: 'admin@resourceflow.com',
      password: 'admin123',
      rememberMe: false
    };
    
    console.log('   Email:', credentials.email);
    console.log('   Password: [hidden]');
    
    // This should test the complete authentication flow including:
    // 1. getUserByEmail
    // 2. Password verification
    // 3. updateUser (last login)
    // 4. getUserWithRoles
    // 5. generateTokens
    // 6. createUserSession
    const result = await authService.login(credentials);
    
    console.log('\n✅ Login successful!');
    console.log('   User ID:', result.user.id);
    console.log('   Email:', result.user.email);
    console.log('   Roles:', result.user.roles.map(r => r.role).join(', '));
    console.log('   Permissions count:', result.user.permissions.length);
    console.log('   Access Token:', result.tokens.accessToken.substring(0, 50) + '...');
    console.log('   Refresh Token:', result.tokens.refreshToken.substring(0, 50) + '...');
    console.log('   Expires At:', result.tokens.expiresAt);
    
    console.log('\n🎉 Complete authentication flow test PASSED!');
    console.log('\n🔑 Ready to login with:');
    console.log('   Email: admin@resourceflow.com');
    console.log('   Password: admin123');
    
    return true;
  } catch (error) {
    console.error('\n❌ Complete authentication flow test FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  const success = await testCompleteAuthFlow();
  
  if (success) {
    console.log('\n✅ All authentication tests passed! Login should work perfectly now.');
  } else {
    console.log('\n❌ Authentication tests failed. There may still be issues.');
    process.exit(1);
  }
}

main();
