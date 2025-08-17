import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isAfter, isBefore } from 'date-fns';

/**
 * Enhanced period utilities specifically for Enhanced Capacity Alerts
 * Implements current date awareness to exclude past weeks from forward-looking calculations
 */

export interface AlertsPeriodInfo {
  startDate: string;
  endDate: string;
  label: string;
  isForwardLooking: boolean;
  excludedPastWeeks: number;
}

/**
 * Get current week information for reference
 */
export function getCurrentWeekInfo() {
  const now = new Date();
  return {
    startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weekNumber: getISOWeekNumber(now),
    year: now.getFullYear()
  };
}

/**
 * Get ISO week number (consistent with backend calculation)
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * BULLETPROOF: Simplified period calculation for Enhanced Capacity Alerts with current date awareness
 * Excludes past weeks from forward-looking periods like "current month"
 */
export function getAlertsPeriodInfo(period: string, originalPeriodInfo: { startDate: string; endDate: string; label: string }): AlertsPeriodInfo {
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  const originalStartDate = new Date(originalPeriodInfo.startDate);
  const originalEndDate = new Date(originalPeriodInfo.endDate);

  // Determine if this is a forward-looking period
  const isCurrentPeriod = period === 'thisMonth' || period === 'quarter' || period === 'year';
  const isMultiWeek = (originalEndDate.getTime() - originalStartDate.getTime()) > (7 * 24 * 60 * 60 * 1000);
  const includesPastWeeks = isBefore(originalStartDate, currentWeekStart);
  const periodIncludesNow = originalStartDate <= now && originalEndDate >= now;

  if (isCurrentPeriod && isMultiWeek && includesPastWeeks && periodIncludesNow) {
    // This is a forward-looking period that includes past weeks - adjust it
    const adjustedStartDate = currentWeekStart;
    const timeDiff = currentWeekStart.getTime() - originalStartDate.getTime();
    const excludedPastWeeks = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));

    console.log(`[ALERTS_PERIOD] BULLETPROOF: Adjusted ${period} period: excluded ${excludedPastWeeks} past weeks`);
    console.log(`[ALERTS_PERIOD] Original: ${originalPeriodInfo.startDate} -> Adjusted: ${format(adjustedStartDate, 'yyyy-MM-dd')}`);

    return {
      startDate: format(adjustedStartDate, 'yyyy-MM-dd'),
      endDate: originalPeriodInfo.endDate,
      label: originalPeriodInfo.label,
      isForwardLooking: true,
      excludedPastWeeks
    };
  }

  // No adjustment needed
  return {
    startDate: originalPeriodInfo.startDate,
    endDate: originalPeriodInfo.endDate,
    label: originalPeriodInfo.label,
    isForwardLooking: false,
    excludedPastWeeks: 0
  };
}

/**
 * Generate week keys for a date range, excluding past weeks if specified
 * This ensures consistent week key generation with the backend
 */
export function getAlertsWeekKeysInRange(startDate: string, endDate: string, excludePastWeeks: boolean = false): string[] {
  const weekKeys: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  
  // Get the Monday of the week containing startDate
  const startMonday = new Date(start);
  startMonday.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
  
  let currentWeek = new Date(startMonday);
  
  // If excluding past weeks, start from current week if it's later
  if (excludePastWeeks && isBefore(currentWeek, currentWeekStart)) {
    currentWeek = new Date(currentWeekStart);
  }
  
  while (currentWeek <= end) {
    const year = currentWeek.getFullYear();
    const weekNum = getISOWeekNumber(currentWeek);
    weekKeys.push(`${year}-W${weekNum.toString().padStart(2, '0')}`);
    currentWeek.setDate(currentWeek.getDate() + 7);
  }
  
  return weekKeys;
}

/**
 * Check if a week key represents a past week
 */
export function isPastWeek(weekKey: string): boolean {
  const now = new Date();
  const currentWeek = getCurrentWeekInfo();
  const currentWeekKey = `${currentWeek.year}-W${currentWeek.weekNumber.toString().padStart(2, '0')}`;
  
  // Parse week key (format: YYYY-WXX)
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  
  const [currentYear, currentWeekNum] = [currentWeek.year, currentWeek.weekNumber];
  
  // Compare year and week
  if (year < currentYear) return true;
  if (year > currentYear) return false;
  return week < currentWeekNum;
}

/**
 * Filter out past weeks from a list of week keys
 */
export function filterOutPastWeeks(weekKeys: string[]): string[] {
  return weekKeys.filter(weekKey => !isPastWeek(weekKey));
}

/**
 * Get period multiplier for alerts (how many weeks in the period) excluding past weeks
 */
export function getAlertsPeriodMultiplier(alertsPeriodInfo: AlertsPeriodInfo): number {
  const start = new Date(alertsPeriodInfo.startDate);
  const end = new Date(alertsPeriodInfo.endDate);
  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  const diffInWeeks = diffInDays / 7;
  
  // Round to nearest week, minimum 1 week
  return Math.max(1, Math.round(diffInWeeks));
}

/**
 * Create enhanced period description for UI display
 */
export function getAlertsPeriodDescription(alertsPeriodInfo: AlertsPeriodInfo): string {
  const baseDescription = alertsPeriodInfo.label;
  
  if (alertsPeriodInfo.isForwardLooking && alertsPeriodInfo.excludedPastWeeks > 0) {
    return `${baseDescription} (from current week, ${alertsPeriodInfo.excludedPastWeeks} past weeks excluded)`;
  }
  
  return baseDescription;
}

/**
 * Validate that period calculations are current-date aware
 */
export function validateCurrentDateAwareness(periodInfo: AlertsPeriodInfo): boolean {
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const periodStart = new Date(periodInfo.startDate);
  
  // For forward-looking periods, start date should not be before current week
  if (periodInfo.isForwardLooking) {
    return !isBefore(periodStart, currentWeekStart);
  }
  
  return true;
}
