import React from 'react';
import { SubmissionToastBanner } from './submission-toast-banner';
import { SubmitWeekCelebration, useSubmitCelebration } from './submit-week-celebration';
import type { WeeklySubmission } from '@shared/schema';

interface EnhancedTimeLoggingWrapperProps {
  children: React.ReactNode;
  weeklySubmission?: WeeklySubmission;
  onSubmit: () => void;
  onUnsubmit: () => void;
  isSubmitting: boolean;
  isUnsubmitting: boolean;
  selectedWeek: string;
  hasAllocations: boolean;
  hasTimeEntries?: boolean;
  totalHours?: number;
  submissionError?: string;
  onCelebrationTrigger?: () => void;
}

export function EnhancedTimeLoggingWrapper({
  children,
  weeklySubmission,
  onSubmit,
  onUnsubmit,
  isSubmitting,
  isUnsubmitting,
  selectedWeek,
  hasAllocations,
  hasTimeEntries = false,
  totalHours = 0,
  submissionError,
  onCelebrationTrigger
}: EnhancedTimeLoggingWrapperProps) {
  const { showCelebration, triggerCelebration, hideCelebration } = useSubmitCelebration();

  // Expose triggerCelebration to parent component
  React.useEffect(() => {
    if (onCelebrationTrigger) {
      onCelebrationTrigger(triggerCelebration);
    }
  }, [onCelebrationTrigger, triggerCelebration]);

  return (
    <>
      {children}
      
      {/* Enhanced Submission Toast Banner */}
      <SubmissionToastBanner
        weeklySubmission={weeklySubmission}
        onSubmit={onSubmit}
        onUnsubmit={onUnsubmit}
        isSubmitting={isSubmitting}
        isUnsubmitting={isUnsubmitting}
        selectedWeek={selectedWeek}
        hasAllocations={hasAllocations}
        hasTimeEntries={hasTimeEntries}
        totalHours={totalHours}
        submissionError={submissionError}
      />

      {/* Submit Week Celebration */}
      <SubmitWeekCelebration
        isVisible={showCelebration}
        onComplete={hideCelebration}
      />
    </>
  );
}

// Hook to use with the wrapper
export function useEnhancedSubmission() {
  const [triggerCelebrationFn, setTriggerCelebrationFn] = React.useState<(() => void) | null>(null);

  const handleCelebrationTrigger = React.useCallback((fn: () => void) => {
    setTriggerCelebrationFn(() => fn);
  }, []);

  const triggerCelebration = React.useCallback(() => {
    if (triggerCelebrationFn) {
      triggerCelebrationFn();
    }
  }, [triggerCelebrationFn]);

  return {
    triggerCelebration,
    handleCelebrationTrigger
  };
}
