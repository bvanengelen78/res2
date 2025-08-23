import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  Timer,
  Plus,
  Copy,
  Info,
  ArrowRight,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { format, startOfWeek, addDays, parseISO, getWeek, getYear, isToday, addWeeks, subWeeks } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsDesktop } from '@/hooks/use-desktop';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileSmartReminders } from '@/components/mobile-smart-reminders';
import { AdminResourceSelector, useAdminResourceSelection } from '@/components/admin-resource-selector';
import { AdminConfirmationDialog, useAdminConfirmation } from '@/components/admin-confirmation-dialog';
import type { TimeEntry, WeeklySubmission, Resource, ResourceAllocation, Project } from '@shared/schema';
import { TimeLoggingGuard } from "@/components/auth/RBACGuard";
import "@/styles/dashboard-blue-theme.css";

// Types for our enhanced interface
interface WeekStatus {
  weekStartDate: string;
  status: 'submitted' | 'in-progress' | 'not-started';
  totalHours: number;
  submittedAt?: string;
}

interface TimeEntryWithAllocation extends TimeEntry {
  allocation: ResourceAllocation & {
    project: Project;
  };
}

interface WeeklyTimeData {
  [allocationId: string]: {
    mondayHours: string;
    tuesdayHours: string;
    wednesdayHours: string;
    thursdayHours: string;
    fridayHours: string;
    saturdayHours: string;
    sundayHours: string;
    notes?: string;
  };
}

// Mobile-first Week Selection Component
interface WeekSelectorProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  weekStatuses: WeekStatus[];
  isLoading?: boolean;
}

function WeekSelector({ selectedWeek, onWeekChange, weekStatuses, isLoading }: WeekSelectorProps) {
  const isMobile = useIsMobile();
  const [showCalendar, setShowCalendar] = useState(false);
  
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const selectedWeekDate = parseISO(selectedWeek);
  
  const getWeekStatus = (weekStart: string) => {
    return weekStatuses.find(ws => ws.weekStartDate === weekStart)?.status || 'not-started';
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Timer className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'in-progress':
        return 'bg-amber-100 border-amber-200 text-amber-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-600';
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'next'
      ? addWeeks(selectedWeekDate, 1)
      : subWeeks(selectedWeekDate, 1);

    // Add reasonable bounds: 12 weeks in the past, 8 weeks in the future
    const minWeek = subWeeks(currentWeekStart, 12);
    const maxWeek = addWeeks(currentWeekStart, 8);

    if (newWeek >= minWeek && newWeek <= maxWeek) {
      onWeekChange(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    }
  };

  const currentStatus = getWeekStatus(selectedWeek);

  // Check navigation bounds
  const minWeek = subWeeks(currentWeekStart, 12);
  const maxWeek = addWeeks(currentWeekStart, 8);
  const canNavigatePrev = selectedWeekDate > minWeek;
  const canNavigateNext = selectedWeekDate < maxWeek;

  return (
    <div className="space-y-4">
      {/* Mobile-optimized week navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('prev')}
          disabled={!canNavigatePrev}
          className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 text-center">
          <div className="font-semibold text-lg">
            Week {getWeek(selectedWeekDate)} • {getYear(selectedWeekDate)}
          </div>
          <div className="text-sm text-gray-500">
            {format(selectedWeekDate, 'MMM d')} - {format(addDays(selectedWeekDate, 6), 'MMM d')}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('next')}
          disabled={!canNavigateNext}
          className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Week status indicator */}
      <div className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium",
        getStatusColor(currentStatus)
      )}>
        {getStatusIcon(currentStatus)}
        <span>
          {currentStatus === 'submitted' && 'Week Submitted'}
          {currentStatus === 'in-progress' && 'In Progress'}
          {currentStatus === 'not-started' && 'Not Started'}
        </span>
      </div>

      {/* Enhanced quick week navigation for mobile */}
      {isMobile && (
        <div className="space-y-3">
          {/* Current week indicator and quick jump */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Quick Navigation
            </div>
            {selectedWeek !== format(currentWeekStart, 'yyyy-MM-dd') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onWeekChange(format(currentWeekStart, 'yyyy-MM-dd'))}
                className="text-xs h-7 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                ← Current Week
              </Button>
            )}
          </div>

          {/* Smart week navigation - shows weeks around selected week */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(() => {
              // Generate weeks around the selected week, ensuring we show a good range
              const selectedWeekStart = parseISO(selectedWeek);
              const weeks = [];

              // Show 3 weeks before and 3 weeks after selected week
              for (let offset = -3; offset <= 3; offset++) {
                const weekDate = addWeeks(selectedWeekStart, offset);
                const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const status = getWeekStatus(weekStart);
                const isSelected = weekStart === selectedWeek;
                const isCurrentWeek = weekStart === format(currentWeekStart, 'yyyy-MM-dd');

                weeks.push(
                  <Button
                    key={weekStart}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => onWeekChange(weekStart)}
                    className={cn(
                      "flex-shrink-0 min-w-[85px] h-12 flex flex-col gap-1",
                      isSelected && "ring-2 ring-blue-500 ring-offset-2",
                      isCurrentWeek && !isSelected && "border-blue-300 bg-blue-50"
                    )}
                  >
                    <div className="text-xs flex items-center gap-1">
                      Week {getWeek(weekDate)}
                      {isCurrentWeek && <span className="text-blue-600">•</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status)}
                      <span className="text-xs">
                        {format(weekDate, 'MMM d')}
                      </span>
                    </div>
                  </Button>
                );
              }

              return weeks;
            })()}
          </div>

          {/* Additional navigation hint */}
          <div className="text-xs text-gray-400 text-center">
            Use ← → arrows above or swipe to navigate further
          </div>
        </div>
      )}
    </div>
  );
}

// Validation types and interfaces
interface DailyValidation {
  isValid: boolean; // For data entry - always true for non-blocking UX
  totalHours: number;
  remainingHours: number;
  warningMessage?: string; // Non-blocking warning message
  severity: 'none' | 'moderate' | 'severe'; // Visual styling level
}

interface SubmissionValidation {
  canSubmit: boolean;
  violationCount: number;
  violatedDays: string[];
  errorMessage?: string;
}

interface ProjectAllocationStatus {
  weeklyHours: number;
  allocatedHours: number;
  percentage: number;
  status: 'within' | 'moderate' | 'exceeded';
  message: string;
}

// Mobile-optimized Hour Entry Cell
interface MobileHourCellProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  day: string;
  isSaving?: boolean;
  isSaved?: boolean;
  isCurrentDay?: boolean;
  disabled?: boolean;
  validation?: DailyValidation;
  allocationStatus?: ProjectAllocationStatus;
  isHighlighted?: boolean; // For submission error highlighting
  fieldRef?: React.RefObject<HTMLInputElement>; // For auto-focus
}

function MobileHourCell({
  value,
  onChange,
  onSave,
  day,
  isSaving,
  isSaved,
  isCurrentDay,
  disabled,
  validation,
  allocationStatus,
  isHighlighted,
  fieldRef
}: MobileHourCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showValidationTooltip, setShowValidationTooltip] = useState(false);
  const [showDisabledTooltip, setShowDisabledTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent changes if disabled (week submitted)
    if (disabled) return;

    const newValue = e.target.value;

    // Validate input format (numbers and decimal points only)
    const isValidFormat = /^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '';
    if (!isValidFormat) return;

    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShowValidationTooltip(false);

    // Prevent actions if disabled (week submitted)
    if (disabled) return;

    // Format the value on blur
    const numValue = parseFloat(localValue) || 0;
    const formattedValue = numValue.toFixed(2);
    setLocalValue(formattedValue);

    if (formattedValue !== value) {
      onChange(formattedValue);
      // Only save if validation passes
      if (!validation || validation.isValid) {
        onSave();
      }
    }
  };

  const handleFocus = () => {
    // Show disabled tooltip if week is submitted
    if (disabled) {
      setShowDisabledTooltip(true);
      setTimeout(() => setShowDisabledTooltip(false), 3000);
      return;
    }

    setIsFocused(true);
    if (validation && !validation.isValid) {
      setShowValidationTooltip(true);
    }
  };

  const handleClick = () => {
    // Show disabled tooltip if week is submitted
    if (disabled) {
      setShowDisabledTooltip(true);
      setTimeout(() => setShowDisabledTooltip(false), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent keyboard interactions if disabled (week submitted)
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Tab') {
      // Auto-save on tab
      if (localValue !== value) {
        onSave();
      }
    }

    // Keyboard shortcuts for hour adjustment
    if (e.ctrlKey || e.altKey) {
      const currentValue = parseFloat(localValue) || 0;
      let newValue = currentValue;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        newValue = Math.min(currentValue + 0.5, 24);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        newValue = Math.max(currentValue - 0.5, 0);
      }

      if (newValue !== currentValue) {
        const formattedValue = newValue.toFixed(2);
        setLocalValue(formattedValue);
        onChange(formattedValue);

        // Show helpful toast for first-time users
        if (currentValue === 0) {
          // Could add a toast here for keyboard shortcuts discovery
        }
      }
    }

    // Quick hour presets
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      let presetValue = '';

      switch (e.key) {
        case '8':
          presetValue = '8.00';
          break;
        case '4':
          presetValue = '4.00';
          break;
        case '0':
          presetValue = '0.00';
          break;
      }

      if (presetValue) {
        setLocalValue(presetValue);
        onChange(presetValue);
      }
    }
  };

  // Determine validation styling
  const getValidationStyling = () => {
    // Submission error highlighting takes priority
    if (isHighlighted) {
      return "border-red-500 bg-red-100 text-red-900 focus:ring-red-500 focus:border-red-500 ring-2 ring-red-200";
    }

    // Daily limit warnings (non-blocking)
    if (validation && validation.severity !== 'none') {
      if (validation.severity === 'severe') {
        return "border-red-400 bg-red-50 text-red-800 focus:ring-red-400 focus:border-red-400";
      } else if (validation.severity === 'moderate') {
        return "border-amber-400 bg-amber-50 text-amber-800 focus:ring-amber-400 focus:border-amber-400";
      }
    }

    // Project allocation status styling
    if (allocationStatus) {
      switch (allocationStatus.status) {
        case 'moderate':
          return "border-amber-300 bg-amber-25";
        case 'exceeded':
          return "border-red-300 bg-red-25";
        default:
          return "";
      }
    }
    return "";
  };

  return (
    <div className="space-y-1 relative">
      <div className={cn(
        "text-xs font-medium text-center",
        disabled ? "text-gray-400" : "text-gray-600"
      )}>
        {day}
      </div>
      <div className="relative">
        <input
          ref={fieldRef || inputRef}
          type="number"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          disabled={disabled}
          min="0"
          max="24"
          step="0.5"
          placeholder="0.00"
          className={cn(
            "w-full h-12 text-center text-lg font-medium rounded-lg border-2 transition-all duration-200",
            "focus:outline-none focus:ring-2",
            isCurrentDay && !isHighlighted && !validation?.warningMessage && !disabled && "bg-blue-50 border-blue-200",
            isFocused && !isHighlighted && !disabled && "scale-105 shadow-lg",
            isSaved && !isHighlighted && !disabled && "border-green-400 bg-green-50",
            disabled && "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed",
            !disabled && getValidationStyling(),
            !disabled && !getValidationStyling() && "focus:ring-blue-500 focus:border-blue-500",
            !disabled && !isFocused && "hover:border-gray-300 hover:shadow-sm"
          )}
        />

        {/* Save indicator */}
        <AnimatePresence>
          {isSaving && !disabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </motion.div>
          )}

          {isSaved && !isHighlighted && !disabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-3 h-3 text-white" />
            </motion.div>
          )}

          {/* Submission error indicator */}
          {isHighlighted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
            >
              <AlertTriangle className="w-3 h-3 text-white" />
            </motion.div>
          )}

          {/* Daily limit warning indicator */}
          {validation && validation.severity !== 'none' && !isHighlighted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                validation.severity === 'severe' ? "bg-red-500" : "bg-amber-500"
              )}
            >
              <AlertTriangle className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warning tooltip */}
      <AnimatePresence>
        {showValidationTooltip && validation && validation.warningMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute z-10 top-full mt-1 left-1/2 transform -translate-x-1/2 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap",
              validation.severity === 'severe' ? "bg-red-600" : "bg-amber-600"
            )}
          >
            <div className={cn(
              "absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45",
              validation.severity === 'severe' ? "bg-red-600" : "bg-amber-600"
            )}></div>
            {validation.warningMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disabled tooltip for submitted weeks */}
      <AnimatePresence>
        {showDisabledTooltip && disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 top-full mt-1 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
          >
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-700"></div>
            Week submitted - editing disabled
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily total indicator */}
      {validation && (
        <div className="text-xs text-center mt-1">
          <span className={cn(
            "font-medium",
            validation.severity === 'severe' && "text-red-600",
            validation.severity === 'moderate' && "text-amber-600",
            validation.severity === 'none' && "text-gray-600"
          )}>
            {validation.totalHours.toFixed(1)}h
          </span>
          {validation.remainingHours > 0 && (
            <span className="text-gray-500 ml-1">
              ({validation.remainingHours.toFixed(1)}h left)
            </span>
          )}
          {validation.warningMessage && (
            <div className={cn(
              "text-xs mt-1",
              validation.severity === 'severe' && "text-red-600",
              validation.severity === 'moderate' && "text-amber-600"
            )}>
              {validation.warningMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Project Hour Entry Grid Component
interface ProjectHourGridProps {
  selectedWeek: string;
  selectedResourceId: number | null;
  timeData: WeeklyTimeData;
  onTimeDataChange: (data: WeeklyTimeData) => void;
  savingStates: Record<string, boolean>;
  savedStates: Record<string, boolean>;
  onSavingStateChange: (states: Record<string, boolean>) => void;
  onSavedStateChange: (states: Record<string, boolean>) => void;
  showWeekends?: boolean;
  autoFillEnabled?: boolean;
  onWeekChange?: (week: string) => void;
  onValidationError?: () => boolean; // Returns true if validation passes
  weekStatuses?: WeekStatus[]; // For determining submission state
}

function ProjectHourGrid({
  selectedWeek,
  selectedResourceId,
  timeData,
  onTimeDataChange,
  savingStates,
  savedStates,
  onSavingStateChange,
  onSavedStateChange,
  showWeekends = false,
  autoFillEnabled = true,
  onWeekChange,
  onValidationError,
  weekStatuses = []
}: ProjectHourGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // State for submission validation and field highlighting
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const fieldRefs = useRef<{ [key: string]: React.RefObject<HTMLInputElement> }>({});

  // Check if current week is submitted
  const currentWeekStatus = weekStatuses.find(ws => ws.weekStartDate === selectedWeek);
  const isWeekSubmitted = currentWeekStatus?.status === 'submitted';

  // Expose validation error handler for SubmissionFlow
  const handleValidationError = () => {
    return handleSubmissionAttempt();
  };

  // Create refs for all input fields
  const getFieldRef = (allocationId: number, day: string) => {
    const key = `${allocationId}-${day}`;
    if (!fieldRefs.current[key]) {
      fieldRefs.current[key] = React.createRef<HTMLInputElement>();
    }
    return fieldRefs.current[key];
  };

  // Validation functions
  const calculateDailyValidation = (day: string, currentAllocationId: number, newValue: string): DailyValidation => {
    const dayKey = `${day.toLowerCase()}Hours` as keyof WeeklyTimeData[string];
    let totalHours = 0;

    // Calculate total hours for the day across all allocations
    Object.entries(timeData).forEach(([allocationId, projectData]) => {
      const allocId = parseInt(allocationId);
      const hours = allocId === currentAllocationId ?
        parseFloat(newValue) || 0 :
        parseFloat(projectData[dayKey] as string) || 0;
      totalHours += hours;
    });

    const DAILY_LIMIT = 8;
    const remainingHours = Math.max(DAILY_LIMIT - totalHours, 0);
    const overage = Math.max(totalHours - DAILY_LIMIT, 0);

    // Determine severity and warning message
    let severity: 'none' | 'moderate' | 'severe' = 'none';
    let warningMessage: string | undefined;

    if (totalHours > DAILY_LIMIT) {
      if (totalHours > 10) {
        severity = 'severe';
        warningMessage = `${totalHours.toFixed(1)}h significantly exceeds daily cap of ${DAILY_LIMIT}h (+${overage.toFixed(1)}h)`;
      } else {
        severity = 'moderate';
        warningMessage = `${totalHours.toFixed(1)}h exceeds daily cap of ${DAILY_LIMIT}h (+${overage.toFixed(1)}h)`;
      }
    }

    return {
      isValid: true, // Always true for non-blocking data entry
      totalHours,
      remainingHours,
      warningMessage,
      severity
    };
  };

  const calculateSubmissionValidation = (): SubmissionValidation => {
    const DAILY_LIMIT = 8;
    const violatedDays: string[] = [];

    allDays.forEach(day => {
      const dayKey = `${day.toLowerCase()}Hours` as keyof WeeklyTimeData[string];
      let dailyTotal = 0;

      Object.values(timeData).forEach(projectData => {
        dailyTotal += parseFloat(projectData[dayKey] as string) || 0;
      });

      if (dailyTotal > DAILY_LIMIT) {
        violatedDays.push(day);
      }
    });

    const violationCount = violatedDays.length;
    const canSubmit = violationCount === 0;

    let errorMessage: string | undefined;
    if (!canSubmit) {
      if (violationCount === 1) {
        errorMessage = `You have 1 day (${violatedDays[0]}) with >8h logged. Please correct before submitting.`;
      } else {
        errorMessage = `You have ${violationCount} days with >8h logged (${violatedDays.join(', ')}). Please correct before submitting.`;
      }
    }

    return {
      canSubmit,
      violationCount,
      violatedDays,
      errorMessage
    };
  };

  const calculateProjectAllocationStatus = (allocationId: number, allocatedHours: number): ProjectAllocationStatus => {
    const projectData = timeData[allocationId] || {};
    const weeklyHours = Object.values(projectData).reduce((total, hours) => {
      return total + (parseFloat(hours as string) || 0);
    }, 0);

    const percentage = allocatedHours > 0 ? (weeklyHours / allocatedHours) * 100 : 0;

    let status: 'within' | 'moderate' | 'exceeded' = 'within';
    let message = `${weeklyHours.toFixed(1)} / ${allocatedHours.toFixed(1)} hours (${percentage.toFixed(0)}%)`;

    if (percentage > 125) {
      status = 'exceeded';
      message = `Significantly over allocation: ${message}`;
    } else if (percentage > 100) {
      status = 'moderate';
      message = `Over allocation: ${message}`;
    } else {
      message = `Within allocation: ${message}`;
    }

    return {
      weeklyHours,
      allocatedHours,
      percentage,
      status,
      message
    };
  };

  // Fetch allocations for the selected resource (filter by week in component)
  const { data: allAllocations = [], isLoading: isLoadingAllocations, error: allocationsError } = useQuery<(ResourceAllocation & { project: Project })[]>({
    queryKey: ['/api/resources', selectedResourceId, 'allocations'],
    queryFn: async () => {
      console.log(`[ProjectHourGrid] Fetching allocations for resource ${selectedResourceId}`);
      try {
        const result = await apiRequest(`/api/resources/${selectedResourceId}/allocations`);
        console.log(`[ProjectHourGrid] Allocations API response:`, result);
        return result || [];
      } catch (error) {
        console.error(`[ProjectHourGrid] Failed to fetch allocations:`, error);
        throw error;
      }
    },
    enabled: !!selectedResourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`[ProjectHourGrid] Query retry attempt ${failureCount} for allocations:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Filter allocations for the selected week and analyze allocation patterns
  const { allocations, allocationAnalysis } = useMemo(() => {
    if (!selectedWeek || !allAllocations.length) {
      return {
        allocations: [],
        allocationAnalysis: {
          hasAnyAllocations: false,
          hasAllocationsForWeek: false,
          totalAllocations: 0,
          earliestStart: null,
          latestEnd: null,
          suggestedWeeks: []
        }
      };
    }

    const weekStart = new Date(selectedWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const filtered = allAllocations.filter(allocation => {
      const allocStart = new Date(allocation.startDate);
      const allocEnd = new Date(allocation.endDate);

      // Check if allocation overlaps with the selected week
      return allocStart <= weekEnd && allocEnd >= weekStart;
    });

    // Analyze all allocations to provide helpful information
    const analysis = {
      hasAnyAllocations: allAllocations.length > 0,
      hasAllocationsForWeek: filtered.length > 0,
      totalAllocations: allAllocations.length,
      earliestStart: allAllocations.length > 0 ?
        new Date(Math.min(...allAllocations.map(a => new Date(a.startDate).getTime()))) : null,
      latestEnd: allAllocations.length > 0 ?
        new Date(Math.max(...allAllocations.map(a => new Date(a.endDate).getTime()))) : null,
      suggestedWeeks: [] as string[]
    };

    // Find weeks with allocations to suggest
    if (analysis.hasAnyAllocations && !analysis.hasAllocationsForWeek) {
      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Monday

      // Suggest current week if it has allocations
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

      const hasCurrentWeek = allAllocations.some(allocation => {
        const allocStart = new Date(allocation.startDate);
        const allocEnd = new Date(allocation.endDate);
        return allocStart <= currentWeekEnd && allocEnd >= currentWeekStart;
      });

      if (hasCurrentWeek) {
        analysis.suggestedWeeks.push(format(currentWeekStart, 'yyyy-MM-dd'));
      }

      // Also suggest the first week with allocations
      if (analysis.earliestStart) {
        const firstWeekStart = startOfWeek(analysis.earliestStart, { weekStartsOn: 1 });
        const firstWeekKey = format(firstWeekStart, 'yyyy-MM-dd');
        if (!analysis.suggestedWeeks.includes(firstWeekKey)) {
          analysis.suggestedWeeks.push(firstWeekKey);
        }
      }
    }

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProjectHourGrid] Allocation filtering and analysis:', {
        selectedResourceId,
        selectedWeek,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        analysis,
        allocationsError: allocationsError?.message,
        isLoadingAllocations,
        allAllocationsCount: allAllocations.length,
        allAllocations: allAllocations.map(a => ({
          id: a.id,
          projectName: a.project?.name,
          startDate: a.startDate,
          endDate: a.endDate,
          status: a.status
        })),
        filteredAllocations: filtered.map(a => ({
          id: a.id,
          projectName: a.project?.name,
          startDate: a.startDate,
          endDate: a.endDate
        }))
      });
    }

    return { allocations: filtered, allocationAnalysis: analysis };
  }, [allAllocations, selectedWeek, selectedResourceId]);

  // Fetch existing time entries for the selected week
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useQuery<TimeEntryWithAllocation[]>({
    queryKey: ['/api/resources', selectedResourceId, 'time-entries', 'week', selectedWeek],
    queryFn: () => apiRequest(`/api/resources/${selectedResourceId}/time-entries/week/${selectedWeek}`),
    enabled: !!selectedResourceId && !!selectedWeek,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Initialize time data from existing entries
  useEffect(() => {
    if (timeEntries.length > 0) {
      const newTimeData: WeeklyTimeData = {};
      timeEntries.forEach(entry => {
        newTimeData[entry.allocationId] = {
          mondayHours: entry.mondayHours || '0.00',
          tuesdayHours: entry.tuesdayHours || '0.00',
          wednesdayHours: entry.wednesdayHours || '0.00',
          thursdayHours: entry.thursdayHours || '0.00',
          fridayHours: entry.fridayHours || '0.00',
          saturdayHours: entry.saturdayHours || '0.00',
          sundayHours: entry.sundayHours || '0.00',
          notes: entry.notes || '',
        };
      });
      onTimeDataChange(newTimeData);
    }
  }, [timeEntries, onTimeDataChange]);

  // Save time entry mutation
  const saveTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const existingEntry = timeEntries.find(entry => entry.allocationId === data.allocationId);
      if (existingEntry) {
        return apiRequest(`/api/time-entries/${existingEntry.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest('/api/time-entries', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'time-entries'] });

      // Update saved state
      onSavedStateChange(prev => ({ ...prev, [variables.allocationId]: true }));
      onSavingStateChange(prev => ({ ...prev, [variables.allocationId]: false }));

      // Clear saved state after 3 seconds
      setTimeout(() => {
        onSavedStateChange(prev => ({ ...prev, [variables.allocationId]: false }));
      }, 3000);
    },
    onError: (error: any, variables) => {
      onSavingStateChange(prev => ({ ...prev, [variables.allocationId]: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to save time entry",
        variant: "destructive",
      });
    },
  });

  const handleHourChange = (allocationId: number, day: string, value: string) => {
    // Prevent changes if week is submitted
    if (isWeekSubmitted) return;

    const dayKey = `${day.toLowerCase()}Hours` as keyof WeeklyTimeData[string];

    // Always update the state (non-blocking validation)
    onTimeDataChange(prev => ({
      ...prev,
      [allocationId]: {
        ...prev[allocationId],
        [dayKey]: value,
      }
    }));
  };

  const handleSave = async (allocationId: number) => {
    if (!selectedResourceId) return;
    // Prevent saving if week is submitted
    if (isWeekSubmitted) return;

    onSavingStateChange(prev => ({ ...prev, [allocationId]: true }));

    const entryData = timeData[allocationId] || {};
    const timeEntryData = {
      resourceId: selectedResourceId,
      allocationId,
      weekStartDate: selectedWeek,
      ...entryData,
    };

    await saveTimeEntryMutation.mutateAsync(timeEntryData);
  };

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = showWeekends ? allDays : allDays.slice(0, 5); // Only weekdays if weekends are hidden
  const weekDates = allDays.map((_, index) => addDays(parseISO(selectedWeek), index));

  // Calculate submission validation status
  const submissionValidation = useMemo(() => {
    return calculateSubmissionValidation();
  }, [timeData, allDays]);

  // Calculate project allocation warnings
  const allocationWarnings = useMemo(() => {
    const warnings: string[] = [];
    allocations.forEach(allocation => {
      const status = calculateProjectAllocationStatus(allocation.id, allocation.allocatedHours);
      if (status.status === 'exceeded') {
        warnings.push(`${allocation.project.name}: ${status.weeklyHours.toFixed(1)}h logged (${status.allocatedHours.toFixed(1)}h allocated)`);
      }
    });
    return warnings;
  }, [timeData, allocations]);

  // Handle submission attempt with validation
  const handleSubmissionAttempt = () => {
    const validation = calculateSubmissionValidation();

    if (!validation.canSubmit) {
      // Highlight violated fields
      const violatedFieldKeys = new Set<string>();

      validation.violatedDays.forEach(day => {
        allocations.forEach(allocation => {
          const key = `${allocation.id}-${day}`;
          violatedFieldKeys.add(key);
        });
      });

      setHighlightedFields(violatedFieldKeys);

      // Auto-focus on first violated field
      if (validation.violatedDays.length > 0) {
        const firstViolatedDay = validation.violatedDays[0];
        const firstAllocation = allocations[0];
        if (firstAllocation) {
          const firstFieldRef = getFieldRef(firstAllocation.id, firstViolatedDay);
          if (firstFieldRef.current) {
            firstFieldRef.current.focus();
            firstFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      // Show error toast
      toast({
        title: "Cannot Submit Week",
        description: validation.errorMessage,
        variant: "destructive",
      });

      return false;
    }

    // Clear any existing highlights
    setHighlightedFields(new Set());
    return true;
  };

  if (isLoadingAllocations || isLoadingEntries) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (allocationsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Projects</h3>
            <p className="text-gray-500 mb-4">
              {allocationsError.message || 'Failed to load project allocations'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-sm"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />

            {allocationAnalysis.hasAnyAllocations ? (
              // Resource has allocations, but not for this week
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects This Week</h3>
                  <p className="text-gray-500">
                    This resource has {allocationAnalysis.totalAllocations} project allocation{allocationAnalysis.totalAllocations !== 1 ? 's' : ''},
                    but none for the selected week.
                  </p>
                </div>

                {allocationAnalysis.earliestStart && allocationAnalysis.latestEnd && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <p className="font-medium mb-1">Project allocation period:</p>
                    <p>
                      {format(allocationAnalysis.earliestStart, 'MMM d, yyyy')} - {format(allocationAnalysis.latestEnd, 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                {allocationAnalysis.suggestedWeeks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Try these weeks with allocations:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {allocationAnalysis.suggestedWeeks.slice(0, 2).map(weekKey => {
                        const weekStart = new Date(weekKey);
                        const isCurrentWeek = weekKey === allocationAnalysis.suggestedWeeks[0];

                        return (
                          <Button
                            key={weekKey}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (onWeekChange) {
                                onWeekChange(weekKey);
                              }
                            }}
                            className="text-xs"
                          >
                            {isCurrentWeek ? 'Current Week' : format(weekStart, 'MMM d')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Resource has no allocations at all
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Allocated</h3>
                <p className="text-gray-500">This resource doesn't have any project allocations.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Submission Validation Summary */}
      {(!submissionValidation.canSubmit || allocationWarnings.length > 0) && (
        <Card className={cn(
          "border-2",
          !submissionValidation.canSubmit ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "w-5 h-5 mt-0.5 flex-shrink-0",
                !submissionValidation.canSubmit ? "text-red-600" : "text-amber-600"
              )} />
              <div className="flex-1">
                <h3 className={cn(
                  "font-medium mb-2",
                  !submissionValidation.canSubmit ? "text-red-800" : "text-amber-800"
                )}>
                  {!submissionValidation.canSubmit ? "Submission Blocked" : "Allocation Warnings"}
                </h3>

                {!submissionValidation.canSubmit && (
                  <div className="mb-3">
                    <div className="text-sm text-red-700 mb-2">
                      {submissionValidation.errorMessage}
                    </div>
                    <div className="text-xs text-red-600">
                      Click on highlighted fields to make corrections. You can redistribute hours to other days or projects.
                    </div>
                  </div>
                )}

                {allocationWarnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-700 mb-1">Project Allocation Warnings:</h4>
                    <ul className="text-sm text-amber-600 space-y-1">
                      {allocationWarnings.map((warning, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                          {warning}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-amber-600 mt-2">
                      These are warnings only - you can still submit if needed for legitimate overtime.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {allocations.map(allocation => {
        const projectData = timeData[allocation.id] || {};
        const allocationStatus = calculateProjectAllocationStatus(allocation.id, allocation.allocatedHours);

        return (
          <Card key={allocation.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{allocation.project.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {allocation.role || 'Team Member'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {allocation.allocatedHours}h allocated
                    </span>
                  </div>

                  {/* Project allocation status */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Weekly Progress</span>
                      <span className={cn(
                        "font-medium",
                        allocationStatus.status === 'within' && "text-green-600",
                        allocationStatus.status === 'moderate' && "text-amber-600",
                        allocationStatus.status === 'exceeded' && "text-red-600"
                      )}>
                        {allocationStatus.weeklyHours.toFixed(1)} / {allocationStatus.allocatedHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          allocationStatus.status === 'within' && "bg-green-500",
                          allocationStatus.status === 'moderate' && "bg-amber-500",
                          allocationStatus.status === 'exceeded' && "bg-red-500"
                        )}
                        style={{ width: `${Math.min(allocationStatus.percentage, 100)}%` }}
                      />
                    </div>
                    {allocationStatus.status !== 'within' && (
                      <div className={cn(
                        "text-xs mt-1",
                        allocationStatus.status === 'moderate' && "text-amber-600",
                        allocationStatus.status === 'exceeded' && "text-red-600"
                      )}>
                        {allocationStatus.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Mobile-optimized hour entry grid */}
              {isMobile ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    {days.slice(0, 4).map((day, index) => {
                      const dayIndex = allDays.indexOf(day);
                      const currentValue = projectData[`${day.toLowerCase()}Hours` as keyof typeof projectData] || '0.00';
                      const validation = calculateDailyValidation(day, allocation.id, currentValue);
                      const allocationStatus = calculateProjectAllocationStatus(allocation.id, allocation.allocatedHours);
                      const fieldKey = `${allocation.id}-${day}`;
                      const isHighlighted = highlightedFields.has(fieldKey);
                      const fieldRef = getFieldRef(allocation.id, day);

                      return (
                        <MobileHourCell
                          key={day}
                          value={currentValue}
                          onChange={(value) => handleHourChange(allocation.id, day, value)}
                          onSave={() => handleSave(allocation.id)}
                          day={day.slice(0, 3)}
                          isSaving={savingStates[allocation.id]}
                          isSaved={savedStates[allocation.id]}
                          isCurrentDay={isToday(weekDates[dayIndex])}
                          disabled={isWeekSubmitted}
                          validation={validation}
                          allocationStatus={allocationStatus}
                          isHighlighted={isHighlighted}
                          fieldRef={fieldRef}
                        />
                      );
                    })}
                  </div>

                  {/* Second row for remaining days */}
                  {days.length > 4 && (
                    <div className={cn(
                      "grid gap-3",
                      days.length === 5 ? "grid-cols-1 max-w-[80px]" :
                      days.length === 6 ? "grid-cols-2" : "grid-cols-3"
                    )}>
                      {days.slice(4).map((day, index) => {
                        const dayIndex = allDays.indexOf(day);
                        const currentValue = projectData[`${day.toLowerCase()}Hours` as keyof typeof projectData] || '0.00';
                        const validation = calculateDailyValidation(day, allocation.id, currentValue);
                        const allocationStatus = calculateProjectAllocationStatus(allocation.id, allocation.allocatedHours);
                        const fieldKey = `${allocation.id}-${day}`;
                        const isHighlighted = highlightedFields.has(fieldKey);
                        const fieldRef = getFieldRef(allocation.id, day);

                        return (
                          <MobileHourCell
                            key={day}
                            value={currentValue}
                            onChange={(value) => handleHourChange(allocation.id, day, value)}
                            onSave={() => handleSave(allocation.id)}
                            day={day.slice(0, 3)}
                            isSaving={savingStates[allocation.id]}
                            isSaved={savedStates[allocation.id]}
                            isCurrentDay={isToday(weekDates[dayIndex])}
                            disabled={isWeekSubmitted}
                            validation={validation}
                            allocationStatus={allocationStatus}
                            isHighlighted={isHighlighted}
                            fieldRef={fieldRef}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn(
                  "grid gap-3",
                  showWeekends ? "grid-cols-7" : "grid-cols-5"
                )}>
                  {days.map((day, index) => {
                    const dayIndex = allDays.indexOf(day);
                    const currentValue = projectData[`${day.toLowerCase()}Hours` as keyof typeof projectData] || '0.00';
                    const validation = calculateDailyValidation(day, allocation.id, currentValue);
                    const allocationStatus = calculateProjectAllocationStatus(allocation.id, allocation.allocatedHours);
                    const fieldKey = `${allocation.id}-${day}`;
                    const isHighlighted = highlightedFields.has(fieldKey);
                    const fieldRef = getFieldRef(allocation.id, day);

                    return (
                      <MobileHourCell
                        key={day}
                        value={currentValue}
                        onChange={(value) => handleHourChange(allocation.id, day, value)}
                        onSave={() => handleSave(allocation.id)}
                        day={day.slice(0, 3)}
                        isSaving={savingStates[allocation.id]}
                        isSaved={savedStates[allocation.id]}
                        isCurrentDay={isToday(weekDates[dayIndex])}
                        disabled={isWeekSubmitted}
                        validation={validation}
                        allocationStatus={allocationStatus}
                        isHighlighted={isHighlighted}
                        fieldRef={fieldRef}
                      />
                    );
                  })}
                </div>
              )}

              {/* Weekly total */}
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Weekly Total:</span>
                  <span className="font-semibold">
                    {Object.values(projectData).reduce((sum, hours) => {
                      const numHours = parseFloat(hours as string) || 0;
                      return sum + numHours;
                    }, 0).toFixed(2)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Daily Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Summary
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                Daily limit: 8 hours • Green: within allocation • Yellow: moderate over • Red: significantly over
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
            {allDays.slice(0, showWeekends ? 7 : 5).map((day, index) => {
              // Calculate total hours for this day across all allocations
              let dailyTotal = 0;
              Object.values(timeData).forEach(projectData => {
                const dayKey = `${day.toLowerCase()}Hours` as keyof WeeklyTimeData[string];
                dailyTotal += parseFloat(projectData[dayKey] as string) || 0;
              });

              const validation = calculateDailyValidation(day, -1, '0'); // Use -1 as dummy allocation ID
              const isOverLimit = dailyTotal > 8;
              const isCurrentDay = isToday(weekDates[index]);

              return (
                <div key={day} className="text-center">
                  <div className={cn(
                    "text-xs font-medium mb-2",
                    isCurrentDay && "text-blue-600"
                  )}>
                    {day.slice(0, 3)}
                  </div>
                  <div className={cn(
                    "text-lg font-bold p-2 rounded-lg border-2",
                    isOverLimit && "bg-red-50 border-red-300 text-red-700",
                    !isOverLimit && dailyTotal > 0 && "bg-green-50 border-green-300 text-green-700",
                    dailyTotal === 0 && "bg-gray-50 border-gray-200 text-gray-500",
                    isCurrentDay && !isOverLimit && "bg-blue-50 border-blue-300"
                  )}>
                    {dailyTotal.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isOverLimit ? `${(dailyTotal - 8).toFixed(1)}h over` : `${(8 - dailyTotal).toFixed(1)}h left`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly total and validation summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Weekly Total:</span>
              <span className="text-lg font-bold">
                {Object.values(timeData).reduce((total, projectData) => {
                  return total + Object.values(projectData).reduce((projectTotal, hours) => {
                    return projectTotal + (parseFloat(hours as string) || 0);
                  }, 0);
                }, 0).toFixed(1)}h
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Smart UX Settings Panel
interface SmartSettingsProps {
  showWeekends: boolean;
  onShowWeekendsChange: (show: boolean) => void;
  autoFillEnabled: boolean;
  onAutoFillEnabledChange: (enabled: boolean) => void;
  onAutoFillWeek: () => void;
  onCopyPreviousWeek: () => void;
  className?: string;
}

function SmartSettingsPanel({
  showWeekends,
  onShowWeekendsChange,
  autoFillEnabled,
  onAutoFillEnabledChange,
  onAutoFillWeek,
  onCopyPreviousWeek,
  className
}: SmartSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn("border-dashed border-gray-300", className)}>
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Smart Features
          </CardTitle>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </motion.div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-4">
              {/* Weekend Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Show Weekends</span>
                </div>
                <Switch
                  checked={showWeekends}
                  onCheckedChange={onShowWeekendsChange}
                />
              </div>

              {/* Auto-fill Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Auto-fill Suggestions</span>
                </div>
                <Switch
                  checked={autoFillEnabled}
                  onCheckedChange={onAutoFillEnabledChange}
                />
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAutoFillWeek}
                    className="text-xs h-8"
                    disabled={!autoFillEnabled}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Auto-fill Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCopyPreviousWeek}
                    className="text-xs h-8"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Copy Previous
                  </Button>
                </div>
              </div>

              {/* Keyboard Shortcuts Info */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <div className="font-medium mb-1">Keyboard Shortcuts:</div>
                <div>• Tab: Next field • Enter: Save • Ctrl+↑/↓: Adjust hours</div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Submission Flow Component
interface SubmissionFlowProps {
  selectedWeek: string;
  selectedResourceId: number | null;
  timeData: WeeklyTimeData;
  weekStatuses: WeekStatus[];
  isAdmin?: boolean;
  isLoggingForSelf?: boolean;
  selectedResourceName?: string;
  onValidationError?: () => void; // Callback for validation errors
}

function SubmissionFlow({
  selectedWeek,
  selectedResourceId,
  timeData,
  weekStatuses,
  isAdmin = false,
  isLoggingForSelf = true,
  selectedResourceName = '',
  onValidationError
}: SubmissionFlowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useSupabaseAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const adminConfirmation = useAdminConfirmation();

  // Submission validation logic
  const calculateSubmissionValidation = (): SubmissionValidation => {
    const DAILY_LIMIT = 8;
    const violatedDays: string[] = [];
    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    allDays.forEach(day => {
      const dayKey = `${day.toLowerCase()}Hours` as keyof WeeklyTimeData[string];
      let dailyTotal = 0;

      Object.values(timeData).forEach(projectData => {
        dailyTotal += parseFloat(projectData[dayKey] as string) || 0;
      });

      if (dailyTotal > DAILY_LIMIT) {
        violatedDays.push(day);
      }
    });

    const violationCount = violatedDays.length;
    const canSubmit = violationCount === 0;

    let errorMessage: string | undefined;
    if (!canSubmit) {
      if (violationCount === 1) {
        errorMessage = `You have 1 day (${violatedDays[0]}) with >8h logged. Please correct before submitting.`;
      } else {
        errorMessage = `You have ${violationCount} days with >8h logged (${violatedDays.join(', ')}). Please correct before submitting.`;
      }
    }

    return {
      canSubmit,
      violationCount,
      violatedDays,
      errorMessage
    };
  };

  const submissionValidation = useMemo(() => {
    return calculateSubmissionValidation();
  }, [timeData]);

  // Get current week status
  const currentWeekStatus = weekStatuses.find(ws => ws.weekStartDate === selectedWeek);
  const isSubmitted = currentWeekStatus?.status === 'submitted';

  // Calculate total hours for the week
  const totalHours = Object.values(timeData).reduce((total, projectData) => {
    return total + Object.values(projectData).reduce((projectTotal, hours) => {
      return projectTotal + (parseFloat(hours as string) || 0);
    }, 0);
  }, 0);

  // Submit week mutation
  const submitWeekMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/time-logging/submit/${selectedResourceId}/${selectedWeek}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'week-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions'] });
      setShowCelebration(true);

      const successMessage = isLoggingForSelf
        ? `Successfully submitted ${totalHours.toFixed(2)} hours for the week.`
        : `Successfully submitted ${totalHours.toFixed(2)} hours for ${selectedResourceName}.`;

      toast({
        title: "Week Submitted!",
        description: successMessage,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit week",
        variant: "destructive",
      });
    },
  });

  // Unsubmit week mutation (admin only)
  const unsubmitWeekMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/time-logging/unsubmit/${selectedResourceId}/${selectedWeek}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'week-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions'] });

      const successMessage = isLoggingForSelf
        ? "Week has been reopened for editing."
        : `Week has been reopened for ${selectedResourceName}.`;

      toast({
        title: "Week Unsubmitted",
        description: successMessage,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unsubmit Failed",
        description: error.message || "Failed to unsubmit week",
        variant: "destructive",
      });
    },
  });

  const hasTimeEntries = totalHours > 0;
  const canSubmit = hasTimeEntries && !isSubmitted && submissionValidation.canSubmit;

  // Handle submit with validation and admin confirmation if needed
  const handleSubmit = () => {
    // Check validation first
    if (!submissionValidation.canSubmit) {
      toast({
        title: "Cannot Submit Week",
        description: submissionValidation.errorMessage,
        variant: "destructive",
      });

      // Trigger validation error callback to highlight fields
      onValidationError?.();
      return;
    }

    if (isAdmin && !isLoggingForSelf) {
      adminConfirmation.showConfirmation({
        action: 'submit',
        resourceName: selectedResourceName,
        totalHours,
        weekDisplay: `Week ${format(parseISO(selectedWeek), 'MMM d, yyyy')}`,
        onConfirm: () => submitWeekMutation.mutate(),
      });
    } else {
      submitWeekMutation.mutate();
    }
  };

  // Handle unsubmit with admin confirmation if needed
  const handleUnsubmit = () => {
    if (isAdmin && !isLoggingForSelf) {
      adminConfirmation.showConfirmation({
        action: 'unsubmit',
        resourceName: selectedResourceName,
        totalHours,
        weekDisplay: `Week ${format(parseISO(selectedWeek), 'MMM d, yyyy')}`,
        onConfirm: () => unsubmitWeekMutation.mutate(),
      });
    } else {
      unsubmitWeekMutation.mutate();
    }
  };

  return (
    <>
      {/* Submission Card */}
      <Card className={cn(
        "border-2 transition-all duration-300",
        isSubmitted ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubmitted ? (
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg">
                  {isSubmitted ? 'Week Submitted' : 'Ready to Submit?'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isSubmitted
                    ? `Submitted ${currentWeekStatus?.submittedAt ? new Date(currentWeekStatus.submittedAt).toLocaleDateString() : ''}`
                    : `${totalHours.toFixed(2)} hours logged`
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isSubmitted && isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubmit}
                  disabled={unsubmitWeekMutation.isPending}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  {unsubmitWeekMutation.isPending ? 'Reopening...' : 'Reopen'}
                </Button>
              )}

              {hasTimeEntries && !isSubmitted && (
                <Button
                  data-submit-week
                  onClick={handleSubmit}
                  disabled={submitWeekMutation.isPending || !submissionValidation.canSubmit}
                  className={cn(
                    "transition-all duration-200",
                    submissionValidation.canSubmit
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-red-500 hover:bg-red-600 cursor-not-allowed"
                  )}
                >
                  {submitWeekMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : !submissionValidation.canSubmit ? (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Validation Required
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {isAdmin && !isLoggingForSelf ? 'Submit for User' : 'Submit Week'}
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {!isSubmitted && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Weekly Progress</span>
                <span>{totalHours.toFixed(1)}h logged</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4"
            >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Week Submitted!</h2>
              <p className="text-gray-600 mb-4">
                {isLoggingForSelf
                  ? `Great job! You've successfully submitted ${totalHours.toFixed(2)} hours for this week.`
                  : `Successfully submitted ${totalHours.toFixed(2)} hours for ${selectedResourceName}.`
                }
              </p>
              <Button onClick={() => setShowCelebration(false)} className="w-full">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Confirmation Dialog */}
      <AdminConfirmationDialog
        open={adminConfirmation.isOpen}
        onOpenChange={adminConfirmation.handleCancel}
        onConfirm={adminConfirmation.handleConfirm}
        action={adminConfirmation.pendingAction?.action || 'submit'}
        resourceName={adminConfirmation.pendingAction?.resourceName || ''}
        totalHours={adminConfirmation.pendingAction?.totalHours || 0}
        weekDisplay={adminConfirmation.pendingAction?.weekDisplay || ''}
        isLoading={submitWeekMutation.isPending || unsubmitWeekMutation.isPending}
      />
    </>
  );
}

// Main Mobile Time Logging Component
export default function MobileTimeLogging() {
  const { user, hasPermission } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // Admin resource selection (desktop only)
  const adminResourceSelection = useAdminResourceSelection(user?.resourceId);

  // State management
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  });

  // Track if user has manually navigated to a different week
  const [hasUserNavigated, setHasUserNavigated] = useState(false);

  // Wrapper function to track user navigation
  const handleWeekChange = (newWeek: string) => {
    console.log(`[MobileTimeLogging] User navigated to week: ${newWeek}`);
    setHasUserNavigated(true);
    setSelectedWeek(newWeek);
  };

  const [timeData, setTimeData] = useState<WeeklyTimeData>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
  const [showWeekends, setShowWeekends] = useState(false);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);

  // Use admin selected resource ID or fallback to user's own resource
  const selectedResourceId = adminResourceSelection.selectedResourceId || user?.resourceId || null;

  // Reset to current week when admin changes resources
  useEffect(() => {
    if (adminResourceSelection.isAdmin && selectedResourceId) {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (selectedWeek !== currentWeekStart) {
        console.log(`[MobileTimeLogging] Admin changed resource to ${selectedResourceId}, resetting to current week: ${currentWeekStart}`);
        setSelectedWeek(currentWeekStart);
        setHasUserNavigated(false); // Reset navigation tracking
      }
    }
  }, [selectedResourceId, adminResourceSelection.isAdmin]);

  // Fetch all resources for admin functionality
  const { data: allResources = [], isLoading: resourcesLoading, error: resourcesError } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    queryFn: () => apiRequest('/api/resources'),
    enabled: adminResourceSelection.isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch week statuses for the calendar
  const { data: weekStatuses = [] } = useQuery<WeekStatus[]>({
    queryKey: ['/api/resources', selectedResourceId, 'week-statuses'],
    enabled: !!selectedResourceId,
    queryFn: async () => {
      // Generate week statuses for the past 12 weeks and next 8 weeks (matching navigation bounds)
      const statuses: WeekStatus[] = [];
      const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

      for (let i = -12; i <= 8; i++) {
        const weekStart = addWeeks(currentWeek, i);
        const weekStartDate = format(weekStart, 'yyyy-MM-dd');

        // Fetch submission status for this week
        try {
          const submission = await apiRequest(`/api/resources/${selectedResourceId}/weekly-submissions/week/${weekStartDate}`);
          statuses.push({
            weekStartDate,
            status: submission?.isSubmitted ? 'submitted' : 'in-progress',
            totalHours: parseFloat(submission?.totalHours || '0'),
            submittedAt: submission?.submittedAt,
          });
        } catch {
          statuses.push({
            weekStartDate,
            status: 'not-started',
            totalHours: 0,
          });
        }
      }

      return statuses;
    },
  });

  // Only auto-select incomplete weeks if user hasn't manually navigated and current week is submitted
  useEffect(() => {
    if (weekStatuses.length > 0 && !hasUserNavigated) {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const currentWeekStatus = weekStatuses.find(ws => ws.weekStartDate === currentWeekStart);

      // Only look for incomplete weeks if current week is already submitted
      if (currentWeekStatus?.status === 'submitted') {
        const incompleteWeek = weekStatuses.find(ws => ws.status !== 'submitted');
        if (incompleteWeek && selectedWeek !== incompleteWeek.weekStartDate) {
          console.log(`[MobileTimeLogging] Auto-selecting incomplete week: ${incompleteWeek.weekStartDate} (current week ${currentWeekStart} is submitted)`);
          setSelectedWeek(incompleteWeek.weekStartDate);
        }
      }
    }
  }, [weekStatuses, selectedWeek, hasUserNavigated]);

  // Auto-fill functionality
  const handleAutoFillWeek = async () => {
    if (!selectedResourceId || !autoFillEnabled) return;

    try {
      // Get previous week's data for auto-fill suggestions
      const previousWeek = format(subWeeks(parseISO(selectedWeek), 1), 'yyyy-MM-dd');
      const previousTimeEntries = await apiRequest(`/api/resources/${selectedResourceId}/time-entries/week/${previousWeek}`);

      if (previousTimeEntries && previousTimeEntries.length > 0) {
        const autoFillData: WeeklyTimeData = {};

        previousTimeEntries.forEach((entry: TimeEntryWithAllocation) => {
          // Only auto-fill if there's an active allocation for this week
          const hasCurrentAllocation = allocations.some(alloc => alloc.id === entry.allocationId);
          if (hasCurrentAllocation) {
            autoFillData[entry.allocationId] = {
              mondayHours: entry.mondayHours || '0.00',
              tuesdayHours: entry.tuesdayHours || '0.00',
              wednesdayHours: entry.wednesdayHours || '0.00',
              thursdayHours: entry.thursdayHours || '0.00',
              fridayHours: entry.fridayHours || '0.00',
              saturdayHours: showWeekends ? (entry.saturdayHours || '0.00') : '0.00',
              sundayHours: showWeekends ? (entry.sundayHours || '0.00') : '0.00',
              notes: entry.notes || '',
            };
          }
        });

        setTimeData(prev => ({ ...prev, ...autoFillData }));
        toast({
          title: "Auto-filled from previous week",
          description: `Applied hours from ${format(parseISO(previousWeek), 'MMM d')} week.`,
        });
      } else {
        toast({
          title: "No previous data found",
          description: "No time entries found for the previous week to auto-fill.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Auto-fill failed",
        description: "Could not load previous week's data.",
        variant: "destructive",
      });
    }
  };

  const handleCopyPreviousWeek = () => {
    handleAutoFillWeek(); // Same functionality for now
  };

  // Get allocations for current week (needed for auto-fill)
  const { data: allocations = [], isLoading: allocationsLoading, error: allocationsError } = useQuery<(ResourceAllocation & { project: Project })[]>({
    queryKey: ['/api/resources', selectedResourceId, 'allocations'],
    queryFn: () => apiRequest(`/api/resources/${selectedResourceId}/allocations`),
    enabled: !!selectedResourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug logging for resource selection and allocations
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      console.log('[MobileTimeLogging] Resource and allocation debug:', {
        selectedResourceId,
        selectedWeek,
        currentWeekStart,
        hasUserNavigated,
        weekStatusesCount: weekStatuses.length,
        allocationsLoading,
        allocationsError: allocationsError?.message,
        allocationsCount: allocations.length,
        adminResourceSelection,
        user: user ? { id: user.id, resourceId: user.resourceId, permissions: user.permissions } : null,
        allocations: allocations.map(a => ({
          id: a.id,
          projectName: a.project?.name,
          resourceId: a.resourceId,
          startDate: a.startDate,
          endDate: a.endDate
        }))
      });
    }
  }, [selectedResourceId, selectedWeek, hasUserNavigated, weekStatuses.length, allocationsLoading, allocationsError, allocations.length, adminResourceSelection, user]);

  return (
    <TimeLoggingGuard>
      <div className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 sm:gap-4 mb-2">
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    Time Logging
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                    {adminResourceSelection.isAdmin && !adminResourceSelection.isLoggingForSelf
                      ? `Managing time for selected resource`
                      : 'Log your project hours for the week'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">

        {/* Admin Resource Selector (Desktop Only) */}
        {isDesktop && adminResourceSelection.isAdmin && (
          <AdminResourceSelector
            selectedResourceId={selectedResourceId}
            onResourceChange={adminResourceSelection.handleResourceChange}
          />
        )}

        {/* Current Week Quick Access */}
        {(() => {
          const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          return selectedWeek !== currentWeekStart && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">
                        You're viewing Week {getWeek(parseISO(selectedWeek))} • {getYear(parseISO(selectedWeek))}
                      </div>
                      <div className="text-xs text-blue-700">
                        Current week is Week {getWeek(new Date())} • {getYear(new Date())}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleWeekChange(currentWeekStart)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Current Week
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Week Selection */}
        <WeekSelector
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          weekStatuses={weekStatuses}
          isLoading={false}
        />

        {/* Smart Settings Panel */}
        <SmartSettingsPanel
          showWeekends={showWeekends}
          onShowWeekendsChange={setShowWeekends}
          autoFillEnabled={autoFillEnabled}
          onAutoFillEnabledChange={setAutoFillEnabled}
          onAutoFillWeek={handleAutoFillWeek}
          onCopyPreviousWeek={handleCopyPreviousWeek}
        />

        {/* Project Hour Entry Grid */}
        <ProjectHourGrid
          selectedWeek={selectedWeek}
          selectedResourceId={selectedResourceId}
          timeData={timeData}
          onTimeDataChange={setTimeData}
          savingStates={savingStates}
          savedStates={savedStates}
          onSavingStateChange={setSavingStates}
          onSavedStateChange={setSavedStates}
          showWeekends={showWeekends}
          autoFillEnabled={autoFillEnabled}
          onWeekChange={handleWeekChange}
          weekStatuses={weekStatuses}
        />

        {/* Submission Flow */}
        <SubmissionFlow
          selectedWeek={selectedWeek}
          selectedResourceId={selectedResourceId}
          timeData={timeData}
          weekStatuses={weekStatuses}
          isAdmin={adminResourceSelection.isAdmin}
          isLoggingForSelf={adminResourceSelection.isLoggingForSelf}
          selectedResourceName={allResources.find(r => r.id === selectedResourceId)?.name || ''}
          onValidationError={() => {
            // Find the ProjectHourGrid component and trigger its validation
            const projectGrid = document.querySelector('[data-project-grid]');
            if (projectGrid) {
              // Scroll to the grid and trigger validation highlighting
              projectGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        />

        {/* Smart Reminders */}
        <MobileSmartReminders
          selectedWeek={selectedWeek}
          totalHours={Object.values(timeData).reduce((total, projectData) => {
            return total + Object.values(projectData).reduce((projectTotal, hours) => {
              return projectTotal + (parseFloat(hours as string) || 0);
            }, 0);
          }, 0)}
          isSubmitted={weekStatuses.find(ws => ws.weekStartDate === selectedWeek)?.status === 'submitted'}
          hasTimeEntries={Object.keys(timeData).length > 0}
          onSubmit={() => {
            // This would trigger the submission flow
            const submitButton = document.querySelector('[data-submit-week]') as HTMLButtonElement;
            submitButton?.click();
          }}
        />
      </div>
    </div>
    </TimeLoggingGuard>
  );
}
