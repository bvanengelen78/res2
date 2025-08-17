/**
 * Timeline Grid Component
 * Main timeline visualization grid with items and interactions
 */

import React, { useMemo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { TimelineData, TimelineViewport, TimelineItem, TimelineRow } from './types';
import { TimelineItemComponent } from './TimelineItem';
import { format, differenceInDays, startOfDay, addDays } from 'date-fns';

interface TimelineGridProps {
  data: TimelineData;
  viewport: TimelineViewport;
  selectedItems: string[];
  onItemSelect: (itemIds: string[]) => void;
  onItemUpdate?: (item: TimelineItem) => void;
  dragState: any;
  onDragStateChange: (state: any) => void;
  fullscreen?: boolean;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  data,
  viewport,
  selectedItems,
  onItemSelect,
  onItemUpdate,
  dragState,
  onDragStateChange,
  fullscreen = false
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Calculate grid dimensions and positioning
  const gridMetrics = useMemo(() => {
    const { startDate, endDate, viewMode, zoomLevel } = viewport;
    
    // Base cell width calculation
    const baseWidth = {
      daily: 60 + (zoomLevel * 10),
      weekly: 120 + (zoomLevel * 15),
      monthly: 180 + (zoomLevel * 20),
      quarterly: 240 + (zoomLevel * 30)
    }[viewMode];

    // Calculate total days and grid width
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const totalWidth = totalDays * (baseWidth / (viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : viewMode === 'monthly' ? 30 : 90));
    
    // Row height
    const rowHeight = 60;
    
    return {
      cellWidth: baseWidth,
      totalWidth,
      rowHeight,
      totalDays
    };
  }, [viewport]);

  // Organize items into rows by resource/category
  const timelineRows = useMemo(() => {
    const rows: TimelineRow[] = [];
    
    // Group items by resource or type
    const resourceGroups = new Map<string, TimelineItem[]>();
    const milestoneItems: TimelineItem[] = [];
    
    data.items.forEach(item => {
      if (item.type === 'milestone') {
        milestoneItems.push(item);
      } else if (item.resourceId) {
        const existing = resourceGroups.get(item.resourceId) || [];
        resourceGroups.set(item.resourceId, [...existing, item]);
      }
    });

    // Add milestone row
    if (milestoneItems.length > 0) {
      rows.push({
        id: 'milestones',
        type: 'milestone',
        title: 'Project Milestones',
        items: milestoneItems,
        y: 0,
        height: gridMetrics.rowHeight,
        expanded: true
      });
    }

    // Add resource rows
    let yOffset = milestoneItems.length > 0 ? gridMetrics.rowHeight : 0;
    resourceGroups.forEach((items, resourceId) => {
      // Find resource name from allocations
      const allocation = data.resourceAllocations.find(a => a.resourceId === resourceId);
      const resourceName = allocation?.title || `Resource ${resourceId}`;
      
      rows.push({
        id: resourceId,
        type: 'resource',
        title: resourceName,
        items,
        y: yOffset,
        height: gridMetrics.rowHeight,
        expanded: true
      });
      
      yOffset += gridMetrics.rowHeight;
    });

    return rows;
  }, [data, gridMetrics.rowHeight]);

  // Calculate item positions within the timeline
  const calculateItemPosition = useCallback((item: TimelineItem) => {
    const { startDate, viewMode } = viewport;
    const itemStart = startOfDay(item.startDate);
    const itemEnd = startOfDay(item.endDate);
    
    // Calculate days from timeline start
    const daysFromStart = differenceInDays(itemStart, startDate);
    const itemDuration = differenceInDays(itemEnd, itemStart) + 1;
    
    // Calculate pixel positions
    const x = (daysFromStart * gridMetrics.cellWidth) / (viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : viewMode === 'monthly' ? 30 : 90);
    const width = Math.max(20, (itemDuration * gridMetrics.cellWidth) / (viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : viewMode === 'monthly' ? 30 : 90));
    
    return { x, width };
  }, [viewport, gridMetrics.cellWidth]);

  // Handle item interactions
  const handleItemClick = useCallback((item: TimelineItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const newSelection = selectedItems.includes(item.id)
        ? selectedItems.filter(id => id !== item.id)
        : [...selectedItems, item.id];
      onItemSelect(newSelection);
    } else {
      // Single select
      onItemSelect([item.id]);
    }
  }, [selectedItems, onItemSelect]);

  const handleItemDoubleClick = useCallback((item: TimelineItem) => {
    // Open item details or edit mode
    console.log('Double clicked item:', item);
  }, []);

  // Grid background with date lines
  const renderGridBackground = () => {
    const lines = [];
    const { startDate, endDate } = viewport;
    let currentDate = new Date(startDate);
    let x = 0;
    
    while (currentDate <= endDate) {
      const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      lines.push(
        <div
          key={currentDate.getTime()}
          className={cn(
            "absolute top-0 bottom-0 border-r border-gray-100",
            isToday && "border-blue-300 bg-blue-50/30",
            isWeekend && data.settings.showWeekends && "bg-gray-50/50"
          )}
          style={{ left: x }}
        />
      );
      
      currentDate = addDays(currentDate, 1);
      x += gridMetrics.cellWidth / (viewport.viewMode === 'daily' ? 1 : viewport.viewMode === 'weekly' ? 7 : viewport.viewMode === 'monthly' ? 30 : 90);
    }
    
    return lines;
  };

  return (
    <div className="relative overflow-auto" style={{ height: fullscreen ? '600px' : '400px' }}>
      {/* Grid Container */}
      <div 
        className="relative"
        style={{ 
          width: gridMetrics.totalWidth,
          height: timelineRows.length * gridMetrics.rowHeight
        }}
      >
        {/* Background Grid */}
        <div className="absolute inset-0">
          {renderGridBackground()}
        </div>

        {/* Horizontal Row Lines */}
        {timelineRows.map((row, index) => (
          <div
            key={`row-line-${row.id}`}
            className="absolute left-0 right-0 border-b border-gray-100"
            style={{ top: (index + 1) * gridMetrics.rowHeight }}
          />
        ))}

        {/* Timeline Rows */}
        {timelineRows.map((row, rowIndex) => (
          <div
            key={row.id}
            className="absolute left-0 right-0"
            style={{ 
              top: row.y,
              height: row.height
            }}
          >
            {/* Row Label */}
            <div className="absolute left-0 top-0 bottom-0 w-48 bg-white border-r border-gray-200 flex items-center px-4 z-10">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  row.type === 'milestone' ? "bg-green-500" :
                  row.type === 'resource' ? "bg-blue-500" : "bg-gray-500"
                )} />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {row.title}
                </span>
              </div>
            </div>

            {/* Timeline Items */}
            <div className="absolute left-48 top-0 bottom-0 right-0">
              {row.items.map(item => {
                const position = calculateItemPosition(item);
                const isSelected = selectedItems.includes(item.id);
                const isHovered = hoveredItem === item.id;
                
                return (
                  <TimelineItemComponent
                    key={item.id}
                    item={item}
                    position={position}
                    rowHeight={gridMetrics.rowHeight}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    onClick={(e) => handleItemClick(item, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    settings={data.settings}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Resource Conflicts Overlay */}
        {data.settings.showResourceConflicts && data.conflicts.map(conflict => (
          <div
            key={conflict.id}
            className="absolute bg-red-100 border-2 border-red-300 rounded-md opacity-75 pointer-events-none"
            style={{
              left: 48 + calculateItemPosition({
                id: 'temp',
                type: 'task',
                title: '',
                startDate: conflict.startDate,
                endDate: conflict.endDate,
                status: 'not-started',
                progress: 0
              }).x,
              width: calculateItemPosition({
                id: 'temp',
                type: 'task',
                title: '',
                startDate: conflict.startDate,
                endDate: conflict.endDate,
                status: 'not-started',
                progress: 0
              }).width,
              top: 0,
              height: timelineRows.length * gridMetrics.rowHeight
            }}
          >
            <div className="absolute top-2 left-2 text-xs text-red-700 font-medium">
              Conflict: {conflict.severity}
            </div>
          </div>
        ))}

        {/* Current Time Indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{
            left: 48 + calculateItemPosition({
              id: 'now',
              type: 'milestone',
              title: 'Now',
              startDate: new Date(),
              endDate: new Date(),
              status: 'in-progress',
              progress: 0
            }).x
          }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
          <div className="absolute top-2 left-2 text-xs text-red-700 font-medium whitespace-nowrap">
            Now
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineGrid;
