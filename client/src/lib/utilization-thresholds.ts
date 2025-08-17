/**
 * Unified Utilization Thresholds and Status Logic
 * 
 * This file centralizes all utilization threshold definitions and status calculation logic
 * to ensure consistency across the entire application (resource cards, alerts, dashboards, etc.)
 */

// Default non-project hours (meetings, admin, etc.)
export const DEFAULT_NON_PROJECT_HOURS = 8;

// Unified utilization thresholds (matches Enhanced Capacity Alerts system)
export const UTILIZATION_THRESHOLDS = {
  CRITICAL: 120,        // ≥120% - Critical overallocation
  ERROR: 100,           // ≥100% - Over capacity
  WARNING: 90,          // ≥90% - Near capacity  
  UNDER_UTILIZED: 50,   // <50% - Under-utilized
} as const;

// Status type definitions
export type UtilizationStatus = 
  | 'under-utilized'
  | 'optimal' 
  | 'near-capacity'
  | 'over-capacity'
  | 'critical'
  | 'unassigned'
  | 'inactive';

// Visual styling for each status
export const UTILIZATION_STATUS_STYLES = {
  'under-utilized': {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '🔵',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    priority: 2
  },
  'optimal': {
    color: 'bg-green-100 text-green-700 border-green-200', 
    icon: '🟢',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    priority: 1
  },
  'near-capacity': {
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '🟡',
    bgColor: 'bg-amber-50', 
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    priority: 3
  },
  'over-capacity': {
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: '🔴',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600', 
    borderColor: 'border-red-200',
    priority: 4
  },
  'critical': {
    color: 'bg-red-200 text-red-800 border-red-300',
    icon: '🚨',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300', 
    priority: 5
  },
  'unassigned': {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: '⚪',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    priority: 0
  },
  'inactive': {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: '⚫',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    priority: 0
  }
} as const;

/**
 * Calculate effective capacity (total capacity minus non-project hours)
 */
export function calculateEffectiveCapacity(weeklyCapacity: string | number): number {
  const baseCapacity = typeof weeklyCapacity === 'string' 
    ? parseFloat(weeklyCapacity || '40') 
    : weeklyCapacity;
  return Math.max(0, baseCapacity - DEFAULT_NON_PROJECT_HOURS);
}

/**
 * Calculate utilization percentage based on effective capacity
 */
export function calculateUtilizationPercentage(
  allocatedHours: number, 
  effectiveCapacity: number
): number {
  return effectiveCapacity > 0 ? (allocatedHours / effectiveCapacity) * 100 : 0;
}

/**
 * Determine utilization status based on standardized thresholds
 */
export function getUtilizationStatus(
  utilizationPercentage: number,
  isActive: boolean = true,
  hasAllocations: boolean = true
): UtilizationStatus {
  if (!isActive) {
    return 'inactive';
  }
  
  if (!hasAllocations || utilizationPercentage === 0) {
    return 'unassigned';
  }
  
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.CRITICAL) {
    return 'critical';
  }
  
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.ERROR) {
    return 'over-capacity';
  }
  
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.WARNING) {
    return 'near-capacity';
  }
  
  if (utilizationPercentage < UTILIZATION_THRESHOLDS.UNDER_UTILIZED) {
    return 'under-utilized';
  }
  
  return 'optimal';
}

/**
 * Get complete utilization data for a resource
 */
export function calculateResourceUtilization(
  weeklyCapacity: string | number,
  allocatedHours: number,
  isActive: boolean = true
) {
  const effectiveCapacity = calculateEffectiveCapacity(weeklyCapacity);
  const utilizationPercentage = calculateUtilizationPercentage(allocatedHours, effectiveCapacity);
  const hasAllocations = allocatedHours > 0;
  const status = getUtilizationStatus(utilizationPercentage, isActive, hasAllocations);
  const styles = UTILIZATION_STATUS_STYLES[status];
  
  return {
    baseCapacity: typeof weeklyCapacity === 'string' ? parseFloat(weeklyCapacity || '40') : weeklyCapacity,
    effectiveCapacity,
    allocatedHours,
    utilizationPercentage,
    status,
    styles,
    hasAllocations,
    isActive
  };
}

/**
 * Format status text for display (converts kebab-case to title case)
 */
export function formatStatusText(status: UtilizationStatus): string {
  return status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get status color for legacy components that expect specific color formats
 */
export function getLegacyStatusColor(status: UtilizationStatus): string {
  return UTILIZATION_STATUS_STYLES[status].color;
}

/**
 * Check if a utilization percentage represents an alert condition
 */
export function isAlertCondition(utilizationPercentage: number): boolean {
  return utilizationPercentage >= UTILIZATION_THRESHOLDS.WARNING || 
         utilizationPercentage < UTILIZATION_THRESHOLDS.UNDER_UTILIZED;
}

/**
 * Get alert severity level for a utilization percentage
 */
export function getAlertSeverity(utilizationPercentage: number): 'info' | 'warning' | 'error' | 'critical' | null {
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.CRITICAL) {
    return 'critical';
  }
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.ERROR) {
    return 'error';
  }
  if (utilizationPercentage >= UTILIZATION_THRESHOLDS.WARNING) {
    return 'warning';
  }
  if (utilizationPercentage < UTILIZATION_THRESHOLDS.UNDER_UTILIZED && utilizationPercentage > 0) {
    return 'info';
  }
  return null;
}
