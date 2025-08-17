import React, { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Calendar, Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addWeeks, startOfWeek, isSameWeek, getISOWeek, getYear } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStaticTooltipPosition } from '@/hooks/use-viewport-position';

interface WeekData {
  weekKey: string;
  weekNumber: string;
  startDate: Date;
  effectiveCapacity: number;
  allocatedHours: number;
  utilizationPercentage: number;
  status: 'healthy' | 'near-full' | 'overallocated' | 'no-data';
  isCurrentWeek: boolean;
  hasHolidays?: boolean;
}

interface WeeklyCapacityHeatmapProps {
  resourceId: number;
  weeklyCapacity: number;
  allocations: any[];
  className?: string;
  weeksToShow?: number;
  onWeekClick?: (weekData: WeekData) => void;
}

// Default non-project hours (meetings, admin, etc.)
const DEFAULT_NON_PROJECT_HOURS = 8;

// Generate week key in format "YYYY-WXX" using ISO week
function getWeekKey(date: Date): string {
  const year = getYear(date);
  const weekNumber = getISOWeek(date);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Calculate utilization status
function getUtilizationStatus(utilizationPercentage: number): WeekData['status'] {
  if (utilizationPercentage === 0) return 'no-data';
  if (utilizationPercentage >= 100) return 'overallocated';
  if (utilizationPercentage >= 80) return 'near-full';
  return 'healthy';
}

// Get color classes for status
function getStatusColors(status: WeekData['status']): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500 hover:bg-green-600 border-green-400';
    case 'near-full':
      return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-400';
    case 'overallocated':
      return 'bg-red-500 hover:bg-red-600 border-red-400';
    case 'no-data':
      return 'bg-gray-200 hover:bg-gray-300 border-gray-300';
    default:
      return 'bg-gray-200 hover:bg-gray-300 border-gray-300';
  }
}

export function WeeklyCapacityHeatmap({
  resourceId,
  weeklyCapacity,
  allocations = [],
  className,
  weeksToShow,
  onWeekClick
}: WeeklyCapacityHeatmapProps) {
  const isMobile = useIsMobile();
  const [pinnedTooltip, setPinnedTooltip] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  // Get container width for responsive positioning
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // Click outside handler to close pinned tooltips
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if clicking outside the tooltip and trigger elements
      const target = event.target as Element;
      if (pinnedTooltip && !target.closest('[data-radix-tooltip-content]') && !target.closest('[data-radix-tooltip-trigger]')) {
        setPinnedTooltip(null);
        setHoveredWeek(null);
      }
    };

    if (pinnedTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pinnedTooltip]);

  // Keyboard support for closing pinned tooltips
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pinnedTooltip && event.key === 'Escape') {
        setPinnedTooltip(null);
        setHoveredWeek(null);
      }
    };

    if (pinnedTooltip) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [pinnedTooltip]);

  // Responsive weeks display: 4 on mobile, 6-8 on desktop
  const responsiveWeeksToShow = weeksToShow || (isMobile ? 4 : 6);
  const weekData = useMemo(() => {
    // Use a stable date reference to prevent flickering
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
    const weeks: WeekData[] = [];

    // Group allocations by week - stable calculation
    const allocationsByWeek: Record<string, number> = {};
    if (allocations && allocations.length > 0) {
      allocations.forEach(allocation => {
        if (allocation.weeklyAllocations && typeof allocation.weeklyAllocations === 'object') {
          Object.entries(allocation.weeklyAllocations).forEach(([weekKey, hours]) => {
            if (typeof hours === 'number' && !isNaN(hours)) {
              allocationsByWeek[weekKey] = (allocationsByWeek[weekKey] || 0) + hours;
            }
          });
        }
      });
    }

    // Generate week data for the specified number of weeks
    for (let i = 0; i < responsiveWeeksToShow; i++) {
      const weekStart = addWeeks(currentWeekStart, i);
      const weekKey = getWeekKey(weekStart);
      const weekNumber = format(weekStart, "'W'II");

      // Calculate effective capacity (total capacity minus non-project hours)
      const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);

      // Get allocated hours for this week
      const allocatedHours = allocationsByWeek[weekKey] || 0;

      // Calculate utilization percentage
      const utilizationPercentage = effectiveCapacity > 0 ? (allocatedHours / effectiveCapacity) * 100 : 0;

      weeks.push({
        weekKey,
        weekNumber,
        startDate: weekStart,
        effectiveCapacity,
        allocatedHours,
        utilizationPercentage,
        status: getUtilizationStatus(utilizationPercentage),
        isCurrentWeek: isSameWeek(weekStart, today, { weekStartsOn: 1 }),
        hasHolidays: false // TODO: Implement holiday detection
      });
    }

    return weeks;
  }, [resourceId, weeklyCapacity, allocations, responsiveWeeksToShow]);

  // Check if resource is overallocated in multiple weeks
  const overallocationCount = weekData.filter(week => week.status === 'overallocated').length;
  const hasMultipleOverallocations = overallocationCount > 1;

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <div className={cn("space-y-2", className)}>
        {/* Header with week numbers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Next {responsiveWeeksToShow} weeks</span>
          </div>

        </div>

        {/* Week numbers header */}
        <div className="flex gap-1 mb-1">
          {weekData.map((week, index) => (
            <div
              key={`header-${resourceId}-${week.weekKey}-${index}`}
              className="flex-1 text-center min-w-0"
            >
              <span className="text-xs font-medium text-gray-500">
                {week.weekNumber}
              </span>
            </div>
          ))}
        </div>

        {/* Week blocks */}
        <div className="flex gap-1">
          {weekData.map((week, index) => {
            const isTooltipOpen = hoveredWeek === week.weekKey || pinnedTooltip === week.weekKey;
            const tooltipPosition = getStaticTooltipPosition(index, weekData.length, containerWidth);

            return (
              <Tooltip
                key={`${resourceId}-${week.weekKey}-${index}`}
                open={isTooltipOpen}
                onOpenChange={(open) => {
                  if (!open && pinnedTooltip === week.weekKey) {
                    // Don't close if it's pinned
                    return;
                  }
                  if (open) {
                    setHoveredWeek(week.weekKey);
                  } else {
                    setHoveredWeek(null);
                  }
                }}
              >
                <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Week ${week.weekNumber}: ${Math.round(week.utilizationPercentage)}% utilized. ${pinnedTooltip === week.weekKey ? 'Tooltip pinned. ' : ''}Click to ${pinnedTooltip === week.weekKey ? 'unpin' : 'pin'} tooltip.`}
                  className={cn(
                    "relative flex-1 min-w-0 rounded-md border-2 cursor-pointer",
                    "transition-all duration-200 ease-out will-change-transform",
                    "hover:scale-105 hover:shadow-md hover:z-10",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    isMobile ? "h-7" : "h-8", // Height only, width is flex-1
                    getStatusColors(week.status),
                    week.isCurrentWeek && "ring-2 ring-blue-400 ring-offset-1",
                    pinnedTooltip === week.weekKey && "ring-2 ring-purple-400 ring-offset-1"
                  )}
                  style={{
                    // Prevent layout shifts and flickering
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'translateZ(0)', // Force hardware acceleration
                  }}
                  onMouseEnter={() => {
                    if (pinnedTooltip !== week.weekKey) {
                      setHoveredWeek(week.weekKey);
                    }
                  }}
                  onMouseLeave={() => {
                    if (pinnedTooltip !== week.weekKey) {
                      setHoveredWeek(null);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle pin on click - ensure only one tooltip is pinned at a time
                    if (pinnedTooltip === week.weekKey) {
                      setPinnedTooltip(null);
                      setHoveredWeek(null);
                    } else {
                      // Close any previously pinned tooltip
                      setPinnedTooltip(week.weekKey);
                      setHoveredWeek(week.weekKey);
                    }
                    onWeekClick?.(week);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      // Same logic as click
                      if (pinnedTooltip === week.weekKey) {
                        setPinnedTooltip(null);
                        setHoveredWeek(null);
                      } else {
                        setPinnedTooltip(week.weekKey);
                        setHoveredWeek(week.weekKey);
                      }
                      onWeekClick?.(week);
                    }
                  }}
                >
                  {/* Utilization indicator */}
                  <div className="h-full flex items-center justify-center">
                    <span className={cn(
                      "font-bold text-white drop-shadow-sm",
                      isMobile ? "text-xs" : "text-xs"
                    )}>
                      {Math.round(week.utilizationPercentage)}%
                    </span>
                  </div>

                  {/* Current week indicator */}
                  {week.isCurrentWeek && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm"></div>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side={tooltipPosition.side}
                align={tooltipPosition.align}
                usePortal={true}
                className={cn(
                  "p-0 border-0 shadow-xl bg-white rounded-lg overflow-hidden",
                  // Use maximum z-index to ensure visibility above all elements
                  "z-[99999] !important",
                  // Responsive width: compact for content, mobile-aware
                  isMobile ? "w-64 max-w-[calc(100vw-2rem)]" : "w-56",
                  // Enhanced shadow for pinned tooltips
                  pinnedTooltip === week.weekKey && "shadow-2xl ring-2 ring-purple-200"
                )}
                sideOffset={isMobile ? 8 : 16}
                collisionPadding={isMobile ? 16 : 32}
                avoidCollisions={true}
                sticky="always"
                hideWhenDetached={false}
                onPointerEnter={() => {
                  // Keep tooltip open when hovering over it
                  setHoveredWeek(week.weekKey);
                }}
                onPointerLeave={() => {
                  // Only close if not pinned
                  if (pinnedTooltip !== week.weekKey) {
                    setHoveredWeek(null);
                  }
                }}
              >
                {/* Header Section - Compact with pinned indicator */}
                <div className={cn(
                  "px-3 py-2 border-b border-gray-200 transition-colors duration-200",
                  pinnedTooltip === week.weekKey
                    ? "bg-gradient-to-r from-purple-50 to-purple-100"
                    : "bg-gradient-to-r from-gray-50 to-gray-100"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-base text-gray-900 leading-none">
                        {week.weekNumber}
                      </div>
                      <div className="text-xs font-medium text-gray-600 leading-none">
                        {format(week.startDate, 'MMM dd')}
                      </div>
                      {/* Pinned status indicator */}
                      {pinnedTooltip === week.weekKey && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                          <Pin className="h-3 w-3" />
                          <span>Pinned</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {/* Pin/Unpin button with enhanced visual feedback */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pinnedTooltip === week.weekKey) {
                            setPinnedTooltip(null);
                            setHoveredWeek(null);
                          } else {
                            // Close any previously pinned tooltip and pin this one
                            setPinnedTooltip(week.weekKey);
                            setHoveredWeek(week.weekKey);
                          }
                        }}
                        className={cn(
                          "p-1 rounded-md transition-all duration-200 flex-shrink-0 relative",
                          "focus:outline-none focus:ring-2 focus:ring-purple-300",
                          pinnedTooltip === week.weekKey
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        )}
                        title={pinnedTooltip === week.weekKey ? "Unpin tooltip (click outside to close)" : "Pin tooltip to keep it open"}
                        aria-label={pinnedTooltip === week.weekKey ? "Unpin tooltip" : "Pin tooltip"}
                      >
                        <Pin className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          pinnedTooltip === week.weekKey && "rotate-12"
                        )} />
                        {/* Pinned indicator */}
                        {pinnedTooltip === week.weekKey && (
                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                        )}
                      </button>

                      {/* Close button (only show when pinned) with enhanced styling */}
                      {pinnedTooltip === week.weekKey && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedTooltip(null);
                            setHoveredWeek(null);
                          }}
                          className={cn(
                            "p-1 rounded-md transition-all duration-200 flex-shrink-0",
                            "text-gray-400 hover:text-red-600 hover:bg-red-50",
                            "focus:outline-none focus:ring-2 focus:ring-red-300"
                          )}
                          title="Close pinned tooltip"
                          aria-label="Close tooltip"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Section - Compact */}
                <div className="p-3">
                  {/* Capacity Details - Tighter spacing */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Allocated:</span>
                      <span className="font-semibold text-xs text-gray-900">
                        {week.allocatedHours > 0 ? `${week.allocatedHours.toFixed(1)}h` : '0h'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Capacity:</span>
                      <span className="font-semibold text-xs text-gray-900">{week.effectiveCapacity.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 font-medium">Available:</span>
                      <span className={cn(
                        "font-semibold text-xs",
                        week.effectiveCapacity - week.allocatedHours < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {Math.max(0, week.effectiveCapacity - week.allocatedHours).toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  {/* Status and Utilization - Compact */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={week.status === 'overallocated' ? 'destructive' :
                                week.status === 'near-full' ? 'secondary' : 'default'}
                        className="text-xs font-medium px-2 py-0.5 flex-shrink-0 whitespace-nowrap"
                      >
                        {week.status === 'healthy' && '🟢 Available'}
                        {week.status === 'near-full' && '🟡 Near Full'}
                        {week.status === 'overallocated' && '🔴 Over'}
                        {week.status === 'no-data' && '⚪ No Data'}
                      </Badge>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium">
                          {Math.round(week.utilizationPercentage)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* No Allocations Message - Compact */}
                  {week.allocatedHours === 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>💡</span>
                        <span>No allocations scheduled</span>
                      </div>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
            <span>Near Full</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
            <span>Over</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
