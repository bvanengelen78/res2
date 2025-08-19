const { createClient } = require('@supabase/supabase-js');
const { Logger, withRetry } = require('./middleware');

// Supabase configuration for Vercel serverless functions
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  const error = new Error('SUPABASE_URL environment variable is required');
  Logger.error('Missing Supabase URL configuration', error);
  throw error;
}

if (!supabaseServiceKey) {
  const error = new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  Logger.error('Missing Supabase service key configuration', error);
  throw error;
}

// Create Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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

// Database service functions
const DatabaseService = {
  // Resources with enhanced error handling and retry logic
  async getResources() {
    return withRetry(async () => {
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

  // Projects
  async getProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      return (data || []).map(project =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project), ['createdAt', 'updatedAt', 'startDate', 'endDate'])
      );
    } catch (err) {
      console.error('Unexpected error in getProjects:', err);
      return [];
    }
  },

  // Departments
  async getDepartments() {
    try {
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
