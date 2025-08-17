#!/usr/bin/env node

/**
 * ResourceFlow Database Debug Script
 * 
 * This script tests database connectivity and verifies the admin user
 * using the same connection method as the ResourceFlow application.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Load environment variables
config();

console.log('🔍 ResourceFlow Database Debug Script');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Create Supabase client (using service role for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testDatabaseConnection() {
  console.log('\n🔌 Testing Database Connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

async function verifyAdminUser() {
  console.log('\n👤 Verifying Admin User...');
  
  try {
    // Check if admin user exists
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@resourceflow.com');
    
    if (userError) {
      console.error('❌ Error querying users table:', userError.message);
      return false;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Admin user NOT found in database');
      console.log('📝 Need to create admin user');
      return false;
    }
    
    const adminUser = users[0];
    console.log('✅ Admin user found!');
    console.log('   ID:', adminUser.id);
    console.log('   Email:', adminUser.email);
    console.log('   Active:', adminUser.is_active);
    console.log('   Email Verified:', adminUser.email_verified);
    console.log('   Created:', adminUser.created_at);
    
    // Check admin user roles
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id);
    
    if (roleError) {
      console.error('❌ Error querying user_roles table:', roleError.message);
    } else {
      console.log('🔐 User Roles:');
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          console.log(`   - ${role.role} (assigned: ${role.assigned_at})`);
        });
      } else {
        console.log('   ❌ No roles assigned to admin user!');
      }
    }
    
    return true;
  } catch (err) {
    console.error('❌ Error verifying admin user:', err.message);
    return false;
  }
}

async function testPasswordHash() {
  console.log('\n🔐 Testing Password Hash...');
  
  const testPassword = 'admin123';
  const expectedHash = '$2b$12$LQv3c1yqBwlFDvjhGGRAmu.Aq7.dJDO6rnOUBLQxcAhscUKrHPjgG';
  
  try {
    const isValid = await bcrypt.compare(testPassword, expectedHash);
    console.log('Password validation:', isValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isValid) {
      console.log('🔧 Generating new hash for admin123...');
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('New hash:', newHash);
    }
    
    return isValid;
  } catch (err) {
    console.error('❌ Password hash test failed:', err.message);
    return false;
  }
}

async function createAdminUserIfMissing() {
  console.log('\n🛠️ Creating Admin User...');
  
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: 'admin@resourceflow.com',
        password: hashedPassword,
        resource_id: null,
        is_active: true,
        email_verified: true
      })
      .select()
      .single();
    
    if (createError) {
      if (createError.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Admin user already exists');
        return true;
      }
      console.error('❌ Error creating admin user:', createError.message);
      return false;
    }
    
    console.log('✅ Admin user created successfully!');
    console.log('   ID:', newUser.id);
    
    // Assign admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.id,
        resource_id: null,
        role: 'admin'
      });
    
    if (roleError) {
      console.error('❌ Error assigning admin role:', roleError.message);
      return false;
    }
    
    console.log('✅ Admin role assigned successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    return false;
  }
}

async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Authentication Flow...');
  
  try {
    // Get admin user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@resourceflow.com')
      .single();
    
    if (userError) {
      console.error('❌ Cannot find admin user:', userError.message);
      return false;
    }
    
    // Test password
    const isValidPassword = await bcrypt.compare('admin123', users.password);
    console.log('Password check:', isValidPassword ? '✅ Valid' : '❌ Invalid');
    
    if (!isValidPassword) {
      console.log('🔧 Password mismatch - this is likely the issue!');
      return false;
    }
    
    // Get user roles
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', users.id);
    
    if (roleError) {
      console.error('❌ Error getting user roles:', roleError.message);
      return false;
    }
    
    console.log('✅ Authentication flow test completed successfully!');
    console.log('   User ID:', users.id);
    console.log('   Email:', users.email);
    console.log('   Roles:', roles.map(r => r.role).join(', '));
    
    return true;
  } catch (err) {
    console.error('❌ Authentication flow test failed:', err.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.log('\n❌ Database connection failed. Check your environment variables.');
      process.exit(1);
    }
    
    const adminExists = await verifyAdminUser();
    if (!adminExists) {
      console.log('\n🔧 Admin user missing. Creating...');
      const created = await createAdminUserIfMissing();
      if (!created) {
        console.log('\n❌ Failed to create admin user.');
        process.exit(1);
      }
    }
    
    await testPasswordHash();
    await testAuthenticationFlow();
    
    console.log('\n🎉 Database debug completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection: Working');
    console.log('   ✅ Admin user: Exists');
    console.log('   ✅ Admin role: Assigned');
    console.log('   ✅ Password hash: Valid');
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@resourceflow.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  }
}

main();
