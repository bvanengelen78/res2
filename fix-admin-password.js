#!/usr/bin/env node

/**
 * Fix Admin Password Script
 * 
 * This script updates the admin user's password hash to fix the authentication issue.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Load environment variables
config();

console.log('🔧 Fixing Admin Password Hash...');
console.log('================================');

// Create Supabase client
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

async function fixAdminPassword() {
  try {
    // Generate correct password hash for 'admin123'
    console.log('🔐 Generating password hash for "admin123"...');
    const correctHash = await bcrypt.hash('admin123', 12);
    console.log('✅ New hash generated:', correctHash);
    
    // Update admin user password
    console.log('📝 Updating admin user password in database...');
    const { data, error } = await supabase
      .from('users')
      .update({ password: correctHash })
      .eq('email', 'admin@resourceflow.com')
      .select();
    
    if (error) {
      console.error('❌ Error updating password:', error.message);
      return false;
    }
    
    console.log('✅ Password updated successfully!');
    
    // Verify the fix
    console.log('🔍 Verifying password fix...');
    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('email', 'admin@resourceflow.com')
      .single();
    
    if (user) {
      const isValid = await bcrypt.compare('admin123', user.password);
      console.log('Password verification:', isValid ? '✅ Valid' : '❌ Still invalid');
      return isValid;
    }
    
    return false;
  } catch (err) {
    console.error('❌ Error fixing password:', err.message);
    return false;
  }
}

async function main() {
  const success = await fixAdminPassword();
  
  if (success) {
    console.log('\n🎉 Admin password fixed successfully!');
    console.log('\n🔑 You can now login with:');
    console.log('   Email: admin@resourceflow.com');
    console.log('   Password: admin123');
    console.log('\n🚀 Try logging in to ResourceFlow now!');
  } else {
    console.log('\n❌ Failed to fix admin password.');
    process.exit(1);
  }
}

main();
