// Check Admin Permissions
const { createClient } = require('@supabase/supabase-js');

async function checkAdminPermissions() {
  console.log('🔍 Checking Admin Permissions...\n');

  try {
    // Initialize Supabase client
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

    // Find admin user
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'admin@swisssense.nl')
      .single();

    if (profileError || !adminProfile) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Found admin user:', adminProfile.email);
    console.log('📝 Admin ID:', adminProfile.id);

    // Check admin roles
    console.log('\n📋 Checking admin roles...');
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        id,
        assigned_at,
        is_active,
        roles (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', adminProfile.id)
      .eq('is_active', true);

    if (rolesError) {
      console.log('❌ Error fetching admin roles:', rolesError.message);
    } else {
      console.log(`✅ Found ${adminRoles.length} active roles for admin`);
      adminRoles.forEach((roleAssignment, index) => {
        console.log(`   ${index + 1}. ${roleAssignment.roles.name} (${roleAssignment.roles.display_name})`);
      });
    }

    // Check admin permissions using RPC
    console.log('\n📋 Checking admin permissions...');
    const { data: adminPermissions, error: permError } = await supabase
      .rpc('get_user_permissions', { user_id: adminProfile.id });

    if (permError) {
      console.log('❌ Error fetching admin permissions:', permError.message);
      console.log('   This might be because the get_user_permissions function doesn\'t exist');
    } else {
      console.log(`✅ Found ${adminPermissions.length} permissions for admin`);
      adminPermissions.forEach((permission, index) => {
        console.log(`   ${index + 1}. ${permission.permission_name}`);
      });
    }

    // Check if admin has user_management permission specifically
    const hasUserManagement = adminPermissions?.some(p => p.permission_name === 'user_management');
    console.log(`\n🔑 Admin has user_management permission: ${hasUserManagement ? '✅ YES' : '❌ NO'}`);

    // If no permissions, let's check the permissions table and role_permissions
    if (!adminPermissions || adminPermissions.length === 0) {
      console.log('\n📋 Checking permissions table...');
      const { data: allPermissions, error: allPermError } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true);

      if (allPermError) {
        console.log('❌ Error fetching permissions:', allPermError.message);
      } else {
        console.log(`✅ Found ${allPermissions.length} total permissions in system`);
        allPermissions.forEach((permission, index) => {
          console.log(`   ${index + 1}. ${permission.name} (${permission.display_name})`);
        });
      }

      // Check role_permissions for admin role
      console.log('\n📋 Checking role permissions for admin role...');
      const { data: adminRolePerms, error: rolePermError } = await supabase
        .from('role_permissions')
        .select(`
          *,
          roles(name, display_name),
          permissions(name, display_name)
        `)
        .in('role_id', adminRoles.map(r => r.roles.id));

      if (rolePermError) {
        console.log('❌ Error fetching role permissions:', rolePermError.message);
      } else {
        console.log(`✅ Found ${adminRolePerms.length} role permissions for admin roles`);
        adminRolePerms.forEach((rolePerm, index) => {
          console.log(`   ${index + 1}. ${rolePerm.roles.name} -> ${rolePerm.permissions.name}`);
        });
      }
    }

    // Try to manually assign user_management permission to admin role if missing
    if (!hasUserManagement) {
      console.log('\n🔧 Admin missing user_management permission. Attempting to fix...');
      
      // Find admin role
      const adminRole = adminRoles.find(r => r.roles.name === 'admin');
      if (adminRole) {
        // Find user_management permission
        const { data: userMgmtPerm, error: permFindError } = await supabase
          .from('permissions')
          .select('*')
          .eq('name', 'user_management')
          .single();

        if (permFindError || !userMgmtPerm) {
          console.log('❌ user_management permission not found in permissions table');
        } else {
          // Check if role already has this permission
          const { data: existingRolePerm, error: existingError } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role_id', adminRole.roles.id)
            .eq('permission_id', userMgmtPerm.id)
            .single();

          if (existingError && existingError.code === 'PGRST116') {
            // Permission doesn't exist, create it
            const { error: insertError } = await supabase
              .from('role_permissions')
              .insert({
                role_id: adminRole.roles.id,
                permission_id: userMgmtPerm.id
              });

            if (insertError) {
              console.log('❌ Error assigning user_management permission:', insertError.message);
            } else {
              console.log('✅ Successfully assigned user_management permission to admin role');
            }
          } else {
            console.log('ℹ️  Admin role already has user_management permission in role_permissions table');
          }
        }
      }
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

// Run the check
checkAdminPermissions();
