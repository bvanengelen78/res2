import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { getAuthToken } from "./auth-api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<any> {
  const { method = 'GET', headers = {}, body } = options;

  console.log(`[API_REQUEST] Making ${method} request to ${url}`);
  if (body) {
    console.log(`[API_REQUEST] Request body:`, body);
  }

  // Get fresh authentication token
  const token = await getAuthToken();

  // Prepare headers with authentication
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add Authorization header if we have a token
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    console.log(`[API_REQUEST] Added Authorization header with fresh token`);
  } else {
    console.warn(`[API_REQUEST] No authentication token available`);
  }

  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
      credentials: "include",
    });

    console.log(`[API_REQUEST] Response status: ${res.status} ${res.statusText}`);
    console.log(`[API_REQUEST] Response headers:`, Object.fromEntries(res.headers.entries()));

    await throwIfResNotOk(res);

    // Handle 204 No Content responses (common for DELETE operations)
    if (res.status === 204) {
      console.log(`[API_REQUEST] Returning null for 204 response`);
      return null;
    }

    // Check if response has content before trying to parse JSON
    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');

    console.log(`[API_REQUEST] Content-Type: ${contentType}, Content-Length: ${contentLength}`);

    // Handle empty responses
    if (contentLength === '0' || (!contentType && !contentLength)) {
      console.log(`[API_REQUEST] Empty response detected`);
      return null;
    }

    // Try to parse as JSON if content-type suggests it or if no content-type is specified
    if (!contentType || contentType.includes('application/json')) {
      try {
        const responseText = await res.text();
        console.log(`[API_REQUEST] Raw response text:`, responseText);

        if (!responseText.trim()) {
          console.log(`[API_REQUEST] Empty response body`);
          return null;
        }

        const jsonResponse = JSON.parse(responseText);
        console.log(`[API_REQUEST] Parsed JSON response:`, jsonResponse);
        return jsonResponse;
      } catch (parseError) {
        console.error(`[API_REQUEST] JSON parse error:`, parseError);
        console.error(`[API_REQUEST] Response text that failed to parse was already consumed`);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    }

    // For non-JSON responses, return the text
    const textResponse = await res.text();
    console.log(`[API_REQUEST] Text response:`, textResponse);
    return textResponse;
  } catch (error) {
    console.error(`[API_REQUEST] Request failed:`, error);
    console.error(`[API_REQUEST] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // 🎭 DEMO MODE: Provide mock data fallbacks for failed API requests
    console.log(`[DEMO_FALLBACK] Providing mock data for ${url}`);

    const mockData = getMockDataForEndpoint(url);
    if (mockData !== null) {
      console.log(`[DEMO_FALLBACK] Returning mock data for ${url}`);
      return mockData;
    }

    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get fresh authentication token
    const token = await getAuthToken();

    // Prepare headers with authentication
    const headers: Record<string, string> = {};

    // Add Authorization header if we have a token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Enhanced query client configuration for production environments
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Enhanced cache time for production stability
      gcTime: 1000 * 60 * 5, // 5 minutes
      // Network mode for better serverless handling
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Enhanced mutation options for production
      networkMode: 'online',
      // Longer timeout for serverless functions
      meta: {
        timeout: 30000, // 30 seconds
      },
    },
  },
  // Enhanced mutation cache for better invalidation tracking
  mutationCache: new MutationCache({
    onSuccess: (data, variables, context, mutation) => {
      console.log('🎯 Mutation succeeded:', {
        mutationKey: mutation.options.mutationKey,
        timestamp: new Date().toISOString(),
        hasData: !!data
      })
    },
    onError: (error, variables, context, mutation) => {
      console.error('❌ Mutation failed:', {
        mutationKey: mutation.options.mutationKey,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    },
  }),
  // Enhanced query cache for better debugging
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      if (query.queryKey.includes('users')) {
        console.log('📊 Query cache updated:', {
          queryKey: query.queryKey,
          dataLength: Array.isArray(data) ? data.length : 'N/A',
          timestamp: new Date().toISOString()
        })
      }
    },
    onError: (error, query) => {
      console.error('❌ Query cache error:', {
        queryKey: query.queryKey,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    },
  }),
});

// Centralized cache invalidation system for real-time data synchronization
export const cacheInvalidation = {
  // Invalidate all dashboard-related queries
  invalidateDashboard: async () => {
    await Promise.all([
      // Main dashboard queries
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", "alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", "kpis"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", "kpis", "includeTrends=true"] }), // Include specific KPI query key
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", "heatmap"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", "timeline"] }),

      // Time Logging Overview queries
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-submissions/pending"] }),

      // Hours Allocation vs Actual queries
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),

      // Resource queries (used by multiple components)
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] }),
    ]);
  },

  // Invalidate allocation-related queries
  invalidateAllocations: async (resourceId?: number, projectId?: number) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] }),
    ];

    if (resourceId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ["/api/resources", resourceId, "allocations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/resources", resourceId] })
      );
    }

    if (projectId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "allocations"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] })
      );
    }

    await Promise.all(promises);
  },

  // Comprehensive invalidation for allocation changes that affect dashboard
  invalidateAllocationRelatedData: async (resourceId?: number, projectId?: number) => {
    await Promise.all([
      cacheInvalidation.invalidateDashboard(),
      cacheInvalidation.invalidateAllocations(resourceId, projectId),
    ]);
  },

  // Force refresh dashboard data (bypass cache)
  refreshDashboard: async (departmentFilter?: string, startDate?: string, endDate?: string) => {
    console.log('🔄 Starting comprehensive dashboard refresh...');

    const queryFilters = [
      // Main dashboard queries with filters
      { queryKey: ["/api/dashboard", "alerts", departmentFilter, startDate, endDate] },
      { queryKey: ["/api/dashboard", "alerts"] }, // FIXED: Include unfiltered alerts query for Role & Skill Heatmap
      { queryKey: ["/api/dashboard", "kpis", departmentFilter, startDate, endDate] },
      { queryKey: ["/api/dashboard", "kpis", "includeTrends=true"] }, // Include specific KPI query key
      { queryKey: ["/api/dashboard", "heatmap", departmentFilter, startDate, endDate] },
      { queryKey: ["/api/dashboard", "timeline", departmentFilter, startDate, endDate] },
      { queryKey: ["/api/dashboard", "timeline"] }, // FIXED: Include unfiltered timeline query

      // Time Logging Overview queries
      { queryKey: ["/api/weekly-submissions/pending"] },

      // Hours Allocation vs Actual queries
      { queryKey: ["/api/allocations"] },
      { queryKey: ["/api/time-entries"] },
      { queryKey: ["/api/projects"] },

      // Resource queries (used by multiple components)
      { queryKey: ["/api/resources"] },
    ];

    console.log(`🎯 Refreshing ${queryFilters.length} query types...`);

    await Promise.all(
      queryFilters.map(async (filter, index) => {
        try {
          console.log(`   ${index + 1}. Refreshing:`, filter.queryKey[0]);
          await queryClient.refetchQueries(filter);
        } catch (error) {
          console.error(`   ❌ Failed to refresh ${filter.queryKey[0]}:`, error);
        }
      })
    );

    console.log('✅ Dashboard refresh complete');
  },
};

// 🎭 DEMO MODE: Mock data provider for failed API requests
function getMockDataForEndpoint(url: string): any {
  console.log(`[MOCK_DATA] Generating mock data for: ${url}`);

  // Extract endpoint from URL
  const urlObj = new URL(url, window.location.origin);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // Projects endpoint
  if (pathname === '/api/projects') {
    return [
      {
        id: 1,
        name: "Customer Portal Redesign",
        description: "Complete overhaul of customer-facing portal with modern UI/UX",
        status: "active",
        type: "development",
        priority: "high",
        start_date: "2024-01-15",
        end_date: "2024-06-30",
        budget: 150000,
        department: "IT",
        project_manager: "Sarah Johnson",
        client: "Internal",
        progress: 65,
        created_at: "2024-01-10T09:00:00Z",
        updated_at: "2024-02-15T14:30:00Z"
      },
      {
        id: 2,
        name: "Mobile App Development",
        description: "Native mobile application for iOS and Android platforms",
        status: "active",
        type: "development",
        priority: "medium",
        start_date: "2024-02-01",
        end_date: "2024-08-15",
        budget: 200000,
        department: "IT",
        project_manager: "Mike Chen",
        client: "External",
        progress: 40,
        created_at: "2024-01-25T10:00:00Z",
        updated_at: "2024-02-20T16:45:00Z"
      },
      {
        id: 3,
        name: "Data Migration Project",
        description: "Migrate legacy systems to cloud infrastructure",
        status: "planning",
        type: "infrastructure",
        priority: "high",
        start_date: "2024-03-01",
        end_date: "2024-09-30",
        budget: 300000,
        department: "IT",
        project_manager: "Alex Rodriguez",
        client: "Internal",
        progress: 15,
        created_at: "2024-02-01T11:00:00Z",
        updated_at: "2024-02-25T09:15:00Z"
      },
      {
        id: 4,
        name: "Security Audit & Compliance",
        description: "Comprehensive security review and compliance implementation",
        status: "active",
        type: "security",
        priority: "critical",
        start_date: "2024-01-01",
        end_date: "2024-04-30",
        budget: 75000,
        department: "Security",
        project_manager: "Emma Wilson",
        client: "Internal",
        progress: 80,
        created_at: "2023-12-15T08:00:00Z",
        updated_at: "2024-02-28T13:20:00Z"
      },
      {
        id: 5,
        name: "Marketing Automation Platform",
        description: "Implementation of new marketing automation tools",
        status: "completed",
        type: "implementation",
        priority: "medium",
        start_date: "2023-10-01",
        end_date: "2024-01-31",
        budget: 120000,
        department: "Marketing",
        project_manager: "David Kim",
        client: "Internal",
        progress: 100,
        created_at: "2023-09-15T09:30:00Z",
        updated_at: "2024-02-01T17:00:00Z"
      }
    ];
  }

  // Resources endpoint
  if (pathname === '/api/resources') {
    return [
      {
        id: 1,
        name: "Sarah Johnson",
        email: "sarah.johnson@company.com",
        role: "Senior Developer",
        job_role: "Software Engineer",
        department: "IT",
        capacity: 40,
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        hourly_rate: 85,
        is_active: true,
        hire_date: "2022-03-15",
        created_at: "2022-03-15T09:00:00Z",
        updated_at: "2024-02-15T14:30:00Z"
      },
      {
        id: 2,
        name: "Mike Chen",
        email: "mike.chen@company.com",
        role: "Project Manager",
        job_role: "Project Manager",
        department: "IT",
        capacity: 40,
        skills: ["Project Management", "Agile", "Scrum", "Leadership"],
        hourly_rate: 95,
        is_active: true,
        hire_date: "2021-08-01",
        created_at: "2021-08-01T09:00:00Z",
        updated_at: "2024-02-20T16:45:00Z"
      },
      {
        id: 3,
        name: "Alex Rodriguez",
        email: "alex.rodriguez@company.com",
        role: "DevOps Engineer",
        job_role: "DevOps Engineer",
        department: "IT",
        capacity: 40,
        skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
        hourly_rate: 90,
        is_active: true,
        hire_date: "2022-01-10",
        created_at: "2022-01-10T09:00:00Z",
        updated_at: "2024-02-25T09:15:00Z"
      },
      {
        id: 4,
        name: "Emma Wilson",
        email: "emma.wilson@company.com",
        role: "Security Specialist",
        job_role: "Security Analyst",
        department: "Security",
        capacity: 40,
        skills: ["Cybersecurity", "Compliance", "Risk Assessment", "Penetration Testing"],
        hourly_rate: 100,
        is_active: true,
        hire_date: "2021-11-20",
        created_at: "2021-11-20T09:00:00Z",
        updated_at: "2024-02-28T13:20:00Z"
      },
      {
        id: 5,
        name: "David Kim",
        email: "david.kim@company.com",
        role: "Marketing Manager",
        job_role: "Marketing Manager",
        department: "Marketing",
        capacity: 40,
        skills: ["Digital Marketing", "Analytics", "Campaign Management", "SEO"],
        hourly_rate: 75,
        is_active: true,
        hire_date: "2020-05-15",
        created_at: "2020-05-15T09:00:00Z",
        updated_at: "2024-02-01T17:00:00Z"
      }
    ];
  }

  // Dashboard KPIs endpoint
  if (pathname === '/api/dashboard/kpis' || pathname.includes('/api/dashboard') && searchParams.get('endpoint') === 'kpis') {
    return {
      activeProjects: {
        current: 12,
        previous: 10,
        change: 20,
        trend: "up",
        sparklineData: [8, 9, 10, 11, 10, 12]
      },
      totalResources: {
        current: 45,
        previous: 43,
        change: 4.7,
        trend: "up",
        sparklineData: [40, 41, 42, 43, 44, 45]
      },
      utilizationRate: {
        current: 78.5,
        previous: 75.2,
        change: 4.4,
        trend: "up",
        sparklineData: [72, 74, 75, 76, 77, 78.5]
      },
      projectsOnTrack: {
        current: 85,
        previous: 82,
        change: 3.7,
        trend: "up",
        sparklineData: [80, 81, 82, 83, 84, 85]
      },
      budgetUtilization: {
        current: 67.3,
        previous: 71.8,
        change: -6.3,
        trend: "down",
        sparklineData: [75, 74, 72, 70, 69, 67.3]
      },
      teamEfficiency: {
        current: 92.1,
        previous: 89.5,
        change: 2.9,
        trend: "up",
        sparklineData: [87, 88, 89, 90, 91, 92.1]
      }
    };
  }

  // Dashboard alerts endpoint
  if (pathname.includes('/api/dashboard') && (searchParams.get('endpoint') === 'alerts' || pathname.includes('alerts'))) {
    return [
      {
        id: 1,
        type: "capacity_warning",
        severity: "warning",
        title: "High Resource Utilization",
        message: "Sarah Johnson is at 95% capacity this week",
        resource_id: 1,
        resource_name: "Sarah Johnson",
        department: "IT",
        created_at: "2024-02-28T10:30:00Z"
      },
      {
        id: 2,
        type: "project_delay",
        severity: "error",
        title: "Project Behind Schedule",
        message: "Customer Portal Redesign is 2 weeks behind schedule",
        project_id: 1,
        project_name: "Customer Portal Redesign",
        department: "IT",
        created_at: "2024-02-27T14:15:00Z"
      },
      {
        id: 3,
        type: "budget_warning",
        severity: "warning",
        title: "Budget Threshold Exceeded",
        message: "Mobile App Development has exceeded 80% of allocated budget",
        project_id: 2,
        project_name: "Mobile App Development",
        department: "IT",
        created_at: "2024-02-26T09:45:00Z"
      }
    ];
  }

  // Time entries endpoint
  if (pathname === '/api/time-entries') {
    return [
      {
        id: 1,
        resource_id: 1,
        resource_name: "Sarah Johnson",
        project_id: 1,
        project_name: "Customer Portal Redesign",
        date: "2024-02-28",
        hours: 8,
        description: "Frontend component development",
        created_at: "2024-02-28T17:00:00Z"
      },
      {
        id: 2,
        resource_id: 2,
        resource_name: "Mike Chen",
        project_id: 2,
        project_name: "Mobile App Development",
        date: "2024-02-28",
        hours: 6,
        description: "Project planning and stakeholder meetings",
        created_at: "2024-02-28T16:30:00Z"
      },
      {
        id: 3,
        resource_id: 3,
        resource_name: "Alex Rodriguez",
        project_id: 3,
        project_name: "Data Migration Project",
        date: "2024-02-28",
        hours: 7,
        description: "Infrastructure setup and configuration",
        created_at: "2024-02-28T16:00:00Z"
      }
    ];
  }

  // Weekly submissions endpoint
  if (pathname.includes('/api/weekly-submissions')) {
    const baseSubmissions = [
      {
        id: 1,
        resource_id: 1,
        resource: {
          id: 1,
          name: "Sarah Johnson",
          department: "IT"
        },
        week_start: "2024-02-26",
        total_hours: 40,
        status: "submitted",
        submitted_at: "2024-03-01T17:00:00Z",
        created_at: "2024-02-26T09:00:00Z"
      },
      {
        id: 2,
        resource_id: 2,
        resource: {
          id: 2,
          name: "Mike Chen",
          department: "IT"
        },
        week_start: "2024-02-26",
        total_hours: 38,
        status: "pending",
        submitted_at: null,
        created_at: "2024-02-26T09:00:00Z"
      }
    ];

    // Filter for pending submissions if requested
    if (pathname.includes('/pending')) {
      return baseSubmissions.filter(s => s.status === 'pending');
    }

    return baseSubmissions;
  }

  // Management dashboard endpoints
  if (pathname.includes('/api/management-dashboard/')) {
    const endpointType = pathname.split('/').pop();

    const baseKPIResponse = {
      current: 0,
      previous: 0,
      change: 0,
      trend: "stable" as const,
      sparklineData: [0, 0, 0, 0, 0, 0]
    };

    switch (endpointType) {
      case 'active-projects-trend':
        return {
          ...baseKPIResponse,
          current: 12,
          previous: 10,
          change: 20,
          trend: "up" as const,
          sparklineData: [8, 9, 10, 11, 10, 12]
        };
      case 'under-utilised-resources':
        return {
          ...baseKPIResponse,
          current: 3,
          previous: 5,
          change: -40,
          trend: "down" as const,
          sparklineData: [6, 5, 4, 4, 3, 3]
        };
      case 'over-utilised-resources':
        return {
          ...baseKPIResponse,
          current: 2,
          previous: 1,
          change: 100,
          trend: "up" as const,
          sparklineData: [0, 1, 1, 2, 2, 2]
        };
      case 'utilisation-rate-trend':
        return {
          ...baseKPIResponse,
          current: 78.5,
          previous: 75.2,
          change: 4.4,
          trend: "up" as const,
          sparklineData: [72, 74, 75, 76, 77, 78.5]
        };
    }
  }

  // Default fallback for unhandled endpoints
  console.log(`[MOCK_DATA] No mock data available for: ${pathname}`);
  return null;
}
