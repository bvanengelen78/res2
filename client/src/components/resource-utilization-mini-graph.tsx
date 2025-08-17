import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { startOfWeek, addWeeks, getWeek, getYear } from 'date-fns';

interface ResourceUtilizationMiniGraphProps {
  resource: any;
  weeklyCapacity: number;
  className?: string;
}

interface WeekData {
  weekKey: string;
  weekNumber: number;
  utilizationPercentage: number;
  allocatedHours: number;
  isCurrentWeek: boolean;
}

export function ResourceUtilizationMiniGraph({ 
  resource, 
  weeklyCapacity, 
  className 
}: ResourceUtilizationMiniGraphProps) {
  // Generate utilization data for the last 8 weeks
  const weekData = useMemo(() => {
    try {
      const weeks: WeekData[] = [];
      const today = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(addWeeks(today, -i), { weekStartsOn: 1 });
        const weekNumber = getWeek(weekStart);
        const year = getYear(weekStart);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        
        // Calculate weekly allocation
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
        
        const utilizationPercentage = weeklyCapacity > 0 ? 
          Math.min(150, (weeklyAllocated / weeklyCapacity) * 100) : 0;
        
        const isCurrentWeek = i === 0;
        
        weeks.push({
          weekKey,
          weekNumber,
          utilizationPercentage,
          allocatedHours: weeklyAllocated,
          isCurrentWeek
        });
      }
      
      return weeks;
    } catch (error) {
      console.error('Error generating mini graph data:', error);
      return [];
    }
  }, [resource, weeklyCapacity]);

  // Calculate average utilization
  const averageUtilization = useMemo(() => {
    if (weekData.length === 0) return 0;
    const total = weekData.reduce((sum, week) => sum + week.utilizationPercentage, 0);
    return total / weekData.length;
  }, [weekData]);

  // Generate SVG path for area chart
  const chartPath = useMemo(() => {
    if (weekData.length === 0) return '';
    
    const width = 280;
    const height = 60;
    const padding = 4;
    
    const maxValue = Math.max(100, Math.max(...weekData.map(w => w.utilizationPercentage)));
    const stepX = (width - padding * 2) / (weekData.length - 1);
    
    // Create path points
    const points = weekData.map((week, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((week.utilizationPercentage / maxValue) * (height - padding * 2));
      return `${x},${y}`;
    });
    
    // Create area path
    const pathData = [
      `M ${padding},${height - padding}`, // Start at bottom left
      `L ${points[0]}`, // Line to first point
      ...points.slice(1).map(point => `L ${point}`), // Lines to all other points
      `L ${width - padding},${height - padding}`, // Line to bottom right
      'Z' // Close path
    ].join(' ');
    
    return pathData;
  }, [weekData]);

  if (weekData.length === 0) {
    return (
      <div className={cn("h-16 bg-gray-50 rounded-lg flex items-center justify-center", className)}>
        <span className="text-xs text-gray-400">No utilization data available</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Mini Area Chart */}
        <div className="relative h-16 bg-gray-50 rounded-lg overflow-hidden">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 280 60"
            className="absolute inset-0"
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Area fill */}
            <path
              d={chartPath}
              fill="url(#gradient)"
              className="opacity-60"
            />
            
            {/* Line */}
            <path
              d={chartPath.replace(/L \d+,60 Z/, '').replace('M 4,56 L ', 'M ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            {/* Data points */}
            {weekData.map((week, index) => {
              const width = 280;
              const height = 60;
              const padding = 4;
              const maxValue = Math.max(100, Math.max(...weekData.map(w => w.utilizationPercentage)));
              const stepX = (width - padding * 2) / (weekData.length - 1);
              const x = padding + index * stepX;
              const y = height - padding - ((week.utilizationPercentage / maxValue) * (height - padding * 2));
              
              return (
                <Tooltip key={week.weekKey}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={x}
                      cy={y}
                      r={week.isCurrentWeek ? "4" : "3"}
                      fill={week.isCurrentWeek ? "#1d4ed8" : "#3b82f6"}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-5 transition-all duration-200"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">
                        Week {week.weekNumber}
                        {week.isCurrentWeek && <span className="text-blue-600"> (Current)</span>}
                      </p>
                      <p>{week.allocatedHours}h allocated</p>
                      <p>{week.utilizationPercentage.toFixed(0)}% utilization</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500">Avg:</span>
              <span className="ml-1 font-medium text-gray-900">
                {averageUtilization.toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Current:</span>
              <span className={cn(
                "ml-1 font-medium",
                weekData[weekData.length - 1]?.utilizationPercentage > 100 ? "text-red-600" :
                weekData[weekData.length - 1]?.utilizationPercentage > 80 ? "text-amber-600" :
                "text-green-600"
              )}>
                {weekData[weekData.length - 1]?.utilizationPercentage.toFixed(0) || 0}%
              </span>
            </div>
          </div>
          <div className="text-gray-400">
            8 weeks
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
