import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, cacheInvalidation } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAllocationKeyboardNavigation } from "@/hooks/use-allocation-keyboard-navigation";
import { useExplicitAllocationSave } from "@/hooks/use-explicit-allocation-save";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { ExplicitSaveControls, NavigationGuardDialog } from "./explicit-save-controls";
import { useAllocationMutationSync } from "@/hooks/use-real-time-sync";
import { ResourceAllocation, Project, Resource } from "@shared/schema";
import { Link } from "wouter";
import { Calendar, ChevronUp, ChevronDown, ExternalLink, CheckCircle, Clock, Lock } from "lucide-react";
import { useEffectiveCapacity } from "@/hooks/use-effective-capacity";
import { UtilizationBar, useUtilizationData } from "@/components/utilization-bar";
import { AllocationInput } from "@/components/allocation-input";

interface ResourceWeeklyAllocationTableProps {
  resourceId: number;
  resource: Resource;
  fullscreen?: boolean;
  readOnly?: boolean;
  projectFilter?: number; // Optional project ID to filter allocations
}

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
  weeklyAllocations?: Record<string, number>;
}

interface WeekColumn {
  key: string;
  label: string;
  date: string;
  fullDate: Date;
  weekStart: Date;
  weekEnd: Date;
}

export function ResourceWeeklyAllocationTable({
  resourceId,
  resource,
  fullscreen = false,
  readOnly = true,
  projectFilter
}: ResourceWeeklyAllocationTableProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState<string | null>(null);


  // Explicit save workflow
  const explicitSave = useExplicitAllocationSave({
    mutationFn: async ({ projectId, weekKey, hours }: { projectId: number; weekKey: string; hours: number }) => {
      console.log(`[CLIENT] Resource allocation save: resourceId=${resourceId}, projectId=${projectId}, weekKey=${weekKey}, hours=${hours}`);
      const response = await apiRequest(`/api/resources/${resourceId}/weekly-allocations`, {
        method: 'PUT',
        body: JSON.stringify({ projectId, weekKey, hours }),
      });
      console.log(`[CLIENT] Resource allocation save response:`, response);
      return response;
    },
    onSuccess: async (data, variables) => {
      // Don't invalidate cache here - it causes visual flickering
      // Cache will be invalidated once after all saves are complete
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: "Failed to update weekly allocation",
        variant: "destructive",
      });
    },
    onAllSaved: async () => {
      // Invalidate cache only once after all saves are complete
      await cacheInvalidation.invalidateAllocationRelatedData(resourceId);

      // End editing session when all changes are saved
      endEditingSession();
    }
  });

  // State for locking row order during editing
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [lockedRowOrder, setLockedRowOrder] = useState<AllocationWithProject[]>([]);

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

  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createSuccessHandler, syncAllocationChange } = useAllocationMutationSync();

  // Get effective capacity calculations for real-time overallocation warnings
  const { checkOverallocationWarning, getCapacityStatus } = useEffectiveCapacity([resource]);



  // Fetch allocations for this resource
  const { data: allocations = [], isLoading } = useQuery<AllocationWithProject[]>({
    queryKey: ["/api/resources", resourceId, "allocations"],
  });



  // Generate week columns for a windowed view (showing 16 weeks at a time)
  const WEEKS_TO_SHOW = fullscreen ? 20 : 16;

  // Calculate initial offset to show current week
  const getCurrentWeekOffset = useCallback(() => {
    const currentDate = new Date();
    const currentYear = getYear(currentDate);
    if (currentYear !== selectedYear) return 0;

    const currentWeekNum = getWeek(currentDate, { weekStartsOn: 1 });
    // Center the current week in the view
    return Math.max(0, Math.min(52 - WEEKS_TO_SHOW, currentWeekNum - Math.floor(WEEKS_TO_SHOW / 2)));
  }, [selectedYear, WEEKS_TO_SHOW]);

  const [weekOffset, setWeekOffset] = useState(() => getCurrentWeekOffset());

  const allWeekColumns = useMemo(() => {
    const weeks: WeekColumn[] = [];

    // Start from the first Monday of the year or the Monday before if Jan 1 is not Monday
    const yearStart = new Date(selectedYear, 0, 1); // January 1st
    let currentWeek = startOfWeek(yearStart, { weekStartsOn: 1 });

    // If the first week starts in the previous year, move to the first week that starts in the current year
    if (getYear(currentWeek) < selectedYear) {
      currentWeek = addWeeks(currentWeek, 1);
    }

    // Generate 52 weeks for the selected year
    for (let i = 0; i < 52; i++) {
      const weekNumber = getWeek(currentWeek, { weekStartsOn: 1 });
      const year = getYear(currentWeek);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      const weekLabel = `W${weekNumber}`;
      const weekStart = new Date(currentWeek);
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

      weeks.push({
        key: weekKey,
        label: weekLabel,
        date: format(currentWeek, 'MMM d'),
        fullDate: new Date(currentWeek),
        weekStart,
        weekEnd,
      });

      currentWeek = addWeeks(currentWeek, 1);
    }

    return weeks;
  }, [selectedYear]);

  // Get the windowed subset of weeks to display
  const weekColumns = useMemo(() => {
    return allWeekColumns.slice(weekOffset, weekOffset + WEEKS_TO_SHOW);
  }, [allWeekColumns, weekOffset, WEEKS_TO_SHOW]);

  // Get current week key for highlighting
  const currentWeekKey = useMemo(() => {
    const currentDate = new Date();
    const currentYear = getYear(currentDate);
    const currentWeekNum = getWeek(currentDate, { weekStartsOn: 1 });
    return `${currentYear}-W${currentWeekNum.toString().padStart(2, '0')}`;
  }, []);

  // Filter allocations to only show active ones (and optionally filter by project)
  const activeAllocations = useMemo(() => {
    let filtered = allocations.filter(allocation => allocation.status === 'active');

    // Apply project filter if specified
    if (projectFilter) {
      filtered = filtered.filter(allocation => allocation.project.id === projectFilter);
    }

    return filtered;
  }, [allocations, projectFilter]);

  // Stable row order during editing sessions
  const stableAllocations = useMemo(() => {
    if (isEditingSession && lockedRowOrder.length > 0) {
      // During editing, maintain the locked order but update with current data
      return lockedRowOrder.map(lockedAllocation => {
        const currentAllocation = activeAllocations.find(
          a => a.id === lockedAllocation.id
        );
        return currentAllocation || lockedAllocation;
      }).filter(allocation =>
        // Only keep allocations that still match current filters
        activeAllocations.some(aa => aa.id === allocation.id)
      );
    }
    return activeAllocations;
  }, [isEditingSession, lockedRowOrder, activeAllocations]);

  // Calculate total allocated hours per week across all projects
  const weeklyTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    activeAllocations.forEach(allocation => {
      const weeklyAllocations = allocation.weeklyAllocations || {};
      Object.entries(weeklyAllocations).forEach(([weekKey, hours]) => {
        totals[weekKey] = (totals[weekKey] || 0) + hours;
      });
    });

    return totals;
  }, [activeAllocations]);

  // Calculate real-time weekly totals including pending changes
  const realTimeWeeklyTotals = useMemo(() => {
    const totals = { ...weeklyTotals };

    // Apply pending changes to get real-time totals
    Object.entries(explicitSave.state.pendingChanges).forEach(([cellKey, change]) => {
      const [projectIdStr, weekKey] = cellKey.split('-');
      const projectId = parseInt(projectIdStr);

      // Find the allocation for this project to get the original value
      const allocation = activeAllocations.find(a => a.project.id === projectId);
      if (allocation && weekKey) {
        const originalValue = allocation.weeklyAllocations?.[weekKey] || 0;
        totals[weekKey] = (totals[weekKey] || 0) - originalValue + change.hours;
      }
    });

    return totals;
  }, [weeklyTotals, explicitSave.state.pendingChanges, activeAllocations]);

  // Keyboard navigation setup
  const {
    handleKeyDown: handleNavigationKeyDown,
    focusCell,
    clearCurrentCell
  } = useAllocationKeyboardNavigation({
    totalRows: stableAllocations.length,
    totalCols: weekColumns.length,
    getCellKey: (rowIndex: number, colIndex: number) => {
      const allocation = stableAllocations[rowIndex];
      const week = weekColumns[colIndex];
      return allocation && week ? `${allocation.project.id}-${week.key}` : '';
    },
    onCellFocus: (cellKey) => setEditingCell(cellKey),
    onCellBlur: (cellKey) => setEditingCell(null),
    onSaveAll: () => {
      // Save all pending changes using explicit save
      explicitSave.actions.saveAllChanges();
    }
  });



  // Start editing session - lock current row order
  const startEditingSession = useCallback(() => {
    if (!isEditingSession) {
      setIsEditingSession(true);
      setLockedRowOrder([...stableAllocations]);
    }
  }, [isEditingSession, stableAllocations]);

  // End editing session - unlock row order
  const endEditingSession = useCallback(() => {
    setIsEditingSession(false);
    setLockedRowOrder([]);
  }, []);

  // Enhanced cell editing with debounced save and validation
  const handleCellEdit = useCallback((projectId: number, weekKey: string, value: string, oldValue?: number) => {
    // Start editing session on first edit
    if (!isEditingSession) {
      startEditingSession();
    }

    const hours = Math.max(0, Math.min(40, parseFloat(value) || 0)); // Clamp between 0-40
    const cellKey = `${projectId}-${weekKey}`;



    // Add to pending changes using explicit save
    explicitSave.actions.addPendingChange(cellKey, {
      projectId,
      weekKey,
      hours,
      oldValue
    });

    // Check for effective capacity warning (but don't block the input)
    const currentProjectHours = stableAllocations.find(a => a.project.id === projectId)?.weeklyAllocations?.[weekKey] || 0;
    const warning = checkOverallocationWarning(resource, weekKey, hours, currentProjectHours);

    if (warning.hasWarning) {
      toast({
        title: warning.severity === 'error' ? "Capacity Exceeded" : "Capacity Warning",
        description: warning.message,
        variant: warning.severity === 'error' ? "destructive" : "default",
      });
    }

    // Optimistic update for immediate UI feedback
    syncAllocationChange({ resourceId, optimistic: true });
  }, [resource, weeklyTotals, toast, resourceId, syncAllocationChange, isEditingSession, startEditingSession, explicitSave.actions]);

  // Handle blur events - no auto-save in explicit mode
  const handleCellBlur = useCallback((projectId: number, weekKey: string) => {
    // End editing session after a delay if no more edits are happening
    setTimeout(() => {
      if (!explicitSave.state.hasUnsavedChanges) {
        endEditingSession();
      }
    }, 2000);
  }, [explicitSave.state.hasUnsavedChanges, endEditingSession]);



  // Keyboard navigation for cells
  const handleKeyDown = useCallback((e: React.KeyboardEvent, projectId: number, weekKey: string, weekIndex: number, allocationIndex: number) => {
    const currentValue = activeAllocations.find(a => a.project.id === projectId)?.weeklyAllocations?.[weekKey] || 0;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        handleCellEdit(projectId, weekKey, (currentValue + 0.5).toString(), currentValue);
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleCellEdit(projectId, weekKey, Math.max(0, currentValue - 0.5).toString(), currentValue);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (weekIndex > 0) {
          const prevWeekKey = weekColumns[weekIndex - 1].key;
          const prevCell = document.querySelector(`[data-cell="${projectId}-${prevWeekKey}"]`) as HTMLInputElement;
          prevCell?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (weekIndex < weekColumns.length - 1) {
          const nextWeekKey = weekColumns[weekIndex + 1].key;
          const nextCell = document.querySelector(`[data-cell="${projectId}-${nextWeekKey}"]`) as HTMLInputElement;
          nextCell?.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (allocationIndex < stableAllocations.length - 1) {
          const nextProjectId = stableAllocations[allocationIndex + 1].project.id;
          const nextCell = document.querySelector(`[data-cell="${nextProjectId}-${weekKey}"]`) as HTMLInputElement;
          nextCell?.focus();
        }
        break;
    }
  }, [activeAllocations, weekColumns, handleCellEdit]);





  // Format change for display in save controls
  const formatChangeForDisplay = useCallback((cellKey: string, change: any) => {
    const [projectIdStr, weekKey] = cellKey.split('-');
    const projectId = parseInt(projectIdStr);
    const allocation = stableAllocations.find(a => a.project.id === projectId);
    const week = weekColumns.find(w => w.key === weekKey);

    return {
      cellKey,
      projectName: allocation?.project.name || 'Unknown Project',
      weekLabel: week?.label || weekKey,
      oldValue: change.oldValue || 0,
      newValue: change.hours || 0
    };
  }, [stableAllocations, weekColumns]);

  // Auto-scroll to current week function
  const scrollToCurrentWeek = useCallback(() => {
    if (!tableRef.current || weekColumns.length === 0) {
      return;
    }

    const currentDate = new Date();
    const currentYear = getYear(currentDate);

    // Only scroll if we're viewing the current year
    if (selectedYear !== currentYear) {
      return;
    }

    // Find the current week by date range comparison
    let currentWeekIndex = -1;
    for (let i = 0; i < weekColumns.length; i++) {
      const week = weekColumns[i];
      if (week.weekStart && week.weekEnd) {
        if (currentDate >= week.weekStart && currentDate <= week.weekEnd) {
          currentWeekIndex = i;
          break;
        }
      }
    }

    // If we found the current week, scroll to it
    if (currentWeekIndex !== -1) {
      const tableContainer = tableRef.current;
      if (!tableContainer) return;

      // Calculate scroll position using actual DOM measurements
      const firstWeekHeader = tableContainer.querySelector('thead th:nth-child(3)'); // First week column
      const columnWidth = firstWeekHeader ? firstWeekHeader.offsetWidth : (fullscreen ? 96 : 80);

      // Calculate the width of the fixed columns (Project, Status)
      const projectCol = tableContainer.querySelector('thead th:nth-child(1)');
      const statusCol = tableContainer.querySelector('thead th:nth-child(2)');
      const fixedColumnsWidth = (projectCol?.offsetWidth || 0) + (statusCol?.offsetWidth || 0);

      // Position the current week about 1/3 from the left for optimal viewing
      const targetScrollLeft = Math.max(0, fixedColumnsWidth + (currentWeekIndex * columnWidth) - (tableContainer.clientWidth / 3));

      // Perform the scroll with smooth behavior
      tableContainer.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [weekColumns, selectedYear, fullscreen]);

  // Reset week offset when year changes
  useEffect(() => {
    setWeekOffset(getCurrentWeekOffset());
  }, [selectedYear, getCurrentWeekOffset]);

  // Auto-scroll to current week on load and year changes
  useEffect(() => {
    if (!tableRef.current || weekColumns.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollToCurrentWeek();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [scrollToCurrentWeek]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stableAllocations || stableAllocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No active allocations</p>
            <p className="text-sm">Weekly breakdown will appear when allocations are added</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className={fullscreen ? "" : "w-full overflow-hidden"}>
        <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Allocations
              {fullscreen && (
                <Badge variant="outline" className="ml-2">
                  Fullscreen Mode
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {fullscreen
                ? "Enhanced view for managing weekly resource allocations across multiple weeks"
                : readOnly
                  ? "Week-by-week allocation breakdown across all active projects"
                  : "Week-by-week breakdown of allocated hours per project with editing capabilities"
              }
            </p>
            {isEditingSession && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-2 w-fit">
                <Lock className="h-3 w-3" />
                <span>Row order locked during editing</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Week Navigation Controls */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(Math.max(0, weekOffset - WEEKS_TO_SHOW))}
                disabled={weekOffset === 0}
                className="h-7 px-2"
              >
                ←
              </Button>
              <span className="text-xs text-gray-600 px-2">
                Weeks {weekOffset + 1}-{Math.min(weekOffset + WEEKS_TO_SHOW, allWeekColumns.length)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(Math.min(allWeekColumns.length - WEEKS_TO_SHOW, weekOffset + WEEKS_TO_SHOW))}
                disabled={weekOffset + WEEKS_TO_SHOW >= allWeekColumns.length}
                className="h-7 px-2"
              >
                →
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentDate = new Date();
                const currentWeekIndex = allWeekColumns.findIndex(week => {
                  const weekStart = week.fullDate;
                  const weekEnd = addDays(weekStart, 6);
                  return currentDate >= weekStart && currentDate <= weekEnd;
                });
                if (currentWeekIndex >= 0) {
                  const newOffset = Math.max(0, Math.min(
                    allWeekColumns.length - WEEKS_TO_SHOW,
                    currentWeekIndex - Math.floor(WEEKS_TO_SHOW / 2)
                  ));
                  setWeekOffset(newOffset);
                }
              }}
              disabled={selectedYear !== new Date().getFullYear()}
            >
              Current Week
            </Button>

          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={tableRef}
          className={`overflow-x-auto overflow-y-auto rounded-lg border bg-gradient-to-br from-white to-gray-50/30 backdrop-blur-sm ${
            fullscreen
              ? "max-h-[calc(100vh-20rem)]"
              : "max-h-[600px]"
          }`}
          style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <table className="caption-bottom text-sm"
                 style={{
                   tableLayout: 'auto',
                   minWidth: 'max-content',
                   width: 'auto'
                 }}>
            <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b-2 border-gray-200"
                   style={{ position: 'sticky', top: 0 }}>
              <TableRow>
                <TableHead className={`${fullscreen ? "w-56" : "w-40"} bg-white/95 min-w-0`}>Project</TableHead>
                <TableHead className={`${fullscreen ? "w-32" : "w-24"} bg-white/95 min-w-0`}>Status</TableHead>
                {weekColumns.map(week => (
                  <TableHead key={week.key} className={`${fullscreen ? "w-20" : "w-16"} text-center bg-white/95 min-w-0`}>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center justify-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {week.label}
                      </div>
                      <div className="text-xs text-gray-500">{week.date}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
              {/* Weekly Totals Row */}
              <TableRow className="bg-blue-50/50 border-b-2 border-blue-200">
                <TableHead className="font-semibold text-blue-900 bg-blue-50/50">Total Allocated</TableHead>
                <TableHead className="bg-blue-50/50"></TableHead>
                {weekColumns.map(week => {
                  const totalHours = weeklyTotals[week.key] || 0;
                  const capacity = parseFloat(resource.weeklyCapacity);
                  const isOverCapacity = totalHours > capacity;
                  const isNearCapacity = totalHours > capacity * 0.8;
                  
                  return (
                    <TableHead key={week.key} className="text-center bg-blue-50/50">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`font-semibold text-sm px-2 py-1 rounded cursor-help ${
                            isOverCapacity
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : isNearCapacity
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-green-100 text-green-900 border border-green-300'
                          }`}>
                            {totalHours}h
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-medium">Week {week.label} Capacity</div>
                            <div>Total Allocated: {totalHours}h</div>
                            <div>Weekly Capacity: {capacity}h</div>
                            <div>Available: {Math.max(0, capacity - totalHours)}h</div>
                            {isOverCapacity && (
                              <div className="text-red-600 font-medium mt-1">
                                ⚠️ Over-allocated by {totalHours - capacity}h
                              </div>
                            )}
                            {isNearCapacity && !isOverCapacity && (
                              <div className="text-amber-600 font-medium mt-1">
                                ⚡ Near capacity ({((totalHours / capacity) * 100).toFixed(1)}%)
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  );
                })}
              </TableRow>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {stableAllocations.map((allocation, index) => (
                <TableRow key={allocation.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{allocation.project.name}</div>
                      <Link href={`/projects/${allocation.project.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={allocation.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {allocation.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {allocation.status}
                    </Badge>
                  </TableCell>
                  {weekColumns.map((week, weekIndex) => {
                    const cellKey = `${allocation.project.id}-${week.key}`;
                    const pendingValue = explicitSave.state.pendingChanges[cellKey];
                    const currentHours = pendingValue ? pendingValue.hours : (allocation.weeklyAllocations?.[week.key] || 0);

                    // Calculate effective capacity warning for this specific project allocation
                    const currentProjectHours = allocation.weeklyAllocations?.[week.key] || 0;
                    const overallocationWarning = checkOverallocationWarning(
                      resource,
                      week.key,
                      currentHours,
                      currentProjectHours
                    );
                    const capacityStatus = getCapacityStatus(
                      resource,
                      week.key,
                      currentHours,
                      currentProjectHours
                    );

                    const totalWeekHours = weeklyTotals[week.key] || 0; // Keep saved totals for some displays
                    const realTimeTotalWeekHours = realTimeWeeklyTotals[week.key] || 0;
                    const capacity = parseFloat(resource.weeklyCapacity);
                    const isOverCapacity = realTimeTotalWeekHours > capacity; // Use real-time for overallocation check
                    const isSaving = explicitSave.state.savingCells.has(cellKey);
                    const isSaved = explicitSave.state.savedCells.has(cellKey);
                    const hasFailed = explicitSave.state.failedCells.has(cellKey);
                    const hasPendingChanges = !!pendingValue;

                    // Calculate utilization data for the bar using real-time totals
                    const utilizationData = useUtilizationData(
                      resource,
                      week.key,
                      currentHours,
                      realTimeTotalWeekHours,
                      week.label
                    );



                    return (
                      <TableCell key={week.key} className="text-center p-1">
                        <div className="relative group">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                {readOnly ? (
                                  <div className="space-y-1">
                                    <div
                                      className={`${fullscreen ? "w-20" : "w-16"} h-9 text-center text-sm font-medium flex items-center justify-center rounded border transition-all duration-200 ${
                                        currentHours > 0
                                          ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-900'
                                          : 'bg-white border-gray-200'
                                      } ${
                                        isOverCapacity && currentHours > 0
                                          ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 text-red-900'
                                          : ''
                                      }`}
                                    >
                                      {currentHours > 0 ? `${currentHours}h` : '—'}
                                    </div>
                                    {/* Utilization bar for read-only cells - always show for consistency */}
                                    <div className="px-1">
                                      <UtilizationBar
                                        data={utilizationData}
                                        className="h-1"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <AllocationInput
                                    value={currentHours || 0}
                                    onChange={(newValueStr, oldValue) => {
                                      handleCellEdit(allocation.project.id, week.key, newValueStr, oldValue);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        handleCellBlur(allocation.project.id, week.key);
                                      }
                                      // Use navigation keyboard handler
                                      handleNavigationKeyDown(e, index, weekIndex);
                                      // Also call the original handler for stepper functionality
                                      handleKeyDown(e, allocation.project.id, week.key, weekIndex, index);
                                    }}
                                    onFocus={() => setEditingCell(cellKey)}
                                    onBlur={() => {
                                      setEditingCell(null);
                                      handleCellBlur(allocation.project.id, week.key);
                                    }}
                                    cellKey={cellKey}
                                    isFocused={editingCell === cellKey}
                                    isSaving={isSaving}
                                    isSaved={isSaved}
                                    hasPendingChanges={hasPendingChanges}
                                    isOverCapacity={overallocationWarning.hasWarning && !isSaving && !isSaved && !hasFailed}
                                    capacityWarning={overallocationWarning.message}
                                    fullscreen={fullscreen}
                                    min={0}
                                    max={40}
                                    step={0.5}
                                    className={`
                                      ${editingCell === cellKey ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''}
                                      ${overallocationWarning.hasWarning && !isSaving && !isSaved && !hasFailed ? capacityStatus.className : ''}
                                    `}
                                  />
                                )}

                                {/* Real-time utilization bar */}
                                {!readOnly && (
                                  <div className="mt-1 px-1">
                                    <UtilizationBar
                                      data={utilizationData}
                                      className="h-1"
                                    />
                                  </div>
                                )}

                                {/* Status indicators */}
                                {isSaving && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute -top-1 -left-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Saving...</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {isSaved && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute -top-1 -left-1 h-3 w-3 bg-green-500 rounded-full" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Saved</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {hasFailed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute -top-1 -left-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                                        <X className="h-2 w-2 text-white" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Save failed - click to retry</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {hasPendingChanges && !isSaving && !isSaved && !hasFailed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="absolute -top-1 -left-1 h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">*</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Unsaved changes - click Save All to persist</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">{allocation.project.name}</div>
                                <div>Week {week.label}: {currentHours}h</div>
                                <div>Total week capacity: {realTimeTotalWeekHours}h / {capacity}h</div>
                                {isOverCapacity && (
                                  <div className="text-red-600 font-medium mt-1">
                                    ⚠️ Week over-allocated
                                  </div>
                                )}
                                {currentHours === 0 && (
                                  <div className="text-gray-500 mt-1">
                                    No hours allocated this week
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

      {/* Explicit Save Controls */}
      <ExplicitSaveControls
        state={explicitSave.state}
        onSaveAll={explicitSave.actions.saveAllChanges}
        onDiscardAll={explicitSave.actions.discardAllChanges}
        onRetryFailed={explicitSave.actions.retryFailedSaves}
        formatChange={formatChangeForDisplay}
        position="floating"
        showDetails={true}
      />

      {/* Navigation Guard Dialog */}
      <NavigationGuardDialog
        open={navigationGuard.showConfirmDialog}
        onOpenChange={navigationGuard.confirmDialogProps.onOpenChange}
        pendingCount={explicitSave.state.pendingCount}
        navigationAction={navigationGuard.navigationAction}
        onSaveAndContinue={navigationGuard.handleSaveAndContinue}
        onDiscardAndContinue={navigationGuard.handleDiscardAndContinue}
        onCancel={navigationGuard.handleCancel}
      />
      </div>
    </TooltipProvider>
  );
}
