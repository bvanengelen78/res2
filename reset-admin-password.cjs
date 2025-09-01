// Reset Admin Password
const { createClient } = require('@supabase/supabase-js');

async function resetAdminPassword() {
  console.log('🔧 Resetting admin password...\n');

  try {
    // Initialize Supabase client with service role key
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

    console.log('✅ Supabase client initialized');

    // Find admin user
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'admin@swisssense.nl')
      .single();

    if (profileError || !adminProfile) {
      console.log('❌ Admin user not found in user_profiles');
      return;
    }

    console.log('✅ Found admin user:', adminProfile.email);

    // Reset password using Supabase Admin API
    const newPassword = 'admin123';
    const { data: updateResult, error: updateError } = await supabase.auth.admin.updateUserById(
      adminProfile.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      console.log('❌ Error updating password:', updateError.message);
      return;
    }

    console.log('✅ Password reset successfully');
    console.log(`📧 Email: admin@swisssense.nl`);
    console.log(`🔑 Password: ${newPassword}`);

    // Test login
    console.log('\n🧪 Testing login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@swisssense.nl',
      password: newPassword
    });

    if (authError) {
      console.log('❌ Login test failed:', authError.message);
    } else {
      console.log('✅ Login test successful');
      console.log('🎟️ Token:', authData.session.access_token.substring(0, 50) + '...');
    }

  } catch (error) {
    console.error('💥 Reset failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run the reset
resetAdminPassword();
