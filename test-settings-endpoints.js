#!/usr/bin/env node

/**
 * Test script to verify Settings page API endpoints
 * This script tests the database connectivity and API endpoints for settings data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET,
};

console.log('🔧 Testing Settings Page Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log(`✓ SUPABASE_URL: ${TEST_CONFIG.supabaseUrl ? 'Set' : '❌ Missing'}`);
console.log(`✓ SUPABASE_SERVICE_ROLE_KEY: ${TEST_CONFIG.supabaseServiceKey ? 'Set' : '❌ Missing'}`);
console.log(`✓ JWT_SECRET: ${TEST_CONFIG.jwtSecret ? 'Set' : '❌ Missing'}\n`);

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🔌 Testing Supabase Connection...');
  
  if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseServiceKey) {
    console.log('❌ Cannot test Supabase - missing configuration\n');
    return false;
  }

  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('resources').select('count').limit(1);
    
    if (error) {
      console.log(`❌ Supabase connection failed: ${error.message}\n`);
      return false;
    }
    
    console.log('✅ Supabase connection successful\n');
    return true;
  } catch (error) {
    console.log(`❌ Supabase connection error: ${error.message}\n`);
    return false;
  }
}

// Test settings tables
async function testSettingsTables() {
  console.log('📊 Testing Settings Tables...');
  
  if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseServiceKey) {
    console.log('❌ Cannot test tables - missing Supabase configuration\n');
    return;
  }

  const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
  
  const tables = [
    'ogsm_charters',
    'departments', 
    'notification_settings'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': Accessible`);
      }
    } catch (error) {
      console.log(`❌ Table '${table}': ${error.message}`);
    }
  }
  console.log('');
}

// Test API endpoints (if server is running)
async function testAPIEndpoints() {
  console.log('🌐 Testing API Endpoints...');
  
  const endpoints = [
    '/api/settings/ogsm-charters',
    '/api/settings/departments',
    '/api/settings/notifications'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': 'Bearer test-token' // This will likely fail auth, but we can see if endpoint exists
        }
      });
      
      console.log(`${response.status === 401 ? '✅' : response.status === 200 ? '✅' : '❌'} ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Server not running or endpoint not accessible`);
    }
  }
  console.log('');
}

// Main test function
async function runTests() {
  const supabaseConnected = await testSupabaseConnection();
  
  if (supabaseConnected) {
    await testSettingsTables();
  }
  
  await testAPIEndpoints();
  
  console.log('🎯 Test Summary:');
  console.log('1. If Supabase connection failed, update .env with correct Supabase credentials');
  console.log('2. If tables are missing, run database migrations or create tables manually');
  console.log('3. If API endpoints return 401, that\'s expected (authentication required)');
  console.log('4. If API endpoints are not accessible, start the development server with: npm run dev');
  console.log('\n✨ Settings page should work once all components are properly configured!');
}

// Run the tests
runTests().catch(console.error);
