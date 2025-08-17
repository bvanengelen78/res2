#!/usr/bin/env node

/**
 * Test Migrated Database Operations
 * 
 * This script tests the migrated Supabase operations to ensure they work correctly
 */

import { config } from 'dotenv';
import { storage } from './server/storage';

// Load environment variables
config();

console.log('🧪 Testing Migrated Database Operations');
console.log('=====================================');

async function testResourceOperations() {
  try {
    console.log('\n📋 Testing Resource Operations...');
    
    // Test getResources
    console.log('   Testing getResources...');
    const resources = await storage.getResources();
    console.log(`   ✅ Found ${resources.length} resources`);
    
    if (resources.length > 0) {
      // Test getResource
      console.log('   Testing getResource...');
      const resource = await storage.getResource(resources[0].id);
      console.log(`   ✅ Retrieved resource: ${resource?.name || 'Unknown'}`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Resource operations failed:', error.message);
    return false;
  }
}

async function testProjectOperations() {
  try {
    console.log('\n📋 Testing Project Operations...');
    
    // Test getProjects
    console.log('   Testing getProjects...');
    const projects = await storage.getProjects();
    console.log(`   ✅ Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      // Test getProject
      console.log('   Testing getProject...');
      const project = await storage.getProject(projects[0].id);
      console.log(`   ✅ Retrieved project: ${project?.name || 'Unknown'}`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Project operations failed:', error.message);
    return false;
  }
}

async function testUserOperations() {
  try {
    console.log('\n👤 Testing User Operations...');
    
    // Test getUserByEmail (already migrated)
    console.log('   Testing getUserByEmail...');
    const user = await storage.getUserByEmail('admin@resourceflow.com');
    console.log(`   ✅ Found user: ${user?.email || 'Not found'}`);
    
    if (user) {
      // Test getUserRoles (already migrated)
      console.log('   Testing getUserRoles...');
      const roles = await storage.getUserRoles(user.id);
      console.log(`   ✅ Found ${roles.length} roles: ${roles.map(r => r.role).join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ User operations failed:', error.message);
    return false;
  }
}

async function testAuthenticationFlow() {
  try {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Test complete login
    console.log('   Testing complete login...');
    const { authService } = await import('./server/auth');
    const result = await authService.login({
      email: 'admin@resourceflow.com',
      password: 'admin123',
      rememberMe: false
    });
    
    console.log('   ✅ Login successful');
    console.log(`   ✅ User: ${result.user.email}`);
    console.log(`   ✅ Roles: ${result.user.roles.map(r => r.role).join(', ')}`);
    console.log(`   ✅ Permissions: ${result.user.permissions.length} total`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Authentication flow failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive database operation tests...\n');
  
  const results = {
    auth: await testAuthenticationFlow(),
    users: await testUserOperations(),
    resources: await testResourceOperations(),
    projects: await testProjectOperations(),
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`   Authentication: ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   User Operations: ${results.users ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Resource Operations: ${results.resources ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Project Operations: ${results.projects ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All migrated operations are working correctly!');
    console.log('✅ The Supabase client migration is successful so far.');
  } else {
    console.log('\n⚠️  Some operations are still failing.');
    console.log('❌ Additional migration work may be needed.');
    process.exit(1);
  }
}

main();
