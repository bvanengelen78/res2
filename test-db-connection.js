// Database connectivity test for ResourceFlow Supabase migration
// Run this with: node test-db-connection.js

import { config } from 'dotenv';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

console.log('🔍 Testing ResourceFlow Database Connectivity...\n');

// Test environment variables
console.log('📋 Environment Variables Check:');
console.log('✓ SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('✓ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('✓ DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('');

// Test Supabase client connection
async function testSupabaseClient() {
  try {
    console.log('🔌 Testing Supabase Client Connection...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase.from('departments').select('count');
    
    if (error) {
      console.log('❌ Supabase Client Error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase Client: Connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Supabase Client Error:', error.message);
    return false;
  }
}

// Test direct PostgreSQL connection
async function testPostgresConnection() {
  let sql;
  try {
    console.log('🐘 Testing Direct PostgreSQL Connection...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL');
    }

    sql = postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 1 // Limit connections for test
    });

    // Test basic query
    const result = await sql`SELECT COUNT(*) as count FROM departments`;
    
    console.log('✅ PostgreSQL: Connected successfully');
    console.log(`📊 Departments table has ${result[0].count} records`);
    
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL Error:', error.message);
    return false;
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

// Test table existence
async function testTableStructure() {
  let sql;
  try {
    console.log('📋 Testing Table Structure...');
    
    sql = postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 1
    });

    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN (
          'departments', 'ogsm_charters', 'resources', 'projects',
          'resource_allocations', 'time_off', 'time_entries',
          'weekly_submissions', 'notification_settings', 'users',
          'user_sessions', 'password_reset_tokens', 'user_roles'
        )
      ORDER BY tablename
    `;

    console.log(`✅ Found ${tables.length}/13 required tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.tablename}`);
    });

    if (tables.length === 13) {
      console.log('✅ All required tables exist');
      return true;
    } else {
      console.log('❌ Some tables are missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Table Structure Error:', error.message);
    return false;
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting ResourceFlow Database Tests...\n');
  
  const results = {
    supabase: await testSupabaseClient(),
    postgres: await testPostgresConnection(),
    tables: await testTableStructure()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Supabase Client:', results.supabase ? '✅ PASS' : '❌ FAIL');
  console.log('PostgreSQL Direct:', results.postgres ? '✅ PASS' : '❌ FAIL');
  console.log('Table Structure:', results.tables ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🎯 Overall Status:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  if (allPassed) {
    console.log('\n🎉 Your ResourceFlow database is ready!');
    console.log('You can now start the application with: npm run dev');
  } else {
    console.log('\n🔧 Please check your configuration and try again.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});
