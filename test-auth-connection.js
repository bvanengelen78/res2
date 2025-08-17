#!/usr/bin/env node

/**
 * Test script to verify authentication connection and diagnose issues
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

console.log('🔍 Testing Authentication Connection...\n');

// Check environment variables
console.log('1️⃣ Environment Variables Check:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Test Supabase connection
console.log('\n2️⃣ Testing Supabase Connection:');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnection() {
  try {
    console.log('   Attempting to connect to Supabase...');
    
    // Test basic connection by trying to access a table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.log('   ❌ Supabase connection failed:');
      console.log('      Code:', error.code);
      console.log('      Message:', error.message);
      console.log('      Details:', error.details);
      console.log('      Hint:', error.hint);
      
      // Provide specific guidance based on error
      if (error.message?.includes('relation "users" does not exist')) {
        console.log('\n💡 The users table does not exist. You may need to run database migrations.');
      } else if (error.message?.includes('Invalid API key')) {
        console.log('\n💡 Invalid API key. Please check your SUPABASE_SERVICE_ROLE_KEY.');
      } else if (error.message?.includes('fetch')) {
        console.log('\n💡 Network/connection issue. Check your SUPABASE_URL and internet connection.');
      }
      
      return false;
    }

    console.log('   ✅ Supabase connection successful!');
    console.log('   📊 Users table accessible');
    return true;

  } catch (err) {
    console.log('   ❌ Unexpected error during connection test:');
    console.log('      Error:', err.message);
    console.log('      Type:', err.constructor.name);
    
    if (err.message.includes('fetch failed')) {
      console.log('\n💡 This looks like a network connectivity issue.');
      console.log('   - Check if the Supabase project is active');
      console.log('   - Verify the SUPABASE_URL is correct');
      console.log('   - Check your internet connection');
    }
    
    return false;
  }
}

async function testUserQuery() {
  console.log('\n3️⃣ Testing User Query (simulating login):');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@resourceflow.com')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('   ℹ️  User not found (this is expected if no admin user exists)');
        return true;
      }
      
      console.log('   ❌ User query failed:');
      console.log('      Code:', error.code);
      console.log('      Message:', error.message);
      return false;
    }

    console.log('   ✅ User query successful!');
    console.log('   👤 Found user:', data.email);
    return true;

  } catch (err) {
    console.log('   ❌ Unexpected error during user query:');
    console.log('      Error:', err.message);
    return false;
  }
}

// Run tests
async function runTests() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await testUserQuery();
    
    console.log('\n✅ Connection tests completed successfully!');
    console.log('💡 The authentication error should now be resolved.');
  } else {
    console.log('\n❌ Connection tests failed.');
    console.log('💡 Please fix the connection issues before testing authentication.');
  }
}

runTests().catch(console.error);
