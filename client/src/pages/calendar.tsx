import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Users,
  Eye,
  Briefcase
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, parseISO } from "date-fns";
import type { Project, Resource, ResourceAllocation } from "@shared/schema";

type TimeRange = 'week' | 'month' | '2months';

interface ProjectWithAllocations extends Project {
  allocations: (ResourceAllocation & { resource: Resource })[];
}

interface TimelineBarProps {
  allocation: ResourceAllocation & { resource: Resource };
  startDate: Date;
  endDate: Date;
  timelineStart: Date;
  timelineEnd: Date;
  onClick: () => void;
  isOverallocated?: boolean;
}

function TimelineBar({ allocation, startDate, endDate, timelineStart, timelineEnd, onClick, isOverallocated }: TimelineBarProps) {
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const allocationStart = parseISO(allocation.startDate);
  const allocationEnd = parseISO(allocation.endDate);
  
  // Calculate position and width as percentages
  const startOffset = Math.max(0, differenceInDays(allocationStart, timelineStart)) / totalDays * 100;
  const duration = differenceInDays(allocationEnd, allocationStart) / totalDays * 100;
  const width = Math.min(duration, 100 - startOffset);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'planned': return 'bg-blue-300';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div 
      className={`absolute h-6 rounded-sm cursor-pointer transition-all hover:opacity-80 ${getStatusColor(allocation.status)} ${isOverallocated ? 'ring-2 ring-red-500' : ''}`}
      style={{ 
        left: `${startOffset}%`, 
        width: `${width}%`,
        minWidth: '20px'
      }}
      onClick={onClick}
      title={`${allocation.resource.name} - ${allocation.role} (${allocation.allocatedHours}h)`}
    >
      <div className="text-xs text-white p-1 truncate">
        {allocation.allocatedHours}h
      </div>
    </div>
  );
}

export default function Calendar() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [overallocatedOnly, setOverallocatedOnly] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());
  const [selectedAllocation, setSelectedAllocation] = useState<(ResourceAllocation & { resource: Resource; project: Project }) | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const { data: allocations = [] } = useQuery<ResourceAllocation[]>({
    queryKey: ["/api/allocations"],
  });

  // Calculate timeline bounds
  const getTimelineBounds = () => {
    const today = new Date();
    switch (timeRange) {
      case 'week':
        return {
          start: startOfWeek(currentDate),
          end: endOfWeek(currentDate),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case '2months':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(addMonths(currentDate, 1)),
        };
    }
  };

  const timelineBounds = getTimelineBounds();

  // Generate time axis
  const generateTimeAxis = () => {
    const { start, end } = timelineBounds;
    const days = eachDayOfInterval({ start, end });
    
    if (timeRange === 'week') {
      return days.map(day => ({
        date: day,
        label: format(day, 'EEE d'),
        isWeekend: day.getDay() === 0 || day.getDay() === 6,
      }));
    } else {
      // For month and 2months, show weeks
      const weeks = [];
      let current = start;
      while (current <= end) {
        weeks.push({
          date: current,
          label: format(current, 'MMM d'),
          isWeekend: false,
        });
        current = addWeeks(current, 1);
      }
      return weeks;
    }
  };

  const timeAxis = generateTimeAxis();

  // Process data for hierarchy
  const processedData = useMemo(() => {
    // Group allocations by project
    const projectAllocations = new Map<number, (ResourceAllocation & { resource: Resource })[]>();
    
    allocations.forEach(allocation => {
      const resource = resources.find(r => r.id === allocation.resourceId);
      if (resource) {
        if (!projectAllocations.has(allocation.projectId)) {
          projectAllocations.set(allocation.projectId, []);
        }
        projectAllocations.get(allocation.projectId)!.push({ ...allocation, resource });
      }
    });

    // Create project hierarchy
    const hierarchy: ProjectWithAllocations[] = projects.map(project => ({
      ...project,
      allocations: projectAllocations.get(project.id) || [],
    }));

    // Apply filters
    return hierarchy.filter(project => {
      // Search filter
      if (searchTerm) {
        const searchMatch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.allocations.some(a => a.resource.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!searchMatch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;

      // Department filter
      if (departmentFilter !== 'all') {
        const hasDepartmentMatch = project.allocations.some(a => a.resource.department === departmentFilter);
        if (!hasDepartmentMatch) return false;
      }

      // Overallocated only filter
      if (overallocatedOnly) {
        const hasOverallocated = project.allocations.some(a => {
          const resourceAllocations = allocations.filter(alloc => alloc.resourceId === a.resourceId && alloc.status === 'active');
          const totalHours = resourceAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.allocatedHours), 0);
          const capacity = parseFloat(a.resource.weeklyCapacity);
          return totalHours > capacity;
        });
        if (!hasOverallocated) return false;
      }

      return project.allocations.length > 0; // Only show projects with allocations
    });
  }, [projects, allocations, resources, searchTerm, statusFilter, departmentFilter, overallocatedOnly]);

  // Get unassigned resources
  const unassignedResources = resources.filter(resource => {
    return !allocations.some(allocation => allocation.resourceId === resource.id && allocation.status === 'active');
  });

  // Check if resource is overallocated
  const isResourceOverallocated = (resourceId: number) => {
    const resourceAllocations = allocations.filter(a => a.resourceId === resourceId && a.status === 'active');
    const totalHours = resourceAllocations.reduce((sum, a) => sum + parseFloat(a.allocatedHours), 0);
    const resource = resources.find(r => r.id === resourceId);
    return resource ? totalHours > parseFloat(resource.weeklyCapacity) : false;
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (timeRange) {
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case '2months':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 2 : -2));
        break;
    }
    setCurrentDate(newDate);
  };

  const toggleProjectCollapse = (projectId: number) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
  };

  const formatDateRange = () => {
    const { start, end } = timelineBounds;
    if (timeRange === 'week') {
      return format(start, 'MMM d') + ' - ' + format(end, 'MMM d, yyyy');
    } else {
      return format(start, 'MMM yyyy') + (timeRange === '2months' ? ' - ' + format(end, 'MMM yyyy') : '');
    }
  };

  const getUniqueDepartments = () => {
    const departments = new Set(resources.map(r => r.department));
    return Array.from(departments);
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">View resource allocations and project timelines</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={timeRange === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            Week
          </Button>
          <Button 
            variant={timeRange === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            Month
          </Button>
          <Button 
            variant={timeRange === '2months' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setTimeRange('2months')}
          >
            2 Months
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects or resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {getUniqueDepartments().map((dept, index) => (
                  <SelectItem key={`dept-${index}`} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={overallocatedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOverallocatedOnly(!overallocatedOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Overallocated Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">{formatDateRange()}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTime('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTime('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Time axis */}
              <div className="flex sticky top-0 bg-white z-10 border-b border-gray-200 pb-2 mb-4">
                <div className="w-80 flex-shrink-0" /> {/* Project column space */}
                <div className="flex-1 flex">
                  {timeAxis.map((tick, index) => (
                    <div
                      key={index}
                      className={`flex-1 text-center text-sm font-medium ${tick.isWeekend ? 'text-gray-400' : 'text-gray-700'}`}
                    >
                      {tick.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Project hierarchy */}
              <div className="space-y-4">
                {processedData.map((project) => (
                  <div key={project.id} className={cn(
                    "border border-gray-200 rounded-lg transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300/50",
                    "focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2",
                    // Subtle pulse for collapsed state to indicate interactivity
                    collapsedProjects.has(project.id) && "animate-pulse-subtle"
                  )}>
                    <Collapsible
                      open={!collapsedProjects.has(project.id)}
                      onOpenChange={() => toggleProjectCollapse(project.id)}
                    >
                      <CollapsibleTrigger className="w-full group">
                        <div className={cn(
                          "flex items-center justify-between p-4 transition-all duration-200",
                          "bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30",
                          "group-hover:bg-slate-50/50 rounded-t-lg",
                          "active:bg-blue-100/50 active:scale-[0.99]",
                          "touch-manipulation" // Better touch handling on mobile
                        )}
                        role="button"
                        tabIndex={0}
                        aria-expanded={!collapsedProjects.has(project.id)}
                        aria-label={`${collapsedProjects.has(project.id) ? 'Expand' : 'Collapse'} ${project.name} project details`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              {collapsedProjects.has(project.id) ? (
                                <ChevronRight className="h-4 w-4 text-gray-600 transition-transform duration-200" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600 transition-transform duration-200" />
                              )}
                              {/* Plus icon for collapsed state */}
                              {collapsedProjects.has(project.id) && (
                                <div className="p-1 bg-blue-100 rounded-md group-hover:bg-blue-200 transition-colors">
                                  <Plus className="h-3 w-3 text-blue-600" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                              <Briefcase className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold text-gray-900 truncate">{project.name}</div>
                                {/* Expandable hint */}
                                <div className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                                  "text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap",
                                  "hidden sm:block animate-in fade-in-50"
                                )}>
                                  {collapsedProjects.has(project.id) ? 'Click to view allocations' : 'Click to collapse'}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <span>{project.allocations.length} resources</span>
                                {collapsedProjects.has(project.id) && (
                                  <>
                                    <span>•</span>
                                    <span className="text-xs opacity-70 flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      View details
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="outline">{project.priority}</Badge>
                            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-slate-200/50 animate-in slide-in-from-top-4 duration-300">
                          <div className="p-4 space-y-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-b-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-blue-100 rounded-md">
                                <Eye className="h-4 w-4 text-blue-600" />
                              </div>
                              <h4 className="font-medium text-gray-900">Resource Allocations</h4>
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                Expanded View
                              </Badge>
                            </div>
                            {project.allocations.map((allocation) => {
                            const isOverallocated = isResourceOverallocated(allocation.resourceId);
                            return (
                              <div key={allocation.id} className="flex items-center">
                                <div className="w-80 flex-shrink-0 flex items-center space-x-3">
                                  <div className="w-6" /> {/* Indent for hierarchy */}
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {allocation.resource.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {allocation.resource.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {allocation.role} • {allocation.resource.department}
                                    </div>
                                  </div>
                                  {isOverallocated && (
                                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex-1 relative h-8 bg-gray-50 rounded-sm">
                                  <TimelineBar
                                    allocation={allocation}
                                    startDate={timelineBounds.start}
                                    endDate={timelineBounds.end}
                                    timelineStart={timelineBounds.start}
                                    timelineEnd={timelineBounds.end}
                                    onClick={() => setSelectedAllocation({ ...allocation, project })}
                                    isOverallocated={isOverallocated}
                                  />
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}

                {/* Unassigned Resources */}
                {unassignedResources.length > 0 && (
                  <div className={cn(
                    "border border-gray-200 rounded-lg transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:shadow-green-500/10 hover:border-green-300/50",
                    "focus-within:ring-2 focus-within:ring-green-300 focus-within:ring-offset-2",
                    "animate-pulse-subtle" // Always collapsed by default
                  )}>
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger className="w-full group">
                        <div className={cn(
                          "flex items-center justify-between p-4 transition-all duration-200",
                          "bg-gray-50 hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30",
                          "group-hover:bg-slate-50/50 rounded-t-lg",
                          "active:bg-green-100/50 active:scale-[0.99]",
                          "touch-manipulation" // Better touch handling on mobile
                        )}
                        role="button"
                        tabIndex={0}
                        aria-expanded={false}
                        aria-label="Expand unassigned resources list"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <ChevronRight className="h-4 w-4 text-gray-600 transition-transform duration-200" />
                              {/* Plus icon for collapsed state */}
                              <div className="p-1 bg-green-100 rounded-md group-hover:bg-green-200 transition-colors">
                                <Plus className="h-3 w-3 text-green-600" />
                              </div>
                            </div>
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                              <Users className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold text-gray-900">Unassigned Resources</div>
                                {/* Expandable hint */}
                                <div className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                                  "text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap",
                                  "hidden sm:block animate-in fade-in-50"
                                )}>
                                  Click to view available resources
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <span>{unassignedResources.length} available resources</span>
                                <span>•</span>
                                <span className="text-xs opacity-70 flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  View list
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-slate-200/50 animate-in slide-in-from-top-4 duration-300">
                          <div className="p-4 space-y-3 bg-gradient-to-br from-green-50 to-emerald-50/30 rounded-b-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-green-100 rounded-md">
                                <Users className="h-4 w-4 text-green-600" />
                              </div>
                              <h4 className="font-medium text-gray-900">Available Resources</h4>
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                {unassignedResources.length} Available
                              </Badge>
                            </div>
                          {unassignedResources.map((resource) => (
                            <div key={resource.id} className="flex items-center">
                              <div className="w-80 flex-shrink-0 flex items-center space-x-3">
                                <div className="w-6" />
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {resource.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {resource.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {resource.department} • {resource.weeklyCapacity}h capacity
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Assign
                                </Button>
                              </div>
                              <div className="flex-1 relative h-8 bg-gray-50 rounded-sm">
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                                  Available
                                </div>
                              </div>
                            </div>
                          ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation Details Modal */}
      {selectedAllocation && (
        <Dialog open={!!selectedAllocation} onOpenChange={() => setSelectedAllocation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocation Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Project</Label>
                  <p className="text-sm text-gray-900">{selectedAllocation.project.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Resource</Label>
                  <p className="text-sm text-gray-900">{selectedAllocation.resource.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Role</Label>
                  <p className="text-sm text-gray-900">{selectedAllocation.role}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hours</Label>
                  <p className="text-sm text-gray-900">{selectedAllocation.allocatedHours}h</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                  <p className="text-sm text-gray-900">{format(parseISO(selectedAllocation.startDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">End Date</Label>
                  <p className="text-sm text-gray-900">{format(parseISO(selectedAllocation.endDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedAllocation(null)}>
                  Close
                </Button>
                <Button>Edit Allocation</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}