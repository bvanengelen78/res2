/**
 * Project Timeline Components Export
 */

export { default as ProjectTimeline } from './ProjectTimeline';
export { default as TimelineControls } from './TimelineControls';
export { default as TimelineHeader } from './TimelineHeader';
export { default as TimelineGrid } from './TimelineGrid';
export { default as TimelineItem } from './TimelineItem';
export { default as TimelineExportDialog } from './TimelineExportDialog';
export { default as TimelineSettingsDialog } from './TimelineSettingsDialog';

export * from './types';

// Utility functions for timeline data generation
export const generateMockTimelineData = (projectId: string) => {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

  return {
    projectId,
    items: [
      {
        id: '1',
        type: 'milestone' as const,
        title: 'Project Kickoff',
        description: 'Initial project meeting and setup',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'completed' as const,
        progress: 100,
        priority: 'high' as const,
        assignee: {
          id: 'user1',
          name: 'Project Manager',
          avatar: undefined
        }
      },
      {
        id: '2',
        type: 'task' as const,
        title: 'Requirements Analysis',
        description: 'Gather and analyze project requirements',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        status: 'in-progress' as const,
        progress: 65,
        priority: 'high' as const,
        resourceId: 'resource1',
        assignee: {
          id: 'user2',
          name: 'Business Analyst',
          avatar: undefined
        }
      },
      {
        id: '3',
        type: 'resource-allocation' as const,
        title: 'Development Team',
        description: 'Core development resources',
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
        status: 'not-started' as const,
        progress: 0,
        priority: 'medium' as const,
        resourceId: 'resource2'
      },
      {
        id: '4',
        type: 'milestone' as const,
        title: 'MVP Release',
        description: 'Minimum viable product release',
        startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'not-started' as const,
        progress: 0,
        priority: 'critical' as const,
        dependencies: ['2', '3']
      }
    ],
    milestones: [],
    tasks: [],
    resourceAllocations: [
      {
        id: 'alloc1',
        type: 'resource-allocation' as const,
        title: 'Senior Developer',
        resourceId: 'resource1',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
        status: 'in-progress' as const,
        progress: 30,
        allocatedHours: 320,
        utilization: 80,
        capacity: 400
      },
      {
        id: 'alloc2',
        type: 'resource-allocation' as const,
        title: 'UI/UX Designer',
        resourceId: 'resource2',
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        status: 'not-started' as const,
        progress: 0,
        allocatedHours: 240,
        utilization: 60,
        capacity: 400
      }
    ],
    conflicts: [
      {
        id: 'conflict1',
        severity: 'medium' as const,
        description: 'Resource overallocation during week 3-4',
        conflictingItems: ['2', '3'],
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        suggestedResolution: 'Adjust task scheduling or add additional resources'
      }
    ],
    viewport: {
      startDate,
      endDate,
      zoomLevel: 5,
      viewMode: 'weekly' as const
    },
    settings: {
      showWeekends: true,
      showResourceConflicts: true,
      showDependencies: true,
      showProgress: true,
      showCriticalPath: false,
      autoScroll: false,
      snapToGrid: true,
      enableDragDrop: true
    },
    collaboration: {
      isRealTime: false,
      activeUsers: [],
      lastUpdated: new Date(),
      version: 1
    }
  };
};
