import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";
import { supabase } from "./supabase";

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

  // Get the current session token from Supabase
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.warn(`[API_REQUEST] Session error:`, sessionError);
  }

  // Prepare headers with authentication
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add Authorization header if we have a session
  if (session?.access_token) {
    requestHeaders['Authorization'] = `Bearer ${session.access_token}`;
    console.log(`[API_REQUEST] Added Authorization header with token`);
  } else {
    console.warn(`[API_REQUEST] No session token available for authentication`);
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
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the current session token from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn(`[QUERY_FN] Session error:`, sessionError);
    }

    // Prepare headers with authentication
    const headers: Record<string, string> = {};

    // Add Authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
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
