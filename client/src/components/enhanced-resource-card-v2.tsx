import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklyCapacityHeatmap } from './weekly-capacity-heatmap';
import {
  Mail,
  Eye,
  Edit,
  Building,
  Users,
  MapPin,
  Activity,
  Clock,
  CheckCircle,
  Briefcase,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { getWeek, getYear } from 'date-fns';
import {
  calculateResourceUtilization,
  formatStatusText,
  type UtilizationStatus
} from '@/lib/utilization-thresholds';
import type { Resource } from '@shared/schema';

interface EnhancedResourceCardV2Props {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  variant?: 'grid' | 'list';
  showActions?: boolean;
  className?: string;
  allocations?: any[]; // Resource allocations for status calculation
  isLoading?: boolean; // Loading state for skeleton display
}

// Department color mapping for avatar rings
const DEPARTMENT_COLORS = {
  'IT Architecture & Delivery': 'ring-blue-500',
  'Business Operations': 'ring-green-500',
  'Finance': 'ring-yellow-500',
  'Human Resources': 'ring-indigo-500',
  // Legacy department names for backward compatibility
  'Engineering': 'ring-blue-500',
  'Design': 'ring-purple-500',
  'Product': 'ring-green-500',
  'Marketing': 'ring-pink-500',
  'Sales': 'ring-orange-500',
  'Operations': 'ring-gray-500',
  'HR': 'ring-indigo-500',
  'default': 'ring-gray-400'
};

// Loading skeleton component for resource cards
function ResourceCardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'list' }) {
  if (variant === 'list') {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 ease-out border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>

            {/* Center: Skills with shimmer effect */}
            <div className="hidden lg:flex items-center gap-2 px-4 h-6">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full animate-pulse" />
                <Skeleton className="h-5 w-8 rounded-full animate-pulse" />
                <Skeleton className="h-5 w-20 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Right: Status */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid variant skeleton
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 ease-out border-gray-200/60 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Department & Capacity */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Weekly Heatmap with shimmer */}
        <div className="mb-4 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 h-8 rounded-md animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>

        {/* Project Count */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4 border-t border-gray-100/80">
          <Skeleton className="flex-1 h-9 rounded" />
          <Skeleton className="h-9 w-12 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Animated number counter component
function AnimatedNumber({
  value,
  suffix = '',
  className = '',
  duration = 300
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true);
      const startValue = displayValue;
      const difference = value - startValue;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (difference * easeOutQuart));

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, displayValue, duration]);

  return (
    <span className={cn(
      "transition-all duration-200",
      isAnimating && "scale-110 text-blue-600",
      className
    )}>
      {displayValue}{suffix}
    </span>
  );
}



// Status calculation helper using unified threshold logic
function calculateResourceStatus(resource: Resource, allocations: any[] = []) {
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocatedHours) || 0), 0);
  const utilization = calculateResourceUtilization(
    resource.weeklyCapacity || '40',
    totalAllocated,
    resource.isActive
  );

  return {
    status: utilization.status,
    color: utilization.styles.color,
    icon: utilization.styles.icon,
    utilizationPercentage: utilization.utilizationPercentage,
    effectiveCapacity: utilization.effectiveCapacity
  };
}

// Get initials for avatar fallback
function getInitials(name: string | undefined | null) {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Truncate text with tooltip
function TruncatedText({ text, maxLength = 20, className = "" }: { text: string; maxLength?: number; className?: string }) {
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)}>
          {text.substring(0, maxLength)}...
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Helper function to get current week key
const getCurrentWeekKey = () => {
  const currentDate = new Date();
  const currentYear = getYear(currentDate);
  const currentWeekNum = getWeek(currentDate, { weekStartsOn: 1 });
  return `${currentYear}-W${currentWeekNum.toString().padStart(2, '0')}`;
};

// Helper function to calculate effective capacity (total capacity - non-project hours)
const calculateEffectiveCapacity = (weeklyCapacity: string | number) => {
  const totalCapacity = parseFloat(weeklyCapacity?.toString() || '40');
  const nonProjectHours = 8; // Standard non-project time (meetings, admin, etc.)
  return Math.max(0, totalCapacity - nonProjectHours);
};

// Helper function to calculate current week utilization
const calculateCurrentWeekUtilization = (allocations: any[], effectiveCapacity: number) => {
  const currentWeekKey = getCurrentWeekKey();

  const currentWeekHours = allocations.reduce((total, allocation) => {
    const weeklyHours = allocation.weeklyAllocations?.[currentWeekKey] || 0;
    return total + weeklyHours;
  }, 0);

  return effectiveCapacity > 0 ? (currentWeekHours / effectiveCapacity) * 100 : 0;
};

export function EnhancedResourceCardV2({
  resource,
  onEdit,
  variant = 'grid',
  showActions = true,
  className,
  allocations = [],
  isLoading = false
}: EnhancedResourceCardV2Props) {
  // Calculate capacity and utilization values
  const effectiveCapacity = calculateEffectiveCapacity(resource.weeklyCapacity || '40');
  const currentWeekUtilization = calculateCurrentWeekUtilization(allocations, effectiveCapacity);
  // Show loading skeleton if in loading state
  if (isLoading) {
    return <ResourceCardSkeleton variant={variant} />;
  }
  const status = useMemo(() => calculateResourceStatus(resource, allocations), [resource, allocations]);

  const departmentColor = DEPARTMENT_COLORS[resource.department as keyof typeof DEPARTMENT_COLORS] || DEPARTMENT_COLORS.default;

  // Calculate overallocation alerts for avatar
  const overallocationAlert = useMemo(() => {
    const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
    const effectiveCapacity = Math.max(0, weeklyCapacity - 8); // Subtract non-project hours

    // Group allocations by week
    const allocationsByWeek: Record<string, number> = {};
    allocations.forEach(allocation => {
      if (allocation.weeklyAllocations) {
        Object.entries(allocation.weeklyAllocations).forEach(([weekKey, hours]) => {
          allocationsByWeek[weekKey] = (allocationsByWeek[weekKey] || 0) + (hours as number);
        });
      }
    });

    // Count overallocated weeks (>100% utilization)
    const overallocatedWeeks = Object.values(allocationsByWeek).filter(
      hours => effectiveCapacity > 0 && (hours / effectiveCapacity) > 1
    ).length;

    return {
      hasMultipleOverallocations: overallocatedWeeks > 1,
      overallocatedWeeksCount: overallocatedWeeks
    };
  }, [resource.weeklyCapacity, allocations]);
  
  // Helper function to truncate skill names for consistent display
  const truncateSkill = (skill: string, maxLength: number = 12): string => {
    if (skill.length <= maxLength) return skill;

    // Smart abbreviation for common long skill names
    const abbreviations: Record<string, string> = {
      'JavaScript Development': 'JavaScript',
      'Project Management': 'PM',
      'Change Management': 'Change Mgmt',
      'Business Analysis': 'BA',
      'User Experience': 'UX',
      'User Interface': 'UI',
      'Quality Assurance': 'QA',
      'Database Administration': 'DBA',
      'System Administration': 'SysAdmin',
      'Software Development': 'Dev',
      'Frontend Development': 'Frontend',
      'Backend Development': 'Backend',
      'Full Stack Development': 'Full Stack',
      'Data Analysis': 'Data',
      'Machine Learning': 'ML',
      'Artificial Intelligence': 'AI'
    };

    // Check for exact matches first
    if (abbreviations[skill]) {
      return abbreviations[skill];
    }

    // Check for partial matches
    for (const [full, abbrev] of Object.entries(abbreviations)) {
      if (skill.includes(full)) {
        return abbrev;
      }
    }

    // Fallback to truncation with ellipsis
    return skill.substring(0, maxLength - 3) + '...';
  };

  // Parse skills and projects for tags
  const skills = useMemo(() => {
    if (!resource.skills) return [];

    let rawSkills: string[] = [];
    if (typeof resource.skills === 'string') {
      rawSkills = resource.skills.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(resource.skills)) {
      rawSkills = resource.skills.map(skill => String(skill).trim()).filter(Boolean);
    } else {
      // Handle other data types by converting to string
      rawSkills = String(resource.skills).split(',').map(s => s.trim()).filter(Boolean);
    }

    // Apply truncation to all skills for consistent display
    return rawSkills.map(skill => truncateSkill(skill));
  }, [resource.skills]);

  const projectCount = allocations.length;

  if (variant === 'list') {
    return (
      <TooltipProvider>
        <Card className={cn(
          "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer rounded-xl shadow-sm border-blue-200/50 bg-white/95 backdrop-blur-sm hover:bg-white hover:border-blue-300/50",
          "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5",
          className
        )}>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 mr-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="max-h-[3rem] overflow-hidden">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors cursor-help project-title-clamp">
                              {resource.name}
                            </h3>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{resource.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge className={cn("font-medium text-xs px-2.5 py-1 border-2", status.color)}>
                        {formatStatusText(status.status)}
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="font-medium text-xs px-2.5 py-1 border-2 max-w-[120px]">
                              <span className="truncate block">
                                {resource.role}
                              </span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{resource.role}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span>{resource.department}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{resource.weeklyCapacity || '40'}h capacity</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Tags - Fixed height container for consistent layout */}
              <div className="hidden lg:flex items-center gap-2 px-4 h-6 overflow-hidden">
                {/* Show only 1 skill to prevent wrapping, with smaller font */}
                {skills.length > 0 && (
                  <Badge key={0} variant="secondary" className="text-xs flex-shrink-0 max-w-[100px]">
                    <span className="truncate">{skills[0]}</span>
                  </Badge>
                )}
                {skills.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs cursor-help flex-shrink-0">
                        +{skills.length - 1}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 max-w-[200px]">
                        <div className="font-medium text-sm mb-2">All Skills:</div>
                        {/* Show original skill names in tooltip */}
                        {resource.skills && typeof resource.skills === 'string'
                          ? resource.skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, index) => (
                              <div key={index} className="text-sm">{skill}</div>
                            ))
                          : Array.isArray(resource.skills)
                          ? resource.skills.map((skill, index) => (
                              <div key={index} className="text-sm">{String(skill).trim()}</div>
                            ))
                          : [String(resource.skills)].map((skill, index) => (
                              <div key={index} className="text-sm">{skill}</div>
                            ))
                        }
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {projectCount > 0
                    ? `${projectCount} project${projectCount !== 1 ? 's' : ''}`
                    : 'No projects assigned'
                  }
                </Badge>
              </div>

              {/* Right: Status + Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatStatusText(status.status)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>{resource.weeklyCapacity}h/week capacity</div>
                    <div>{effectiveCapacity}h effective</div>
                    <div className="font-medium text-blue-600">
                      {Math.round(currentWeekUtilization)}% this week
                    </div>
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center gap-1">
                    <Link href={`/resources/${resource.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(resource)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Capacity Heatmap for List View */}
            <div className="mt-4 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
              <WeeklyCapacityHeatmap
                resourceId={resource.id}
                weeklyCapacity={parseFloat(resource.weeklyCapacity || '40')}
                allocations={allocations || []}
                onWeekClick={(weekData) => {
                  // Show a toast notification for now (can be replaced with modal later)
                  console.log('Week clicked:', weekData);
                  // TODO: Open allocation detail modal
                }}
              />
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  // Grid view (default)
  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer rounded-xl shadow-sm border-blue-200/50 bg-white/95 backdrop-blur-sm hover:bg-white hover:border-blue-300/50",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.02]",
        className
      )}>
        <CardHeader className="pb-3 relative z-10 flex-shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-[3.5rem] overflow-hidden">
                    <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors cursor-help project-title-clamp">
                      {resource.name}
                    </h3>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{resource.name}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Badge className={cn("font-medium text-xs px-2.5 py-1 text-center", status.color)}>
                {formatStatusText(status.status)}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="font-medium text-xs px-2.5 py-1 text-center max-w-[120px]">
                      <span className="truncate block">
                        {resource.role}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{resource.role}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Resource Info with tooltip for long text */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2 cursor-help">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="line-clamp-1">{resource.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="line-clamp-1">{resource.department}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{resource.weeklyCapacity || '40'}h/week capacity</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-6">
                    {effectiveCapacity}h effective capacity
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <p><strong>Email:</strong> {resource.email}</p>
                <p><strong>Department:</strong> {resource.department}</p>
                <p><strong>Total Capacity:</strong> {resource.weeklyCapacity || '40'}h/week</p>
                <p><strong>Effective Capacity:</strong> {effectiveCapacity}h/week</p>
                {resource.location && <p><strong>Location:</strong> {resource.location}</p>}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Current Week Utilization Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current Week Utilization</span>
              <span className="font-medium text-gray-900">
                {Math.round(currentWeekUtilization)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round(currentWeekUtilization))}%`
                }}
              ></div>
            </div>
          </div>

          {/* Weekly Capacity Heatmap */}
          <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100">
            <WeeklyCapacityHeatmap
              resourceId={resource.id}
              weeklyCapacity={parseFloat(resource.weeklyCapacity || '40')}
              allocations={allocations || []}
              onWeekClick={(weekData) => {
                // Show a toast notification for now (can be replaced with modal later)
                console.log('Week clicked:', weekData);
                // TODO: Open allocation detail modal
              }}
            />
          </div>

          {/* Skills Tags */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 2).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skills.length > 2 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs cursor-help">
                      +{skills.length - 2}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {skills.slice(2).map((skill, index) => (
                        <div key={index}>{skill}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Project Count */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="h-4 w-4 text-gray-400" />
            <span>
              {projectCount > 0
                ? `${projectCount} active project${projectCount !== 1 ? 's' : ''}`
                : 'No projects assigned'
              }
            </span>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex space-x-2 pt-4 border-t border-gray-100/80">
              <Link href={`/resources/${resource.id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(resource)}
                className="px-3 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
