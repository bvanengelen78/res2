// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');
const { Logger, withRetry } = require('./middleware');

// Supabase configuration for both development and production
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for environment variables but don't throw immediately
// This allows the module to load even if Supabase is not configured
let supabaseConfigured = true;

if (!supabaseUrl) {
  Logger.error('Missing Supabase URL configuration', new Error('SUPABASE_URL environment variable is required'));
  supabaseConfigured = false;
}

if (!supabaseServiceKey) {
  Logger.error('Missing Supabase service key configuration', new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required'));
  supabaseConfigured = false;
}

// Create Supabase client with service role for admin operations
// Only if configuration is available
let supabase = null;

if (supabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'resource-planning-tracker'
        }
      }
    });

    // Log successful connection
    Logger.info('Supabase client initialized', {
      url: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
  } catch (error) {
    Logger.error('Failed to initialize Supabase client', error);
    supabaseConfigured = false;
  }
} else {
  Logger.warn('Supabase client not initialized due to missing configuration');
}

// Utility functions for data transformation
const SupabaseUtils = {
  // Convert snake_case to camelCase
  toCamelCase: (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => SupabaseUtils.toCamelCase(item));
    if (typeof obj !== 'object') return obj;

    const camelCaseObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCaseObj[camelKey] = SupabaseUtils.toCamelCase(value);
    }
    return camelCaseObj;
  },

  // Parse date strings to Date objects
  parseDates: (obj, dateFields = []) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => SupabaseUtils.parseDates(item, dateFields));

    const parsedObj = { ...obj };
    dateFields.forEach(field => {
      if (parsedObj[field] && typeof parsedObj[field] === 'string') {
        parsedObj[field] = new Date(parsedObj[field]);
      }
    });
    return parsedObj;
  },

  // Convert camelCase to snake_case for database operations
  toSnakeCase: (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => SupabaseUtils.toSnakeCase(item));
    if (typeof obj !== 'object') return obj;

    const snakeCaseObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseObj[snakeKey] = SupabaseUtils.toSnakeCase(value);
    }
    return snakeCaseObj;
  }
};

// Helper function to check if Supabase is available
const checkSupabaseAvailable = () => {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured or available');
  }
};

// Database service functions
const DatabaseService = {
  // Resources with enhanced error handling and retry logic
  async getResources() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching resources from database');

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        Logger.error('Failed to fetch resources', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const resources = (data || []).map(resource =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(resource), ['createdAt', 'updatedAt', 'deletedAt'])
      );

      Logger.info('Successfully fetched resources', { count: resources.length });
      return resources;
    });
  },

  // Projects with enhanced error handling and retry logic
  async getProjects() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching projects from database');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        Logger.error('Failed to fetch projects', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const projects = (data || []).map(project =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project), ['createdAt', 'updatedAt', 'startDate', 'endDate'])
      );

      Logger.info('Successfully fetched projects', { count: projects.length });
      return projects;
    });
  },

  // Departments
  async getDepartments() {
    try {
      checkSupabaseAvailable();
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching departments:', error);
        return [];
      }

      return (data || []).map(department =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(department), ['createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getDepartments:', err);
      return [];
    }
  },

  // OGSM Charters
  async getOgsmCharters() {
    try {
      const { data, error } = await supabase
        .from('ogsm_charters')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching OGSM charters:', error);
        return [];
      }

      return (data || []).map(charter =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(charter), ['createdAt', 'updatedAt'])
      );
    } catch (err) {
      console.error('Unexpected error in getOgsmCharters:', err);
      return [];
    }
  },

  // Resource Allocations with enhanced error handling and retry logic
  async getResourceAllocations() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching resource allocations from database');

      const { data, error } = await supabase
        .from('resource_allocations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error('Failed to fetch resource allocations', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const allocations = (data || []).map(allocation =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(allocation), ['createdAt', 'updatedAt', 'startDate', 'endDate'])
      );

      Logger.info('Successfully fetched resource allocations', { count: allocations.length });
      return allocations;
    });
  },

  // User authentication methods
  async getUserWithRoles(userId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching user with roles from database', { userId });

      // First get the user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (userError) {
        Logger.error('Failed to fetch user', userError, { userId });
        throw new Error(`User query error: ${userError.message}`);
      }

      if (!userData) {
        Logger.warn('User not found', { userId });
        return null;
      }

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (rolesError) {
        Logger.error('Failed to fetch user roles', rolesError, { userId });
        // Continue without roles rather than failing completely
      }

      // Get user's resource if they have one
      let resource = null;
      if (userData.resource_id) {
        const { data: resourceData, error: resourceError } = await supabase
          .from('resources')
          .select('*')
          .eq('id', userData.resource_id)
          .single();

        if (!resourceError && resourceData) {
          resource = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(resourceData), ['createdAt', 'updatedAt']);
        }
      }

      // Convert roles to proper format
      const roles = (rolesData || []).map(role => ({
        id: role.id,
        userId: role.user_id,
        resourceId: role.resource_id,
        role: role.role,
        assignedAt: role.assigned_at ? new Date(role.assigned_at) : null,
        assignedBy: role.assigned_by,
      }));

      // Calculate permissions from roles
      const ROLE_PERMISSIONS = {
        'regular_user': ['time_logging', 'dashboard'],
        'change_lead': ['time_logging', 'change_lead_reports', 'dashboard', 'reports'],
        'manager_change': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
        'business_controller': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'dashboard', 'calendar', 'submission_overview', 'settings'],
        'admin': ['time_logging', 'reports', 'change_lead_reports', 'resource_management', 'project_management', 'user_management', 'system_admin', 'dashboard', 'calendar', 'submission_overview', 'settings', 'role_management']
      };

      const allPermissions = roles.flatMap(role => ROLE_PERMISSIONS[role.role] || []);
      const uniquePermissions = Array.from(new Set(allPermissions));

      // Convert user data to camelCase and add roles/permissions
      const user = {
        ...SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(userData), ['createdAt', 'updatedAt']),
        resource,
        roles,
        permissions: uniquePermissions,
      };

      Logger.info('Successfully fetched user with roles', {
        userId,
        email: user.email,
        rolesCount: roles.length,
        permissionsCount: uniquePermissions.length,
        permissions: uniquePermissions
      });

      return user;
    });
  },

  // Health check
  async checkHealth() {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          database: 'error',
          error: error.message,
          responseTime
        };
      }

      return {
        status: 'healthy',
        database: 'connected',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

module.exports = {
  supabase,
  SupabaseUtils,
  DatabaseService
};
