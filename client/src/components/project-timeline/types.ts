/**
 * Project Timeline Component Types
 * Comprehensive type definitions for the advanced timeline feature
 */

export type TimelineViewMode = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type TimelineItemType = 'milestone' | 'task' | 'resource-allocation' | 'deadline' | 'dependency';

export type TimelineItemStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'at-risk';

export type ResourceConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: TimelineItemStatus;
  progress: number; // 0-100
  resourceId?: string;
  dependencies?: string[]; // Array of timeline item IDs
  color?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface TimelineMilestone extends TimelineItem {
  type: 'milestone';
  isDeadline: boolean;
  deliverables?: string[];
  stakeholders?: string[];
}

export interface TimelineTask extends TimelineItem {
  type: 'task';
  estimatedHours: number;
  actualHours?: number;
  parentTaskId?: string;
  subtasks?: string[];
}

export interface TimelineResourceAllocation extends TimelineItem {
  type: 'resource-allocation';
  resourceId: string;
  allocatedHours: number;
  utilization: number; // 0-100
  capacity: number;
  conflicts?: ResourceConflict[];
}

export interface ResourceConflict {
  id: string;
  severity: ResourceConflictSeverity;
  description: string;
  conflictingItems: string[];
  suggestedResolution?: string;
  startDate: Date;
  endDate: Date;
}

export interface TimelineViewport {
  startDate: Date;
  endDate: Date;
  zoomLevel: number; // 1-10 scale
  viewMode: TimelineViewMode;
}

export interface TimelineSettings {
  showWeekends: boolean;
  showResourceConflicts: boolean;
  showDependencies: boolean;
  showProgress: boolean;
  showCriticalPath: boolean;
  autoScroll: boolean;
  snapToGrid: boolean;
  enableDragDrop: boolean;
}

export interface TimelineExportOptions {
  format: 'pdf' | 'png' | 'csv' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeResources: boolean;
  includeMilestones: boolean;
  includeTasks: boolean;
  includeDependencies: boolean;
}

export interface TimelineCollaboration {
  isRealTime: boolean;
  activeUsers: {
    id: string;
    name: string;
    avatar?: string;
    cursor?: {
      x: number;
      y: number;
      timestamp: Date;
    };
  }[];
  lastUpdated: Date;
  version: number;
}

export interface TimelineData {
  projectId: string;
  items: TimelineItem[];
  milestones: TimelineMilestone[];
  tasks: TimelineTask[];
  resourceAllocations: TimelineResourceAllocation[];
  conflicts: ResourceConflict[];
  viewport: TimelineViewport;
  settings: TimelineSettings;
  collaboration?: TimelineCollaboration;
}

export interface TimelineProps {
  projectId: string;
  data: TimelineData;
  fullscreen?: boolean;
  onItemUpdate?: (item: TimelineItem) => void;
  onViewportChange?: (viewport: TimelineViewport) => void;
  onSettingsChange?: (settings: TimelineSettings) => void;
  onExport?: (options: TimelineExportOptions) => void;
  className?: string;
}

// Utility types for timeline calculations
export interface TimelineGridCell {
  date: Date;
  x: number;
  width: number;
  isWeekend?: boolean;
  isToday?: boolean;
  isHoliday?: boolean;
}

export interface TimelineRow {
  id: string;
  type: 'resource' | 'milestone' | 'task-group';
  title: string;
  items: TimelineItem[];
  y: number;
  height: number;
  expanded?: boolean;
  children?: TimelineRow[];
}

export interface TimelineDragState {
  isDragging: boolean;
  draggedItem?: TimelineItem;
  dragType: 'move' | 'resize-start' | 'resize-end' | 'none';
  startPosition?: { x: number; y: number };
  currentPosition?: { x: number; y: number };
  snapToDate?: Date;
}

// Animation and interaction types
export interface TimelineAnimation {
  duration: number;
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number;
}

export interface TimelineInteraction {
  type: 'click' | 'hover' | 'drag' | 'zoom' | 'pan';
  target: TimelineItem | TimelineRow | 'viewport';
  data?: any;
  timestamp: Date;
}
