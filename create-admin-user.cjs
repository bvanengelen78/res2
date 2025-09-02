// Create Admin User for Resource Planning Tracker
const { createClient } = require('@supabase/supabase-js');

async function createAdminUser() {
  console.log('🔧 Creating admin user...\n');

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

    // Admin user details
    const adminEmail = 'admin@resourceflow.com';
    const adminPassword = 'ResourceFlow2024!';
    const adminName = 'System Administrator';

    // Check if admin user already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (existingProfile) {
      console.log('✅ Admin user already exists:', adminEmail);
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      return;
    }

    console.log('👤 Creating new admin user...');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: 'System',
        last_name: 'Administrator',
        full_name: adminName,
        role: 'admin',
      },
    });

    if (authError) {
      console.log('❌ Error creating auth user:', authError.message);
      return;
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created with ID:', userId);

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: adminEmail,
        first_name: 'System',
        last_name: 'Administrator',
        full_name: adminName,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.log('❌ Error creating user profile:', profileError.message);
      return;
    }

    console.log('✅ User profile created');

    // Get admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.log('❌ Admin role not found:', roleError?.message);
      return;
    }

    console.log('✅ Found admin role with ID:', adminRole.id);

    // Assign admin role to user
    const { data: roleAssignment, error: assignmentError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: adminRole.id,
        is_active: true,
      })
      .select()
      .single();

    if (assignmentError) {
      console.log('❌ Error assigning admin role:', assignmentError.message);
      return;
    }

    console.log('✅ Admin role assigned successfully');

    // Create a resource record for the admin
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .insert({
        name: adminName,
        email: adminEmail,
        role: 'Administrator',
        department: 'IT',
        capacity: 40,
        skills: ['System Administration', 'User Management'],
        hourly_rate: 0,
        is_active: true,
      })
      .select()
      .single();

    if (resourceError) {
      console.log('⚠️ Warning: Could not create resource record:', resourceError.message);
    } else {
      console.log('✅ Resource record created');
    }

    console.log('\n🎉 Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('\n🚀 You can now login at: https://res2-five.vercel.app/');

    // Test login
    console.log('\n🧪 Testing login...');
    const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (authError2) {
      console.log('❌ Login test failed:', authError2.message);
    } else {
      console.log('✅ Login test successful');
      console.log('🎟️ Access token generated successfully');
    }

  } catch (error) {
    console.error('💥 Creation failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run the creation
createAdminUser();
