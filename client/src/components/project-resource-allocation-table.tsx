import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addWeeks, startOfWeek, getWeek, getYear, startOfYear, endOfYear, addDays, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { apiRequest, cacheInvalidation } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAllocationKeyboardNavigation } from "@/hooks/use-allocation-keyboard-navigation";
import { useExplicitAllocationSave } from "@/hooks/use-explicit-allocation-save";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { ExplicitSaveControls, NavigationGuardDialog } from "./explicit-save-controls";
import { ResourceAllocation, Resource, Project } from "@shared/schema";
import { Plus, Trash2, Filter, Users, Info, ChevronUp, ChevronDown, Calendar, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { ResourceCapacityDetailRow } from "./resource-capacity-detail-row";
import { useResourceAvailability } from "@/hooks/use-resource-availability";
import { useEffectiveCapacity } from "@/hooks/use-effective-capacity";
import { UtilizationBar, useUtilizationData } from "@/components/utilization-bar";
import { AllocationInput } from "@/components/allocation-input";
import { SmartSortingDropdown, SortOption } from "@/components/smart-sorting-dropdown";
import { sortResourceAllocations, getSortingStatistics } from "@/lib/resource-sorting-utils";

interface ProjectResourceAllocationTableProps {
  projectId: number;
  fullscreen?: boolean;
}

interface AllocationWithResource extends ResourceAllocation {
  resource: Resource;
  weeklyAllocations?: Record<string, number>;
}

interface WeeklyAllocationData {
  [resourceId: number]: {
    [weekKey: string]: number; // weekKey format: "2024-W27"
  };
}

export function ProjectResourceAllocationTable({ projectId, fullscreen = false }: ProjectResourceAllocationTableProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Initialize sort option from localStorage or default to name-asc
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resourceAllocation.sortOption');
      return (saved as SortOption) || "name-asc";
    }
    return "name-asc";
  });

  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [newResourceRole, setNewResourceRole] = useState<string>("");

  const [stickyHeader, setStickyHeader] = useState(false);
  const [isTableScrolled, setIsTableScrolled] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedResourceId, setExpandedResourceId] = useState<number | null>(null);

  // Save sort option to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resourceAllocation.sortOption', sortOption);
    }
  }, [sortOption]);

  // Explicit save workflow
  const explicitSave = useExplicitAllocationSave({
    mutationFn: async ({ resourceId, weekKey, hours }: { resourceId: number; weekKey: string; hours: number }) => {
      console.log(`[CLIENT] Project allocation save: projectId=${projectId}, resourceId=${resourceId}, weekKey=${weekKey}, hours=${hours}`);
      const response = await apiRequest(`/api/projects/${projectId}/weekly-allocations`, {
        method: 'PUT',
        body: JSON.stringify({ resourceId, weekKey, hours }),
      });
      console.log(`[CLIENT] Project allocation save response:`, response);
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
      await cacheInvalidation.invalidateAllocationRelatedData(undefined, projectId);

      // End editing session when all changes are saved
      endEditingSession();
    }
  });

  // State for locking row order during editing
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [lockedRowOrder, setLockedRowOrder] = useState<AllocationWithResource[]>([]);

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

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  // Fetch project allocations with resource details
  const { data: allocations = [], isLoading } = useQuery<AllocationWithResource[]>({
    queryKey: ["/api/projects", projectId, "allocations"],
    queryFn: () => apiRequest(`/api/projects/${projectId}/allocations`),
  });

  // Fetch all resources for adding new allocations
  const { data: allResources = [] } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  // Generate week columns for a windowed view (showing 16 weeks at a time)
  const [weekOffset, setWeekOffset] = useState(0);
  const WEEKS_TO_SHOW = fullscreen ? 20 : 16;

  const allWeekColumns = useMemo(() => {
    const weeks = [];

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

  // Get current week key for availability indicator
  const currentWeekKey = useMemo(() => {
    const currentDate = new Date();
    const currentYear = getYear(currentDate);
    const currentWeekNum = getWeek(currentDate, { weekStartsOn: 1 });
    return `${currentYear}-W${currentWeekNum.toString().padStart(2, '0')}`;
  }, []);

  // Handle expanding/collapsing resource capacity details
  const handleToggleExpand = useCallback((resourceId: number, isExpanded: boolean) => {
    setExpandedResourceId(isExpanded ? resourceId : null);
  }, []);

  // Enhanced auto-scroll to current week function with improved UX
  const scrollToCurrentWeek = useCallback(() => {
    // Validate prerequisites
    if (!tableRef.current || weekColumns.length === 0) {
      return;
    }

    const currentDate = new Date();
    const currentYear = getYear(currentDate);

    // If we're not viewing the current year, switch to current year first
    if (selectedYear !== currentYear) {
      setSelectedYear(currentYear);
      // The useEffect will handle scrolling after year change
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

    if (currentWeekIndex === -1) {
      return;
    }

    const tableContainer = tableRef.current;

    // Use dual-strategy approach for maximum reliability
    const performScroll = () => {
      // Strategy 1: Calculate based on column widths
      const firstWeekHeader = tableContainer.querySelector('thead th:nth-child(4)');
      const columnWidth = firstWeekHeader ? firstWeekHeader.offsetWidth : (fullscreen ? 96 : 80);

      // Calculate fixed columns width
      const resourceCol = tableContainer.querySelector('thead th:nth-child(1)');
      const roleCol = tableContainer.querySelector('thead th:nth-child(2)');
      const departmentCol = tableContainer.querySelector('thead th:nth-child(3)');
      const fixedColumnsWidth = (resourceCol?.offsetWidth || 0) + (roleCol?.offsetWidth || 0) + (departmentCol?.offsetWidth || 0);

      // Calculate target position - center the current week for optimal viewing
      const targetScrollLeft = Math.max(0, fixedColumnsWidth + (currentWeekIndex * columnWidth) - (tableContainer.clientWidth / 2));

      // Perform the scroll
      tableContainer.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    };

    // Execute primary scroll strategy
    performScroll();

    // Fallback strategy: Direct element scrolling for additional reliability
    setTimeout(() => {
      const currentWeekHeader = tableContainer.querySelector(`thead th:nth-child(${4 + currentWeekIndex})`);
      if (currentWeekHeader) {
        currentWeekHeader.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);

  }, [weekColumns, selectedYear, fullscreen, setSelectedYear]);

  // Auto-scroll to current week on load and year changes
  useEffect(() => {
    // Only proceed if we have the necessary data
    if (!tableRef.current || weekColumns.length === 0) {
      return;
    }

    // Use a timeout to ensure the table is fully rendered
    const timeoutId = setTimeout(() => {
      scrollToCurrentWeek();
    }, 300); // Reduced timeout for better responsiveness

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [scrollToCurrentWeek]);

  // Handle horizontal scroll to show/hide sticky column shadow
  useEffect(() => {
    const scrollContainer = tableRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      setIsTableScrolled(scrollLeft > 0);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter and sort allocations based on selected filters and sorting option
  const filteredAndSortedAllocations = useMemo(() => {
    // First, filter based on department and role
    const filtered = allocations.filter(allocation => {
      const departmentMatch = selectedDepartment === "all" || allocation.resource.department === selectedDepartment;
      const roleMatch = selectedRole === "all" || allocation.role === selectedRole;
      return departmentMatch && roleMatch;
    });

    // Then, sort the filtered results
    return sortResourceAllocations(filtered, weekColumns, sortOption);
  }, [allocations, selectedDepartment, selectedRole, sortOption, weekColumns]);

  // Stable row order during editing sessions
  const stableAllocations = useMemo(() => {
    if (isEditingSession && lockedRowOrder.length > 0) {
      // During editing, maintain the locked order but update with current data
      return lockedRowOrder.map(lockedAllocation => {
        const currentAllocation = filteredAndSortedAllocations.find(
          a => a.id === lockedAllocation.id
        );
        return currentAllocation || lockedAllocation;
      }).filter(allocation =>
        // Only keep allocations that still match current filters
        filteredAndSortedAllocations.some(fa => fa.id === allocation.id)
      );
    }
    return filteredAndSortedAllocations;
  }, [isEditingSession, lockedRowOrder, filteredAndSortedAllocations]);

  // Get resource IDs for availability calculation (must come after stableAllocations)
  const resourceIds = useMemo(() =>
    stableAllocations.map(allocation => allocation.resource.id),
    [stableAllocations]
  );

  // Fetch comprehensive availability data across all projects
  const { getResourceWeeklyAllocations } = useResourceAvailability(resourceIds);

  // Get effective capacity calculations for real-time overallocation warnings
  const resources = useMemo(() =>
    stableAllocations.map(allocation => allocation.resource),
    [stableAllocations]
  );
  const { checkOverallocationWarning, getCapacityStatus } = useEffectiveCapacity(resources);

  // Keyboard navigation setup (after filteredAllocations and weekColumns are defined)
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
      return allocation && week ? `${allocation.resource.id}-${week.key}` : '';
    },
    onCellFocus: (cellKey) => setEditingCell(cellKey),
    onCellBlur: (cellKey) => setEditingCell(null),
    onSaveAll: () => {
      // Save all pending changes using explicit save
      explicitSave.actions.saveAllChanges();
    }
  });

  // Get unique departments and roles for filters
  const departments = useMemo(() => {
    const depts = new Set(allocations.map(a => a.resource.department));
    return Array.from(depts);
  }, [allocations]);

  const roles = useMemo(() => {
    const roleSet = new Set(allocations.map(a => a.role).filter(Boolean));
    return Array.from(roleSet);
  }, [allocations]);

  // Get available resources (not already assigned to this project)
  const availableResources = useMemo(() => {
    const assignedResourceIds = new Set(allocations.map(a => a.resource.id));
    return allResources.filter(resource => !assignedResourceIds.has(resource.id) && resource.isActive);
  }, [allResources, allocations]);


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
  const handleCellEdit = useCallback((resourceId: number, weekKey: string, value: string, oldValue?: number) => {
    // Start editing session on first edit
    if (!isEditingSession) {
      startEditingSession();
    }

    const hours = Math.max(0, Math.min(40, parseFloat(value) || 0)); // Clamp between 0-40
    const cellKey = `${resourceId}-${weekKey}`;



    // Add to pending changes using explicit save
    explicitSave.actions.addPendingChange(cellKey, {
      resourceId,
      weekKey,
      hours,
      oldValue
    });

    // Check for effective capacity warning (but don't block the input)
    const resource = filteredAndSortedAllocations.find(a => a.resource.id === resourceId)?.resource;
    if (resource) {
      const currentProjectHours = filteredAndSortedAllocations.find(a => a.resource.id === resourceId)?.weeklyAllocations?.[weekKey] || 0;
      const warning = checkOverallocationWarning(resource, weekKey, hours, currentProjectHours);

      if (warning.hasWarning) {
        toast({
          title: warning.severity === 'error' ? "Capacity Exceeded" : "Capacity Warning",
          description: warning.message,
          variant: warning.severity === 'error' ? "destructive" : "default",
        });
      }
    }
  }, [filteredAndSortedAllocations, toast, isEditingSession, startEditingSession, explicitSave.actions]);

  // Handle blur events - no auto-save in explicit mode
  const handleCellBlur = useCallback((resourceId: number, weekKey: string) => {
    // End editing session after a delay if no more edits are happening
    setTimeout(() => {
      if (!explicitSave.state.hasUnsavedChanges) {
        endEditingSession();
      }
    }, 2000);
  }, [explicitSave.state.hasUnsavedChanges, endEditingSession]);



  // Format change for display in unsaved changes indicator
  const formatChangeForDisplay = useCallback((cellKey: string, change: any) => {
    const [resourceIdStr, weekKey] = cellKey.split('-');
    const resourceId = parseInt(resourceIdStr);
    const allocation = filteredAndSortedAllocations.find(a => a.resource.id === resourceId);
    const week = weekColumns.find(w => w.key === weekKey);

    return {
      cellKey,
      resourceName: allocation?.resource.name || 'Unknown Resource',
      weekLabel: week?.label || weekKey,
      oldValue: change.oldValue || 0,
      newValue: change.hours || 0
    };
  }, [filteredAndSortedAllocations, weekColumns]);



  // Keyboard navigation and shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, resourceId: number, weekKey: string, weekIndex: number, resourceIndex: number) => {
    const currentValue = filteredAndSortedAllocations.find(a => a.resource.id === resourceId)?.weeklyAllocations?.[weekKey] || 0;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        handleCellEdit(resourceId, weekKey, (currentValue + 0.5).toString(), currentValue);
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleCellEdit(resourceId, weekKey, Math.max(0, currentValue - 0.5).toString(), currentValue);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (weekIndex > 0) {
          const prevWeekKey = weekColumns[weekIndex - 1].key;
          const prevCell = document.querySelector(`[data-cell="${resourceId}-${prevWeekKey}"]`) as HTMLInputElement;
          prevCell?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (weekIndex < weekColumns.length - 1) {
          const nextWeekKey = weekColumns[weekIndex + 1].key;
          const nextCell = document.querySelector(`[data-cell="${resourceId}-${nextWeekKey}"]`) as HTMLInputElement;
          nextCell?.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (resourceIndex < stableAllocations.length - 1) {
          const nextResourceId = stableAllocations[resourceIndex + 1].resource.id;
          const nextCell = document.querySelector(`[data-cell="${nextResourceId}-${weekKey}"]`) as HTMLInputElement;
          nextCell?.focus();
        }
        break;
    }
  }, [filteredAndSortedAllocations, weekColumns, handleCellEdit]);





  const addResourceToProject = useMutation({
    mutationFn: async ({ resourceId, role }: { resourceId: number; role: string }) => {
      if (!project) throw new Error('Project not found');

      return apiRequest('/api/allocations', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId,
          resourceId: resourceId,
          allocatedHours: "0", // Default to 0, will be set via weekly allocations
          startDate: project.startDate,
          endDate: project.endDate,
          role: role,
          status: 'active',
        }),
      });
    },
    onSuccess: async () => {
      // Invalidate all allocation-related data including dashboard
      await cacheInvalidation.invalidateAllocationRelatedData(undefined, projectId);
      setAddResourceDialogOpen(false);
      setSelectedResourceId(null);
      setNewResourceRole("");
      toast({
        title: "Success",
        description: "Resource added to project",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add resource to project",
        variant: "destructive",
      });
    },
  });

  const removeResourceAllocation = useMutation({
    mutationFn: (allocationId: number) => apiRequest(`/api/allocations/${allocationId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "allocations"] });
      toast({
        title: "Success",
        description: "Resource removed from project",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove resource",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={fullscreen ? "h-[calc(100vh-12rem)]" : "allocation-table-container"}>
        <CardHeader className={fullscreen ? "pb-4" : ""}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resource Allocations
                {fullscreen && (
                  <Badge variant="outline" className="ml-2">
                    Fullscreen Mode
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {fullscreen
                  ? "Enhanced view for managing weekly resource allocations across multiple weeks"
                  : "Manage weekly resource allocations for this project"
                }
              </p>

              {/* Year Navigation */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm font-medium text-gray-700">Year:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedYear(prev => prev - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="outline" className="px-3 py-1 font-medium">
                    {selectedYear}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedYear(prev => prev + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Week Navigation Controls */}
                <div className="flex items-center gap-2 ml-3">
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

                  {/* Navigate to Current Week Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollToCurrentWeek}
                    className="h-7 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                    title="Navigate to current week"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Current Week
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">

              <Dialog open={addResourceDialogOpen} onOpenChange={setAddResourceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Resource to Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Select a resource to add to this project. You can configure their weekly allocations after adding them.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="resource-select">Resource</Label>
                      <Select value={selectedResourceId?.toString() || ""} onValueChange={(value) => setSelectedResourceId(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resource" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableResources.map(resource => (
                            <SelectItem key={resource.id} value={resource.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={resource.profileImage || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {resource.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-medium">{resource.name}</span>
                                  <span className="text-sm text-gray-500 ml-2">({resource.department})</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-input">Role (Optional)</Label>
                      <Input
                        id="role-input"
                        placeholder="e.g., Frontend Developer, Project Manager"
                        value={newResourceRole}
                        onChange={(e) => setNewResourceRole(e.target.value)}
                      />
                    </div>

                    {availableResources.length === 0 && (
                      <div className="text-center py-4">
                        <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">All active resources are already assigned to this project.</p>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddResourceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => selectedResourceId && addResourceToProject.mutate({ resourceId: selectedResourceId, role: newResourceRole })}
                      disabled={!selectedResourceId || addResourceToProject.isPending}
                    >
                      {addResourceToProject.isPending ? "Adding..." : "Add Resource"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Filters */}
          <div className={`flex items-center gap-4 mt-4 ${fullscreen ? 'flex-wrap' : ''}`}>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className={fullscreen ? "w-56" : "w-48"}>
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className={fullscreen ? "w-56" : "w-48"}>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sorting Section */}
            <div className="border-l border-gray-200 pl-4 ml-2">
              <SmartSortingDropdown
                value={sortOption}
                onChange={setSortOption}
                fullscreen={fullscreen}
              />
            </div>

            {fullscreen && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>Showing {stableAllocations.length} resources across {weekColumns.length} weeks</span>
                {isEditingSession && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                    <Lock className="h-3 w-3" />
                    <span>Row order locked during editing</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {stableAllocations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Resources Assigned</h3>
              <p className="text-gray-600 mb-4">
                Start by adding resources to this project to manage their weekly allocations.
              </p>
              <Button onClick={() => setAddResourceDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Resource
              </Button>
            </div>
          ) : (
            <div
              ref={tableRef}
              className={`overflow-x-auto overflow-y-auto rounded-lg border bg-gradient-to-br from-white to-gray-50/30 backdrop-blur-sm ${
                fullscreen
                  ? "max-h-[calc(100vh-20rem)]"
                  : "max-h-[600px]"
              } ${isTableScrolled ? "table-scrolled" : ""}`}
              style={{
                width: '100%',
                maxWidth: '100%'
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
                    <TableHead className={`${fullscreen ? "w-56" : "w-48"} sticky-column-header`}>Resource</TableHead>
                    <TableHead className={`${fullscreen ? "w-36" : "w-32"} bg-white/95`}>Role</TableHead>
                    <TableHead className={`${fullscreen ? "w-44" : "w-40"} bg-white/95`}>Department</TableHead>
                    {weekColumns.map(week => (
                      <TableHead key={week.key} className={`${fullscreen ? "w-20" : "w-16"} text-center bg-white/95`}>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {week.label}
                          </div>
                          <div className="text-xs text-gray-500">{week.date}</div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className={`${fullscreen ? "w-24" : "w-20"} bg-white/95`}>Actions</TableHead>
                  </TableRow>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {stableAllocations.map((allocation, index) => (
                    <React.Fragment key={allocation.id}>
                      <TableRow className={index % 2 === 0 ? "bg-gray-50/50" : ""}>
                      <TableCell className="sticky-column">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={allocation.resource.profileImage || undefined} />
                            <AvatarFallback>
                              {allocation.resource.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{allocation.resource.name}</p>
                            <p className="text-sm text-gray-600">{allocation.resource.email}</p>

                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap max-w-full truncate">
                          {allocation.role || 'Unspecified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{allocation.resource.department}</span>
                      </TableCell>
                      {weekColumns.map((week, weekIndex) => {
                        const cellKey = `${allocation.resource.id}-${week.key}`;
                        const pendingValue = explicitSave.state.pendingChanges[cellKey];
                        const currentHours = pendingValue ? pendingValue.hours : (allocation.weeklyAllocations?.[week.key] || 0);

                        // Calculate effective capacity warning
                        const currentProjectHours = allocation.weeklyAllocations?.[week.key] || 0;
                        const overallocationWarning = checkOverallocationWarning(
                          allocation.resource,
                          week.key,
                          currentHours,
                          currentProjectHours
                        );
                        const capacityStatus = getCapacityStatus(
                          allocation.resource,
                          week.key,
                          currentHours,
                          currentProjectHours
                        );

                        const isSaving = explicitSave.state.savingCells.has(cellKey);
                        const isSaved = explicitSave.state.savedCells.has(cellKey);
                        const hasFailed = explicitSave.state.failedCells.has(cellKey);
                        const hasPendingChanges = !!pendingValue;

                        // Calculate utilization data for the bar with real-time pending changes
                        // Start with saved total allocated hours for this resource/week across all projects
                        const savedTotalAllocatedHours = getResourceWeeklyAllocations(allocation.resource.id)[week.key] || 0;

                        // For project allocation table, we only have pending changes for the current project
                        // The cell key format is "resourceId-weekKey" and represents this project's allocation
                        let realTimeTotalAllocatedHours = savedTotalAllocatedHours;

                        // Apply the pending change for this specific resource/week in this project
                        const currentCellKey = `${allocation.resource.id}-${week.key}`;
                        const currentPendingChange = explicitSave.state.pendingChanges[currentCellKey];

                        if (currentPendingChange) {
                          // Replace the saved value for this project with the pending value
                          const savedCurrentProjectHours = allocation.weeklyAllocations?.[week.key] || 0;
                          realTimeTotalAllocatedHours = realTimeTotalAllocatedHours - savedCurrentProjectHours + currentPendingChange.hours;
                        }

                        const utilizationData = useUtilizationData(
                          allocation.resource,
                          week.key,
                          currentHours,
                          realTimeTotalAllocatedHours,
                          week.label
                        );

                        return (
                          <TableCell key={week.key} className="text-center p-1">
                            <div className="relative group">
                              <div className="relative">
                                <AllocationInput
                                  value={currentHours || 0}
                                  onChange={(newValueStr, oldValue) => {
                                    handleCellEdit(allocation.resource.id, week.key, newValueStr, oldValue);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                      handleCellBlur(allocation.resource.id, week.key);
                                    }
                                    // Use navigation keyboard handler
                                    handleNavigationKeyDown(e, index, weekIndex);
                                    // Also call the original handler for stepper functionality
                                    handleKeyDown(e, allocation.resource.id, week.key, weekIndex, index);
                                  }}
                                  onFocus={() => setEditingCell(cellKey)}
                                  onBlur={() => {
                                    setEditingCell(null);
                                    handleCellBlur(allocation.resource.id, week.key);
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
                              </div>

                              {/* Real-time utilization bar - always show for consistency */}
                              <div className="mt-1 px-1">
                                <UtilizationBar
                                  data={utilizationData}
                                  className="h-1"
                                />
                              </div>

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
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeResourceAllocation.mutate(allocation.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove from project</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Detail Row */}
                    {expandedResourceId === allocation.resource.id && (
                      <TableRow>
                        <TableCell colSpan={weekColumns.length + 4} className="p-0 border-0">
                          <ResourceCapacityDetailRow
                            resource={allocation.resource}
                            weekKey={currentWeekKey}
                            currentWeekAllocations={allocation.weeklyAllocations || {}}
                            allResourceAllocations={getResourceWeeklyAllocations(allocation.resource.id)}
                            isCurrentWeek={true}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                  ))}

                  {/* Enhanced Summary Row */}
                  {stableAllocations.length > 0 && (
                    <>
                      <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 font-medium border-t-2 border-gray-300">
                        <TableCell className="sticky-column text-right">
                          <span className="text-sm font-semibold text-gray-700">
                            Total Hours:
                            {fullscreen && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({stableAllocations.length} resources)
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                        {weekColumns.map(week => {
                          const totalHours = filteredAndSortedAllocations.reduce((sum, allocation) => {
                            return sum + (allocation.weeklyAllocations?.[week.key] || 0);
                          }, 0);

                          return (
                            <TableCell key={week.key} className="text-center">
                              <Badge
                                variant={totalHours > 0 ? "default" : "outline"}
                                className={`${
                                  totalHours > 0
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                                    : ''
                                }`}
                              >
                                {totalHours}h
                              </Badge>
                            </TableCell>
                          );
                        })}
                        <TableCell></TableCell>
                      </TableRow>


                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsaved Changes Indicator */}
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
    </TooltipProvider>
  );
}
