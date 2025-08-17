/**
 * Project Timeline Component
 * Advanced timeline visualization for project resource management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  Download, 
  Settings, 
  ZoomIn, 
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineProps, TimelineViewMode, TimelineData, TimelineViewport } from './types';
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { TimelineControls } from './TimelineControls';
import { TimelineExportDialog } from './TimelineExportDialog';
import { TimelineSettingsDialog } from './TimelineSettingsDialog';

export const ProjectTimeline: React.FC<TimelineProps> = ({
  projectId,
  data,
  fullscreen = false,
  onItemUpdate,
  onViewportChange,
  onSettingsChange,
  onExport,
  className
}) => {
  // State management
  const [viewport, setViewport] = useState<TimelineViewport>(data.viewport);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragState, setDragState] = useState<any>(null);

  // Viewport management
  const handleViewportChange = useCallback((newViewport: TimelineViewport) => {
    setViewport(newViewport);
    onViewportChange?.(newViewport);
  }, [onViewportChange]);

  const handleZoomIn = useCallback(() => {
    const newZoomLevel = Math.min(viewport.zoomLevel + 1, 10);
    handleViewportChange({ ...viewport, zoomLevel: newZoomLevel });
  }, [viewport, handleViewportChange]);

  const handleZoomOut = useCallback(() => {
    const newZoomLevel = Math.max(viewport.zoomLevel - 1, 1);
    handleViewportChange({ ...viewport, zoomLevel: newZoomLevel });
  }, [viewport, handleViewportChange]);

  const handleViewModeChange = useCallback((mode: TimelineViewMode) => {
    handleViewportChange({ ...viewport, viewMode: mode });
  }, [viewport, handleViewportChange]);

  // Navigation
  const navigateTimeline = useCallback((direction: 'prev' | 'next') => {
    const { viewMode, startDate, endDate } = viewport;
    const duration = endDate.getTime() - startDate.getTime();
    const offset = direction === 'next' ? duration : -duration;
    
    const newStartDate = new Date(startDate.getTime() + offset);
    const newEndDate = new Date(endDate.getTime() + offset);
    
    handleViewportChange({
      ...viewport,
      startDate: newStartDate,
      endDate: newEndDate
    });
  }, [viewport, handleViewportChange]);

  // Auto-play functionality
  const toggleAutoPlay = useCallback(() => {
    setIsPlaying(!isPlaying);
    // Auto-play logic would be implemented here
  }, [isPlaying]);

  // Reset to today
  const resetToToday = useCallback(() => {
    const today = new Date();
    const duration = viewport.endDate.getTime() - viewport.startDate.getTime();
    const newStartDate = new Date(today.getTime() - duration / 2);
    const newEndDate = new Date(today.getTime() + duration / 2);
    
    handleViewportChange({
      ...viewport,
      startDate: newStartDate,
      endDate: newEndDate
    });
  }, [viewport, handleViewportChange]);

  // Calculate timeline statistics
  const timelineStats = useMemo(() => {
    const totalItems = data.items.length;
    const completedItems = data.items.filter(item => item.status === 'completed').length;
    const overdue = data.items.filter(item => 
      item.status !== 'completed' && item.endDate < new Date()
    ).length;
    const conflicts = data.conflicts.length;
    
    return {
      totalItems,
      completedItems,
      completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      overdue,
      conflicts
    };
  }, [data]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Beta Feature Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Play className="h-3 w-3 mr-1" />
            Beta Feature
          </Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{timelineStats.totalItems} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{timelineStats.completionRate.toFixed(0)}% complete</span>
          </div>
          {timelineStats.conflicts > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{timelineStats.conflicts} conflicts</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Timeline Card */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Timeline View
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Timeline Controls */}
          <TimelineControls
            viewport={viewport}
            onViewportChange={handleViewportChange}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onViewModeChange={handleViewModeChange}
            onNavigate={navigateTimeline}
            onToggleAutoPlay={toggleAutoPlay}
            onResetToToday={resetToToday}
            isPlaying={isPlaying}
            fullscreen={fullscreen}
          />

          {/* Timeline Header */}
          <TimelineHeader
            viewport={viewport}
            settings={data.settings}
            fullscreen={fullscreen}
          />

          {/* Timeline Grid */}
          <TimelineGrid
            data={data}
            viewport={viewport}
            selectedItems={selectedItems}
            onItemSelect={setSelectedItems}
            onItemUpdate={onItemUpdate}
            dragState={dragState}
            onDragStateChange={setDragState}
            fullscreen={fullscreen}
          />
        </CardContent>
      </Card>

      {/* Export Dialog */}
      {showExportDialog && (
        <TimelineExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          onExport={onExport}
          projectId={projectId}
        />
      )}

      {/* Settings Dialog */}
      {showSettingsDialog && (
        <TimelineSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          settings={data.settings}
          onSettingsChange={onSettingsChange}
        />
      )}
    </div>
  );
};

export default ProjectTimeline;
