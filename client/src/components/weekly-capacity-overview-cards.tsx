import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addWeeks, isSameWeek, getISOWeek, getYear } from "date-fns";

interface WeekData {
  weekKey: string;
  weekNumber: string;
  dateRange: string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number;
  effectiveCapacity: number;
  utilizationPercentage: number;
  status: 'healthy' | 'near-full' | 'over' | 'none';
  statusColor: string;
  statusIcon: string;
  projectCount: number;
  isCurrentWeek: boolean;
}

interface WeeklyCapacityOverviewCardsProps {
  weeklyAggregations: Record<string, any>;
  weekColumns: Array<{
    key: string;
    weekNumber: number;
    year: number;
    dateRange: string;
    startDate: Date;
    endDate: Date;
  }>;
  getWeeklyAggregation: (weekKey: string) => any;
  className?: string;
}

export function WeeklyCapacityOverviewCards({
  weeklyAggregations,
  weekColumns,
  getWeeklyAggregation,
  className
}: WeeklyCapacityOverviewCardsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Touch gesture support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Check scroll position and update button states
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const tolerance = 2; // Add small tolerance for floating point precision

      setCanScrollLeft(scrollLeft > tolerance);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - tolerance);
    }
  };

  // Initialize scroll buttons on mount and when content changes
  useEffect(() => {
    const checkScrollability = () => {
      updateScrollButtons();
    };

    // Check after delays to ensure layout is complete
    const timeoutId1 = setTimeout(checkScrollability, 100);
    const timeoutId2 = setTimeout(checkScrollability, 300);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);

      // Also listen for resize events with fallback
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(checkScrollability);
        resizeObserver.observe(container);
      } else {
        // Fallback for older browsers
        window.addEventListener('resize', checkScrollability);
      }

      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener('resize', checkScrollability);
        }
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
      };
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [weekColumns]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWithGap = 130 + 8; // 130px card + 8px gap
      const scrollAmount = cardWithGap * 2; // Scroll 2 cards at a time for better UX
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });

      // Update scroll buttons after animation completes
      setTimeout(updateScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWithGap = 130 + 8; // 130px card + 8px gap
      const scrollAmount = cardWithGap * 2; // Scroll 2 cards at a time for better UX
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });

      // Update scroll buttons after animation completes
      setTimeout(updateScrollButtons, 300);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && canScrollRight) {
      scrollRight();
    }
    if (isRightSwipe && canScrollLeft) {
      scrollLeft();
    }
  };

  // Find current week index for centering
  const currentWeekIndex = weekColumns.findIndex(week => 
    week.startDate <= new Date() && week.endDate > new Date()
  );

  // Center current week on mount
  useEffect(() => {
    if (currentWeekIndex >= 0 && scrollContainerRef.current) {
      const cardWidth = 132; // 130px card + 2px gap
      const containerWidth = scrollContainerRef.current.clientWidth;
      const targetScroll = (currentWeekIndex * cardWidth) - (containerWidth / 2) + (cardWidth / 2);

      // Wait for layout to complete before centering
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
          // Update scroll buttons after centering
          setTimeout(updateScrollButtons, 300);
        }
      }, 200);
    }
  }, [currentWeekIndex]);

  // Transform week data
  const weekData = useMemo(() => {
    return weekColumns.map(week => {
      const aggregation = getWeeklyAggregation(week.key);
      const isCurrentWeek = week.startDate <= new Date() && week.endDate > new Date();

      return {
        weekKey: week.key,
        weekNumber: `W${week.weekNumber}`,
        dateRange: week.dateRange,
        startDate: week.startDate,
        endDate: week.endDate,
        allocatedHours: aggregation.totalAllocatedHours || 0,
        effectiveCapacity: aggregation.effectiveCapacity || 32,
        utilizationPercentage: aggregation.utilizationPercentage || 0,
        status: aggregation.status || 'none',
        statusColor: aggregation.statusColor || 'bg-gray-100 text-gray-800 border-gray-300',
        statusIcon: aggregation.statusIcon || '⚪',
        projectCount: aggregation.projectCount || 0,
        isCurrentWeek
      };
    });
  }, [weekColumns, getWeeklyAggregation]);

  // Calculate actual content width based on cards and gaps
  const cardWidth = 130; // Fixed card width
  const gapWidth = 8; // gap-2 = 8px in Tailwind
  const paddingWidth = 8; // px-1 = 4px on each side
  const actualContentWidth = (weekData.length * cardWidth) + ((weekData.length - 1) * gapWidth) + paddingWidth;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Weekly Capacity Overview</h3>
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
            Aggregated across all projects
          </Badge>
        </div>

          {/* Enhanced Weekly Cards Grid with Navigation */}
          <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Left Scroll Button */}
            {canScrollLeft && (
              <div className={cn(
                "absolute left-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollLeft}
                  className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                >
                  <ChevronLeft className="h-4 w-4 text-blue-600" />
                </Button>
              </div>
            )}

            {/* Right Scroll Button */}
            {canScrollRight && (
              <div className={cn(
                "absolute right-0 top-0 bottom-0 z-10 flex items-center transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollRight}
                  className="h-8 w-8 p-0 bg-white/95 backdrop-blur-sm border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-lg"
                >
                  <ChevronRight className="h-4 w-4 text-blue-600" />
                </Button>
              </div>
            )}

            {/* Left Gradient Mask */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-50/80 to-transparent z-[5] pointer-events-none" />
            )}

            {/* Right Gradient Mask */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blue-50/80 to-transparent z-[5] pointer-events-none" />
            )}

            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex gap-2 pb-2 px-1" style={{
                // Set exact width based on content to enable proper scrolling
                width: `${actualContentWidth}px`,
                minWidth: `${actualContentWidth}px`
              }}>
                {weekData.map((week) => (
                  <div
                    key={week.weekKey}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md flex-shrink-0",
                      "w-[130px]", // Fixed width for consistent scrolling
                      week.isCurrentWeek
                        ? "border-blue-400 bg-blue-100/50 ring-2 ring-blue-300 shadow-md"
                        : "border-blue-200 bg-white hover:border-blue-300 hover:shadow-lg"
                    )}>
                        {/* Week Header */}
                        <div className="text-center mb-3">
                          <div className={cn(
                            "text-sm font-bold",
                            week.isCurrentWeek ? "text-blue-800" : "text-blue-700"
                          )}>
                            {week.weekNumber}
                          </div>
                          <div className={cn(
                            "text-xs",
                            week.isCurrentWeek ? "text-blue-700" : "text-blue-600"
                          )}>
                            {week.dateRange}
                          </div>
                        </div>

                        {/* Total Hours */}
                        <div className="text-center mb-3">
                          <div className="text-xl font-bold text-gray-900">
                            {week.allocatedHours}h
                          </div>
                          <div className="text-xs text-gray-600">
                            of {week.effectiveCapacity}h effective
                          </div>
                        </div>

                        {/* Utilization Percentage */}
                        <div className="text-center mb-3">
                          <div className="text-sm font-semibold text-gray-700">
                            {Math.round(week.utilizationPercentage)}%
                          </div>
                        </div>

                        {/* Status Badge */}
                        <Badge className={cn("text-xs px-3 py-1 border whitespace-nowrap", week.statusColor)}>
                          <span className="mr-1">{week.statusIcon}</span>
                          {week.status === 'none' ? 'None' :
                           week.status === 'over' ? 'Over' :
                           week.status === 'near-full' ? 'Near Full' :
                           'Healthy'}
                        </Badge>

                        {/* Project Count */}
                        {week.projectCount > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            {week.projectCount} project{week.projectCount !== 1 ? 's' : ''}
                          </div>
                        )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
