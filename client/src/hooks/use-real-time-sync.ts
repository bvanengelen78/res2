import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { cacheInvalidation } from "@/lib/queryClient";

/**
 * Hook for real-time data synchronization across components
 * Provides methods to trigger updates when allocation data changes
 */
export function useRealTimeSync() {
  const queryClient = useQueryClient();

  // Trigger immediate dashboard refresh with loading states
  const refreshDashboard = useCallback(async (filters?: {
    departmentFilter?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    await cacheInvalidation.refreshDashboard(
      filters?.departmentFilter,
      filters?.startDate,
      filters?.endDate
    );
  }, []);

  // Sync allocation changes across all related components
  const syncAllocationChange = useCallback(async (options?: {
    resourceId?: number;
    projectId?: number;
    optimistic?: boolean;
  }) => {
    const { resourceId, projectId, optimistic = false } = options || {};

    if (optimistic) {
      // For optimistic updates, invalidate immediately without waiting
      cacheInvalidation.invalidateAllocationRelatedData(resourceId, projectId);
    } else {
      // For confirmed updates, wait for invalidation to complete
      await cacheInvalidation.invalidateAllocationRelatedData(resourceId, projectId);
    }
  }, []);

  // Sync capacity changes (non-project activities, resource capacity updates)
  const syncCapacityChange = useCallback(async (resourceId?: number) => {
    await Promise.all([
      cacheInvalidation.invalidateDashboard(),
      resourceId ? queryClient.invalidateQueries({ 
        queryKey: ["/api/resources", resourceId] 
      }) : queryClient.invalidateQueries({ 
        queryKey: ["/api/resources"] 
      }),
    ]);
  }, [queryClient]);

  // Force refresh all dashboard data (for manual refresh scenarios)
  const forceRefreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] }),
    ]);
  }, [queryClient]);

  // Check if any dashboard queries are currently loading
  const isDashboardLoading = useCallback(() => {
    const dashboardQueries = queryClient.getQueriesData({ 
      queryKey: ["/api/dashboard"] 
    });
    
    return dashboardQueries.some(([queryKey]) => {
      const queryState = queryClient.getQueryState(queryKey);
      return queryState?.isFetching || queryState?.isLoading;
    });
  }, [queryClient]);

  return {
    refreshDashboard,
    syncAllocationChange,
    syncCapacityChange,
    forceRefreshAll,
    isDashboardLoading,
  };
}

/**
 * Hook specifically for allocation mutations with automatic sync
 * Provides standardized onSuccess handlers for allocation-related mutations
 */
export function useAllocationMutationSync() {
  const { syncAllocationChange } = useRealTimeSync();

  const createSuccessHandler = useCallback((options?: {
    resourceId?: number;
    projectId?: number;
    customCallback?: () => void | Promise<void>;
  }) => {
    return async () => {
      const { resourceId, projectId, customCallback } = options || {};
      
      // Sync allocation changes
      await syncAllocationChange({ resourceId, projectId });
      
      // Execute custom callback if provided
      if (customCallback) {
        await customCallback();
      }
    };
  }, [syncAllocationChange]);

  return {
    createSuccessHandler,
    syncAllocationChange,
  };
}
