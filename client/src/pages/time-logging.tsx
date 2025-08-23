import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, CheckCircle, AlertTriangle, Save, ChevronRight, Target, Timer, Plus, ChevronLeft, ChevronDown, Copy, Info, ArrowRight } from 'lucide-react';
import { format, startOfWeek, addDays, parseISO, getWeek, getYear, isToday } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { EnhancedTimeLoggingWrapper, useEnhancedSubmission } from '@/components/enhanced-time-logging-wrapper';
import { HourEntryCell } from '@/components/ui/hour-entry-cell';
import { cn } from '@/lib/utils';
import { useExplicitAllocationSave, type PendingChange } from '@/hooks/use-explicit-allocation-save';
import { ExplicitSaveControls } from '@/components/explicit-save-controls';
import { useNavigationGuard } from '@/hooks/use-navigation-guard';
import type { TimeEntry, WeeklySubmission, Resource, ResourceAllocation, Project } from '@shared/schema';

interface TimeEntryWithAllocation extends TimeEntry {
  allocation: ResourceAllocation & { project: Project };
}

interface WeekForm {
  entries: Record<number, {
    mondayHours: string;
    tuesdayHours: string;
    wednesdayHours: string;
    thursdayHours: string;
    fridayHours: string;
    saturdayHours: string;
    sundayHours: string;
    notes: string;
  }>;
}

interface ProjectSummary {
  totalAllocated: number;
  totalEntered: number;
  percentage: number;
}

// Get Monday of current week
const getCurrentWeekStart = () => {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

// Get ISO week number
const getISOWeek = (dateString: string) => {
  const date = parseISO(dateString);
  const weekNumber = getWeek(date, { weekStartsOn: 1 });
  const year = getYear(date);
  return { week: weekNumber, year };
};

// Get week options for dropdown
const getWeekOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  // Generate 12 weeks (6 before, current, 5 after)
  for (let i = -6; i <= 5; i++) {
    const date = new Date(currentDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    const weekData = getISOWeek(format(monday, 'yyyy-MM-dd'));
    
    options.push({
      value: format(monday, 'yyyy-MM-dd'),
      label: `Week ${weekData.week}`,
      fullLabel: `Week ${weekData.week} of ${weekData.year}`,
      dateLabel: `${format(monday, 'MMM d')} - ${format(addDays(monday, 6), 'MMM d, yyyy')}`,
    });
  }
  
  return options;
};

export default function TimeLogging() {
  const { user, hasPermission, hasRole } = useSupabaseAuth();
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [weekForm, setWeekForm] = useState<WeekForm>({ entries: {} });
  const [savingStates, setSavingStates] = useState<Record<number, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<number, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [enableWeekends, setEnableWeekends] = useState(false);
  const [weekPickerMode, setWeekPickerMode] = useState<'date' | 'week'>('week');
  const [submissionError, setSubmissionError] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { triggerCelebration, handleCelebrationTrigger } = useEnhancedSubmission();

  // Explicit save workflow for time entries
  const explicitSave = useExplicitAllocationSave({
    mutationFn: async ({ allocationId, weekKey, hours, resourceId }: { allocationId: number; weekKey: string; hours: number; resourceId: number }) => {
      console.log(`[CLIENT] Time entry save: allocationId=${allocationId}, weekKey=${weekKey}, hours=${hours}, resourceId=${resourceId}`);

      // Find the existing time entry for this allocation and week
      const existingEntry = timeEntries.find(entry => entry.allocationId === allocationId);

      if (existingEntry) {
        // Update existing entry
        const response = await apiRequest(`/api/time-entries/${existingEntry.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            resourceId,
            allocationId,
            weekStartDate: selectedWeek,
            ...weekForm.entries[allocationId],
          }),
        });
        console.log(`[CLIENT] Time entry update response:`, response);
        return response;
      } else {
        // Create new entry
        const response = await apiRequest('/api/time-entries', {
          method: 'POST',
          body: JSON.stringify({
            resourceId,
            allocationId,
            weekStartDate: selectedWeek,
            ...weekForm.entries[allocationId],
          }),
        });
        console.log(`[CLIENT] Time entry create response:`, response);
        return response;
      }
    },
    onSuccess: async (data, variables) => {
      // Invalidate time entries query to refresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/resources', selectedResourceId, 'time-entries', 'week', selectedWeek]
      });
    },
    onError: (error, variables) => {
      console.error('Failed to save time entry:', error);
      toast({
        title: "Error",
        description: "Failed to save time entry. Please try again.",
        variant: "destructive",
      });
    },
    onAllSaved: () => {
      // Remove toast notification - users should rely on Save button feedback
    }
  });

  // Navigation guard for unsaved changes
  const navigationGuard = useNavigationGuard({
    hasUnsavedChanges: explicitSave.state.hasUnsavedChanges,
    onSaveAndContinue: async () => {
      await explicitSave.actions.saveAllChanges();
    },
    onDiscardAndContinue: () => {
      explicitSave.actions.discardAllChanges();
    }
  });

  // Check if user is admin (can select any resource) or regular user (only their own resource)
  const isAdmin = hasRole('admin') || hasPermission('resource_management') || hasPermission('system_admin');
  const userResourceId = user?.resourceId;

  // Fetch resources for selection
  const { data: allResources = [] } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
  });

  // Filter resources based on user permissions
  const resources = isAdmin
    ? allResources
    : allResources.filter(resource => resource.id === userResourceId);

  // Fetch existing time entries for selected resource and week
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useQuery<TimeEntryWithAllocation[]>({
    queryKey: ['/api/resources', selectedResourceId, 'time-entries', 'week', selectedWeek],
    enabled: !!selectedResourceId,
  });

  // Fetch weekly submission status
  const { data: weeklySubmission } = useQuery<WeeklySubmission>({
    queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions', 'week', selectedWeek],
    enabled: !!selectedResourceId,
  });

  // Get active allocations for the selected resource
  const { data: allocations = [] } = useQuery<(ResourceAllocation & { project: Project })[]>({
    queryKey: ['/api/resources', selectedResourceId, 'allocations'],
    enabled: !!selectedResourceId,
  });

  // Auto-fill user's resource for non-admin users
  useEffect(() => {
    if (!isAdmin && userResourceId && !selectedResourceId && resources.length > 0) {
      // Find the user's resource in the filtered list
      const userResource = resources.find(resource => resource.id === userResourceId);
      if (userResource) {
        setSelectedResourceId(userResourceId);
      }
    }
  }, [isAdmin, userResourceId, selectedResourceId, resources]);

  // Submit week mutation
  const submitWeekMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResourceId) throw new Error('No resource selected');
      return await apiRequest(`/api/time-logging/submit/${selectedResourceId}/${selectedWeek}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Clear any previous errors
      setSubmissionError('');

      // Trigger celebration animation
      triggerCelebration();

      // Invalidate the specific weekly submission query that the UI is using
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions', 'week', selectedWeek] });
      // Also invalidate the general weekly submissions query for good measure
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions'] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to submit weekly timesheet. Please try again.";
      setSubmissionError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Unsubmit week mutation
  const unsubmitWeekMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResourceId) throw new Error('No resource selected');
      return await apiRequest(`/api/time-logging/unsubmit/${selectedResourceId}/${selectedWeek}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate the specific weekly submission query that the UI is using
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions', 'week', selectedWeek] });
      // Also invalidate the general weekly submissions query for good measure
      queryClient.invalidateQueries({ queryKey: ['/api/resources', selectedResourceId, 'weekly-submissions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unsubmit weekly timesheet. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize form with existing data
  useEffect(() => {
    if (timeEntries.length > 0) {
      const entries: Record<number, any> = {};
      timeEntries.forEach(entry => {
        entries[entry.allocationId] = {
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
      setWeekForm({ entries });
    } else {
      // Initialize with empty form for active allocations
      const entries: Record<number, any> = {};
      allocations.forEach(allocation => {
        entries[allocation.id] = {
          mondayHours: '0.00',
          tuesdayHours: '0.00',
          wednesdayHours: '0.00',
          thursdayHours: '0.00',
          fridayHours: '0.00',
          saturdayHours: '0.00',
          sundayHours: '0.00',
          notes: '',
        };
      });
      setWeekForm({ entries });
    }
  }, [timeEntries, allocations]);

  // Enhanced save time entry mutation with better feedback
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
      
      // Set saved state for visual feedback
      setSavedStates(prev => ({ ...prev, [variables.allocationId]: true }));
      setSavingStates(prev => ({ ...prev, [variables.allocationId]: false }));
      
      // Clear saved state after 3 seconds
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [variables.allocationId]: false }));
      }, 3000);
    },
    onError: (error: any, variables) => {
      setSavingStates(prev => ({ ...prev, [variables.allocationId]: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to save time entry",
        variant: "destructive",
      });
    },
  });

  // Calculate project summaries for enhanced UI
  const calculateProjectSummary = (allocationId: number): ProjectSummary => {
    const entry = weekForm.entries[allocationId];
    const allocation = allocations.find(a => a.id === allocationId);
    
    if (!entry || !allocation) {
      return { totalAllocated: 0, totalEntered: 0, percentage: 0 };
    }
    
    const totalEntered = parseFloat(entry.mondayHours) + 
                        parseFloat(entry.tuesdayHours) + 
                        parseFloat(entry.wednesdayHours) + 
                        parseFloat(entry.thursdayHours) + 
                        parseFloat(entry.fridayHours) + 
                        parseFloat(entry.saturdayHours) + 
                        parseFloat(entry.sundayHours);
    
    const totalAllocated = allocation.allocatedHours;
    const percentage = totalAllocated > 0 ? (totalEntered / totalAllocated) * 100 : 0;
    
    return {
      totalAllocated,
      totalEntered,
      percentage
    };
  };

  // Calculate expected hours based on project allocations
  const calculateExpectedHours = () => {
    return allocations.reduce((total, allocation) => {
      return total + parseFloat(allocation.allocatedHours);
    }, 0);
  };

  // Calculate weekly summary for dashboard
  const calculateWeeklySummary = () => {
    let totalHours = 0;
    const projectBreakdown: Record<string, number> = {};

    Object.entries(weekForm.entries).forEach(([allocationId, entry]) => {
      const allocation = allocations.find(a => a.id === parseInt(allocationId));
      if (allocation) {
        const projectHours = parseFloat(entry.mondayHours) +
                            parseFloat(entry.tuesdayHours) +
                            parseFloat(entry.wednesdayHours) +
                            parseFloat(entry.thursdayHours) +
                            parseFloat(entry.fridayHours) +
                            parseFloat(entry.saturdayHours) +
                            parseFloat(entry.sundayHours);

        totalHours += projectHours;
        projectBreakdown[allocation.project.name] = (projectBreakdown[allocation.project.name] || 0) + projectHours;
      }
    });

    return { totalHours, projectBreakdown };
  };

  const handleHoursChange = (allocationId: number, day: string, value: string) => {
    // Don't allow changes if the week is already submitted
    if (weeklySubmission?.isSubmitted) return;

    // Validate input - allow numbers and decimal points
    const isValidInput = /^[0-9]*\.?[0-9]*$/.test(value);
    if (!isValidInput && value !== '') return;

    // Get the old value for tracking changes
    const oldValue = parseFloat(weekForm.entries[allocationId]?.[day] || '0');
    const newValue = parseFloat(value) || 0;

    // Update form state with raw value (no formatting during typing)
    setWeekForm(prev => ({
      ...prev,
      entries: {
        ...prev.entries,
        [allocationId]: {
          ...prev.entries[allocationId],
          [day]: value,
        }
      }
    }));

    // Add to pending changes if value actually changed
    if (newValue !== oldValue) {
      const cellKey = `${allocationId}-${day}`;
      explicitSave.actions.addPendingChange(cellKey, {
        resourceId: selectedResourceId!,
        allocationId,
        weekKey: day,
        hours: newValue,
        oldValue
      });
    }
  };

  // Format on blur without auto-save (explicit save workflow)
  const handleHoursBlur = async (allocationId: number, day: string, value: string) => {
    // Don't allow changes if the week is already submitted
    if (weeklySubmission?.isSubmitted) return;

    // Format and validate on blur - handle empty strings properly
    const numValue = value === '' ? 0 : parseFloat(value);
    const formattedValue = (isNaN(numValue) ? 0 : numValue).toFixed(2);

    // Update with formatted value (no auto-save)
    setWeekForm(prev => ({
      ...prev,
      entries: {
        ...prev.entries,
        [allocationId]: {
          ...prev.entries[allocationId],
          [day]: formattedValue,
        }
      }
    }));

    // Note: No auto-save - user must explicitly save changes
  };

  // Enhanced keyboard navigation with weekend support and notes field
  const handleKeyDown = (e: React.KeyboardEvent, allocationId: number, dayIndex?: number) => {
    const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save current entry and move to next field
      saveEntry(allocationId);
      
      // Move to next available field
      if (dayIndex !== undefined) {
        const nextDayIndex = findNextEditableDay(dayIndex, 1);
        if (nextDayIndex !== -1) {
          const nextKey = `${allocationId}-${dayKeys[nextDayIndex]}`;
          setTimeout(() => inputRefs.current[nextKey]?.focus(), 100);
        } else {
          // Move to notes field
          const notesKey = `${allocationId}-notes`;
          setTimeout(() => inputRefs.current[notesKey]?.focus(), 100);
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      if (dayIndex !== undefined) {
        // From day field - move to next day or notes
        const nextDayIndex = findNextEditableDay(dayIndex, 1);
        if (nextDayIndex !== -1) {
          const nextKey = `${allocationId}-${dayKeys[nextDayIndex]}`;
          inputRefs.current[nextKey]?.focus();
        } else {
          // Move to notes field
          const notesKey = `${allocationId}-notes`;
          inputRefs.current[notesKey]?.focus();
        }
      } else {
        // From notes field - move to next allocation or next allocation's first day
        const allocationsArray = allocations.filter(a => a.status === 'active');
        const currentIndex = allocationsArray.findIndex(a => a.id === allocationId);
        if (currentIndex < allocationsArray.length - 1) {
          const nextAllocation = allocationsArray[currentIndex + 1];
          const firstEditableDay = findNextEditableDay(-1, 1);
          const nextKey = `${nextAllocation.id}-${dayKeys[firstEditableDay]}`;
          inputRefs.current[nextKey]?.focus();
        }
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      
      if (dayIndex !== undefined) {
        // From day field - move to previous day
        const prevDayIndex = findNextEditableDay(dayIndex, -1);
        if (prevDayIndex !== -1) {
          const prevKey = `${allocationId}-${dayKeys[prevDayIndex]}`;
          inputRefs.current[prevKey]?.focus();
        } else {
          // Move to previous allocation's notes field
          const allocationsArray = allocations.filter(a => a.status === 'active');
          const currentIndex = allocationsArray.findIndex(a => a.id === allocationId);
          if (currentIndex > 0) {
            const prevAllocation = allocationsArray[currentIndex - 1];
            const notesKey = `${prevAllocation.id}-notes`;
            inputRefs.current[notesKey]?.focus();
          }
        }
      } else {
        // From notes field - move to last day of same allocation
        const lastEditableDay = findNextEditableDay(7, -1);
        if (lastEditableDay !== -1) {
          const prevKey = `${allocationId}-${dayKeys[lastEditableDay]}`;
          inputRefs.current[prevKey]?.focus();
        }
      }
    } else if (dayIndex !== undefined) {
      // Arrow navigation only for day fields
      if (e.key === 'ArrowRight') {
        const nextDayIndex = findNextEditableDay(dayIndex, 1);
        if (nextDayIndex !== -1) {
          const nextKey = `${allocationId}-${dayKeys[nextDayIndex]}`;
          inputRefs.current[nextKey]?.focus();
        }
      } else if (e.key === 'ArrowLeft') {
        const prevDayIndex = findNextEditableDay(dayIndex, -1);
        if (prevDayIndex !== -1) {
          const prevKey = `${allocationId}-${dayKeys[prevDayIndex]}`;
          inputRefs.current[prevKey]?.focus();
        }
      }
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveEntry(allocationId);
    }
  };

  // Helper function to find next editable day
  const findNextEditableDay = (currentIndex: number, direction: number): number => {
    const maxIndex = 6;
    let nextIndex = currentIndex + direction;
    
    while (nextIndex >= 0 && nextIndex <= maxIndex) {
      const isWeekend = nextIndex === 5 || nextIndex === 6; // Saturday or Sunday
      if (!isWeekend || enableWeekends) {
        return nextIndex;
      }
      nextIndex += direction;
    }
    
    return -1;
  };

  // Copy value to all weekdays
  const copyToWeekdays = (allocationId: number, dayIndex: number) => {
    // Don't allow copying if the week is already submitted
    if (weeklySubmission?.isSubmitted) return;
    
    const entry = weekForm.entries[allocationId];
    const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours'];
    const sourceValue = entry?.[dayKeys[dayIndex] as keyof typeof entry] || '0.00';
    
    setWeekForm(prev => ({
      ...prev,
      entries: {
        ...prev.entries,
        [allocationId]: {
          ...prev.entries[allocationId],
          mondayHours: sourceValue,
          tuesdayHours: sourceValue,
          wednesdayHours: sourceValue,
          thursdayHours: sourceValue,
          fridayHours: sourceValue,
        }
      }
    }));
    
    // Auto-save after copying
    setTimeout(() => {
      saveEntry(allocationId);
    }, 100);
  };

  // Calculate hours warning for insufficient logging
  const calculateHoursWarning = () => {
    const weeklySummary = calculateWeeklySummary();
    const expectedHours = calculateExpectedHours();
    const isPastFriday = new Date().getDay() === 0 || new Date().getDay() >= 5; // Sunday or Friday+

    return {
      showWarning: weeklySummary.totalHours < expectedHours && isPastFriday,
      message: `You've logged ${weeklySummary.totalHours.toFixed(1)}h of ${expectedHours.toFixed(0)}h expected (${expectedHours > 0 ? ((weeklySummary.totalHours / expectedHours) * 100).toFixed(0) : 0}%)`,
    };
  };

  const handleNotesChange = (allocationId: number, notes: string) => {
    // Don't allow changes if the week is already submitted
    if (weeklySubmission?.isSubmitted) return;
    
    setWeekForm(prev => ({
      ...prev,
      entries: {
        ...prev.entries,
        [allocationId]: {
          ...prev.entries[allocationId],
          notes,
        }
      }
    }));
  };





  // Drag functionality for filling identical values
  const handleDragFill = (allocationId: number, dayIndex: number, value: string) => {
    const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
    
    // Fill remaining days with the same value
    const updates: Record<string, string> = {};
    for (let i = dayIndex; i < dayKeys.length; i++) {
      updates[dayKeys[i]] = value;
    }
    
    setWeekForm(prev => ({
      ...prev,
      entries: {
        ...prev.entries,
        [allocationId]: {
          ...prev.entries[allocationId],
          ...updates,
        }
      }
    }));
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];

  const activeAllocations = allocations.filter(allocation => allocation.status === 'active');
  const weeklySummary = calculateWeeklySummary();

  // Determine if there are actual time entries with hours > 0
  const hasTimeEntries = weeklySummary.totalHours > 0;

  return (
    <EnhancedTimeLoggingWrapper
      weeklySubmission={weeklySubmission}
      onSubmit={() => submitWeekMutation.mutate()}
      onUnsubmit={() => unsubmitWeekMutation.mutate()}
      isSubmitting={submitWeekMutation.isPending}
      isUnsubmitting={unsubmitWeekMutation.isPending}
      selectedWeek={selectedWeek}
      hasAllocations={activeAllocations.length > 0}
      hasTimeEntries={hasTimeEntries}
      totalHours={weeklySummary.totalHours}
      submissionError={submissionError}
      onCelebrationTrigger={handleCelebrationTrigger}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <main className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Logging</h1>
            <p className="text-gray-600 mt-1">Track your hours with precision and ease</p>
          </div>
        </div>

        {/* Resource and Week Selection */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700 block h-5">
                  {isAdmin ? 'Select Resource' : 'Resource'}
                </Label>
                {isAdmin ? (
                  <Select value={selectedResourceId?.toString() || ''} onValueChange={(value) => setSelectedResourceId(parseInt(value))}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Choose a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map(resource => (
                        <SelectItem key={resource.id} value={resource.id.toString()}>
                          {resource.name} ({resource.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 rounded-xl border border-slate-200 bg-slate-50 backdrop-blur-sm flex items-center px-4">
                    <span className="text-slate-900 font-medium">
                      {resources.find(r => r.id === selectedResourceId)?.name || user?.resource?.name || 'Loading...'}
                      {resources.find(r => r.id === selectedResourceId)?.role && (
                        <span className="text-slate-600 ml-2">
                          ({resources.find(r => r.id === selectedResourceId)?.role})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-sm font-medium text-slate-700">Week Selection</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setWeekPickerMode(weekPickerMode === 'week' ? 'date' : 'week')}
                    className="h-6 px-2 text-xs border-slate-200 bg-white/50 hover:bg-white/70 transition-colors"
                  >
                    {weekPickerMode === 'week' ? 'Switch to Date' : 'Switch to Week'}
                  </Button>
                </div>
                
                {weekPickerMode === 'week' ? (
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {getWeekOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-slate-500">{option.dateLabel}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative">
                    <Input 
                      type="date" 
                      value={selectedWeek} 
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm pl-12"
                    />
                    <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Weekend Toggle */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    id="weekend-toggle"
                    checked={enableWeekends}
                    onCheckedChange={setEnableWeekends}
                  />
                  <Label htmlFor="weekend-toggle" className="text-sm font-medium text-slate-700">
                    Enable weekend logging
                  </Label>
                </div>
                <div className="text-xs text-slate-500">
                  {enableWeekends ? 'Weekends are editable' : 'Weekends are disabled'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedResourceId && (
          <>
            {/* Weekly Summary Panel */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-slate-900">This Week's Summary</h2>
                  <Badge variant="secondary" className="bg-white/70 text-slate-700">
                    {format(parseISO(selectedWeek), 'MMM d, yyyy')} (Week {getISOWeek(selectedWeek).week})
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-slate-900">{weeklySummary.totalHours.toFixed(1)}h</div>
                    <div className="text-sm text-slate-600">Total Hours Logged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-slate-900">{activeAllocations.length}</div>
                    <div className="text-sm text-slate-600">Active Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-slate-900">
                      {(() => {
                        const expectedHours = calculateExpectedHours();

                        return weeklySummary.totalHours < expectedHours ? (
                          <span className="text-orange-600">{(expectedHours - weeklySummary.totalHours).toFixed(1)}h</span>
                        ) : (
                          <span className="text-green-600">Complete</span>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-slate-600">
                      {(() => {
                        const expectedHours = calculateExpectedHours();

                        return weeklySummary.totalHours < expectedHours ? 'Hours Remaining' : 'Weekly Goal';
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Hours Warning */}
                {(() => {
                  const warning = calculateHoursWarning();
                  return warning.showWarning && (
                    <Alert className="mt-4 border-orange-200 bg-orange-50">
                      <Info className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        {warning.message}
                      </AlertDescription>
                    </Alert>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Time Entry Form */}
            {isLoadingEntries ? (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="text-slate-600">Loading time entries...</div>
                  </div>
                </CardContent>
              </Card>
            ) : activeAllocations.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-slate-900">No Active Projects</h3>
                      <p className="text-slate-600">This resource has no active project allocations. Please ensure the resource is assigned to active projects.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {activeAllocations.map((allocation, index) => {
                  const summary = calculateProjectSummary(allocation.id);
                  const isSaving = savingStates[allocation.id] || false;
                  const isSaved = savedStates[allocation.id] || false;
                  const isLastCard = index === activeAllocations.length - 1;
                  
                  return (
                    <Card key={allocation.id} className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden ${isLastCard ? 'mobile-card' : ''}`}>
                      <CardContent className="p-0">
                        {/* Project Header */}
                        <div className="sticky top-0 z-20 p-6 bg-gradient-to-r from-slate-50/95 to-white/95 backdrop-blur-sm border-b border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Target className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">{allocation.project.name}</h3>
                                  <p className="text-sm text-slate-600">{allocation.role}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="text-lg font-semibold text-slate-900">
                                  {summary.totalEntered.toFixed(1)}h / {summary.totalAllocated}h
                                </div>
                                <div className="text-sm text-slate-600">
                                  {summary.percentage.toFixed(0)}% complete
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveEntry(allocation.id)}
                                disabled={isSaving}
                                className={cn(
                                  "rounded-full h-10 px-4 backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-md",
                                  // Base styles
                                  "bg-white/70 border-slate-200 hover:bg-white/90",
                                  // Enhanced styles when there are unsaved changes
                                  explicitSave.state.hasUnsavedChanges && !isSaving && !isSaved && [
                                    "animate-pulse",
                                    "border-blue-300 bg-blue-50/80 hover:bg-blue-100/90",
                                    "shadow-md shadow-blue-200/50",
                                    "ring-2 ring-blue-200/30"
                                  ],
                                  // Saved state
                                  isSaved && "border-green-300 bg-green-50/80"
                                )}
                              >
                                {isSaving ? (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : isSaved ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Save className={cn(
                                    "w-4 h-4 transition-all duration-300",
                                    explicitSave.state.hasUnsavedChanges && !isSaving && !isSaved && [
                                      "text-blue-600",
                                      "animate-pulse"
                                    ]
                                  )} />
                                )}
                                <span className={cn(
                                  "ml-2 transition-all duration-300",
                                  explicitSave.state.hasUnsavedChanges && !isSaving && !isSaved && "text-blue-700 font-medium"
                                )}>
                                  {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                                </span>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(summary.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Time Entry Grid */}
                        <div className="p-6">
                          {/* Mobile Week Header */}
                          <div className="mobile-week-header md:hidden mb-6">
                            <div className="text-center">
                              <div className="text-lg font-medium text-slate-900">
                                {allocation.project.name}
                              </div>
                              <div className="text-sm text-slate-600">
                                Week of {format(parseISO(selectedWeek), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          
                          {/* Desktop Grid */}
                          <div className="hidden md:grid grid-cols-7 gap-3 mb-6">
                            {weekDays.map((day, index) => {
                              const isWeekend = index === 5 || index === 6; // Saturday or Sunday
                              const isDisabled = isWeekend && !enableWeekends;
                              const currentDate = addDays(parseISO(selectedWeek), index);
                              const isCurrentDay = isToday(currentDate);
                              const isWeekday = index < 5; // Monday to Friday
                              
                              return (
                                <div key={day} className="space-y-2">
                                  <div className="text-center">
                                    <div className={`text-sm font-medium flex items-center justify-center gap-1 ${
                                      isCurrentDay 
                                        ? 'text-blue-600' 
                                        : isDisabled 
                                          ? 'text-slate-400' 
                                          : 'text-slate-700'
                                    }`}>
                                      {weekDaysShort[index]}
                                      {isWeekday && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToWeekdays(allocation.id, index)}
                                          className="h-4 w-4 p-0 opacity-0 hover:opacity-100 transition-opacity"
                                          title="Copy to all weekdays"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <div className={`text-xs ${
                                      isCurrentDay 
                                        ? 'text-blue-500' 
                                        : isDisabled 
                                          ? 'text-slate-300' 
                                          : 'text-slate-500'
                                    }`}>
                                      {format(currentDate, 'MMM d')}
                                    </div>
                                  </div>
                                  <HourEntryCell
                                    value={weekForm.entries[allocation.id]?.[dayKeys[index]] || ''}
                                    onChange={(newValue, oldValue) => handleHoursChange(allocation.id, dayKeys[index], newValue)}
                                    onBlur={() => handleHoursBlur(allocation.id, dayKeys[index], weekForm.entries[allocation.id]?.[dayKeys[index]] || '')}
                                    onKeyDown={(e) => handleKeyDown(e, allocation.id, index)}
                                    onFocus={() => setFocusedField(`${allocation.id}-${dayKeys[index]}`)}
                                    cellKey={`${allocation.id}-${dayKeys[index]}`}
                                    isFocused={focusedField === `${allocation.id}-${dayKeys[index]}`}
                                    isSaving={explicitSave.state.savingCells.has(`${allocation.id}-${dayKeys[index]}`)}
                                    isSaved={explicitSave.state.savedCells.has(`${allocation.id}-${dayKeys[index]}`)}
                                    hasPendingChanges={explicitSave.state.pendingChanges[`${allocation.id}-${dayKeys[index]}`] !== undefined}
                                    disabled={isDisabled || weeklySubmission?.isSubmitted}
                                    isCurrentDay={isCurrentDay && !isDisabled && !weeklySubmission?.isSubmitted}
                                    mobileOptimized={false}
                                    max={24}
                                    step={0.25}
                                    placeholder="0.00"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Enhanced Mobile Layout - Stacked Days */}
                          <div className="md:hidden mb-6">
                            <div className="space-y-3">
                              {weekDays.map((day, index) => {
                                const isWeekend = index === 5 || index === 6; // Saturday or Sunday
                                const isDisabled = isWeekend && !enableWeekends;
                                const currentDate = addDays(parseISO(selectedWeek), index);
                                const isCurrentDay = isToday(currentDate);
                                const isWeekday = index < 5; // Monday to Friday
                                
                                if (isDisabled) return null; // Hide weekends on mobile when disabled
                                
                                return (
                                  <div 
                                    key={day} 
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                                      isCurrentDay 
                                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                        : 'bg-white/70 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <div className={`font-medium ${
                                        isCurrentDay ? 'text-blue-900' : 'text-slate-900'
                                      }`}>
                                        {day}
                                      </div>
                                      <div className={`text-sm ${
                                        isCurrentDay ? 'text-blue-600' : 'text-slate-500'
                                      }`}>
                                        {format(currentDate, 'MMM d')}
                                        {isCurrentDay && <span className="ml-2 text-xs">(Today)</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isWeekday && !weeklySubmission?.isSubmitted && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToWeekdays(allocation.id, index)}
                                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                                          title="Copy to all weekdays"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <HourEntryCell
                                        value={weekForm.entries[allocation.id]?.[dayKeys[index]] || ''}
                                        onChange={(newValue, oldValue) => handleHoursChange(allocation.id, dayKeys[index], newValue)}
                                        onBlur={() => handleHoursBlur(allocation.id, dayKeys[index], weekForm.entries[allocation.id]?.[dayKeys[index]] || '')}
                                        onKeyDown={(e) => handleKeyDown(e, allocation.id, index)}
                                        onFocus={() => setFocusedField(`${allocation.id}-${dayKeys[index]}`)}
                                        cellKey={`${allocation.id}-${dayKeys[index]}`}
                                        isFocused={focusedField === `${allocation.id}-${dayKeys[index]}`}
                                        isSaving={explicitSave.state.savingCells.has(`${allocation.id}-${dayKeys[index]}`)}
                                        isSaved={explicitSave.state.savedCells.has(`${allocation.id}-${dayKeys[index]}`)}
                                        hasPendingChanges={explicitSave.state.pendingChanges[`${allocation.id}-${dayKeys[index]}`] !== undefined}
                                        disabled={isDisabled || weeklySubmission?.isSubmitted}
                                        isCurrentDay={isCurrentDay && !isDisabled && !weeklySubmission?.isSubmitted}
                                        mobileOptimized={true}
                                        max={24}
                                        step={0.25}
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Notes Section */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-slate-700">Notes</Label>
                            <Textarea
                              ref={(el) => inputRefs.current[`${allocation.id}-notes`] = el}
                              value={weekForm.entries[allocation.id]?.notes || ''}
                              onChange={(e) => handleNotesChange(allocation.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, allocation.id)}
                              onFocus={() => setFocusedField(`${allocation.id}-notes`)}
                              placeholder="Add any notes about this week's work..."
                              rows={3}
                              disabled={weeklySubmission?.isSubmitted}
                              className={`rounded-xl border-slate-200 bg-white/70 backdrop-blur-sm resize-none transition-all duration-200 ${
                                focusedField === `${allocation.id}-notes`
                                  ? 'ring-2 ring-blue-500 border-blue-500'
                                  : ''
                              } ${
                                weeklySubmission?.isSubmitted
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300'
                              }`}
                            />
                          </div>
                          
                          {/* Keyboard Shortcuts Help */}
                          <div className="keyboard-shortcuts hidden md:block">
                            <div className="flex items-center gap-2 text-slate-600 mb-2">
                              <Info className="h-3 w-3" />
                              <span className="text-xs font-medium">Keyboard Shortcuts</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">Tab</kbd> Next field</div>
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">Shift+Tab</kbd> Previous field</div>
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">Enter</kbd> Save & advance</div>
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">Ctrl+S</kbd> Save entry</div>
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">↑↓</kbd> Navigate days</div>
                              <div><kbd className="px-1 py-0.5 bg-slate-200 rounded">Copy icon</kbd> Fill weekdays</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {/* Explicit Save Controls */}
            <ExplicitSaveControls
              state={explicitSave.state}
              onSaveAll={explicitSave.actions.saveAllChanges}
              onDiscardAll={explicitSave.actions.discardAllChanges}
              onRetryFailed={explicitSave.actions.retryFailedSaves}
              formatChange={(change) => {
                const dayNames = {
                  mondayHours: 'Monday',
                  tuesdayHours: 'Tuesday',
                  wednesdayHours: 'Wednesday',
                  thursdayHours: 'Thursday',
                  fridayHours: 'Friday',
                  saturdayHours: 'Saturday',
                  sundayHours: 'Sunday'
                };
                const dayName = dayNames[change.weekKey as keyof typeof dayNames] || change.weekKey;
                const allocation = allocations.find(a => a.id === change.allocationId);
                const projectName = allocation?.project?.name || 'Unknown Project';
                return `${projectName} - ${dayName}: ${change.oldValue || 0}h → ${change.hours}h`;
              }}
              position="floating"
              showDetails={true}
            />
          </>
        )}
      </main>
      </div>
    </EnhancedTimeLoggingWrapper>
  );
}