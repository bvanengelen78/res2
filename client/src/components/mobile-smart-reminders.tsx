import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle, CheckCircle, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

interface SmartReminderProps {
  selectedWeek: string;
  totalHours: number;
  isSubmitted: boolean;
  hasTimeEntries: boolean;
  onSubmit: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface ReminderMessage {
  type: 'info' | 'warning' | 'success' | 'urgent';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon: React.ReactNode;
  priority: number; // Higher number = higher priority
}

export function MobileSmartReminders({
  selectedWeek,
  totalHours,
  isSubmitted,
  hasTimeEntries,
  onSubmit,
  onDismiss,
  className
}: SmartReminderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<ReminderMessage | null>(null);

  // Generate smart reminder messages based on current state
  const generateReminders = (): ReminderMessage[] => {
    const reminders: ReminderMessage[] = [];
    const weekDate = new Date(selectedWeek);
    
    // Already submitted - success message
    if (isSubmitted) {
      reminders.push({
        type: 'success',
        title: 'Week Submitted Successfully',
        message: `${totalHours.toFixed(1)} hours submitted for this week.`,
        icon: <CheckCircle className="w-5 h-5" />,
        priority: 1,
      });
      return reminders;
    }

    // No time entries yet
    if (!hasTimeEntries) {
      if (isToday(weekDate) || isTomorrow(weekDate)) {
        reminders.push({
          type: 'info',
          title: 'Start Logging Time',
          message: 'Begin tracking your project hours for this week.',
          icon: <Clock className="w-5 h-5" />,
          priority: 3,
        });
      }
      return reminders;
    }

    // Has time entries but not submitted
    const isCurrentWeek = isToday(weekDate);
    const isPastWeek = weekDate < new Date();
    
    if (isPastWeek && !isCurrentWeek) {
      // Past week not submitted - urgent
      reminders.push({
        type: 'urgent',
        title: 'Past Week Pending',
        message: `${totalHours.toFixed(1)} hours logged but not submitted.`,
        action: {
          label: 'Submit Now',
          onClick: onSubmit,
        },
        icon: <AlertTriangle className="w-5 h-5" />,
        priority: 10,
      });
    } else if (isCurrentWeek) {
      // Current week with hours
      if (totalHours >= 35) {
        reminders.push({
          type: 'info',
          title: 'Ready to Submit',
          message: `${totalHours.toFixed(1)} hours logged. Submit when ready.`,
          action: {
            label: 'Submit Week',
            onClick: onSubmit,
          },
          icon: <Target className="w-5 h-5" />,
          priority: 7,
        });
      } else if (totalHours > 0) {
        const missingDays = getMissingDays();
        if (missingDays.length > 0) {
          reminders.push({
            type: 'warning',
            title: 'Week Incomplete',
            message: `Missing hours for ${missingDays.join(', ')}.`,
            icon: <Calendar className="w-5 h-5" />,
            priority: 5,
          });
        }
      }
    }

    return reminders;
  };

  // Helper function to identify missing days
  const getMissingDays = (): string[] => {
    // This would need to be passed from parent component
    // For now, return empty array
    return [];
  };

  // Update current reminder based on state changes
  useEffect(() => {
    if (isDismissed) return;

    const reminders = generateReminders();
    const highestPriorityReminder = reminders.sort((a, b) => b.priority - a.priority)[0];
    
    if (highestPriorityReminder) {
      setCurrentReminder(highestPriorityReminder);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [selectedWeek, totalHours, isSubmitted, hasTimeEntries, isDismissed]);

  // Auto-hide success messages after 5 seconds
  useEffect(() => {
    if (currentReminder?.type === 'success') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentReminder]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
    
    // Reset dismissal after 30 minutes for non-success messages
    if (currentReminder?.type !== 'success') {
      setTimeout(() => {
        setIsDismissed(false);
      }, 30 * 60 * 1000);
    }
  };

  const getTypeStyles = (type: ReminderMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIconColor = (type: ReminderMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-amber-500';
      case 'urgent':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  if (!currentReminder) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
            "md:bottom-6 md:left-auto md:right-6 md:max-w-sm",
            className
          )}
        >
          <div className={cn(
            "rounded-xl border-2 p-4 shadow-lg backdrop-blur-sm",
            "transition-all duration-300",
            getTypeStyles(currentReminder.type)
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("flex-shrink-0 mt-0.5", getIconColor(currentReminder.type))}>
                {currentReminder.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight mb-1">
                  {currentReminder.title}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {currentReminder.message}
                </p>
                
                {currentReminder.action && (
                  <Button
                    size="sm"
                    onClick={currentReminder.action.onClick}
                    className="mt-3 h-8 text-xs font-medium"
                    variant={currentReminder.type === 'urgent' ? 'destructive' : 'default'}
                  >
                    {currentReminder.action.label}
                  </Button>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-shrink-0 h-6 w-6 p-0 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing smart reminders
export function useSmartReminders() {
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  
  const dismissReminder = (reminderId: string) => {
    setDismissedReminders(prev => new Set([...prev, reminderId]));
  };
  
  const resetDismissals = () => {
    setDismissedReminders(new Set());
  };
  
  return {
    dismissedReminders,
    dismissReminder,
    resetDismissals,
  };
}

// Smart reminder context for global state management
export const SmartReminderContext = React.createContext<{
  dismissedReminders: Set<string>;
  dismissReminder: (id: string) => void;
  resetDismissals: () => void;
} | null>(null);

export function SmartReminderProvider({ children }: { children: React.ReactNode }) {
  const reminderState = useSmartReminders();
  
  return (
    <SmartReminderContext.Provider value={reminderState}>
      {children}
    </SmartReminderContext.Provider>
  );
}
