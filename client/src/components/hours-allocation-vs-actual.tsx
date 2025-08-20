import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Calendar,

  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, getWeek, getYear, addWeeks, startOfQuarter, endOfQuarter } from "date-fns";
import { getPeriodInfo, type PeriodFilter } from "@/lib/period-utils";
import { apiRequest } from "@/lib/queryClient";


interface AllocationData {
  resourceId: number;
  resourceName: string;
  department: string;
  projectId: number;
  projectName: string;
  allocatedHours: number;
  actualHours: number;
  variance: number;
  variancePercentage: number;
  utilization: number;
  capacity: number;
  status: 'over' | 'under' | 'on-track';
}

interface HoursAllocationVsActualProps {
  className?: string;
  periodFilter?: PeriodFilter; // Accept period filter from parent dashboard
  isTransitioning?: boolean; // Accept transition state from parent dashboard
}

export function HoursAllocationVsActual({ className, periodFilter = 'currentWeek', isTransitioning = false }: HoursAllocationVsActualProps) {
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showAllResources, setShowAllResources] = useState(false);

  // Calculate date range based on global period filter using shared utility
  const dateRange = useMemo(() => {
    const periodInfo = getPeriodInfo(periodFilter);
    return {
      start: periodInfo.startDate,
      end: periodInfo.endDate,
      label: periodInfo.label
    };
  }, [periodFilter]);

  // Debug logging for period changes and data
  useEffect(() => {
    console.log('📊 [HOURS_ALLOCATION] Period filter changed:', {
      periodFilter,
      dateRange: dateRange.label,
      startDate: dateRange.start,
      endDate: dateRange.end
    });
  }, [periodFilter, dateRange]);

  // Fetch allocations data with date range parameters
  const { data: allocations = [], isLoading: allocationsLoading, error: allocationsError } = useQuery({
    queryKey: ["/api/allocations", dateRange.start, dateRange.end],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      return await apiRequest(`/api/allocations?${params}`);
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch time entries data
  const { data: timeEntries = [], isLoading: timeEntriesLoading, error: timeEntriesError } = useQuery({
    queryKey: ["/api/time-entries", dateRange.start, dateRange.end],
    queryFn: async () => {
      return await apiRequest('/api/time-entries');
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch resources for department filtering
  const { data: resources = [], error: resourcesError } = useQuery({
    queryKey: ["/api/resources"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch projects
  const { data: projects = [], error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Process and combine data
  const processedData = useMemo(() => {
    if (!allocations.length) return [];

    const dataMap = new Map<string, AllocationData>();

    // Filter allocations by date range and process
    allocations.forEach((allocation: any) => {
      // Check if allocation is active in the selected date range
      const allocStart = new Date(allocation.startDate);
      const allocEnd = new Date(allocation.endDate);
      const rangeStart = new Date(dateRange.start);
      const rangeEnd = new Date(dateRange.end);

      if (allocStart <= rangeEnd && allocEnd >= rangeStart) {
        const key = `${allocation.resourceId}-${allocation.projectId}`;

        const resource = resources.find((r: any) => r.id === allocation.resourceId);
        const project = projects.find((p: any) => p.id === allocation.projectId);

        if (resource && project) {
          // Calculate allocated hours for the period
          let allocatedHours = 0;

          // Use the base allocated hours if no weekly breakdown is available
          if (allocation.weeklyAllocations && Object.keys(allocation.weeklyAllocations).length > 0) {
            if (periodFilter === 'currentWeek') {
              // For weekly view, get the specific week's allocation
              const weekNumber = getWeek(rangeStart, { weekStartsOn: 1 });
              const year = getYear(rangeStart);
              const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
              allocatedHours = allocation.weeklyAllocations[weekKey] || 0;
            } else {
              // For longer periods, sum up all weeks in the period
              const weekKeys = [];
              let currentWeek = startOfWeek(rangeStart, { weekStartsOn: 1 });
              const periodEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 });

              while (currentWeek <= periodEnd) {
                const weekNumber = getWeek(currentWeek, { weekStartsOn: 1 });
                const year = getYear(currentWeek);
                const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
                weekKeys.push(weekKey);
                currentWeek = addWeeks(currentWeek, 1);
              }

              allocatedHours = weekKeys.reduce((sum, weekKey) => {
                return sum + (allocation.weeklyAllocations[weekKey] || 0);
              }, 0);
            }
          } else {
            // Fallback to base allocated hours if no weekly breakdown
            allocatedHours = parseFloat(allocation.allocatedHours) || 0;
          }

          dataMap.set(key, {
            resourceId: allocation.resourceId,
            resourceName: resource.name,
            department: resource.department,
            projectId: allocation.projectId,
            projectName: project.name,
            allocatedHours,
            actualHours: 0,
            variance: 0,
            variancePercentage: 0,
            utilization: 0,
            capacity: parseFloat(resource.weeklyCapacity) || 40,
            status: 'on-track'
          });
        }
      }
    });

    // Process time entries and filter by date range
    timeEntries.forEach((entry: any) => {
      const entryDate = new Date(entry.weekStartDate);
      const rangeStart = new Date(dateRange.start);
      const rangeEnd = new Date(dateRange.end);

      // Check if time entry is within the selected date range
      if (entryDate >= rangeStart && entryDate <= rangeEnd) {
        // Find the allocation for this time entry
        const allocation = allocations.find((a: any) => a.id === entry.allocationId);
        if (allocation) {
          const project = projects.find((p: any) => p.id === allocation.projectId);
          if (project) {
            const key = `${entry.resourceId}-${allocation.projectId}`;

            let existing = dataMap.get(key);
            if (!existing) {
              // Create entry if it doesn't exist (for cases where there are time entries but no allocations)
              const resource = resources.find((r: any) => r.id === entry.resourceId);
              if (resource) {
                existing = {
                  resourceId: entry.resourceId,
                  resourceName: resource.name,
                  department: resource.department,
                  projectId: allocation.projectId,
                  projectName: project.name,
                  allocatedHours: 0,
                  actualHours: 0,
                  variance: 0,
                  variancePercentage: 0,
                  utilization: 0,
                  capacity: parseFloat(resource.weeklyCapacity) || 40,
                  status: 'on-track'
                };
                dataMap.set(key, existing);
              }
            }

            if (existing) {
              const totalHours = parseFloat(entry.mondayHours || 0) + parseFloat(entry.tuesdayHours || 0) +
                                parseFloat(entry.wednesdayHours || 0) + parseFloat(entry.thursdayHours || 0) +
                                parseFloat(entry.fridayHours || 0) + parseFloat(entry.saturdayHours || 0) +
                                parseFloat(entry.sundayHours || 0);
              existing.actualHours += totalHours;
            }
          }
        }
      }
    });

    // Calculate variance and status - Add defensive check for Map
    if (dataMap && typeof dataMap.forEach === 'function') {
      dataMap.forEach((data) => {
        data.variance = data.actualHours - data.allocatedHours;
        data.variancePercentage = data.allocatedHours > 0
          ? (data.variance / data.allocatedHours) * 100
          : 0;
        data.utilization = data.capacity > 0
          ? (data.actualHours / data.capacity) * 100
          : 0;

        if (Math.abs(data.variancePercentage) <= 10) {
          data.status = 'on-track';
        } else if (data.variance > 0) {
          data.status = 'over';
        } else {
          data.status = 'under';
        }
      });
    } else {
      console.warn('[HoursAllocationVsActual] dataMap is not a valid Map object:', dataMap);
    }

    return dataMap && typeof dataMap.values === 'function' ? Array.from(dataMap.values()) : [];
  }, [allocations, timeEntries, resources, projects, periodFilter, dateRange]);

  // Debug logging for data after all variables are initialized
  useEffect(() => {
    console.log('📊 [HOURS_ALLOCATION] Data loaded:', {
      allocations: allocations.length,
      timeEntries: timeEntries.length,
      resources: resources.length,
      projects: projects.length,
      processedData: processedData.length
    });
  }, [allocations, timeEntries, resources, projects, processedData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = processedData;

    // Apply department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(item => item.department === departmentFilter);
    }

    // Sort data by resource name only
    filtered.sort((a, b) => a.resourceName.localeCompare(b.resourceName));

    return filtered;
  }, [processedData, departmentFilter]);

  // Limit data for display
  const sortedAndLimitedData = useMemo(() => {
    return showAllResources ? filteredData : filteredData.slice(0, 5);
  }, [filteredData, showAllResources]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalAllocated = filteredData.reduce((sum, item) => sum + item.allocatedHours, 0);
    const totalActual = filteredData.reduce((sum, item) => sum + item.actualHours, 0);
    const overAllocated = filteredData.filter(item => item.status === 'over').length;
    const underAllocated = filteredData.filter(item => item.status === 'under').length;
    const onTrack = filteredData.filter(item => item.status === 'on-track').length;

    return {
      totalAllocated,
      totalActual,
      totalVariance: totalActual - totalAllocated,
      overAllocated,
      underAllocated,
      onTrack,
      averageUtilization: filteredData.length > 0 
        ? filteredData.reduce((sum, item) => sum + item.utilization, 0) / filteredData.length 
        : 0
    };
  }, [filteredData]);



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'text-red-600 bg-red-50 border-red-200';
      case 'under': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'on-track': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over': return <TrendingUp className="h-4 w-4" />;
      case 'under': return <TrendingDown className="h-4 w-4" />;
      case 'on-track': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const isLoading = allocationsLoading || timeEntriesLoading || isTransitioning;
  const hasError = allocationsError || timeEntriesError || resourcesError || projectsError;

  // Error state
  if (hasError) {
    return (
      <div className={cn("bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 max-w-5xl w-full", className)}>
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Hours Allocation vs. Actual
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {dateRange.label} - Compare allocated hours with actual time logged
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600">
              Unable to load allocation data. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 max-w-5xl w-full", className)}>
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Hours Allocation vs. Actual
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {dateRange.label} - Compare allocated hours with actual time logged
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
        <div className="animate-pulse space-y-4">
          {/* Filter controls skeleton */}
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded w-32 animate-shimmer"></div>
            <div className="h-10 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded w-40 animate-shimmer"></div>
            <div className="h-10 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded w-36 animate-shimmer"></div>
          </div>
          {/* Chart skeleton */}
          <div className="h-64 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded animate-shimmer"></div>
          {/* Period transition indicator */}
          {isTransitioning && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Updating data for {periodFilter}...</span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 max-w-5xl w-full", className)}>
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Hours Allocation vs. Actual
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {dateRange.label} - Compare allocated hours with actual time logged
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">
        {/* Content with transition effects */}
        <div className={cn(
          "transition-all duration-300",
          isTransitioning ? "opacity-80" : "opacity-100"
        )}>
        {/* Summary Badges */}
        <div className="flex items-center gap-3 mb-6">
          <Badge variant="outline" className="bg-blue-100 text-blue-600 border-blue-200">
            {summaryMetrics.totalAllocated.toFixed(1)}h Allocated
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-600 border-green-200">
            {summaryMetrics.totalActual.toFixed(1)}h Actual
          </Badge>
          <Badge variant="outline" className={cn(
            summaryMetrics.totalVariance >= 0
              ? "bg-amber-100 text-amber-600 border-amber-200"
              : "bg-red-100 text-red-600 border-red-200"
          )}>
            {summaryMetrics.totalVariance > 0 ? '+' : ''}{summaryMetrics.totalVariance.toFixed(1)}h Variance
          </Badge>
          <Badge variant="outline" className="bg-purple-100 text-purple-600 border-purple-200">
            {summaryMetrics.averageUtilization.toFixed(0)}% Avg Utilization
          </Badge>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {Array.from(new Set(resources.map((r: any) => r.department))).map((dept: string) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data Visualization */}
        <div className="space-y-3">
          {sortedAndLimitedData.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">
                No allocation or time entry data found for the selected period and filters.
              </p>
            </div>
          ) : (
            sortedAndLimitedData.map((item, index) => (
              <TooltipProvider key={`${item.resourceId}-${item.projectId}-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-5 w-5",
                            item.status === 'on-track' ? 'text-green-600' :
                            item.status === 'under' ? 'text-yellow-600' :
                            'text-red-600'
                          )}>
                            {item.status === 'on-track' ? <CheckCircle className="h-5 w-5" /> :
                             item.status === 'under' ? <Clock className="h-5 w-5" /> :
                             <AlertTriangle className="h-5 w-5" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">
                              {item.resourceName}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {item.department}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            item.status === 'on-track' ? 'bg-green-100 text-green-800 border-green-200' :
                            item.status === 'under' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          )}>
                            {item.utilization.toFixed(0)}%
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {item.variance > 0 ? `+${item.variance.toFixed(1)}h` : `${item.variance.toFixed(1)}h`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Hours Utilization</span>
                          <span>{item.actualHours}h / {item.allocatedHours}h</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={cn("h-2 rounded-full transition-all duration-300",
                              item.status === 'on-track' ? 'bg-green-500' :
                              item.status === 'under' ? 'bg-yellow-500' :
                              'bg-red-500'
                            )}
                            style={{ width: `${Math.min(100, item.utilization)}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-600">
                        {item.variance > 0 ?
                          `${item.variance.toFixed(1)}h over allocated` :
                          item.variance < 0 ?
                          `${Math.abs(item.variance).toFixed(1)}h under allocated` :
                          'On track with allocation'
                        }
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <div><strong>Capacity:</strong> {item.capacity}h</div>
                      <div><strong>Utilization:</strong> {item.utilization.toFixed(1)}%</div>
                      <div><strong>Variance:</strong> {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}h</div>
                      <div><strong>Project:</strong> {item.projectName}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>

        {/* View More/Less Button */}
        {filteredData.length > 5 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAllResources(!showAllResources)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              {showAllResources
                ? 'View Less'
                : `View More (${Math.min(filteredData.length - 5, 5)} more)`
              }
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
