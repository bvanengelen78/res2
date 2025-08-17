import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Activity, AlertCircle, AlertTriangle, CheckCircle, Clock, Users, Target, Zap, PieChart, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addWeeks, getWeek, getYear } from 'date-fns';

// Custom hook for animated number counting
const useAnimatedCounter = (
  endValue: number,
  duration: number = 1000,
  decimals: number = 0,
  startValue: number = 0
) => {
  const [count, setCount] = useState(startValue);
  const countRef = useRef(startValue);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();
    const startCount = countRef.current;
    const difference = endValue - startCount;

    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = startCount + (difference * easeOutQuart);

      setCount(currentCount);
      countRef.current = currentCount;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(updateCount);
      }
    };

    rafRef.current = requestAnimationFrame(updateCount);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [endValue, duration]);

  return decimals > 0 ? count.toFixed(decimals) : Math.round(count).toString();
};

// Custom hook for color transitions
const useColorTransition = (color: string, duration: number = 300) => {
  const [currentColor, setCurrentColor] = useState(color);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCurrentColor(color);
    }, 50);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [color]);

  return currentColor;
};

interface ResourceKPIPanelProps {
  resource: any;
  totalAllocatedHours: number;
  resourceStatus: {
    status: string;
    color: string;
    icon: string;
  };
  isLoading?: boolean;
  className?: string;
}

interface LoadingSkeletonProps {
  className?: string;
}

interface ManagementUtilizationCardProps {
  currentUtilization: number;
  totalAllocatedHours: number;
  weeklyCapacity: number;
  resourceStatus: {
    status: string;
    color: string;
    icon: string;
  };
}

// Animated Progress Ring Component
const AnimatedProgressRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  className?: string;
}> = ({ percentage, size = 40, strokeWidth = 3, color, className }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
};

interface ManagementStatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'red' | 'amber' | 'green' | 'blue';
  tooltip: {
    title: string;
    details: { label: string; value: string }[];
  };
  numericValue?: number;
  isPercentage?: boolean;
  isLoading?: boolean;
}

interface ManagementMetrics {
  averageWeeklyAllocation: number;
  overbookedWeeks: number;
  underutilizedWeeks: number;
  maxWeeklyAllocation: number;
  activeProjects: number;
  totalWeeks: number;
  capacityUtilization: number;
  weeklyTrend: number[];
  allocationEfficiency: number;
  projectDiversity: number;
  peakUtilization: number;
  consistencyScore: number;
}

interface UtilizationTrendData {
  weekKey: string;
  weekNumber: number;
  utilizationPercentage: number;
  allocatedHours: number;
  effectiveCapacity: number;
  isCurrentWeek?: boolean;
}

// Management Utilization Card Component
function ManagementUtilizationCard({
  currentUtilization,
  totalAllocatedHours,
  weeklyCapacity,
  resourceStatus
}: ManagementUtilizationCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Current Utilization</h4>
            <p className="text-xs text-gray-500">This week's allocation status</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-lg font-bold px-3 py-1.5 cursor-help",
                  currentUtilization > 100 ? "bg-red-50 text-red-700 border-red-200" :
                  currentUtilization > 80 ? "bg-amber-50 text-amber-700 border-amber-200" :
                  currentUtilization > 0 ? "bg-green-50 text-green-700 border-green-200" :
                  "bg-gray-50 text-gray-600 border-gray-200"
                )}
              >
                {currentUtilization.toFixed(0)}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <div className="font-medium text-sm">Utilization Breakdown</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Allocated:</span>
                    <span className="font-medium">{totalAllocatedHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span className="font-medium">{weeklyCapacity}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span className="font-medium">{Math.max(0, weeklyCapacity - totalAllocatedHours)}h</span>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-2">
          <Progress
            value={Math.min(100, currentUtilization)}
            className="h-3"
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">0h</span>
            <span className="font-medium text-gray-700 bg-white px-2 py-1 rounded border">
              {totalAllocatedHours}h allocated
            </span>
            <span className="text-gray-500">{weeklyCapacity}h</span>
          </div>
        </div>

        {/* Status Insight */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Status:</span>
            <Badge className={cn("text-xs whitespace-nowrap", resourceStatus.color)}>
              {resourceStatus.icon} {resourceStatus.status.charAt(0).toUpperCase() + resourceStatus.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Management Stat Card Component with Animations
function ManagementStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  tooltip,
  numericValue,
  isPercentage = false,
  isLoading = false
}: ManagementStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Animated counter for numeric values
  const animatedValue = useAnimatedCounter(
    numericValue || parseFloat(value) || 0,
    1200,
    isPercentage ? 1 : 0
  );

  // Color transition for smooth status changes
  const transitionedColor = useColorTransition(color, 300);

  const colorClasses = {
    red: {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      hover: "hover:bg-red-100",
      ring: "ring-red-200",
      progressColor: "#dc2626"
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      hover: "hover:bg-amber-100",
      ring: "ring-amber-200",
      progressColor: "#d97706"
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      border: "border-green-200",
      hover: "hover:bg-green-100",
      ring: "ring-green-200",
      progressColor: "#16a34a"
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      hover: "hover:bg-blue-100",
      ring: "ring-blue-200",
      progressColor: "#2563eb"
    }
  };

  const classes = colorClasses[transitionedColor];

  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-help",
            "transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1",
            "hover:border-gray-300",
            isHovered && "ring-2 ring-offset-2",
            isHovered && classes.ring
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md transition-all duration-300",
                  classes.bg, classes.border, "border",
                  isHovered && "scale-110 shadow-sm"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-300",
                    classes.text,
                    isHovered && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-sm font-medium text-gray-700 transition-colors duration-300",
                  isHovered && classes.text
                )}>
                  {title}
                </span>
              </div>
              {isPercentage && numericValue !== undefined && (
                <AnimatedProgressRing
                  percentage={numericValue}
                  size={28}
                  strokeWidth={2}
                  color={classes.progressColor}
                  className={cn(
                    "transition-all duration-300",
                    isHovered && "scale-110"
                  )}
                />
              )}
            </div>
            <div>
              <div className={cn(
                "text-2xl font-bold text-gray-900 transition-all duration-300",
                hasAnimated && "animate-in slide-in-from-bottom-2",
                isHovered && "scale-105"
              )}>
                {numericValue !== undefined ? (
                  <>
                    {animatedValue}
                    {isPercentage && '%'}
                    {!isPercentage && value.includes('h') && 'h'}
                  </>
                ) : (
                  value
                )}
              </div>
              <div className="text-xs text-gray-500 transition-colors duration-300">
                {subtitle}
              </div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-medium text-sm">{tooltip.title}</div>
          <div className="space-y-1 text-xs">
            {tooltip.details.map((detail, index) => (
              <div key={index} className="flex justify-between">
                <span>{detail.label}:</span>
                <span className="font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Loading skeleton component
function KPIPanelSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <Card className={cn("border-gray-200", className)}>
      <CardContent className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Current utilization skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>

        {/* Trend skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-end gap-2 h-12 bg-gray-50 rounded-lg p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 h-full rounded-sm" />
            ))}
          </div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ResourceKPIPanel({
  resource,
  totalAllocatedHours,
  resourceStatus,
  isLoading = false,
  className
}: ResourceKPIPanelProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Show loading skeleton
  if (isLoading || !resource) {
    return <KPIPanelSkeleton className={className} />;
  }

  // Calculate utilization metrics with error handling using effective capacity
  const weeklyCapacity = useMemo(() => {
    const capacity = parseFloat(resource?.weeklyCapacity || '40');
    return isNaN(capacity) ? 40 : capacity;
  }, [resource?.weeklyCapacity]);

  // Calculate effective capacity (total capacity - non-project hours)
  const effectiveWeeklyCapacity = useMemo(() => {
    const DEFAULT_NON_PROJECT_HOURS = 8; // Meetings, admin, etc.
    return Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
  }, [weeklyCapacity]);

  const currentUtilization = useMemo(() => {
    if (effectiveWeeklyCapacity <= 0) return 0;
    return Math.min(150, (totalAllocatedHours / effectiveWeeklyCapacity) * 100);
  }, [totalAllocatedHours, effectiveWeeklyCapacity]);
  
  // Generate trend data for the last 8 weeks with error handling
  const trendData = useMemo(() => {
    try {
      const weeks: UtilizationTrendData[] = [];
      const today = new Date();

      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(addWeeks(today, -i), { weekStartsOn: 1 });
        const weekNumber = getWeek(weekStart);
        const year = getYear(weekStart);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

        // Calculate weekly allocation from resource allocations with safety checks
        let weeklyAllocated = 0;
        if (resource?.allocations && Array.isArray(resource.allocations)) {
          resource.allocations.forEach((allocation: any) => {
            try {
              if (allocation?.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
                const hours = allocation.weeklyAllocations[weekKey];
                if (typeof hours === 'number' && !isNaN(hours)) {
                  weeklyAllocated += hours;
                }
              }
            } catch (error) {
              console.warn('Error processing allocation data:', error);
            }
          });
        }

        const effectiveCapacity = effectiveWeeklyCapacity; // Use consistent effective capacity
        const utilizationPercentage = effectiveCapacity > 0 ?
          Math.min(150, (weeklyAllocated / effectiveCapacity) * 100) : 0;

        const isCurrentWeek = i === 0; // Last iteration is current week

        weeks.push({
          weekKey,
          weekNumber,
          utilizationPercentage,
          allocatedHours: weeklyAllocated,
          effectiveCapacity,
          isCurrentWeek
        });
      }

      return weeks;
    } catch (error) {
      console.error('Error generating trend data:', error);
      return [];
    }
  }, [resource, weeklyCapacity]);

  // Calculate trend direction with better logic
  const trendDirection = useMemo(() => {
    if (trendData.length < 4) return 'stable';

    try {
      const recent = trendData.slice(-3);
      const earlier = trendData.slice(0, 3);

      const recentAvg = recent.reduce((sum, week) => sum + week.utilizationPercentage, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, week) => sum + week.utilizationPercentage, 0) / earlier.length;
      const diff = recentAvg - earlierAvg;

      if (diff > 8) return 'up';
      if (diff < -8) return 'down';
      return 'stable';
    } catch (error) {
      console.warn('Error calculating trend direction:', error);
      return 'stable';
    }
  }, [trendData]);

  // Get next week's projected utilization with error handling
  const nextWeekProjection = useMemo(() => {
    try {
      const nextWeek = addWeeks(new Date(), 1);
      const weekNumber = getWeek(nextWeek);
      const year = getYear(nextWeek);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

      let nextWeekAllocated = 0;
      if (resource?.allocations && Array.isArray(resource.allocations)) {
        resource.allocations.forEach((allocation: any) => {
          try {
            if (allocation?.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
              const hours = allocation.weeklyAllocations[weekKey];
              if (typeof hours === 'number' && !isNaN(hours)) {
                nextWeekAllocated += hours;
              }
            }
          } catch (error) {
            console.warn('Error processing next week allocation:', error);
          }
        });
      }

      return {
        hours: nextWeekAllocated,
        percentage: effectiveWeeklyCapacity > 0 ? Math.min(150, (nextWeekAllocated / effectiveWeeklyCapacity) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculating next week projection:', error);
      return { hours: 0, percentage: 0 };
    }
  }, [resource, effectiveWeeklyCapacity]);

  // Active projects count with safety check
  const activeProjects = useMemo(() => {
    try {
      return resource?.allocations?.filter((a: any) => a?.status === 'active')?.length || 0;
    } catch (error) {
      console.warn('Error counting active projects:', error);
      return 0;
    }
  }, [resource?.allocations]);

  // Calculate comprehensive management metrics
  const managementMetrics = useMemo((): ManagementMetrics => {
    try {
      if (!resource?.allocations || !Array.isArray(resource.allocations)) {
        return {
          averageWeeklyAllocation: 0,
          overbookedWeeks: 0,
          underutilizedWeeks: 0,
          maxWeeklyAllocation: 0,
          activeProjects: 0,
          totalWeeks: 0,
          capacityUtilization: 0,
          weeklyTrend: [],
          allocationEfficiency: 0,
          projectDiversity: 0,
          peakUtilization: 0,
          consistencyScore: 0,
        };
      }

      const currentYear = new Date().getFullYear();
      const weeklyTotals: Record<string, number> = {};
      const projectWeeks: Record<string, Set<string>> = {};

      // Aggregate weekly allocations across all projects
      resource.allocations.forEach((allocation: any) => {
        if (allocation?.status === 'active' && allocation?.weeklyAllocations) {
          Object.entries(allocation.weeklyAllocations).forEach(([weekKey, hours]) => {
            if (weekKey.startsWith(currentYear.toString()) && typeof hours === 'number' && !isNaN(hours)) {
              weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + hours;

              // Track project diversity
              if (!projectWeeks[allocation.projectId]) {
                projectWeeks[allocation.projectId] = new Set();
              }
              projectWeeks[allocation.projectId].add(weekKey);
            }
          });
        }
      });

      const weeklyValues = Object.values(weeklyTotals);
      const totalWeeks = weeklyValues.length;

      if (totalWeeks === 0) {
        return {
          averageWeeklyAllocation: 0,
          overbookedWeeks: 0,
          underutilizedWeeks: 0,
          maxWeeklyAllocation: 0,
          activeProjects,
          totalWeeks: 0,
          capacityUtilization: 0,
          weeklyTrend: [],
          allocationEfficiency: 0,
          projectDiversity: 0,
          peakUtilization: 0,
          consistencyScore: 0,
        };
      }

      // Core metrics using effective capacity
      const averageWeeklyAllocation = weeklyValues.reduce((sum, val) => sum + val, 0) / totalWeeks;
      const maxWeeklyAllocation = Math.max(...weeklyValues);
      const capacityUtilization = effectiveWeeklyCapacity > 0 ? (averageWeeklyAllocation / effectiveWeeklyCapacity) * 100 : 0;
      const peakUtilization = effectiveWeeklyCapacity > 0 ? (maxWeeklyAllocation / effectiveWeeklyCapacity) * 100 : 0;

      // Week categorization using effective capacity
      const overbookedWeeks = weeklyValues.filter(val => val > effectiveWeeklyCapacity).length;
      const underutilizedWeeks = weeklyValues.filter(val => val < effectiveWeeklyCapacity * 0.5).length;

      // Efficiency and consistency calculations
      const variance = weeklyValues.reduce((sum, hours) => {
        return sum + Math.pow(hours - averageWeeklyAllocation, 2);
      }, 0) / totalWeeks;
      const consistencyScore = averageWeeklyAllocation > 0 ?
        Math.max(0, 100 - (Math.sqrt(variance) / averageWeeklyAllocation) * 100) : 0;

      // Allocation efficiency (how well effective capacity is utilized without over-allocation)
      const optimalWeeks = weeklyValues.filter(val => val >= effectiveWeeklyCapacity * 0.8 && val <= effectiveWeeklyCapacity).length;
      const allocationEfficiency = totalWeeks > 0 ? (optimalWeeks / totalWeeks) * 100 : 0;

      // Project diversity (average projects per week)
      const projectDiversity = totalWeeks > 0 ?
        Object.values(projectWeeks).reduce((sum, weeks) => sum + weeks.size, 0) / totalWeeks : 0;

      // Generate trend data for last 12 weeks
      const sortedWeeks = Object.keys(weeklyTotals).sort();
      const last12Weeks = sortedWeeks.slice(-12);
      const weeklyTrend = last12Weeks.map(week => weeklyTotals[week] || 0);

      return {
        averageWeeklyAllocation,
        overbookedWeeks,
        underutilizedWeeks,
        maxWeeklyAllocation,
        activeProjects,
        totalWeeks,
        capacityUtilization,
        weeklyTrend,
        allocationEfficiency,
        projectDiversity,
        peakUtilization,
        consistencyScore,
      };
    } catch (error) {
      console.error('Error calculating management metrics:', error);
      return {
        averageWeeklyAllocation: 0,
        overbookedWeeks: 0,
        underutilizedWeeks: 0,
        maxWeeklyAllocation: 0,
        activeProjects: 0,
        totalWeeks: 0,
        capacityUtilization: 0,
        weeklyTrend: [],
        allocationEfficiency: 0,
        projectDiversity: 0,
        peakUtilization: 0,
        consistencyScore: 0,
      };
    }
  }, [resource?.allocations, effectiveWeeklyCapacity, activeProjects]);

  // Handle sparkline click with keyboard support
  const handleSparklineClick = useCallback((weekKey: string) => {
    setSelectedWeek(prev => prev === weekKey ? null : weekKey);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, weekKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSparklineClick(weekKey);
    }
  }, [handleSparklineClick]);

  // Error boundary fallback
  if (trendData.length === 0 && !isDataLoading) {
    return (
      <Card className={cn("border-gray-200", className)}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-2">Unable to load resource insights</p>
          <p className="text-xs text-gray-400">Please check the resource allocation data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <Card className={cn(
        "border-gray-200 bg-white hover:shadow-lg transition-all duration-300",
        "hover:border-gray-300 hover:-translate-y-0.5",
        className
      )}>
        <CardContent className="p-6">
          {/* Enhanced Header with Animations */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg transition-all duration-300 hover:bg-blue-100 hover:scale-110">
                <Activity className="h-4 w-4 text-blue-600 transition-all duration-300 hover:scale-110" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Resource Insights</h3>
                <p className="text-sm text-gray-500">Management dashboard for resource utilization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Static Live Data badge */}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs border-blue-200 text-blue-700 bg-blue-50",
                  "hover:bg-blue-100 transition-all duration-300"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Live Data
                </div>
              </Badge>
            </div>
          </div>

          {/* Comprehensive Management Insights Grid */}
          <div className="space-y-6 mt-6">
            {/* Primary KPI Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ManagementStatCard
                title="Average Weekly Allocation"
                value={`${managementMetrics.averageWeeklyAllocation.toFixed(1)}h`}
                subtitle={`${managementMetrics.capacityUtilization.toFixed(1)}% of capacity`}
                icon={TrendingUp}
                color={managementMetrics.capacityUtilization > 100 ? "red" :
                       managementMetrics.capacityUtilization > 80 ? "amber" : "green"}
                numericValue={managementMetrics.averageWeeklyAllocation}
                isPercentage={false}
                isLoading={isLoading}
                tooltip={{
                  title: "Weekly Allocation Analysis",
                  details: [
                    { label: "Average hours", value: `${managementMetrics.averageWeeklyAllocation.toFixed(1)}h` },
                    { label: "Capacity utilization", value: `${managementMetrics.capacityUtilization.toFixed(1)}%` },
                    { label: "Effective capacity", value: `${effectiveWeeklyCapacity}h` },
                    { label: "Total capacity", value: `${weeklyCapacity}h` },
                    { label: "Total weeks analyzed", value: managementMetrics.totalWeeks.toString() }
                  ]
                }}
              />

              <ManagementStatCard
                title="Overbooked Weeks"
                value={managementMetrics.overbookedWeeks.toString()}
                subtitle={`out of ${managementMetrics.totalWeeks} weeks`}
                icon={AlertTriangle}
                color={managementMetrics.overbookedWeeks > 2 ? "red" :
                       managementMetrics.overbookedWeeks > 0 ? "amber" : "green"}
                numericValue={managementMetrics.overbookedWeeks}
                isPercentage={false}
                isLoading={isLoading}
                tooltip={{
                  title: "Capacity Overallocation",
                  details: [
                    { label: "Overbooked weeks", value: managementMetrics.overbookedWeeks.toString() },
                    { label: "Total weeks", value: managementMetrics.totalWeeks.toString() },
                    { label: "Overbook rate", value: `${((managementMetrics.overbookedWeeks / Math.max(1, managementMetrics.totalWeeks)) * 100).toFixed(1)}%` },
                    { label: "Effective capacity", value: `${effectiveWeeklyCapacity}h` },
                    { label: "Total capacity", value: `${weeklyCapacity}h` }
                  ]
                }}
              />

              <ManagementStatCard
                title="Capacity Utilization"
                value={`${managementMetrics.capacityUtilization.toFixed(0)}%`}
                subtitle="Overall efficiency"
                icon={Target}
                color={managementMetrics.capacityUtilization > 100 ? "red" :
                       managementMetrics.capacityUtilization > 80 ? "green" :
                       managementMetrics.capacityUtilization > 50 ? "amber" : "red"}
                numericValue={managementMetrics.capacityUtilization}
                isPercentage={true}
                isLoading={isLoading}
                tooltip={{
                  title: "Capacity Utilization Analysis",
                  details: [
                    { label: "Utilization rate", value: `${managementMetrics.capacityUtilization.toFixed(1)}%` },
                    { label: "Average allocation", value: `${managementMetrics.averageWeeklyAllocation.toFixed(1)}h` },
                    { label: "Effective capacity", value: `${effectiveWeeklyCapacity}h` },
                    { label: "Total capacity", value: `${weeklyCapacity}h` },
                    { label: "Efficiency status", value:
                      managementMetrics.capacityUtilization > 100 ? 'Over-allocated' :
                      managementMetrics.capacityUtilization > 80 ? 'Well-utilized' :
                      managementMetrics.capacityUtilization > 50 ? 'Moderate' : 'Under-utilized'
                    }
                  ]
                }}
              />
            </div>

            {/* Secondary KPI Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <ManagementStatCard
                title="Active Projects"
                value={managementMetrics.activeProjects.toString()}
                subtitle="current assignments"
                icon={BarChart3}
                color="blue"
                numericValue={managementMetrics.activeProjects}
                isPercentage={false}
                isLoading={isLoading}
                tooltip={{
                  title: "Project Load Analysis",
                  details: [
                    { label: "Active projects", value: managementMetrics.activeProjects.toString() },
                    { label: "Project diversity", value: `${managementMetrics.projectDiversity.toFixed(1)} avg/week` },
                    { label: "Load assessment", value:
                      managementMetrics.activeProjects === 0 ? 'No assignments' :
                      managementMetrics.activeProjects === 1 ? 'Single project focus' :
                      managementMetrics.activeProjects <= 3 ? 'Moderate load' : 'High load'
                    }
                  ]
                }}
              />

              <ManagementStatCard
                title="Peak Utilization"
                value={`${managementMetrics.peakUtilization.toFixed(0)}%`}
                subtitle={`${managementMetrics.maxWeeklyAllocation.toFixed(1)}h maximum`}
                icon={Zap}
                color={managementMetrics.peakUtilization > 120 ? "red" :
                       managementMetrics.peakUtilization > 100 ? "amber" : "green"}
                numericValue={managementMetrics.peakUtilization}
                isPercentage={true}
                isLoading={isLoading}
                tooltip={{
                  title: "Peak Utilization Analysis",
                  details: [
                    { label: "Peak utilization", value: `${managementMetrics.peakUtilization.toFixed(1)}%` },
                    { label: "Maximum hours", value: `${managementMetrics.maxWeeklyAllocation.toFixed(1)}h` },
                    { label: "Effective capacity", value: `${effectiveWeeklyCapacity}h` },
                    { label: "Total capacity", value: `${weeklyCapacity}h` },
                    { label: "Peak status", value:
                      managementMetrics.peakUtilization > 120 ? 'Severely overloaded' :
                      managementMetrics.peakUtilization > 100 ? 'Overloaded' : 'Within capacity'
                    }
                  ]
                }}
              />

              <ManagementStatCard
                title="Allocation Efficiency"
                value={`${managementMetrics.allocationEfficiency.toFixed(0)}%`}
                subtitle="optimal weeks"
                icon={CheckCircle}
                color={managementMetrics.allocationEfficiency > 70 ? "green" :
                       managementMetrics.allocationEfficiency > 40 ? "amber" : "red"}
                numericValue={managementMetrics.allocationEfficiency}
                isPercentage={true}
                isLoading={isLoading}
                tooltip={{
                  title: "Allocation Efficiency",
                  details: [
                    { label: "Efficiency score", value: `${managementMetrics.allocationEfficiency.toFixed(1)}%` },
                    { label: "Optimal range", value: "80-100% effective capacity" },
                    { label: "Effective capacity", value: `${effectiveWeeklyCapacity}h` },
                    { label: "Underutilized weeks", value: managementMetrics.underutilizedWeeks.toString() },
                    { label: "Assessment", value:
                      managementMetrics.allocationEfficiency > 70 ? 'Excellent planning' :
                      managementMetrics.allocationEfficiency > 40 ? 'Good planning' : 'Needs improvement'
                    }
                  ]
                }}
              />

              <ManagementStatCard
                title="Consistency Score"
                value={`${managementMetrics.consistencyScore.toFixed(0)}%`}
                subtitle="allocation stability"
                icon={PieChart}
                color={managementMetrics.consistencyScore > 80 ? "green" :
                       managementMetrics.consistencyScore > 60 ? "amber" : "red"}
                numericValue={managementMetrics.consistencyScore}
                isPercentage={true}
                isLoading={isLoading}
                tooltip={{
                  title: "Allocation Consistency",
                  details: [
                    { label: "Consistency score", value: `${managementMetrics.consistencyScore.toFixed(1)}%` },
                    { label: "Average allocation", value: `${managementMetrics.averageWeeklyAllocation.toFixed(1)}h` },
                    { label: "Stability assessment", value:
                      managementMetrics.consistencyScore > 80 ? 'Very stable' :
                      managementMetrics.consistencyScore > 60 ? 'Moderately stable' : 'Highly variable'
                    }
                  ]
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
