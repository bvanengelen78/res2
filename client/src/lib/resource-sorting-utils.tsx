import { Resource, ResourceAllocation } from "@shared/schema";
import { SortOption } from "@/components/smart-sorting-dropdown";

export interface AllocationWithResource extends ResourceAllocation {
  resource: Resource;
  weeklyAllocations?: Record<string, number>;
}

export interface WeekColumn {
  key: string;
  label: string;
  date: string;
  fullDate: Date;
  weekStart: Date;
  weekEnd: Date;
}

export interface ResourceSortingData {
  allocation: AllocationWithResource;
  totalAllocatedHours: number;
  averageUtilization: number;
  effectiveCapacity: number;
  isUnderallocated: boolean;
  isOverallocated: boolean;
}

/**
 * Calculate total allocated hours for a resource across visible weeks
 */
export function calculateTotalAllocatedHours(
  allocation: AllocationWithResource,
  weekColumns: WeekColumn[]
): number {
  if (!allocation || !allocation.weeklyAllocations) return 0;
  if (!weekColumns || !Array.isArray(weekColumns)) return 0;

  return weekColumns.reduce((total, week) => {
    return total + (allocation.weeklyAllocations?.[week.key] || 0);
  }, 0);
}

/**
 * Calculate effective capacity for a resource
 */
export function calculateEffectiveCapacity(resource: Resource): number {
  if (!resource) return 0;
  const baseCapacity = parseFloat(resource.weeklyCapacity || '40');
  const nonProjectHours = 8; // Default non-project hours (meetings, admin, etc.)
  return Math.max(0, baseCapacity - nonProjectHours);
}

/**
 * Calculate average weekly utilization percentage for a resource
 */
export function calculateAverageUtilization(
  allocation: AllocationWithResource,
  weekColumns: WeekColumn[]
): number {
  if (!allocation || !allocation.weeklyAllocations) return 0;
  if (!weekColumns || !Array.isArray(weekColumns) || weekColumns.length === 0) return 0;

  const effectiveCapacity = calculateEffectiveCapacity(allocation.resource);
  if (effectiveCapacity === 0) return 0;

  const totalUtilization = weekColumns.reduce((total, week) => {
    const weekHours = allocation.weeklyAllocations?.[week.key] || 0;
    const weekUtilization = (weekHours / effectiveCapacity) * 100;
    return total + weekUtilization;
  }, 0);

  return totalUtilization / weekColumns.length;
}

/**
 * Determine if a resource is underallocated (< 40% average utilization)
 */
export function isUnderallocated(averageUtilization: number): boolean {
  return averageUtilization < 40;
}

/**
 * Determine if a resource is overallocated (> 100% average utilization)
 */
export function isOverallocated(averageUtilization: number): boolean {
  return averageUtilization > 100;
}

/**
 * Calculate comprehensive sorting data for a resource allocation
 */
export function calculateResourceSortingData(
  allocation: AllocationWithResource,
  weekColumns: WeekColumn[]
): ResourceSortingData {
  const totalAllocatedHours = calculateTotalAllocatedHours(allocation, weekColumns);
  const averageUtilization = calculateAverageUtilization(allocation, weekColumns);
  const effectiveCapacity = calculateEffectiveCapacity(allocation.resource);
  
  return {
    allocation,
    totalAllocatedHours,
    averageUtilization,
    effectiveCapacity,
    isUnderallocated: isUnderallocated(averageUtilization),
    isOverallocated: isOverallocated(averageUtilization)
  };
}

/**
 * Sort resources based on the selected sorting option
 */
export function sortResourceAllocations(
  allocations: AllocationWithResource[],
  weekColumns: WeekColumn[],
  sortOption: SortOption
): AllocationWithResource[] {
  // Defensive programming: handle undefined/null inputs
  if (!allocations || !Array.isArray(allocations)) {
    return [];
  }

  if (!weekColumns || !Array.isArray(weekColumns)) {
    return allocations; // Return unsorted if weekColumns is invalid
  }

  // Calculate sorting data for all allocations
  const sortingData = allocations.map(allocation =>
    calculateResourceSortingData(allocation, weekColumns)
  );
  
  // Sort based on the selected option
  const sorted = [...sortingData].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return a.allocation.resource.name.localeCompare(b.allocation.resource.name);
      
      case 'name-desc':
        return b.allocation.resource.name.localeCompare(a.allocation.resource.name);
      
      case 'role-asc':
        return (a.allocation.role || '').localeCompare(b.allocation.role || '');
      
      case 'role-desc':
        return (b.allocation.role || '').localeCompare(a.allocation.role || '');
      
      case 'department-asc':
        return a.allocation.resource.department.localeCompare(b.allocation.resource.department);
      
      case 'department-desc':
        return b.allocation.resource.department.localeCompare(a.allocation.resource.department);
      
      case 'total-hours-desc':
        return b.totalAllocatedHours - a.totalAllocatedHours;
      
      case 'total-hours-asc':
        return a.totalAllocatedHours - b.totalAllocatedHours;
      
      case 'utilization-desc':
        return b.averageUtilization - a.averageUtilization;
      
      case 'utilization-asc':
        return a.averageUtilization - b.averageUtilization;
      
      case 'underallocated-first':
        // Underallocated first, then by lowest utilization
        if (a.isUnderallocated && !b.isUnderallocated) return -1;
        if (!a.isUnderallocated && b.isUnderallocated) return 1;
        if (a.isUnderallocated && b.isUnderallocated) {
          return a.averageUtilization - b.averageUtilization;
        }
        // For non-underallocated, sort by utilization ascending
        return a.averageUtilization - b.averageUtilization;
      
      case 'overallocated-first':
        // Overallocated first, then by highest utilization
        if (a.isOverallocated && !b.isOverallocated) return -1;
        if (!a.isOverallocated && b.isOverallocated) return 1;
        if (a.isOverallocated && b.isOverallocated) {
          return b.averageUtilization - a.averageUtilization;
        }
        // For non-overallocated, sort by utilization descending
        return b.averageUtilization - a.averageUtilization;
      
      default:
        return a.allocation.resource.name.localeCompare(b.allocation.resource.name);
    }
  });
  
  // Return the sorted allocations
  return sorted.map(data => data.allocation);
}

/**
 * Get sorting statistics for display purposes
 */
export function getSortingStatistics(
  allocations: AllocationWithResource[],
  weekColumns: WeekColumn[]
): {
  totalResources: number;
  underallocatedCount: number;
  overallocatedCount: number;
  averageTotalHours: number;
  averageUtilization: number;
} {
  // Defensive programming: handle undefined/null inputs
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return {
      totalResources: 0,
      underallocatedCount: 0,
      overallocatedCount: 0,
      averageTotalHours: 0,
      averageUtilization: 0
    };
  }

  if (!weekColumns || !Array.isArray(weekColumns)) {
    return {
      totalResources: allocations.length,
      underallocatedCount: 0,
      overallocatedCount: 0,
      averageTotalHours: 0,
      averageUtilization: 0
    };
  }
  
  const sortingData = allocations.map(allocation => 
    calculateResourceSortingData(allocation, weekColumns)
  );
  
  const underallocatedCount = sortingData.filter(data => data.isUnderallocated).length;
  const overallocatedCount = sortingData.filter(data => data.isOverallocated).length;
  
  const totalHours = sortingData.reduce((sum, data) => sum + data.totalAllocatedHours, 0);
  const totalUtilization = sortingData.reduce((sum, data) => sum + data.averageUtilization, 0);
  
  return {
    totalResources: allocations.length,
    underallocatedCount,
    overallocatedCount,
    averageTotalHours: totalHours / allocations.length,
    averageUtilization: totalUtilization / allocations.length
  };
}

/**
 * Format utilization percentage for display
 */
export function formatUtilization(utilization: number): string {
  return `${utilization.toFixed(1)}%`;
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

/**
 * Get utilization status color class
 */
export function getUtilizationStatusClass(utilization: number): string {
  if (utilization > 100) return 'text-red-600';
  if (utilization > 80) return 'text-amber-600';
  if (utilization < 40) return 'text-blue-600';
  return 'text-green-600';
}

/**
 * Get utilization status badge variant
 */
export function getUtilizationBadgeVariant(utilization: number): 'destructive' | 'secondary' | 'default' {
  if (utilization > 100) return 'destructive';
  if (utilization < 40) return 'secondary';
  return 'default';
}
