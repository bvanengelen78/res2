import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Clock, X, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WeeklySubmission } from '@shared/schema';

interface SubmissionToastBannerProps {
  weeklySubmission?: WeeklySubmission;
  onSubmit: () => void;
  onUnsubmit: () => void;
  isSubmitting: boolean;
  isUnsubmitting: boolean;
  selectedWeek: string;
  hasAllocations?: boolean; // Only show banner if user has allocations
  hasTimeEntries?: boolean; // New prop to indicate if there are actual time entries with hours > 0
  totalHours?: number; // Total hours logged for the week
  submissionError?: string; // Error message if submission fails
  className?: string;
}

export function SubmissionToastBanner({
  weeklySubmission,
  onSubmit,
  onUnsubmit,
  isSubmitting,
  isUnsubmitting,
  selectedWeek,
  hasAllocations = true,
  hasTimeEntries = false,
  totalHours = 0,
  submissionError,
  className
}: SubmissionToastBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if banner should be shown
  const shouldShowBanner = () => {
    if (!hasAllocations) return false;

    // Show banner whenever user has active allocations for the selected week
    // This ensures users can always access submit/unsubmit functionality

    if (weeklySubmission?.isSubmitted) {
      return true; // Show confirmation banner for submitted weeks with unsubmit option
    }

    // For unsubmitted weeks, show banner if user has allocations
    // This allows users to submit even with 0 hours (valid business case)
    return true;
  };

  // Auto-collapse functionality
  const startAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }
    autoCollapseTimeoutRef.current = setTimeout(() => {
      if (!hasInteracted) {
        setIsExpanded(false);
      }
    }, 10000); // Auto-collapse after 10 seconds
  }, [hasInteracted]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter to submit week when toast is active
      if (event.ctrlKey && event.key === 'Enter' && isVisible && !weeklySubmission?.isSubmitted) {
        event.preventDefault();
        onSubmit();
        setHasInteracted(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, weeklySubmission?.isSubmitted, onSubmit]);

  useEffect(() => {
    const visible = shouldShowBanner();
    setIsVisible(visible);

    // Start auto-collapse timer when banner becomes visible
    if (visible && !hasInteracted) {
      startAutoCollapseTimer();
    }
  }, [weeklySubmission, hasTimeEntries, totalHours, hasInteracted, startAutoCollapseTimer]);

  // Handle hover and interaction
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsExpanded(true);
    setHasInteracted(true);
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!hasInteracted) {
      startAutoCollapseTimer();
    }
  }, [hasInteracted, startAutoCollapseTimer]);

  const handleClick = useCallback(() => {
    setIsExpanded(!isExpanded);
    setHasInteracted(true);
  }, [isExpanded]);

  // Reset state when week changes
  useEffect(() => {
    setIsExpanded(false);
    setHasInteracted(false);

    // Clear auto-collapse timer
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }
  }, [selectedWeek]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard visibility on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const windowHeight = window.innerHeight;
        const heightDifference = windowHeight - viewportHeight;

        // If height difference is significant, keyboard is likely open
        if (heightDifference > 150) {
          setKeyboardHeight(heightDifference);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);



  // Handle submission errors
  useEffect(() => {
    if (submissionError && !showErrorToast) {
      setShowErrorToast(true);

      // Auto-dismiss error toast after 5 seconds
      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [submissionError, showErrorToast]);

  // Enhanced keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (event.target === bannerRef.current) {
          event.preventDefault();
          if (!isSubmitted && !isSubmitting) {
            onSubmit();
          }
        }
        break;
      default:
        break;
    }
  };

  const isSubmitted = weeklySubmission?.isSubmitted;

  // Smooth animation variants with consistent easing
  const bannerVariants = {
    hidden: {
      y: 60,
      opacity: 0,
      scale: 0.92,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        mass: 0.8,
        duration: 0.5,
      },
    },
    exit: {
      y: 60,
      opacity: 0,
      scale: 0.92,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1], // Custom cubic-bezier for smooth exit
      },
    },
  };

  const iconVariants = {
    hidden: {
      scale: 0,
      rotate: -90,
      opacity: 0,
    },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: 0.15,
      },
    },
  };

  // Smooth state transition variants
  const stateTransitionVariants = {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
      }
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      }
    },
  };

  // Subtle pulse animation for CTA button
  const pulseVariants = {
    pulse: {
      scale: [1, 1.015, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      {/* Main Submission Banner - Compact Pill Style */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={bannerRef}
            variants={bannerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            aria-label={isSubmitted ? "Week submission confirmation" : "Week submission reminder"}
            aria-describedby="submission-banner-content"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={cn(
              // Bottom-right positioning with responsive padding
              "fixed bottom-4 right-4 z-submission-banner",
              "sm:bottom-6 sm:right-6",
              // Responsive width with better mobile handling
              "w-[calc(100vw-2rem)] max-w-[340px]",
              "sm:w-auto sm:max-w-[340px]",
              // Cursor pointer for interaction
              "cursor-pointer",
              // Safe area handling for iOS
              "pb-safe",
              className
            )}
            style={{
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
            }}
          >
            <motion.div
              className={cn(
                "rounded-full shadow-lg border backdrop-blur-sm",
                "transition-all duration-400 ease-out",
                isSubmitted
                  ? "bg-green-50/95 border-green-200 text-green-900"
                  : "bg-blue-50/95 border-blue-200 text-blue-900",
                // Hover effects with smooth transitions
                "hover:shadow-xl",
                // Expanded state with smooth border radius transition
                isExpanded ? "rounded-2xl" : "rounded-full"
              )}
              animate={{
                height: isExpanded ? "auto" : "48px",
                paddingTop: isExpanded ? "20px" : "12px",
                paddingBottom: isExpanded ? "20px" : "12px",
                paddingLeft: "16px",
                paddingRight: "16px",
                scale: isHovered ? 1.02 : 1,
              }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94], // Smooth custom easing
                scale: { duration: 0.2 }
              }}
            >
              {/* Minimized View */}
              {!isExpanded && (
                <motion.div
                  key="minimized"
                  variants={stateTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-center justify-between gap-3 min-h-[24px]"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      variants={iconVariants}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        "transition-colors duration-300",
                        isSubmitted
                          ? "bg-green-100"
                          : "bg-blue-100"
                      )}
                    >
                      <motion.div
                        key={isSubmitted ? 'submitted' : 'unsubmitted'}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        {isSubmitted ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600" />
                        )}
                      </motion.div>
                    </motion.div>
                    <motion.span
                      key={isSubmitted ? 'submitted-text' : 'unsubmitted-text'}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="text-sm font-medium truncate"
                    >
                      {isSubmitted
                        ? '✅ Week submitted'
                        : `${totalHours?.toFixed(1) || '0'}h logged – Submit week`
                      }
                    </motion.span>
                  </div>
                  <motion.div
                    animate={{ rotate: 0 }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronUp className="w-4 h-4 opacity-60 flex-shrink-0" />
                  </motion.div>
                </motion.div>
              )}

              {/* Expanded View */}
              {isExpanded && (
                <motion.div
                  key="expanded"
                  variants={stateTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* Header Section with improved alignment */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <motion.div
                        variants={iconVariants}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          "transition-colors duration-300",
                          isSubmitted
                            ? "bg-green-100"
                            : "bg-blue-100"
                        )}
                      >
                        <motion.div
                          key={isSubmitted ? 'submitted-icon' : 'unsubmitted-icon'}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          {isSubmitted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-blue-600" />
                          )}
                        </motion.div>
                      </motion.div>

                      <div className="flex-1 min-w-0 pt-0.5" id="submission-banner-content">
                        <motion.h4
                          key={isSubmitted ? 'submitted-title' : 'unsubmitted-title'}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="font-semibold text-sm leading-tight"
                        >
                          {isSubmitted ? 'Week Submitted Successfully' : 'Weekly Timesheet'}
                        </motion.h4>
                        <motion.p
                          key={isSubmitted ? 'submitted-desc' : 'unsubmitted-desc'}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.15 }}
                          className="text-xs opacity-80 mt-1 leading-relaxed"
                        >
                          {isSubmitted
                            ? `Submitted ${weeklySubmission?.submittedAt ?
                                new Date(weeklySubmission.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                }) : 'recently'}`
                            : totalHours && totalHours > 0
                              ? `${totalHours.toFixed(1)} hours logged. Submit when ready.`
                              : `No hours logged yet. Submit with 0 hours or add time entries first.`
                          }
                        </motion.p>
                        {!isSubmitted && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="text-xs opacity-60 mt-1.5 leading-relaxed"
                          >
                            Press Ctrl+Enter to submit quickly
                          </motion.p>
                        )}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: 180 }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1"
                    >
                      <ChevronDown className="w-4 h-4 opacity-60 flex-shrink-0" />
                    </motion.div>
                  </div>

                  {/* Action Buttons - Improved alignment and transitions */}
                  <motion.div
                    className="flex items-center justify-start gap-3 w-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                  >
                    <AnimatePresence mode="wait">
                      {isSubmitted ? (
                        <motion.div
                          key="reopen-button"
                          initial={{ opacity: 0, scale: 0.9, x: -10 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: 10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnsubmit();
                            }}
                            disabled={isUnsubmitting}
                            variant="outline"
                            size="sm"
                            aria-label="Reopen week for editing"
                            className={cn(
                              "bg-white/80 border-amber-300 text-amber-700",
                              "hover:bg-amber-50 hover:border-amber-400",
                              "backdrop-blur-sm transition-all duration-300",
                              "min-h-[40px] px-4 text-xs font-medium",
                              "sm:min-h-[38px] sm:px-4",
                              "flex items-center justify-center gap-2",
                              "shadow-sm hover:shadow-md",
                              "touch-manipulation" // Better mobile touch
                            )}
                          >
                            {isUnsubmitting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                <span>Reopening...</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Reopen Week</span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="submit-button"
                          initial={{ opacity: 0, scale: 0.9, x: 10 }}
                          animate={
                            !isSubmitting
                              ? { opacity: 1, scale: 1, x: 0, ...pulseVariants.pulse }
                              : { opacity: 1, scale: 1, x: 0 }
                          }
                          exit={{ opacity: 0, scale: 0.9, x: -10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSubmit();
                              setHasInteracted(true);
                            }}
                            disabled={isSubmitting}
                            size="sm"
                            aria-label="Submit weekly timesheet"
                            className={cn(
                              "bg-blue-600 hover:bg-blue-700 text-white",
                              "transition-all duration-300",
                              "min-h-[40px] px-5 text-xs font-medium",
                              "sm:min-h-[38px] sm:px-5",
                              "flex items-center justify-center gap-2",
                              "shadow-md hover:shadow-lg",
                              "border-0",
                              "touch-manipulation" // Better mobile touch
                            )}
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Submit Week</span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
      )}
    </AnimatePresence>



    {/* Error Toast */}
    <AnimatePresence>
      {showErrorToast && submissionError && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            // Bottom-right positioning matching main banner
            "fixed bottom-6 right-6 z-submission-toast",
            "w-[90vw] max-w-[320px]",
            "sm:w-auto sm:max-w-[320px]",
            "pb-safe"
          )}
          role="alert"
          aria-live="assertive"
        >
          <div className="rounded-xl shadow-lg border backdrop-blur-sm bg-red-50/95 border-red-200 text-red-900 p-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
                className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"
              >
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </motion.div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Submission Failed</h4>
                <p className="text-xs opacity-80 mt-0.5">{submissionError}</p>
              </div>
              <Button
                onClick={() => setShowErrorToast(false)}
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 opacity-60 hover:opacity-100 min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Dismiss error</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>


  </>
  );
}
