import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import KpiCard from '@/components/ui/kpi-card';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, parseISO } from 'date-fns';
import { useTimeEntryStats, getCurrentWeekStatus } from '@/hooks/useTimeEntryStats';
import type { WeeklySubmission } from '@shared/schema';

interface TimeLoggingReminderProps {
  resourceId?: number;
  showAllResources?: boolean;
}

export function TimeLoggingReminder({ resourceId, showAllResources = false }: TimeLoggingReminderProps) {
  const [currentWeek] = useState(() => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  });

  // Get real-time time entry statistics
  const { stats, isLoading: statsLoading, error: statsError } = useTimeEntryStats({
    currentWeek,
    weeksCount: 8,
  });

  // Get current week submission for specific resource (only when resourceId is provided and valid)
  const { data: currentSubmission, isLoading: currentSubmissionLoading } = useQuery<WeeklySubmission>({
    queryKey: ['/api/resources', resourceId, 'weekly-submissions', 'week', currentWeek],
    enabled: !!resourceId && !isNaN(Number(resourceId)),
  });

  // Transform real stats into KPI format
  const timeLoggingKPIs = [
    {
      title: 'Weekly Submissions',
      value: stats.weeklySubmissions,
      deltaPercent: stats.weeklySubmissionsDelta,
      data: stats.weeklySubmissionsTrend,
    },
    {
      title: 'Pending Entries',
      value: stats.pendingEntries,
      deltaPercent: stats.pendingEntriesDelta,
      data: stats.pendingEntriesTrend,
    },
    {
      title: 'Late Submissions',
      value: stats.lateSubmissions,
      deltaPercent: stats.lateSubmissionsDelta,
      data: stats.lateSubmissionsTrend,
    },
    {
      title: 'On-Time Rate',
      value: stats.onTimeRate,
      deltaPercent: stats.onTimeRateDelta,
      data: stats.onTimeRateTrend,
    },
  ];



  // Show individual resource reminder (simplified for KPI view)
  if (resourceId && !showAllResources) {
    const isSubmitted = currentSubmission?.isSubmitted || false;
    const weekStatus = getCurrentWeekStatus(currentWeek);

    if (isSubmitted) {
      return (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span>Time Logging Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">
              Your time entries for the week of {format(parseISO(currentWeek), 'MMM d, yyyy')} have been submitted.
            </p>
            {currentSubmission?.submittedAt && (
              <p className="text-xs text-green-600 mt-2">
                Submitted on {format(parseISO(currentSubmission.submittedAt), 'MMM d, h:mm a')}
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`border-amber-200 ${weekStatus.isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center space-x-2 ${weekStatus.isOverdue ? 'text-red-800' : 'text-amber-800'}`}>
            <AlertTriangle className="w-5 h-5" />
            <span>Time Logging {weekStatus.isOverdue ? 'Overdue' : 'Required'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${weekStatus.isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
            {weekStatus.isOverdue ?
              'Your time entries are overdue! Please submit them as soon as possible.' :
              'Please submit your time entries for this week.'
            }
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Week of {format(parseISO(currentWeek), 'MMM d, yyyy')} • Deadline: {format(weekStatus.deadline, 'EEE MMM d, h:mm a')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show KPI dashboard view for all resources
  if (showAllResources) {
    // Show loading state while data is being fetched
    if (statsLoading || currentSubmissionLoading) {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Time Logging Reminder</h2>
              <p className="text-sm text-gray-600">Track and manage time entries</p>
            </div>
          </div>

          {/* Loading KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm p-6 animate-pulse"
                style={{ height: '220px' }}
              >
                <div className="h-3 bg-gray-200 rounded mb-4 w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                <div className="flex-1 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Show error state if data failed to load
    if (statsError) {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Time Logging Reminder</h2>
              <p className="text-sm text-gray-600">Track and manage time entries</p>
            </div>
          </div>

          {/* Error State */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Unable to load time logging statistics</span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Time Logging Reminder</h2>
            <p className="text-sm text-gray-600">Track and manage time entries</p>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {timeLoggingKPIs.map((kpi, index) => (
            <KpiCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              deltaPercent={kpi.deltaPercent}
              data={kpi.data}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}