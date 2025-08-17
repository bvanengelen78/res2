#!/usr/bin/env node

/**
 * Test Authentication Flow
 * 
 * This script tests the exact authentication flow that the ResourceFlow app uses
 */

import { config } from 'dotenv';
import { storage } from './server/storage';
import bcrypt from 'bcrypt';

// Load environment variables
config();

console.log('🧪 Testing ResourceFlow Authentication Flow');
console.log('==========================================');

async function testAuthFlow() {
  try {
    console.log('\n1️⃣ Testing getUserByEmail...');
    const user = await storage.getUserByEmail('admin@resourceflow.com');
    
    if (!user) {
      console.log('❌ User not found');
      return false;
    }
    
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Active:', user.isActive);
    console.log('   Email Verified:', user.emailVerified);
    
    console.log('\n2️⃣ Testing password verification...');
    const isValidPassword = await bcrypt.compare('admin123', user.password);
    console.log('Password check:', isValidPassword ? '✅ Valid' : '❌ Invalid');
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return false;
    }
    
    console.log('\n3️⃣ Testing getUserWithRoles...');
    const userWithRoles = await storage.getUserWithRoles(user.id);

    if (!userWithRoles) {
      console.log('❌ Failed to get user with roles');
      return false;
    }

    console.log('✅ User with roles:');
    console.log('   ID:', userWithRoles.id);
    console.log('   Email:', userWithRoles.email);
    console.log('   Roles:', userWithRoles.roles.map(r => r.role).join(', '));
    console.log('   Permissions:', userWithRoles.permissions.slice(0, 5).join(', '), '...');

    console.log('\n4️⃣ Testing updateUser (last login)...');
    const updatedUser = await storage.updateUser(user.id, {
      lastLogin: new Date(),
    });

    console.log('✅ User updated successfully:');
    console.log('   Last Login:', updatedUser.lastLogin);

    console.log('\n🎉 Complete authentication flow test PASSED!');
    console.log('\n🔑 Ready to login with:');
    console.log('   Email: admin@resourceflow.com');
    console.log('   Password: admin123');
    
    return true;
  } catch (error) {
    console.error('\n❌ Authentication flow test FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  const success = await testAuthFlow();
  
  if (success) {
    console.log('\n✅ All tests passed! The authentication should work now.');
  } else {
    console.log('\n❌ Tests failed. There may still be issues with the authentication.');
    process.exit(1);
  }
}

main();
