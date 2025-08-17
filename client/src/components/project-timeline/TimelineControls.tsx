/**
 * Timeline Controls Component
 * Navigation and view controls for the timeline
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Play, 
  Pause,
  Calendar,
  Clock,
  Filter,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineViewMode, TimelineViewport } from './types';
import { format } from 'date-fns';

interface TimelineControlsProps {
  viewport: TimelineViewport;
  onViewportChange: (viewport: TimelineViewport) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onViewModeChange: (mode: TimelineViewMode) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToggleAutoPlay: () => void;
  onResetToToday: () => void;
  isPlaying: boolean;
  fullscreen?: boolean;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  viewport,
  onViewportChange,
  onZoomIn,
  onZoomOut,
  onViewModeChange,
  onNavigate,
  onToggleAutoPlay,
  onResetToToday,
  isPlaying,
  fullscreen = false
}) => {
  const getViewModeLabel = (mode: TimelineViewMode) => {
    switch (mode) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      default: return 'Weekly';
    }
  };

  const getDateRangeLabel = () => {
    const { startDate, endDate, viewMode } = viewport;
    
    switch (viewMode) {
      case 'daily':
        return format(startDate, 'MMM d, yyyy');
      case 'weekly':
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
      case 'monthly':
        return format(startDate, 'MMMM yyyy');
      case 'quarterly':
        return `Q${Math.ceil((startDate.getMonth() + 1) / 3)} ${startDate.getFullYear()}`;
      default:
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
  };

  const getZoomLabel = () => {
    const zoomPercentage = (viewport.zoomLevel / 10) * 100;
    return `${zoomPercentage}%`;
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50/50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section - Navigation */}
          <div className="flex items-center gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-md border border-gray-200 min-w-[200px]">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {getDateRangeLabel()}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Reset to Today */}
            <Button
              variant="outline"
              size="sm"
              onClick={onResetToToday}
              className="flex items-center gap-1 h-8"
            >
              <RotateCcw className="h-3 w-3" />
              Today
            </Button>

            {/* Auto-play Toggle */}
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              onClick={onToggleAutoPlay}
              className="flex items-center gap-1 h-8"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Play
                </>
              )}
            </Button>
          </div>

          {/* Center Section - View Mode Tabs */}
          <div className="flex items-center gap-2">
            <Tabs value={viewport.viewMode} onValueChange={(value) => onViewModeChange(value as TimelineViewMode)}>
              <TabsList className="grid w-full grid-cols-4 h-8">
                <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly" className="text-xs">Quarterly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right Section - Zoom and Tools */}
          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onZoomOut}
                disabled={viewport.zoomLevel <= 1}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              
              <div className="flex items-center px-2 py-1 bg-white rounded-md border border-gray-200 min-w-[60px] justify-center">
                <span className="text-xs font-medium text-gray-700">
                  {getZoomLabel()}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onZoomIn}
                disabled={viewport.zoomLevel >= 10}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            {/* View Options */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 h-8"
              >
                <Filter className="h-3 w-3" />
                Filter
              </Button>
              
              {fullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8"
                >
                  <Maximize2 className="h-3 w-3" />
                  Fullscreen
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Controls Row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          {/* Timeline Info */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Current view: {getViewModeLabel(viewport.viewMode)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Zoom: {getZoomLabel()}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-600">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span className="text-gray-600">Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-gray-600">Milestones</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                <span className="text-gray-600">Resources</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-gray-600">Conflicts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineControls;
