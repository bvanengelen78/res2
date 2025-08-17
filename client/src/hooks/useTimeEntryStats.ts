import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, subWeeks, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import type { WeeklySubmission, Resource } from '@shared/schema';

export interface TimeEntryStats {
  weeklySubmissions: number;
  pendingEntries: number;
  lateSubmissions: number;
  onTimeRate: number;
  weeklySubmissionsTrend: number[];
  pendingEntriesTrend: number[];
  lateSubmissionsTrend: number[];
  onTimeRateTrend: number[];
  weeklySubmissionsDelta: number;
  pendingEntriesDelta: number;
  lateSubmissionsDelta: number;
  onTimeRateDelta: number;
}

export interface UseTimeEntryStatsOptions {
  currentWeek?: string;
  weeksCount?: number;
}

/**
 * Shared hook for time entry statistics calculations
 * Used by both dashboard and time logging components
 */
export function useTimeEntryStats(options: UseTimeEntryStatsOptions = {}): {
  stats: TimeEntryStats;
  isLoading: boolean;
  error: Error | null;
} {
  const {
    currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weeksCount = 8
  } = options;

  // Helper function to normalize weekStartDate for comparison
  const normalizeWeekDate = useCallback((weekStartDate: string | Date): string => {
    if (weekStartDate instanceof Date) {
      return format(weekStartDate, 'yyyy-MM-dd');
    }

    // Handle ISO date strings from API (e.g., "2025-08-04T00:00:00.000Z")
    if (typeof weekStartDate === 'string' && weekStartDate.includes('T')) {
      try {
        return format(parseISO(weekStartDate), 'yyyy-MM-dd');
      } catch (error) {
        console.warn('[useTimeEntryStats] Error parsing ISO date string:', weekStartDate, error);
        return weekStartDate;
      }
    }

    // Already in yyyy-MM-dd format
    return weekStartDate;
  }, []);

  // Get all weekly submissions with real-time updates
  const { data: allSubmissions = [], isLoading: submissionsLoading, error: submissionsError } = useQuery<WeeklySubmission[]>({
    queryKey: ['/api/weekly-submissions'],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get pending submissions with real-time updates
  const { data: pendingSubmissions = [], isLoading: pendingLoading, error: pendingError } = useQuery<WeeklySubmission[]>({
    queryKey: ['/api/weekly-submissions/pending'],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get active resources for pending calculations with caching
  const { data: resources = [], isLoading: resourcesLoading, error: resourcesError } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    staleTime: 5 * 60 * 1000, // 5 minutes (resources change less frequently)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const isLoading = submissionsLoading || pendingLoading || resourcesLoading;

  // Handle authentication errors gracefully - don't fail the entire component
  const hasAuthError = resourcesError?.message?.includes('401') || resourcesError?.message?.includes('403');
  const error = hasAuthError ? null : (submissionsError || pendingError || resourcesError);

  const stats = useMemo((): TimeEntryStats => {
    // Return default values during loading or error
    const defaultStats: TimeEntryStats = {
      weeklySubmissions: 0,
      pendingEntries: 0,
      lateSubmissions: 0,
      onTimeRate: 0,
      weeklySubmissionsTrend: Array(weeksCount).fill(0),
      pendingEntriesTrend: Array(weeksCount).fill(0),
      lateSubmissionsTrend: Array(weeksCount).fill(0),
      onTimeRateTrend: Array(weeksCount).fill(0),
      weeklySubmissionsDelta: 0,
      pendingEntriesDelta: 0,
      lateSubmissionsDelta: 0,
      onTimeRateDelta: 0,
    };



    if (isLoading || error) {
      return defaultStats;
    }

    // Validate data arrays
    if (!Array.isArray(allSubmissions) || !Array.isArray(resources)) {
      console.warn('[useTimeEntryStats] Invalid data format received');
      return defaultStats;
    }

    // Validate currentWeek format
    if (!currentWeek || !/^\d{4}-\d{2}-\d{2}$/.test(currentWeek)) {
      console.warn('[useTimeEntryStats] Invalid currentWeek format:', currentWeek);
      return defaultStats;
    }




    // Generate last N weeks for trend data
    const weeks = Array.from({ length: weeksCount }, (_, i) => {
      const weekStart = subWeeks(parseISO(currentWeek), weeksCount - 1 - i);
      return format(weekStart, 'yyyy-MM-dd');
    });

    // Helper function to check if submission is late (after Friday 4PM)
    const isLateSubmission = (submission: WeeklySubmission): boolean => {
      try {
        if (!submission?.submittedAt || !submission?.weekStartDate || !submission?.isSubmitted) {
          return false;
        }

        // Validate date formats
        if (!/^\d{4}-\d{2}-\d{2}$/.test(submission.weekStartDate)) {
          console.warn('[useTimeEntryStats] Invalid weekStartDate format:', submission.weekStartDate);
          return false;
        }

        const friday4PM = addDays(parseISO(submission.weekStartDate), 4);
        friday4PM.setHours(16, 0, 0, 0);

        return isAfter(parseISO(submission.submittedAt), friday4PM);
      } catch (error) {
        console.warn('[useTimeEntryStats] Error checking late submission:', error);
        return false;
      }
    };

    // Calculate weekly submissions trend with error handling
    const weeklySubmissionsTrend = weeks.map(week => {
      try {
        return allSubmissions.filter(sub =>
          normalizeWeekDate(sub?.weekStartDate) === week && sub?.isSubmitted === true
        ).length;
      } catch (error) {
        console.warn('[useTimeEntryStats] Error calculating weekly submissions for week:', week, error);
        return 0;
      }
    });

    // Calculate pending entries trend (active resources without submissions)
    const pendingEntriesTrend = weeks.map(week => {
      try {
        // If we don't have access to resources data (auth issue), use pending submissions as fallback
        if (!resources || resources.length === 0 || hasAuthError) {
          return pendingSubmissions.filter(sub => normalizeWeekDate(sub?.weekStartDate) === week).length;
        }

        const activeResources = resources.filter(r => r?.status === 'active');
        const submittedResourceIds = allSubmissions
          .filter(sub => normalizeWeekDate(sub?.weekStartDate) === week && sub?.isSubmitted === true)
          .map(sub => sub?.resourceId)
          .filter(id => id !== undefined);

        return activeResources.filter(r => r?.id && !submittedResourceIds.includes(r.id)).length;
      } catch (error) {
        console.warn('[useTimeEntryStats] Error calculating pending entries for week:', week, error);
        return 0;
      }
    });

    // Calculate late submissions trend
    const lateSubmissionsTrend = weeks.map(week => {
      return allSubmissions.filter(sub =>
        normalizeWeekDate(sub.weekStartDate) === week && isLateSubmission(sub)
      ).length;
    });

    // Calculate on-time rate trend
    const onTimeRateTrend = weeks.map(week => {
      const totalSubmissions = allSubmissions.filter(sub =>
        normalizeWeekDate(sub.weekStartDate) === week && sub.isSubmitted
      ).length;

      const onTimeSubmissions = allSubmissions.filter(sub =>
        normalizeWeekDate(sub.weekStartDate) === week && sub.isSubmitted && !isLateSubmission(sub)
      ).length;

      return totalSubmissions > 0 ? Math.round((onTimeSubmissions / totalSubmissions) * 100) : 0;
    });

    // Current week calculations
    const currentWeekSubmissions = allSubmissions.filter(sub => {
      const subWeekDate = normalizeWeekDate(sub.weekStartDate);
      return subWeekDate === currentWeek && sub.isSubmitted;
    }).length;

    // Calculate current week pending entries
    let currentWeekPending = 0;
    if (!resources || resources.length === 0 || hasAuthError) {
      // Fallback: use pending submissions count if we don't have access to resources
      currentWeekPending = pendingSubmissions.filter(sub => normalizeWeekDate(sub?.weekStartDate) === currentWeek).length;
    } else {
      const activeResources = resources.filter(r => r?.status === 'active');
      const currentWeekSubmittedResourceIds = allSubmissions
        .filter(sub => normalizeWeekDate(sub?.weekStartDate) === currentWeek && sub?.isSubmitted === true)
        .map(sub => sub?.resourceId)
        .filter(id => id !== undefined);

      currentWeekPending = activeResources.filter(r =>
        r?.id && !currentWeekSubmittedResourceIds.includes(r.id)
      ).length;
    }

    const currentWeekLate = allSubmissions.filter(sub =>
      normalizeWeekDate(sub.weekStartDate) === currentWeek && isLateSubmission(sub)
    ).length;

    const currentWeekTotal = currentWeekSubmissions + currentWeekPending;
    const currentWeekOnTime = currentWeekSubmissions - currentWeekLate;
    const currentOnTimeRate = currentWeekTotal > 0 ? 
      Math.round((currentWeekOnTime / currentWeekTotal) * 100) : 0;

    // Previous week for comparison
    const previousWeek = format(subWeeks(parseISO(currentWeek), 1), 'yyyy-MM-dd');
    
    const previousWeekSubmissions = allSubmissions.filter(sub =>
      normalizeWeekDate(sub.weekStartDate) === previousWeek && sub.isSubmitted
    ).length;

    // Calculate previous week pending entries
    let previousWeekPending = 0;
    if (!resources || resources.length === 0 || hasAuthError) {
      // Fallback: use pending submissions count if we don't have access to resources
      previousWeekPending = pendingSubmissions.filter(sub => normalizeWeekDate(sub?.weekStartDate) === previousWeek).length;
    } else {
      const activeResources = resources.filter(r => r?.status === 'active');
      const previousWeekSubmittedResourceIds = allSubmissions
        .filter(sub => normalizeWeekDate(sub?.weekStartDate) === previousWeek && sub?.isSubmitted === true)
        .map(sub => sub?.resourceId)
        .filter(id => id !== undefined);

      previousWeekPending = activeResources.filter(r =>
        r?.id && !previousWeekSubmittedResourceIds.includes(r.id)
      ).length;
    }

    const previousWeekLate = allSubmissions.filter(sub =>
      normalizeWeekDate(sub.weekStartDate) === previousWeek && isLateSubmission(sub)
    ).length;

    const previousWeekTotal = previousWeekSubmissions + previousWeekPending;
    const previousWeekOnTime = previousWeekSubmissions - previousWeekLate;
    const previousOnTimeRate = previousWeekTotal > 0 ? 
      Math.round((previousWeekOnTime / previousWeekTotal) * 100) : 0;

    // Calculate deltas (percentage change from previous week) with error handling
    const calculateDelta = (current: number, previous: number): number => {
      try {
        // Validate inputs
        if (typeof current !== 'number' || typeof previous !== 'number') {
          console.warn('[useTimeEntryStats] Invalid delta calculation inputs:', { current, previous });
          return 0;
        }

        if (isNaN(current) || isNaN(previous)) {
          console.warn('[useTimeEntryStats] NaN values in delta calculation:', { current, previous });
          return 0;
        }

        if (previous === 0) return current > 0 ? 100 : 0;

        const delta = ((current - previous) / previous) * 100;

        // Ensure result is finite
        if (!isFinite(delta)) {
          console.warn('[useTimeEntryStats] Non-finite delta result:', { current, previous, delta });
          return 0;
        }

        return delta;
      } catch (error) {
        console.warn('[useTimeEntryStats] Error calculating delta:', error);
        return 0;
      }
    };

    const weeklySubmissionsDelta = calculateDelta(currentWeekSubmissions, previousWeekSubmissions);
    const pendingEntriesDelta = calculateDelta(currentWeekPending, previousWeekPending);
    const lateSubmissionsDelta = calculateDelta(currentWeekLate, previousWeekLate);
    const onTimeRateDelta = calculateDelta(currentOnTimeRate, previousOnTimeRate);

    const finalStats = {
      weeklySubmissions: currentWeekSubmissions,
      pendingEntries: currentWeekPending,
      lateSubmissions: currentWeekLate,
      onTimeRate: currentOnTimeRate,
      weeklySubmissionsTrend,
      pendingEntriesTrend,
      lateSubmissionsTrend,
      onTimeRateTrend,
      weeklySubmissionsDelta,
      pendingEntriesDelta,
      lateSubmissionsDelta,
      onTimeRateDelta,
    };



    return finalStats;
  }, [allSubmissions, pendingSubmissions, resources, currentWeek, weeksCount, isLoading, error]);

  return {
    stats,
    isLoading,
    error,
  };
}

/**
 * Utility function to calculate Friday 4PM deadline for a given week
 */
export function getFridayDeadline(weekStartDate: string): Date {
  const friday4PM = addDays(parseISO(weekStartDate), 4);
  friday4PM.setHours(16, 0, 0, 0);
  return friday4PM;
}

/**
 * Utility function to check if a submission is late
 */
export function isSubmissionLate(submission: WeeklySubmission): boolean {
  if (!submission.submittedAt || !submission.weekStartDate || !submission.isSubmitted) {
    return false;
  }

  const deadline = getFridayDeadline(submission.weekStartDate);
  return isAfter(parseISO(submission.submittedAt), deadline);
}

/**
 * Utility function to get current week status
 */
export function getCurrentWeekStatus(currentWeek: string) {
  const today = new Date();
  const friday = addDays(parseISO(currentWeek), 4); // Friday of current week
  const friday4PM = new Date(friday);
  friday4PM.setHours(16, 0, 0, 0); // 4 PM on Friday
  
  const isAfterFriday4PM = isAfter(today, friday4PM);
  const isCurrentWeek = isBefore(today, addDays(parseISO(currentWeek), 7));
  
  return {
    isAfterFriday4PM,
    isCurrentWeek,
    isOverdue: isAfterFriday4PM && isCurrentWeek,
    deadline: friday4PM,
  };
}
