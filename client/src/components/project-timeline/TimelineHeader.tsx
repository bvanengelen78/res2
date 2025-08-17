/**
 * Timeline Header Component
 * Date/time header for the timeline grid
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TimelineViewport, TimelineSettings } from './types';
import { format, addDays, addWeeks, addMonths, startOfDay, startOfWeek, startOfMonth, startOfQuarter, isSameDay, isToday, isWeekend } from 'date-fns';

interface TimelineHeaderProps {
  viewport: TimelineViewport;
  settings: TimelineSettings;
  fullscreen?: boolean;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  viewport,
  settings,
  fullscreen = false
}) => {
  // Calculate header cells based on view mode
  const headerCells = useMemo(() => {
    const { startDate, endDate, viewMode, zoomLevel } = viewport;
    const cells: Array<{
      date: Date;
      label: string;
      sublabel?: string;
      width: number;
      isToday: boolean;
      isWeekend: boolean;
      isHoliday: boolean;
    }> = [];

    // Base cell width calculation based on zoom level and view mode
    const baseWidth = {
      daily: 60 + (zoomLevel * 10),
      weekly: 120 + (zoomLevel * 15),
      monthly: 180 + (zoomLevel * 20),
      quarterly: 240 + (zoomLevel * 30)
    }[viewMode];

    let currentDate = new Date(startDate);
    
    switch (viewMode) {
      case 'daily':
        currentDate = startOfDay(currentDate);
        while (currentDate <= endDate) {
          const isCurrentToday = isToday(currentDate);
          const isCurrentWeekend = isWeekend(currentDate);
          
          cells.push({
            date: new Date(currentDate),
            label: format(currentDate, 'EEE'),
            sublabel: format(currentDate, 'd'),
            width: baseWidth,
            isToday: isCurrentToday,
            isWeekend: isCurrentWeekend,
            isHoliday: false // TODO: Add holiday detection
          });
          
          currentDate = addDays(currentDate, 1);
        }
        break;

      case 'weekly':
        currentDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
        while (currentDate <= endDate) {
          const weekEnd = addDays(currentDate, 6);
          const hasToday = isToday(currentDate) || (new Date() >= currentDate && new Date() <= weekEnd);
          
          cells.push({
            date: new Date(currentDate),
            label: `Week ${format(currentDate, 'w')}`,
            sublabel: `${format(currentDate, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
            width: baseWidth,
            isToday: hasToday,
            isWeekend: false,
            isHoliday: false
          });
          
          currentDate = addWeeks(currentDate, 1);
        }
        break;

      case 'monthly':
        currentDate = startOfMonth(currentDate);
        while (currentDate <= endDate) {
          const isCurrentMonth = isSameDay(startOfMonth(new Date()), currentDate);
          
          cells.push({
            date: new Date(currentDate),
            label: format(currentDate, 'MMMM'),
            sublabel: format(currentDate, 'yyyy'),
            width: baseWidth,
            isToday: isCurrentMonth,
            isWeekend: false,
            isHoliday: false
          });
          
          currentDate = addMonths(currentDate, 1);
        }
        break;

      case 'quarterly':
        currentDate = startOfQuarter(currentDate);
        while (currentDate <= endDate) {
          const quarter = Math.ceil((currentDate.getMonth() + 1) / 3);
          const isCurrentQuarter = Math.ceil((new Date().getMonth() + 1) / 3) === quarter && 
                                  new Date().getFullYear() === currentDate.getFullYear();
          
          cells.push({
            date: new Date(currentDate),
            label: `Q${quarter}`,
            sublabel: format(currentDate, 'yyyy'),
            width: baseWidth,
            isToday: isCurrentQuarter,
            isWeekend: false,
            isHoliday: false
          });
          
          currentDate = addMonths(currentDate, 3);
        }
        break;
    }

    return cells;
  }, [viewport]);

  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(() => {
    return headerCells.reduce((total, cell) => total + cell.width, 0);
  }, [headerCells]);

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      {/* Main Header Row */}
      <div 
        className="flex border-b border-gray-100"
        style={{ width: totalWidth }}
      >
        {headerCells.map((cell, index) => (
          <div
            key={`${cell.date.getTime()}-${index}`}
            className={cn(
              "flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-r-0",
              "transition-colors duration-200",
              cell.isToday && "bg-blue-50 border-blue-200",
              cell.isWeekend && settings.showWeekends && "bg-gray-50",
              !settings.showWeekends && cell.isWeekend && "hidden"
            )}
            style={{ width: cell.width }}
          >
            {/* Primary Label */}
            <div className={cn(
              "text-sm font-medium",
              cell.isToday ? "text-blue-700" : "text-gray-900"
            )}>
              {cell.label}
            </div>
            
            {/* Secondary Label */}
            {cell.sublabel && (
              <div className={cn(
                "text-xs mt-1",
                cell.isToday ? "text-blue-600" : "text-gray-500"
              )}>
                {cell.sublabel}
              </div>
            )}
            
            {/* Today Indicator */}
            {cell.isToday && (
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-header for detailed view (daily/weekly) */}
      {(viewport.viewMode === 'daily' || viewport.viewMode === 'weekly') && (
        <div 
          className="flex text-xs text-gray-500 bg-gray-50/50"
          style={{ width: totalWidth }}
        >
          {headerCells.map((cell, index) => (
            <div
              key={`sub-${cell.date.getTime()}-${index}`}
              className={cn(
                "flex items-center justify-center py-2 border-r border-gray-100 last:border-r-0",
                cell.isToday && "bg-blue-50 text-blue-600",
                cell.isWeekend && settings.showWeekends && "bg-gray-100",
                !settings.showWeekends && cell.isWeekend && "hidden"
              )}
              style={{ width: cell.width }}
            >
              {viewport.viewMode === 'daily' && (
                <span>{format(cell.date, 'MMM yyyy')}</span>
              )}
              {viewport.viewMode === 'weekly' && (
                <span>{format(cell.date, 'yyyy')}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Time markers for current time (daily view) */}
      {viewport.viewMode === 'daily' && (
        <div className="absolute top-0 bottom-0 pointer-events-none">
          {/* Current time line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{
              left: `${(new Date().getHours() / 24) * headerCells[0]?.width || 0}px`,
              display: headerCells.some(cell => isToday(cell.date)) ? 'block' : 'none'
            }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineHeader;
