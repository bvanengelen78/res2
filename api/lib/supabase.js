// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

// Standalone logger to avoid circular dependency with middleware
const Logger = {
  info: (message, context = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  error: (message, error = null, context = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },

  warn: (message, context = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};

// Database retry utility (moved from middleware to avoid circular dependency)
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      Logger.warn(`Database operation failed, retrying (${attempt}/${maxRetries})`, {
        error: error.message,
        attempt
      });

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

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

  // Time Entries with enhanced error handling and retry logic
  async getTimeEntries() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching time entries from database');

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) {
        Logger.error('Failed to fetch time entries', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const timeEntries = (data || []).map(entry =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(entry), ['weekStartDate', 'createdAt', 'updatedAt'])
      );

      Logger.info('Successfully fetched time entries', { count: timeEntries.length });
      return timeEntries;
    });
  },

  // Optimized period-aware resource allocations
  async getResourceAllocationsByPeriod(startDate, endDate) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching period-filtered resource allocations from database', {
        startDate,
        endDate
      });

      let query = supabase
        .from('resource_allocations')
        .select('*');

      // Apply date filtering at database level
      if (startDate && endDate) {
        // Get allocations that overlap with the specified period
        query = query
          .lte('start_date', endDate)
          .gte('end_date', startDate);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        Logger.error('Failed to fetch period-filtered resource allocations', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const allocations = (data || []).map(allocation =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(allocation), ['createdAt', 'updatedAt', 'startDate', 'endDate'])
      );

      Logger.info('Successfully fetched period-filtered resource allocations', {
        count: allocations.length,
        period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
      });
      return allocations;
    });
  },

  // Optimized period-aware projects
  async getProjectsByPeriod(startDate, endDate) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching period-filtered projects from database', {
        startDate,
        endDate
      });

      let query = supabase
        .from('projects')
        .select('*');

      // Apply date filtering at database level for active projects in period
      if (startDate && endDate) {
        query = query
          .eq('status', 'active')
          .lte('start_date', endDate)
          .gte('end_date', startDate);
      } else {
        query = query.eq('status', 'active');
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        Logger.error('Failed to fetch period-filtered projects', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const projects = (data || []).map(project =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(project), ['createdAt', 'updatedAt', 'startDate', 'endDate'])
      );

      Logger.info('Successfully fetched period-filtered projects', {
        count: projects.length,
        period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
      });
      return projects;
    });
  },

  // Optimized period-aware time entries
  async getTimeEntriesByPeriod(startDate, endDate) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching period-filtered time entries from database', {
        startDate,
        endDate
      });

      let query = supabase
        .from('time_entries')
        .select('*');

      // Apply date filtering at database level
      if (startDate && endDate) {
        query = query
          .gte('week_start_date', startDate)
          .lte('week_start_date', endDate);
      }

      query = query.order('week_start_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        Logger.error('Failed to fetch period-filtered time entries', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const timeEntries = (data || []).map(entry =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(entry), ['weekStartDate', 'createdAt', 'updatedAt'])
      );

      Logger.info('Successfully fetched period-filtered time entries', {
        count: timeEntries.length,
        period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
      });
      return timeEntries;
    });
  },

  // Historical KPIs management
  async saveHistoricalKpi(kpiData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Saving historical KPI snapshot', {
        snapshotDate: kpiData.snapshotDate,
        period: `${kpiData.periodStartDate} to ${kpiData.periodEndDate}`,
        department: kpiData.department || 'all'
      });

      const { data, error } = await supabase
        .from('historical_kpis')
        .insert(kpiData)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to save historical KPI snapshot', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const historicalKpi = SupabaseUtils.parseDates(
        SupabaseUtils.toCamelCase(data),
        ['snapshotDate', 'periodStartDate', 'periodEndDate', 'createdAt', 'updatedAt']
      );

      Logger.info('Successfully saved historical KPI snapshot', { id: historicalKpi.id });
      return historicalKpi;
    });
  },

  async getHistoricalKpis(filters = {}) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching historical KPI snapshots', filters);

      let query = supabase
        .from('historical_kpis')
        .select('*');

      // Apply filters
      if (filters.startDate) {
        query = query.gte('snapshot_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('snapshot_date', filters.endDate);
      }
      if (filters.department) {
        query = query.eq('department', filters.department);
      }

      query = query.order('snapshot_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        Logger.error('Failed to fetch historical KPI snapshots', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const historicalKpis = (data || []).map(kpi =>
        SupabaseUtils.parseDates(
          SupabaseUtils.toCamelCase(kpi),
          ['snapshotDate', 'periodStartDate', 'periodEndDate', 'createdAt', 'updatedAt']
        )
      );

      Logger.info('Successfully fetched historical KPI snapshots', { count: historicalKpis.length });
      return historicalKpis;
    });
  },

  async getLatestHistoricalKpi(department = null) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching latest historical KPI snapshot', { department });

      let query = supabase
        .from('historical_kpis')
        .select('*');

      if (department) {
        query = query.eq('department', department);
      } else {
        query = query.is('department', null);
      }

      query = query.order('snapshot_date', { ascending: false }).limit(1);

      const { data, error } = await query;

      if (error) {
        Logger.error('Failed to fetch latest historical KPI snapshot', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        Logger.info('No historical KPI snapshots found');
        return null;
      }

      const historicalKpi = SupabaseUtils.parseDates(
        SupabaseUtils.toCamelCase(data[0]),
        ['snapshotDate', 'periodStartDate', 'periodEndDate', 'createdAt', 'updatedAt']
      );

      Logger.info('Successfully fetched latest historical KPI snapshot', {
        id: historicalKpi.id,
        snapshotDate: historicalKpi.snapshotDate
      });
      return historicalKpi;
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

  // Settings API - Departments management
  async getDepartments() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching departments from database');

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        Logger.error('Failed to fetch departments', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const departments = (data || []).map(dept =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(dept), ['createdAt', 'updatedAt'])
      );

      Logger.info('Successfully fetched departments', { count: departments.length });
      return departments;
    });
  },

  async getDepartment(departmentId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching department by ID', { departmentId });

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Logger.info('Department not found', { departmentId });
          return null;
        }
        Logger.error('Failed to fetch department', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const department = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully fetched department', { departmentId });
      return department;
    });
  },

  async createDepartment(departmentData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Creating department', { name: departmentData.name });

      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: departmentData.name,
          description: departmentData.description || null,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create department', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const department = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully created department', { departmentId: department.id });
      return department;
    });
  },

  async updateDepartment(departmentId, updateData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Updating department', { departmentId, updateData });

      const updateFields = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      const { data, error } = await supabase
        .from('departments')
        .update(updateFields)
        .eq('id', departmentId)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to update department', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const department = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully updated department', { departmentId });
      return department;
    });
  },

  async deleteDepartment(departmentId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Deleting department', { departmentId });

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', departmentId);

      if (error) {
        Logger.error('Failed to delete department', error);
        throw new Error(`Database error: ${error.message}`);
      }

      Logger.info('Successfully deleted department', { departmentId });
      return true;
    });
  },

  // Settings API - OGSM Charters management
  async getOgsmCharters() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching OGSM charters from database');

      const { data, error } = await supabase
        .from('ogsm_charters')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        Logger.error('Failed to fetch OGSM charters', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const charters = (data || []).map(charter =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(charter), ['createdAt', 'updatedAt'])
      );

      Logger.info('Successfully fetched OGSM charters', { count: charters.length });
      return charters;
    });
  },

  async getOgsmCharter(charterId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching OGSM charter by ID', { charterId });

      const { data, error } = await supabase
        .from('ogsm_charters')
        .select('*')
        .eq('id', charterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Logger.info('OGSM charter not found', { charterId });
          return null;
        }
        Logger.error('Failed to fetch OGSM charter', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const charter = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully fetched OGSM charter', { charterId });
      return charter;
    });
  },

  async createOgsmCharter(charterData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Creating OGSM charter', { name: charterData.name });

      const { data, error } = await supabase
        .from('ogsm_charters')
        .insert({
          name: charterData.name,
          description: charterData.description || null,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create OGSM charter', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const charter = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully created OGSM charter', { charterId: charter.id });
      return charter;
    });
  },

  async updateOgsmCharter(charterId, updateData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Updating OGSM charter', { charterId, updateData });

      const updateFields = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;

      const { data, error } = await supabase
        .from('ogsm_charters')
        .update(updateFields)
        .eq('id', charterId)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to update OGSM charter', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const charter = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully updated OGSM charter', { charterId });
      return charter;
    });
  },

  async deleteOgsmCharter(charterId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Deleting OGSM charter', { charterId });

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('ogsm_charters')
        .update({ is_active: false })
        .eq('id', charterId);

      if (error) {
        Logger.error('Failed to delete OGSM charter', error);
        throw new Error(`Database error: ${error.message}`);
      }

      Logger.info('Successfully deleted OGSM charter', { charterId });
      return true;
    });
  },

  // Settings API - Notification Settings management
  async getNotificationSettings() {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching notification settings from database');

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('type', { ascending: true });

      if (error) {
        Logger.error('Failed to fetch notification settings', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const settings = (data || []).map(setting =>
        SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(setting), ['createdAt', 'updatedAt'])
      );

      Logger.info('Successfully fetched notification settings', { count: settings.length });
      return settings;
    });
  },

  async getNotificationSetting(settingId) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Fetching notification setting by ID', { settingId });

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('id', settingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Logger.info('Notification setting not found', { settingId });
          return null;
        }
        Logger.error('Failed to fetch notification setting', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const setting = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully fetched notification setting', { settingId });
      return setting;
    });
  },

  async updateNotificationSetting(settingId, updateData) {
    return withRetry(async () => {
      checkSupabaseAvailable();
      Logger.info('Updating notification setting', { settingId, updateData });

      const updateFields = {};
      if (updateData.isEnabled !== undefined) updateFields.is_enabled = updateData.isEnabled;
      if (updateData.reminderDay !== undefined) updateFields.reminder_day = updateData.reminderDay;
      if (updateData.reminderTime !== undefined) updateFields.reminder_time = updateData.reminderTime;
      if (updateData.emailSubject !== undefined) updateFields.email_subject = updateData.emailSubject;
      if (updateData.emailTemplate !== undefined) updateFields.email_template = updateData.emailTemplate;

      const { data, error } = await supabase
        .from('notification_settings')
        .update(updateFields)
        .eq('id', settingId)
        .select()
        .single();

      if (error) {
        Logger.error('Failed to update notification setting', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const setting = SupabaseUtils.parseDates(SupabaseUtils.toCamelCase(data), ['createdAt', 'updatedAt']);
      Logger.info('Successfully updated notification setting', { settingId });
      return setting;
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
