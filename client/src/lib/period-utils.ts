import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

/**
 * Period filter types supported by the dashboard
 */
export type PeriodFilter = 'currentWeek' | 'thisMonth' | 'quarter' | 'year';

/**
 * Period information with start date, end date, and display label
 */
export interface PeriodInfo {
  startDate: string;
  endDate: string;
  label: string;
}

/**
 * Get period information (start date, end date, label) for a given period filter
 * @param period - The period filter to calculate dates for
 * @returns Period information object
 */
export function getPeriodInfo(period: PeriodFilter): PeriodInfo {
  const now = new Date();
  
  switch (period) {
    case 'currentWeek':
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'Current Week'
      };
    case 'thisMonth':
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        label: format(now, 'MMMM yyyy')
      };
    case 'quarter':
      return {
        startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
        endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
        label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
      };
    case 'year':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        label: `${now.getFullYear()}`
      };
    default:
      // Default to current week
      return {
        startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'Current Week'
      };
  }
}

/**
 * Get display label for a period filter
 * @param filter - The period filter
 * @returns Human-readable label
 */
export function getPeriodLabel(filter: PeriodFilter): string {
  switch (filter) {
    case 'currentWeek': return 'Current Week';
    case 'thisMonth': return 'This Month';
    case 'quarter': return 'This Quarter';
    case 'year': return 'This Year';
    default: return 'Current Week';
  }
}

/**
 * Calculate period multiplier (how many weeks in the period) for capacity calculations
 * @param startDate - Period start date (YYYY-MM-DD format)
 * @param endDate - Period end date (YYYY-MM-DD format)
 * @returns Number of weeks in the period (minimum 1)
 */
export function calculatePeriodMultiplier(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  const diffInWeeks = diffInDays / 7;

  // Round to nearest week, minimum 1 week
  return Math.max(1, Math.round(diffInWeeks));
}

/**
 * Check if two period info objects represent the same time period
 * @param period1 - First period
 * @param period2 - Second period
 * @returns True if periods are the same
 */
export function periodsEqual(period1: PeriodInfo, period2: PeriodInfo): boolean {
  return period1.startDate === period2.startDate && period1.endDate === period2.endDate;
}

/**
 * Get comparison text for period-over-period changes
 * @param filter - The current period filter
 * @returns Comparison text (e.g., "from last week", "from last month")
 */
export function getPeriodComparisonText(filter: PeriodFilter): string {
  switch (filter) {
    case 'currentWeek': return 'from last week';
    case 'thisMonth': return 'from last month';
    case 'quarter': return 'from last quarter';
    case 'year': return 'from last year';
    default: return 'from last period';
  }
}

/**
 * Get previous period information for comparison calculations
 * @param period - The current period filter
 * @returns Previous period information object
 */
export function getPreviousPeriodInfo(period: PeriodFilter): PeriodInfo {
  const now = new Date();

  switch (period) {
    case 'currentWeek': {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        startDate: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'Last Week'
      };
    }
    case 'thisMonth': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        label: format(lastMonth, 'MMMM yyyy')
      };
    }
    case 'quarter': {
      const lastQuarter = new Date(now);
      lastQuarter.setMonth(lastQuarter.getMonth() - 3);
      return {
        startDate: format(startOfQuarter(lastQuarter), 'yyyy-MM-dd'),
        endDate: format(endOfQuarter(lastQuarter), 'yyyy-MM-dd'),
        label: `Q${Math.floor(lastQuarter.getMonth() / 3) + 1} ${lastQuarter.getFullYear()}`
      };
    }
    case 'year': {
      const lastYear = new Date(now);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return {
        startDate: format(startOfYear(lastYear), 'yyyy-MM-dd'),
        endDate: format(endOfYear(lastYear), 'yyyy-MM-dd'),
        label: `${lastYear.getFullYear()}`
      };
    }
    default: {
      // Default to last week
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        startDate: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        label: 'Last Week'
      };
    }
  }
}

/**
 * Get all available period filter options
 * @returns Array of period filter options with labels
 */
export function getPeriodFilterOptions(): Array<{ value: PeriodFilter; label: string }> {
  return [
    { value: 'currentWeek', label: 'Current Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];
}
