import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ResourceAllocation, Resource } from "@shared/schema";

interface ResourceAvailabilityData {
  [resourceId: number]: {
    [weekKey: string]: number; // Total allocated hours for this week across all projects
  };
}

/**
 * Hook to fetch and calculate resource availability across all projects
 * This provides comprehensive allocation data for accurate availability indicators
 */
export function useResourceAvailability(resourceIds: number[]) {
  // Fetch all allocations for the specified resources
  const { data: allAllocations = [], isLoading } = useQuery<(ResourceAllocation & { resource: Resource })[]>({
    queryKey: ["/api/allocations", "resources", resourceIds.sort().join(",")],
    queryFn: async () => {
      if (resourceIds.length === 0) return [];

      // For now, fetch all allocations and filter client-side
      // TODO: Optimize with a server endpoint that accepts resource IDs
      const allocations = await apiRequest("/api/allocations");
      return allocations.filter((allocation: any) =>
        resourceIds.includes(allocation.resourceId) && allocation.status === 'active'
      );
    },
    enabled: resourceIds.length > 0,
  });

  // Process allocations to create a lookup table
  const availabilityData = useMemo((): ResourceAvailabilityData => {
    const data: ResourceAvailabilityData = {};
    
    // Initialize data structure for all requested resources
    resourceIds.forEach(resourceId => {
      data[resourceId] = {};
    });

    // Process each allocation
    allAllocations.forEach(allocation => {
      const resourceId = allocation.resourceId;
      
      if (!data[resourceId]) {
        data[resourceId] = {};
      }

      // Process weekly allocations
      const weeklyAllocations = allocation.weeklyAllocations || {};
      Object.entries(weeklyAllocations).forEach(([weekKey, hours]) => {
        if (!data[resourceId][weekKey]) {
          data[resourceId][weekKey] = 0;
        }
        data[resourceId][weekKey] += hours;
      });
    });

    return data;
  }, [allAllocations, resourceIds]);

  /**
   * Get total allocated hours for a specific resource and week
   */
  const getTotalAllocatedHours = (resourceId: number, weekKey: string): number => {
    return availabilityData[resourceId]?.[weekKey] || 0;
  };

  /**
   * Get all weekly allocations for a specific resource
   */
  const getResourceWeeklyAllocations = (resourceId: number): Record<string, number> => {
    return availabilityData[resourceId] || {};
  };

  /**
   * Check if a resource is overallocated for a specific week
   */
  const isResourceOverallocated = (resource: Resource, weekKey: string): boolean => {
    const totalAllocated = getTotalAllocatedHours(resource.id, weekKey);
    const capacity = parseFloat(resource.weeklyCapacity || '40');
    const effectiveCapacity = Math.max(0, capacity - 8); // Subtract default non-project hours
    return totalAllocated > effectiveCapacity;
  };

  /**
   * Get utilization percentage for a resource in a specific week
   */
  const getResourceUtilization = (resource: Resource, weekKey: string): number => {
    const totalAllocated = getTotalAllocatedHours(resource.id, weekKey);
    const capacity = parseFloat(resource.weeklyCapacity || '40');
    const effectiveCapacity = Math.max(0, capacity - 8); // Subtract default non-project hours
    return effectiveCapacity > 0 ? (totalAllocated / effectiveCapacity) * 100 : 0;
  };

  return {
    availabilityData,
    isLoading,
    getTotalAllocatedHours,
    getResourceWeeklyAllocations,
    isResourceOverallocated,
    getResourceUtilization,
  };
}
