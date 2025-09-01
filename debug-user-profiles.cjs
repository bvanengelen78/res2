// Debug User Profiles Endpoint
const { createClient } = require('@supabase/supabase-js');

async function debugUserProfiles() {
  console.log('🔍 Debugging User Profiles Endpoint...\n');

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

    console.log('✅ Supabase client initialized with service role key');

    // Step 1: Get all user profiles (exactly like the endpoint does)
    console.log('\n📋 Step 1: Getting all user profiles...');
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.log('❌ Error fetching user profiles:', profilesError.message);
      return;
    }

    console.log(`✅ Found ${userProfiles.length} active user profiles`);
    userProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.email} (ID: ${profile.id})`);
    });

    // Step 2: Process each user profile to get roles (exactly like the endpoint does)
    console.log('\n📋 Step 2: Processing each user profile for roles...');
    const usersWithRoles = [];
    const processedUserIds = new Set();

    for (const profile of userProfiles || []) {
      console.log(`\n   Processing user: ${profile.email}`);
      
      // Skip if we've already processed this user
      if (processedUserIds.has(profile.id)) {
        console.log(`   ⚠️  Skipping duplicate user: ${profile.id}`);
        continue;
      }

      try {
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            id,
            assigned_at,
            assigned_by,
            is_active,
            roles (
              id,
              name,
              description,
              display_name,
              is_active
            )
          `)
          .eq('user_id', profile.id)
          .eq('is_active', true);

        let roles = [];
        let roleAssignments = [];

        if (rolesError) {
          console.log(`   ⚠️  Error fetching roles for ${profile.email}:`, rolesError.message);
          // Continue with empty roles rather than failing completely
        } else {
          console.log(`   ✅ Found ${userRoles?.length || 0} role assignments for ${profile.email}`);
          
          // Extract roles
          const rawRoles = userRoles?.map(ur => ur.roles).filter(Boolean) || [];
          roles = rawRoles.filter((role, index, self) => 
            role && self.findIndex(r => r && r.id === role.id) === index
          );
          
          // Extract role assignments
          const rawRoleAssignments = userRoles?.map(ur => ({
            id: ur.id,
            role: ur.roles,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
          })).filter(ra => ra.role) || [];
          roleAssignments = rawRoleAssignments.filter((assignment, index, self) => 
            assignment && self.findIndex(a => a && a.id === assignment.id) === index
          );

          console.log(`   📝 Processed roles: ${roles.map(r => r.name).join(', ') || 'None'}`);
        }

        // Add user to results
        const userWithRoles = {
          ...profile,
          roles,
          role_assignments: roleAssignments
        };

        usersWithRoles.push(userWithRoles);
        processedUserIds.add(profile.id);

        console.log(`   ✅ Added user to results: ${profile.email}`);

      } catch (error) {
        console.log(`   ❌ Error processing user ${profile.email}:`, error.message);
        // Add user with empty roles
        if (!processedUserIds.has(profile.id)) {
          usersWithRoles.push({
            ...profile,
            roles: [],
            role_assignments: []
          });
          processedUserIds.add(profile.id);
          console.log(`   ⚠️  Added user with empty roles: ${profile.email}`);
        }
      }
    }

    console.log(`\n📊 Final Results:`);
    console.log(`   Total users processed: ${usersWithRoles.length}`);
    console.log(`   Processed user IDs: ${processedUserIds.size}`);
    
    usersWithRoles.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - Roles: ${user.roles.map(r => r.name).join(', ') || 'None'}`);
    });

    // Step 3: Test the actual API endpoint
    console.log('\n📋 Step 3: Testing actual API endpoint...');
    
    // First login to get token
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@swisssense.nl',
      password: 'admin123'
    });

    if (authError) {
      console.log('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful');

    // Test the API endpoint
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:5000/api/rbac/user-profiles', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const apiData = await response.json();
      console.log(`✅ API endpoint returned ${apiData.data.length} users`);
      apiData.data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - Roles: ${user.roles.map(r => r.name).join(', ') || 'None'}`);
      });
    } else {
      const errorData = await response.json();
      console.log('❌ API endpoint failed:', errorData.error);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run the debug
debugUserProfiles();
