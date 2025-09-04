import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Info,
  BarChart3,
  Eye,
  Briefcase
} from "lucide-react";
import { ResourceAllocation, Project, Resource } from "@shared/schema";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addWeeks, getWeek, getYear } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { WeeklyCapacityOverviewCards } from "./weekly-capacity-overview-cards";

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
  weeklyAllocations: Record<string, number> | null;
}

interface WeekColumn {
  key: string;
  weekNumber: number;
  year: number;
  dateRange: string;
  startDate: Date;
  endDate: Date;
}

interface WeeklyAggregation {
  weekKey: string;
  totalAllocatedHours: number;
  effectiveCapacity: number;
  utilizationPercentage: number;
  status: 'healthy' | 'near-full' | 'over' | 'none';
  statusColor: string;
  statusIcon: string;
  projectCount: number;
}

interface EffectiveCapacityData {
  baseCapacity: number;
  nonProjectHours: number;
  timeOffHours: number;
  effectiveCapacity: number;
}



interface ProjectAllocationData {
  project: Project;
  allocation: AllocationWithProject;
  weeklyData: Record<string, number>;
  totalHours: number;
  averageWeekly: number;
  peakWeek: number;
  status: 'active' | 'planned' | 'completed' | 'archived';
}

interface EnhancedProjectAllocationViewProps {
  resourceId: number;
  resource: Resource;
  className?: string;
  highlightOnMount?: boolean; // For focus management when navigated from alerts
}

export function EnhancedProjectAllocationView({
  resourceId,
  resource,
  className,
  highlightOnMount = false
}: EnhancedProjectAllocationViewProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'future'>('active');
  const [showMoreProjects, setShowMoreProjects] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Performance: Limit initial projects shown
  const INITIAL_PROJECTS_LIMIT = 5;

  // Handle highlight effect when navigated from alerts
  useEffect(() => {
    if (highlightOnMount) {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightOnMount]);

  // Calculate responsive weeks to show based on container width
  const calculateOptimalWeeks = () => {
    if (typeof window === 'undefined') return 12; // Default for SSR

    const containerWidth = window.innerWidth - 400; // Account for sidebar and padding
    const cardWithGap = 130 + 8; // 130px card + 8px gap (gap-2 in Tailwind)
    const calculatedWeeks = Math.floor(containerWidth / cardWithGap);

    // Ensure minimum of 4 weeks and maximum of 16 weeks
    return Math.min(Math.max(calculatedWeeks, 4), 16);
  };

  const [weeksToShow, setWeeksToShow] = useState(calculateOptimalWeeks);

  // Update weeks on window resize
  useEffect(() => {
    const handleResize = () => {
      setWeeksToShow(calculateOptimalWeeks());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch allocations for this resource using the working resource endpoint
  const { data: resourceData, isLoading: resourceLoading } = useQuery({
    queryKey: ["/api/resources", resourceId],
    queryFn: () => apiRequest(`/api/resources/${resourceId}`),
  });

  // Fetch projects to enrich allocation data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("/api/projects"),
  });

  // Combine loading states
  const isLoading = resourceLoading || projectsLoading;

  // Enrich allocations with project data
  const allocations = useMemo(() => {
    if (!resourceData?.allocations || !projects.length) return [];

    return resourceData.allocations.map((allocation: any) => {
      const project = projects.find((p: any) => p.id === allocation.projectId);
      return {
        ...allocation,
        project: project || null
      };
    });
  }, [resourceData?.allocations, projects]);

  // Initialize all projects as expanded by default (empty Set means no projects are collapsed)
  useEffect(() => {
    if (allocations.length > 0) {
      // Start with empty Set so all projects are expanded by default
      setCollapsedProjects(new Set());
    }
  }, [allocations]);

  // Fetch time off data for effective capacity calculation
  const { data: timeOffData = [] } = useQuery({
    queryKey: ["/api/resources", resourceId, "time-off"],
  });

  // Default non-project hours (should match CapacityManagement component)
  const DEFAULT_NON_PROJECT_HOURS = 8;

  // Calculate effective capacity for a given week
  const calculateEffectiveCapacity = (weekKey: string): EffectiveCapacityData => {
    const baseCapacity = parseFloat(resource.weeklyCapacity || '40');
    const nonProjectHours = DEFAULT_NON_PROJECT_HOURS;

    // Calculate time off hours for this specific week
    // TODO: Implement actual time off calculation based on timeOffData
    const timeOffHours = 0; // Placeholder for now

    const effectiveCapacity = Math.max(0, baseCapacity - nonProjectHours - timeOffHours);

    return {
      baseCapacity,
      nonProjectHours,
      timeOffHours,
      effectiveCapacity
    };
  };

  // Generate week columns based on current offset
  const weekColumns = useMemo(() => {
    const columns: WeekColumn[] = [];
    const baseDate = addWeeks(new Date(), currentWeekOffset);

    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = startOfWeek(addWeeks(baseDate, i), { weekStartsOn: 1 });
      const weekEnd = addWeeks(weekStart, 1);
      const weekNumber = getWeek(weekStart);
      const year = getYear(weekStart);

      columns.push({
        key: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
        weekNumber,
        year,
        dateRange: `${format(weekStart, 'MMM d')}–${format(addWeeks(weekStart, 1), 'd')}`,
        startDate: weekStart,
        endDate: weekEnd
      });
    }

    return columns;
  }, [currentWeekOffset, weeksToShow]);

  // Generate extended week columns for the Weekly Capacity Overview Cards
  // This ensures there are always more weeks than what fits in the container for scrolling
  const extendedWeekColumns = useMemo(() => {
    const columns: WeekColumn[] = [];
    const baseDate = addWeeks(new Date(), currentWeekOffset);
    const extendedWeeksToShow = Math.max(weeksToShow + 6, 16); // Always show at least 6 more weeks than what fits

    for (let i = 0; i < extendedWeeksToShow; i++) {
      const weekStart = startOfWeek(addWeeks(baseDate, i), { weekStartsOn: 1 });
      const weekEnd = addWeeks(weekStart, 1);
      const weekNumber = getWeek(weekStart);
      const year = getYear(weekStart);

      columns.push({
        key: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
        weekNumber,
        year,
        dateRange: `${format(weekStart, 'MMM d')}–${format(addWeeks(weekStart, 1), 'd')}`,
        startDate: weekStart,
        endDate: weekEnd
      });
    }

    return columns;
  }, [currentWeekOffset, weeksToShow]);

  // Calculate weekly aggregations across all projects (using extended weeks for overview cards)
  const weeklyAggregations = useMemo(() => {
    const aggregations: Record<string, WeeklyAggregation> = {};

    extendedWeekColumns.forEach(week => {
      const weekKey = week.key;
      const effectiveCapacityData = calculateEffectiveCapacity(weekKey);

      // Aggregate allocated hours across all projects for this week
      let totalAllocatedHours = 0;
      let projectCount = 0;

      allocations.forEach(allocation => {
        const weeklyData = allocation.weeklyAllocations || {};
        const hoursForWeek = weeklyData[weekKey] || 0;
        if (hoursForWeek > 0) {
          totalAllocatedHours += hoursForWeek;
          projectCount++;
        }
      });

      // Calculate utilization percentage based on effective capacity
      const utilizationPercentage = effectiveCapacityData.effectiveCapacity > 0
        ? (totalAllocatedHours / effectiveCapacityData.effectiveCapacity) * 100
        : 0;

      // Determine status based on updated thresholds
      let status: 'healthy' | 'near-full' | 'over' | 'none';
      let statusColor: string;
      let statusIcon: string;

      if (totalAllocatedHours === 0) {
        status = 'none';
        statusColor = 'bg-gray-100 text-gray-800 border-gray-300';
        statusIcon = '⚪';
      } else if (utilizationPercentage > 100) {
        status = 'over';
        statusColor = 'bg-red-100 text-red-800 border-red-300';
        statusIcon = '🔴';
      } else if (utilizationPercentage > 80) {
        status = 'near-full';
        statusColor = 'bg-amber-100 text-amber-800 border-amber-300';
        statusIcon = '🟡';
      } else {
        status = 'healthy';
        statusColor = 'bg-green-100 text-green-800 border-green-300';
        statusIcon = '🟢';
      }

      aggregations[weekKey] = {
        weekKey,
        totalAllocatedHours,
        effectiveCapacity: effectiveCapacityData.effectiveCapacity,
        utilizationPercentage,
        status,
        statusColor,
        statusIcon,
        projectCount
      };
    });

    return aggregations;
  }, [extendedWeekColumns, allocations, resource.weeklyCapacity]);

  // Process allocation data for each project
  const projectData = useMemo(() => {
    const data: ProjectAllocationData[] = [];
    
    allocations.forEach(allocation => {
      const weeklyData = allocation.weeklyAllocations || {};
      const weeklyHours = Object.values(weeklyData);
      const totalHours = weeklyHours.reduce((sum, hours) => sum + hours, 0);
      const averageWeekly = weeklyHours.length > 0 ? totalHours / weeklyHours.length : 0;
      const peakWeek = Math.max(...weeklyHours, 0);
      
      data.push({
        project: allocation.project,
        allocation,
        weeklyData,
        totalHours,
        averageWeekly,
        peakWeek,
        status: allocation.status as any
      });
    });
    
    // Apply filtering
    const filtered = data.filter(item => {
      switch (filterMode) {
        case 'active':
          return item.status === 'active';
        case 'future':
          return item.status === 'active' || item.status === 'planned';
        default:
          return true;
      }
    });
    
    // Apply default sorting by hours (descending)
    return filtered.sort((a, b) => b.totalHours - a.totalHours);
  }, [allocations, filterMode]);

  // Performance: Paginate projects for large datasets
  const displayedProjects = useMemo(() => {
    if (showMoreProjects || projectData.length <= INITIAL_PROJECTS_LIMIT) {
      return projectData;
    }
    return projectData.slice(0, INITIAL_PROJECTS_LIMIT);
  }, [projectData, showMoreProjects]);

  // Toggle function for collapsing/expanding projects
  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };



  const hasMoreProjects = projectData.length > INITIAL_PROJECTS_LIMIT;

  // Get weekly aggregation data for a specific week
  const getWeeklyAggregation = (weekKey: string): WeeklyAggregation => {
    return weeklyAggregations[weekKey] || {
      weekKey,
      totalAllocatedHours: 0,
      effectiveCapacity: calculateEffectiveCapacity(weekKey).effectiveCapacity,
      utilizationPercentage: 0,
      status: 'none',
      statusColor: 'bg-gray-100 text-gray-800 border-gray-300',
      statusIcon: '⚪',
      projectCount: 0
    };
  };

  // Auto-scroll to current week on mount with smooth behavior
  useEffect(() => {
    const scrollToCurrentWeek = () => {
      const scrollContainers = document.querySelectorAll('.week-scroll-container');
      scrollContainers.forEach(container => {
        const currentWeekIndex = weekColumns.findIndex(week => {
          const now = new Date();
          return week.startDate <= now && week.endDate > now;
        });

        if (currentWeekIndex > 0) {
          const scrollPosition = currentWeekIndex * 120; // Approximate column width
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      });
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(scrollToCurrentWeek, 100);
    return () => clearTimeout(timer);
  }, [weekColumns]);

  // Smooth navigation functions
  const navigateWeeks = (direction: 'prev' | 'next') => {
    const offset = direction === 'prev' ? -4 : 4;
    setCurrentWeekOffset(prev => prev + offset);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekOffset(0);
  };

  if (isLoading) {
    return (
      <Card className={cn("rounded-2xl shadow-sm", className)}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projectData.length === 0) {
    return (
      <Card className={cn("rounded-2xl shadow-sm", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resource Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No project allocations found</p>
            <p className="text-sm">Weekly allocation details will appear when projects are assigned</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
        "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
        "hover:bg-white hover:border-blue-300/50",
        "rounded-2xl shadow-sm",
        isHighlighted && "ring-2 ring-blue-500 ring-opacity-50 shadow-lg shadow-blue-500/20 border-blue-300",
        className
      )}>
        <CardHeader className="pb-3 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                Resource Allocations
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Comprehensive allocation management and insights across {projectData.length} project{projectData.length !== 1 ? 's' : ''}
              </p>
            </div>


          </div>
        </CardHeader>

        <CardContent className="pt-4 relative z-10">
          <Tabs defaultValue="allocations" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="allocations" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Aggregated Allocations
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Allocations per Project
              </TabsTrigger>
            </TabsList>

            <TabsContent value="allocations" className="space-y-6">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Select value={filterMode} onValueChange={(value: any) => setFilterMode(value)}>
                    <SelectTrigger className="w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="future">Active + Planned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                onClick={() => navigateWeeks('prev')}
                className="transition-all duration-200 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="transition-all duration-200 hover:scale-105"
              >
                Current Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeeks('next')}
                className="transition-all duration-200 hover:scale-105"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
                </div>
              </div>

              {/* Project Allocations Content */}
              {/* Status Color Legend */}
              <Card className="border border-gray-200 bg-gray-50/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Status Legend:</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">Healthy (≤80%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-gray-600">Near Full (81-100%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-gray-600">Over (100%+)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-600">None (0h)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Capacity Overview Cards */}
              <WeeklyCapacityOverviewCards
                weekColumns={extendedWeekColumns}
                weeklyAggregations={weeklyAggregations}
                getWeeklyAggregation={getWeeklyAggregation}
              />
            </TabsContent>

            {/* Allocations per Project Tab */}
            <TabsContent value="insights" className="space-y-6">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Select value={filterMode} onValueChange={(value: any) => setFilterMode(value)}>
                    <SelectTrigger className="w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="future">Active + Planned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeeks('prev')}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Current Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeeks('next')}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>



              {/* Project Allocation Blocks */}
              <div className="space-y-4">
                {displayedProjects.map((project, index) => (
                  <div
                    key={project.project.id}
                    className="animate-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProjectAllocationBlock
                      projectData={project}
                      weekColumns={extendedWeekColumns}
                      weeklyAggregations={weeklyAggregations}
                      isCollapsed={collapsedProjects.has(project.project.id.toString())}
                      onToggleCollapse={() => toggleProjectCollapse(project.project.id.toString())}
                    />
                  </div>
                ))}
              </div>

              {/* Show More Projects Button */}
              {hasMoreProjects && !showMoreProjects && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowMoreProjects(true)}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Show {projectData.length - INITIAL_PROJECTS_LIMIT} more project{projectData.length - INITIAL_PROJECTS_LIMIT !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {/* Show Less Projects Button */}
              {showMoreProjects && hasMoreProjects && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowMoreProjects(false)}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    Show fewer projects
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// WeeklySummaryRow component has been replaced with WeeklyCapacityOverviewCards

interface ProjectAllocationBlockProps {
  projectData: ProjectAllocationData;
  weekColumns: WeekColumn[];
  weeklyAggregations: Record<string, WeeklyAggregation>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function ProjectAllocationBlock({
  projectData,
  weekColumns,
  weeklyAggregations,
  isCollapsed,
  onToggleCollapse
}: ProjectAllocationBlockProps) {
  const { project, allocation, weeklyData, totalHours } = projectData;

  // Scroll state management for hover-activated chevron navigation
  const mobileScrollContainerRef = useRef<HTMLDivElement>(null);
  const desktopScrollContainerRef = useRef<HTMLDivElement>(null);
  const [mobileCanScrollLeft, setMobileCanScrollLeft] = useState(false);
  const [mobileCanScrollRight, setMobileCanScrollRight] = useState(false);
  const [desktopCanScrollLeft, setDesktopCanScrollLeft] = useState(false);
  const [desktopCanScrollRight, setDesktopCanScrollRight] = useState(false);
  const [mobileIsHovered, setMobileIsHovered] = useState(false);
  const [desktopIsHovered, setDesktopIsHovered] = useState(false);

  // Scroll detection functions
  const updateMobileScrollButtons = () => {
    if (mobileScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mobileScrollContainerRef.current;
      const tolerance = 2;

      setMobileCanScrollLeft(scrollLeft > tolerance);
      setMobileCanScrollRight(scrollLeft < scrollWidth - clientWidth - tolerance);
    }
  };

  const updateDesktopScrollButtons = () => {
    if (desktopScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = desktopScrollContainerRef.current;
      const tolerance = 2;

      setDesktopCanScrollLeft(scrollLeft > tolerance);
      setDesktopCanScrollRight(scrollLeft < scrollWidth - clientWidth - tolerance);
    }
  };

  // Scroll functions for mobile
  const scrollMobileLeft = () => {
    if (mobileScrollContainerRef.current) {
      const cardWithGap = 120 + 12; // 120px card + 12px gap (gap-3)
      const scrollAmount = cardWithGap * 2;
      mobileScrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateMobileScrollButtons, 300);
    }
  };

  const scrollMobileRight = () => {
    if (mobileScrollContainerRef.current) {
      const cardWithGap = 120 + 12; // 120px card + 12px gap (gap-3)
      const scrollAmount = cardWithGap * 2;
      mobileScrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateMobileScrollButtons, 300);
    }
  };

  // Scroll functions for desktop
  const scrollDesktopLeft = () => {
    if (desktopScrollContainerRef.current) {
      const cardWithGap = 100 + 8; // 100px card + 8px gap (gap-2)
      const scrollAmount = cardWithGap * 2;
      desktopScrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateDesktopScrollButtons, 300);
    }
  };

  const scrollDesktopRight = () => {
    if (desktopScrollContainerRef.current) {
      const cardWithGap = 100 + 8; // 100px card + 8px gap (gap-2)
      const scrollAmount = cardWithGap * 2;
      desktopScrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(updateDesktopScrollButtons, 300);
    }
  };

  // Initialize scroll detection
  useEffect(() => {
    const checkScrollability = () => {
      updateMobileScrollButtons();
      updateDesktopScrollButtons();
    };

    const timeoutId1 = setTimeout(checkScrollability, 100);
    const timeoutId2 = setTimeout(checkScrollability, 300);

    const mobileContainer = mobileScrollContainerRef.current;
    const desktopContainer = desktopScrollContainerRef.current;

    if (mobileContainer) {
      mobileContainer.addEventListener('scroll', updateMobileScrollButtons);
    }
    if (desktopContainer) {
      desktopContainer.addEventListener('scroll', updateDesktopScrollButtons);
    }

    return () => {
      if (mobileContainer) {
        mobileContainer.removeEventListener('scroll', updateMobileScrollButtons);
      }
      if (desktopContainer) {
        desktopContainer.removeEventListener('scroll', updateDesktopScrollButtons);
      }
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [weekColumns]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 ease-out",
      "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
      "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
      "hover:bg-white hover:border-blue-300/50",
      "rounded-2xl shadow-sm",
      "focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2",
      isCollapsed && "bg-gray-50/50 border-gray-300/60 animate-pulse-subtle"
    )}>
      <CardContent className="p-3">
        {/* Project Header */}
        <div
          className={cn(
            "flex items-start justify-between mb-4 cursor-pointer transition-all duration-300 ease-out p-2 -m-2 rounded-lg",
            "hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/40",
            "hover:shadow-sm hover:scale-[1.01]",
            "active:bg-blue-100/50 active:scale-[0.99]",
            "touch-manipulation group/header" // Better touch handling on mobile
          )}
          onClick={onToggleCollapse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse();
            }
          }}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${project.name} project allocation details`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Project Icon */}
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 group/header-hover:scale-105 transition-all duration-200">
                <Briefcase className="h-4 w-4 text-blue-600 group/header-hover:text-blue-700" />
              </div>

              {/* Project Title and Status Badge */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate text-lg">{project.name}</h3>

                {/* Status Badge - Positioned after project title */}
                <Badge className={`text-xs px-1.5 py-0.5 h-5 flex items-center ${getStatusColor(allocation.status)}`}>
                  {allocation.status === 'active' && <CheckCircle className="h-2 w-2 mr-0.5" />}
                  <span className="text-xs leading-none">{allocation.status}</span>
                </Badge>
              </div>

              {/* Project Navigation Button - Moved to the right */}
              <Link href={`/projects/${project.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300",
                    "text-blue-700 hover:text-blue-800 transition-all duration-200 hover:scale-105",
                    "flex items-center justify-center flex-shrink-0"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  title="View project details"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>


          </div>
        </div>

        {/* Weekly Allocation Grid - Collapsible */}
        <div className={cn(
          "relative overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        )}>
          {/* Mobile: Show fewer weeks, larger touch targets */}
          <div className="block sm:hidden">
            <div
              className="relative group"
              onMouseEnter={() => setMobileIsHovered(true)}
              onMouseLeave={() => setMobileIsHovered(false)}
            >
              {/* Mobile Left Scroll Button */}
              {mobileCanScrollLeft && (
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                  mobileIsHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollMobileLeft}
                    className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                  >
                    <ChevronLeft className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              )}

              {/* Mobile Right Scroll Button */}
              {mobileCanScrollRight && (
                <div className={cn(
                  "absolute right-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                  mobileIsHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollMobileRight}
                    className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                  >
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              )}

              <div
                ref={mobileScrollContainerRef}
                className="week-scroll-container overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex gap-3 min-w-max pb-2">
                {weekColumns.slice(0, Math.min(weekColumns.length, 8)).map((week) => {
                  const hours = weeklyData[week.key] || 0;
                  const weeklyAggregation = weeklyAggregations[week.key];
                  const isCurrentWeek = week.startDate <= new Date() && week.endDate > new Date();

                  return (
                    <div key={week.key} className={cn(
                      "flex flex-col items-center p-4 rounded-lg border transition-all duration-200 min-w-[120px]",
                      isCurrentWeek
                        ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-200"
                        : "border-gray-200 bg-white",
                      hours === 0 && "opacity-60"
                    )}>
                      <div className="text-center mb-3">
                        <div className={cn(
                          "text-sm font-medium",
                          isCurrentWeek ? "text-blue-700" : "text-gray-600"
                        )}>
                          W{week.weekNumber}
                        </div>
                        <div className={cn(
                          "text-xs",
                          isCurrentWeek ? "text-blue-600" : "text-gray-500"
                        )}>
                          {week.dateRange}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className={cn(
                          "text-xl font-bold",
                          hours > 0 ? "text-gray-900" : "text-gray-400"
                        )}>
                          {hours}h
                        </div>
                        {weeklyAggregation && (
                          <div className="text-xs text-gray-500 mt-1">
                            of {weeklyAggregation.totalAllocatedHours}h total
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Full week view with tooltips */}
          <div className="hidden sm:block">
            <div
              className="relative group"
              onMouseEnter={() => setDesktopIsHovered(true)}
              onMouseLeave={() => setDesktopIsHovered(false)}
            >
              {/* Desktop Left Scroll Button */}
              {desktopCanScrollLeft && (
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                  desktopIsHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollDesktopLeft}
                    className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                  >
                    <ChevronLeft className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              )}

              {/* Desktop Right Scroll Button */}
              {desktopCanScrollRight && (
                <div className={cn(
                  "absolute right-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                  desktopIsHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={scrollDesktopRight}
                    className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                  >
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              )}

              <div
                ref={desktopScrollContainerRef}
                className="week-scroll-container overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex gap-2 min-w-max pb-2">
                {weekColumns.map((week) => {
                  const hours = weeklyData[week.key] || 0;
                  const weeklyAggregation = weeklyAggregations[week.key];
                  const isCurrentWeek = week.startDate <= new Date() && week.endDate > new Date();

                  return (
                    <div key={week.key} className={cn(
                      "flex flex-col items-center p-3 rounded-lg border transition-all duration-200 hover:shadow-sm min-w-[100px]",
                      isCurrentWeek
                        ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-200"
                        : "border-gray-200 bg-white hover:border-gray-300",
                      hours === 0 && "opacity-60"
                    )}>
                      <div className="text-center mb-2">
                        <div className={cn(
                          "text-xs font-medium",
                          isCurrentWeek ? "text-blue-700" : "text-gray-600"
                        )}>
                          W{week.weekNumber}
                        </div>
                        <div className={cn(
                          "text-xs",
                          isCurrentWeek ? "text-blue-600" : "text-gray-500"
                        )}>
                          {week.dateRange}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className={cn(
                          "text-lg font-bold",
                          hours > 0 ? "text-gray-900" : "text-gray-400"
                        )}>
                          {hours}h
                        </div>
                        {weeklyAggregation && (
                          <div className="text-xs text-gray-500 mt-1">
                            of {weeklyAggregation.totalAllocatedHours}h total
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// WeeklySummaryRow component has been replaced with WeeklyCapacityOverviewCards




