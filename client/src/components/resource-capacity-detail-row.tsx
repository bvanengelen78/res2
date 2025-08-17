import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  calculateResourceUtilization,
  getUtilizationStatus,
  UTILIZATION_STATUS_STYLES,
  type UtilizationStatus
} from "@/lib/utilization-thresholds";
import type { Resource } from "@shared/schema";

interface ResourceCapacityDetailRowProps {
  resource: Resource;
  weekKey: string;
  currentWeekAllocations: Record<string, number>;
  allResourceAllocations?: Record<string, number>;
  isCurrentWeek?: boolean;
  className?: string;
}

interface CapacityBreakdown {
  baseCapacity: number;
  nonProjectHours: number;
  effectiveCapacity: number;
  totalAllocated: number;
  availableHours: number;
  utilizationPercentage: number;
  status: UtilizationStatus;
  statusColor: string;
  statusIcon: string;
}

// Default non-project hours (matches the main component)
const DEFAULT_NON_PROJECT_HOURS = 8;

export function ResourceCapacityDetailRow({
  resource,
  weekKey,
  currentWeekAllocations,
  allResourceAllocations,
  isCurrentWeek = false,
  className = "",
}: ResourceCapacityDetailRowProps) {

  const capacityBreakdown = useMemo((): CapacityBreakdown => {
    const baseCapacity = parseFloat(resource.weeklyCapacity || '40');
    const nonProjectHours = DEFAULT_NON_PROJECT_HOURS;
    const effectiveCapacity = Math.max(0, baseCapacity - nonProjectHours);

    // Use comprehensive allocation data if available, fallback to current week allocations
    const totalAllocated = (allResourceAllocations && typeof allResourceAllocations[weekKey] === 'number')
                          ? allResourceAllocations[weekKey]
                          : (currentWeekAllocations[weekKey] || 0);
    const availableHours = effectiveCapacity - totalAllocated; // Can be negative for over-allocation
    const utilizationPercentage = effectiveCapacity > 0 ? (totalAllocated / effectiveCapacity) * 100 : 0;
    
    const status = getUtilizationStatus(utilizationPercentage, true, totalAllocated > 0);
    const styles = UTILIZATION_STATUS_STYLES[status];
    const statusColor = `${styles.textColor} ${styles.bgColor} ${styles.borderColor}`;
    const statusIcon = styles.icon;
    
    return {
      baseCapacity,
      nonProjectHours,
      effectiveCapacity,
      totalAllocated,
      availableHours,
      utilizationPercentage,
      status,
      statusColor,
      statusIcon,
    };
  }, [resource.weeklyCapacity, weekKey, currentWeekAllocations, allResourceAllocations]);

  return (
    <div
      className={cn(
        "animate-in slide-in-from-top-2 duration-300 ease-out",
        "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 mx-2 mb-2 rounded-r-lg shadow-sm",
        "min-h-[120px] max-h-40 overflow-hidden", // Compact but sufficient height
        className
      )}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" role="img" aria-label={`Status: ${capacityBreakdown.status}`}>
            {capacityBreakdown.statusIcon}
          </span>
          <h4 className="text-sm font-semibold text-gray-900">
            Weekly Capacity Breakdown{isCurrentWeek ? ' (Current Week)' : ''}
          </h4>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          capacityBreakdown.statusColor
        )}>
          {capacityBreakdown.utilizationPercentage.toFixed(1)}% Used
        </div>
      </div>

      {/* Horizontal Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
        {/* Card 1: Base Capacity */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm min-h-[70px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Total Weekly Capacity
              </div>
              <div className="text-xl font-bold text-gray-900">
                {capacityBreakdown.baseCapacity}h
              </div>
            </div>
            <div className="text-gray-400 ml-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Project Capacity */}
        <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm min-h-[70px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1">
              <div className="text-xs text-blue-600 uppercase tracking-wide font-medium mb-1">
                Available for Projects
              </div>
              <div className="text-xl font-bold text-blue-700">
                {capacityBreakdown.effectiveCapacity}h
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {capacityBreakdown.baseCapacity}h - {capacityBreakdown.nonProjectHours}h
              </div>
            </div>
            <div className="text-blue-400 ml-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Allocation Summary */}
        <div className={cn(
          "bg-white rounded-lg p-3 border shadow-sm min-h-[70px] flex items-center",
          capacityBreakdown.availableHours >= 0 ? "border-green-200" : "border-red-200"
        )}>
          <div className="flex items-center justify-between w-full">
            <div className="flex-1">
              <div className={cn(
                "text-xs uppercase tracking-wide font-medium mb-1",
                capacityBreakdown.availableHours >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {capacityBreakdown.availableHours >= 0 ? "Available" : "Over-allocated"}
              </div>
              <div className={cn(
                "text-xl font-bold",
                capacityBreakdown.availableHours >= 0 ? "text-green-700" : "text-red-700"
              )}>
                {Math.abs(capacityBreakdown.availableHours).toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {capacityBreakdown.totalAllocated.toFixed(1)}h allocated
              </div>
            </div>
            <div className="flex flex-col items-center ml-2">
              {/* Mini Progress Circle */}
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${Math.min(100, capacityBreakdown.utilizationPercentage) * 0.75} 75`}
                    className={cn(
                      capacityBreakdown.status === 'critical' || capacityBreakdown.status === 'over-capacity' ? "text-red-500" :
                      capacityBreakdown.status === 'near-capacity' ? "text-amber-500" :
                      capacityBreakdown.status === 'under-utilized' ? "text-blue-500" : "text-green-500"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">
                    {capacityBreakdown.utilizationPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Status Message - Only for Critical Cases */}
      {capacityBreakdown.status === 'overallocated' && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm">⚠️</span>
            <span className="text-xs font-medium text-red-800">
              Over-allocated by {(capacityBreakdown.totalAllocated - capacityBreakdown.effectiveCapacity).toFixed(1)}h
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
