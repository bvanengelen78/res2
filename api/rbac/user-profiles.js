// RBAC User Profiles Endpoint
// GET /api/rbac/user-profiles
// Fetches all user profiles with roles for User Management interface (admin only)

const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Helper function to deduplicate roles by role ID
function deduplicateRoles(roles) {
  const seen = new Set();
  return roles.filter(role => {
    if (!role || !role.id) return false;
    if (seen.has(role.id)) return false;
    seen.add(role.id);
    return true;
  });
}

// Helper function to deduplicate role assignments by assignment ID
function deduplicateRoleAssignments(roleAssignments) {
  const seen = new Set();
  return roleAssignments.filter(assignment => {
    if (!assignment || !assignment.id) return false;
    if (seen.has(assignment.id)) return false;
    seen.add(assignment.id);
    return true;
  });
}

// Get all user profiles with their roles
async function getAllUserProfilesWithRoles() {
  try {
    if (!supabase) {
      Logger.warn('Supabase not configured, returning empty array');
      return [];
    }

    Logger.info('Fetching all user profiles with roles using service role key');

    // Get all user profiles (bypasses RLS with service role key)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (profilesError) {
      Logger.error('Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    Logger.info('Fetched user profiles:', { count: userProfiles?.length || 0 });

    const usersWithRoles = [];
    const processedUserIds = new Set(); // Track processed users to prevent duplicates

    // For each user profile, get their roles
    for (const profile of userProfiles || []) {
      // Skip if we've already processed this user
      if (processedUserIds.has(profile.id)) {
        Logger.debug('Skipping duplicate user:', { userId: profile.id, email: profile.email });
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
          Logger.warn('Error fetching roles for user:', { userId: profile.id, email: profile.email, error: rolesError });
          // Continue with empty roles rather than failing completely
        } else {
          // Extract and deduplicate roles
          const rawRoles = userRoles?.map(ur => ur.roles).filter(Boolean) || [];
          roles = deduplicateRoles(rawRoles);

          // Extract and deduplicate role assignments
          const rawRoleAssignments = userRoles?.map(ur => ({
            id: ur.id,
            role: ur.roles,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
          })).filter(ra => ra.role) || [];
          roleAssignments = deduplicateRoleAssignments(rawRoleAssignments);
        }

        // Add user to results (only once)
        usersWithRoles.push({
          ...profile,
          roles,
          role_assignments: roleAssignments
        });

        // Mark this user as processed
        processedUserIds.add(profile.id);

        Logger.debug('User profile with roles:', {
          userId: profile.id,
          email: profile.email,
          rolesCount: roles.length,
          roleAssignmentsCount: roleAssignments.length
        });

      } catch (error) {
        Logger.error('Error processing user roles:', { userId: profile.id, error });
        // Add user with empty roles (only if not already processed)
        if (!processedUserIds.has(profile.id)) {
          usersWithRoles.push({
            ...profile,
            roles: [],
            role_assignments: []
          });
          processedUserIds.add(profile.id);
        }
      }
    }

    Logger.info('Successfully processed user profiles with roles:', {
      totalUsers: usersWithRoles.length,
      usersWithRoles: usersWithRoles.filter(u => u.roles.length > 0).length,
      processedUserIds: processedUserIds.size
    });

    return usersWithRoles;

  } catch (error) {
    Logger.error('Failed to fetch user profiles with roles:', error);
    throw error;
  }
}

// Main handler
const userProfilesHandler = async (req, res, { user }) => {
  try {
    Logger.info('User profiles request', { 
      method: req.method, 
      userId: user?.id,
      userEmail: user?.email,
      hasUserManagementPermission: user?.permissions?.includes('user_management')
    });

    if (req.method !== 'GET') {
      return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }

    // Check if user has user management permission
    if (!user?.permissions?.includes('user_management')) {
      return createErrorResponse(res, 403, 'Insufficient permissions for user management');
    }

    // Get all user profiles with their roles using service role key (bypasses RLS)
    const userProfiles = await getAllUserProfilesWithRoles();

    Logger.info('User profiles response', { 
      userCount: userProfiles.length,
      requestUserId: user.id
    });

    return createSuccessResponse(res, userProfiles);

  } catch (error) {
    Logger.error('User profiles endpoint error:', error);
    return createErrorResponse(res, 500, `Failed to fetch user profiles: ${error.message}`);
  }
};

// Export with middleware
module.exports = withMiddleware(userProfilesHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  requiredPermissions: ['user_management'],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 requests per minute
  }
});
