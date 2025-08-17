import { useMemo } from 'react';
import { useResourceAvailability } from './use-resource-availability';
import { Resource } from '@shared/schema';

// Default non-project hours (should match other components)
const DEFAULT_NON_PROJECT_HOURS = 8;

export interface EffectiveCapacityData {
  baseCapacity: number;
  nonProjectHours: number;
  effectiveCapacity: number;
  totalAllocatedHours: number;
  remainingCapacity: number;
  utilizationPercentage: number;
  isOverallocated: boolean;
  isNearCapacity: boolean;
}

export interface OverallocationWarning {
  hasWarning: boolean;
  message: string;
  severity: 'warning' | 'error';
  remainingHours: number;
}

/**
 * Hook to calculate effective remaining capacity for resources
 * Considers non-project time and cross-project allocations
 */
export function useEffectiveCapacity(resources: Resource[]) {
  const resourceIds = resources.map(r => r.id);
  const { availabilityData, getTotalAllocatedHours, isLoading } = useResourceAvailability(resourceIds);

  /**
   * Calculate effective capacity data for a specific resource and week
   */
  const getEffectiveCapacityData = useMemo(() => {
    return (resource: Resource, weekKey: string): EffectiveCapacityData => {
      const baseCapacity = parseFloat(resource.weeklyCapacity || '40');
      const nonProjectHours = DEFAULT_NON_PROJECT_HOURS;
      const effectiveCapacity = Math.max(0, baseCapacity - nonProjectHours);
      
      // Get total allocated hours across all projects for this week
      const totalAllocatedHours = getTotalAllocatedHours(resource.id, weekKey);
      
      const remainingCapacity = Math.max(0, effectiveCapacity - totalAllocatedHours);
      const utilizationPercentage = effectiveCapacity > 0 ? (totalAllocatedHours / effectiveCapacity) * 100 : 0;
      
      return {
        baseCapacity,
        nonProjectHours,
        effectiveCapacity,
        totalAllocatedHours,
        remainingCapacity,
        utilizationPercentage,
        isOverallocated: utilizationPercentage > 100,
        isNearCapacity: utilizationPercentage > 80 && utilizationPercentage <= 100
      };
    };
  }, [getTotalAllocatedHours]);

  /**
   * Check if a proposed allocation would cause overallocation
   */
  const checkOverallocationWarning = useMemo(() => {
    return (
      resource: Resource, 
      weekKey: string, 
      proposedHours: number, 
      currentProjectHours: number = 0
    ): OverallocationWarning => {
      const capacityData = getEffectiveCapacityData(resource, weekKey);
      
      // Calculate what the total would be with the proposed change
      // Subtract current project hours to avoid double counting, then add proposed hours
      const otherProjectHours = capacityData.totalAllocatedHours - currentProjectHours;
      const projectedTotal = otherProjectHours + proposedHours;
      const projectedRemaining = capacityData.effectiveCapacity - projectedTotal;
      
      if (projectedTotal > capacityData.effectiveCapacity) {
        const overAmount = projectedTotal - capacityData.effectiveCapacity;
        return {
          hasWarning: true,
          message: `Would exceed capacity by ${overAmount.toFixed(1)}h (${projectedTotal.toFixed(1)}h / ${capacityData.effectiveCapacity}h effective)`,
          severity: 'error',
          remainingHours: projectedRemaining
        };
      }
      
      if (projectedTotal > capacityData.effectiveCapacity * 0.8) {
        const utilizationPercent = (projectedTotal / capacityData.effectiveCapacity) * 100;
        return {
          hasWarning: true,
          message: `Near capacity: ${utilizationPercent.toFixed(1)}% utilization (${projectedRemaining.toFixed(1)}h remaining)`,
          severity: 'warning',
          remainingHours: projectedRemaining
        };
      }
      
      return {
        hasWarning: false,
        message: `${projectedRemaining.toFixed(1)}h remaining this week`,
        severity: 'warning',
        remainingHours: projectedRemaining
      };
    };
  }, [getEffectiveCapacityData]);

  /**
   * Get remaining capacity for a resource in a specific week
   */
  const getRemainingCapacity = useMemo(() => {
    return (resource: Resource, weekKey: string, currentProjectHours: number = 0): number => {
      const capacityData = getEffectiveCapacityData(resource, weekKey);
      const otherProjectHours = capacityData.totalAllocatedHours - currentProjectHours;
      return Math.max(0, capacityData.effectiveCapacity - otherProjectHours);
    };
  }, [getEffectiveCapacityData]);

  /**
   * Get capacity status for visual indicators
   */
  const getCapacityStatus = useMemo(() => {
    return (resource: Resource, weekKey: string, proposedHours: number, currentProjectHours: number = 0) => {
      const warning = checkOverallocationWarning(resource, weekKey, proposedHours, currentProjectHours);
      
      if (warning.severity === 'error') {
        return {
          status: 'overallocated' as const,
          className: 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 text-red-900 ring-1 ring-red-300',
          iconColor: 'text-red-500'
        };
      }
      
      if (warning.severity === 'warning') {
        return {
          status: 'near-capacity' as const,
          className: 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 ring-1 ring-amber-300',
          iconColor: 'text-amber-500'
        };
      }
      
      return {
        status: 'available' as const,
        className: '',
        iconColor: 'text-green-500'
      };
    };
  }, [checkOverallocationWarning]);

  return {
    isLoading,
    getEffectiveCapacityData,
    checkOverallocationWarning,
    getRemainingCapacity,
    getCapacityStatus
  };
}
