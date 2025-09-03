/**
 * Mock business data for Resource Planning Tracker when Supabase connectivity fails
 * This provides comprehensive fallback data for all core business entities
 */

import type { 
  Resource, Project, ResourceAllocation, TimeEntry, TimeOff, 
  NonProjectActivity, WeeklySubmission 
} from "@shared/schema";

// Mock Resources Data
export const mockResources: Resource[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    jobRole: "Senior Frontend Developer",
    department: "Engineering",
    weeklyCapacity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@company.com",
    jobRole: "Backend Developer",
    department: "Engineering",
    weeklyCapacity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.rodriguez@company.com",
    jobRole: "Product Manager",
    department: "Product Management",
    weeklyCapacity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  },
  {
    id: 4,
    name: "David Kim",
    email: "david.kim@company.com",
    jobRole: "UX Designer",
    department: "Design",
    weeklyCapacity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  },
  {
    id: 5,
    name: "Lisa Wang",
    email: "lisa.wang@company.com",
    jobRole: "Data Analyst",
    department: "Data & Analytics",
    weeklyCapacity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  },
];

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: 1,
    name: "Customer Portal Redesign",
    description: "Complete overhaul of customer-facing portal with modern UI/UX",
    status: "active",
    startDate: new Date("2024-01-15T00:00:00Z"),
    endDate: new Date("2024-06-30T00:00:00Z"),
    priority: "high",
    budget: 150000,
    progress: 65,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-03-15T00:00:00Z"),
  },
  {
    id: 2,
    name: "Mobile App Development",
    description: "Native mobile application for iOS and Android platforms",
    status: "active",
    startDate: new Date("2024-02-01T00:00:00Z"),
    endDate: new Date("2024-08-31T00:00:00Z"),
    priority: "high",
    budget: 200000,
    progress: 40,
    createdAt: new Date("2024-01-15T00:00:00Z"),
    updatedAt: new Date("2024-03-15T00:00:00Z"),
  },
  {
    id: 3,
    name: "Data Analytics Platform",
    description: "Business intelligence and analytics dashboard",
    status: "active",
    startDate: new Date("2024-03-01T00:00:00Z"),
    endDate: new Date("2024-09-30T00:00:00Z"),
    priority: "medium",
    budget: 120000,
    progress: 25,
    createdAt: new Date("2024-02-15T00:00:00Z"),
    updatedAt: new Date("2024-03-15T00:00:00Z"),
  },
  {
    id: 4,
    name: "API Modernization",
    description: "Upgrade legacy APIs to modern REST/GraphQL architecture",
    status: "planning",
    startDate: new Date("2024-04-01T00:00:00Z"),
    endDate: new Date("2024-10-31T00:00:00Z"),
    priority: "medium",
    budget: 100000,
    progress: 10,
    createdAt: new Date("2024-03-01T00:00:00Z"),
    updatedAt: new Date("2024-03-15T00:00:00Z"),
  },
];

// Mock Resource Allocations Data
export const mockResourceAllocations: ResourceAllocation[] = [
  {
    id: 1,
    resourceId: 1,
    projectId: 1,
    allocatedHours: 32,
    startDate: new Date("2024-01-15T00:00:00Z"),
    endDate: new Date("2024-06-30T00:00:00Z"),
    weeklyAllocations: {
      "2024-W03": 8,
      "2024-W04": 8,
      "2024-W05": 8,
      "2024-W06": 8,
      "2024-W07": 8,
      "2024-W08": 8,
      "2024-W09": 8,
      "2024-W10": 8,
    },
    createdAt: new Date("2024-01-15T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
  },
  {
    id: 2,
    resourceId: 2,
    projectId: 1,
    allocatedHours: 24,
    startDate: new Date("2024-01-15T00:00:00Z"),
    endDate: new Date("2024-06-30T00:00:00Z"),
    weeklyAllocations: {
      "2024-W03": 6,
      "2024-W04": 6,
      "2024-W05": 6,
      "2024-W06": 6,
      "2024-W07": 6,
      "2024-W08": 6,
      "2024-W09": 6,
      "2024-W10": 6,
    },
    createdAt: new Date("2024-01-15T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
  },
  {
    id: 3,
    resourceId: 3,
    projectId: 2,
    allocatedHours: 20,
    startDate: new Date("2024-02-01T00:00:00Z"),
    endDate: new Date("2024-08-31T00:00:00Z"),
    weeklyAllocations: {
      "2024-W05": 5,
      "2024-W06": 5,
      "2024-W07": 5,
      "2024-W08": 5,
      "2024-W09": 5,
      "2024-W10": 5,
    },
    createdAt: new Date("2024-02-01T00:00:00Z"),
    updatedAt: new Date("2024-02-01T00:00:00Z"),
  },
  {
    id: 4,
    resourceId: 4,
    projectId: 1,
    allocatedHours: 16,
    startDate: new Date("2024-01-15T00:00:00Z"),
    endDate: new Date("2024-04-30T00:00:00Z"),
    weeklyAllocations: {
      "2024-W03": 4,
      "2024-W04": 4,
      "2024-W05": 4,
      "2024-W06": 4,
      "2024-W07": 4,
      "2024-W08": 4,
    },
    createdAt: new Date("2024-01-15T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
  },
  {
    id: 5,
    resourceId: 5,
    projectId: 3,
    allocatedHours: 30,
    startDate: new Date("2024-03-01T00:00:00Z"),
    endDate: new Date("2024-09-30T00:00:00Z"),
    weeklyAllocations: {
      "2024-W09": 7.5,
      "2024-W10": 7.5,
      "2024-W11": 7.5,
      "2024-W12": 7.5,
    },
    createdAt: new Date("2024-03-01T00:00:00Z"),
    updatedAt: new Date("2024-03-01T00:00:00Z"),
  },
];

// Mock Time Entries Data
export const mockTimeEntries: TimeEntry[] = [
  {
    id: 1,
    resourceId: 1,
    projectId: 1,
    date: new Date("2024-03-11T00:00:00Z"),
    hours: 8,
    description: "Frontend component development for user dashboard",
    status: "submitted",
    createdAt: new Date("2024-03-11T18:00:00Z"),
    updatedAt: new Date("2024-03-11T18:00:00Z"),
  },
  {
    id: 2,
    resourceId: 1,
    projectId: 1,
    date: new Date("2024-03-12T00:00:00Z"),
    hours: 7.5,
    description: "API integration and testing",
    status: "approved",
    createdAt: new Date("2024-03-12T17:30:00Z"),
    updatedAt: new Date("2024-03-13T09:00:00Z"),
  },
  {
    id: 3,
    resourceId: 2,
    projectId: 1,
    date: new Date("2024-03-11T00:00:00Z"),
    hours: 6,
    description: "Backend API development",
    status: "submitted",
    createdAt: new Date("2024-03-11T16:00:00Z"),
    updatedAt: new Date("2024-03-11T16:00:00Z"),
  },
  {
    id: 4,
    resourceId: 3,
    projectId: 2,
    date: new Date("2024-03-11T00:00:00Z"),
    hours: 5,
    description: "Product requirements gathering and analysis",
    status: "approved",
    createdAt: new Date("2024-03-11T15:00:00Z"),
    updatedAt: new Date("2024-03-12T10:00:00Z"),
  },
  {
    id: 5,
    resourceId: 4,
    projectId: 1,
    date: new Date("2024-03-11T00:00:00Z"),
    hours: 4,
    description: "UI/UX design mockups and prototyping",
    status: "submitted",
    createdAt: new Date("2024-03-11T14:00:00Z"),
    updatedAt: new Date("2024-03-11T14:00:00Z"),
  },
];

// Mock Time Off Data
export const mockTimeOff: TimeOff[] = [
  {
    id: 1,
    resourceId: 1,
    startDate: new Date("2024-03-25T00:00:00Z"),
    endDate: new Date("2024-03-29T00:00:00Z"),
    type: "vacation",
    status: "approved",
    description: "Spring break vacation",
    createdAt: new Date("2024-03-01T00:00:00Z"),
    updatedAt: new Date("2024-03-05T00:00:00Z"),
  },
  {
    id: 2,
    resourceId: 3,
    startDate: new Date("2024-04-15T00:00:00Z"),
    endDate: new Date("2024-04-15T00:00:00Z"),
    type: "sick",
    status: "approved",
    description: "Medical appointment",
    createdAt: new Date("2024-04-14T00:00:00Z"),
    updatedAt: new Date("2024-04-14T00:00:00Z"),
  },
];

// Mock Non-Project Activities Data
export const mockNonProjectActivities: NonProjectActivity[] = [
  {
    id: 1,
    name: "Team Meetings",
    description: "Weekly team standup and planning meetings",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 2,
    name: "Training & Development",
    description: "Professional development and skill training",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 3,
    name: "Administrative Tasks",
    description: "General administrative and operational tasks",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

/**
 * Mock business data service that provides fallback data when Supabase connectivity fails
 */
export class MockBusinessDataService {
  // Resource methods
  static async getResources(): Promise<Resource[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockResources];
  }

  static async getResource(id: number): Promise<Resource | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockResources.find(resource => resource.id === id);
  }

  // Project methods
  static async getProjects(): Promise<Project[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockProjects];
  }

  static async getProject(id: number): Promise<Project | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockProjects.find(project => project.id === id);
  }

  // Resource Allocation methods
  static async getResourceAllocations(): Promise<ResourceAllocation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockResourceAllocations];
  }

  static async getResourceAllocationsByDateRange(startDate: string, endDate: string): Promise<ResourceAllocation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockResourceAllocations.filter(allocation => {
      const allocStart = new Date(allocation.startDate);
      const allocEnd = new Date(allocation.endDate);
      return allocStart <= end && allocEnd >= start;
    });
  }

  static async getResourceAllocationsByResource(resourceId: number): Promise<ResourceAllocation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockResourceAllocations.filter(allocation => allocation.resourceId === resourceId);
  }

  static async getResourceAllocationsByProject(projectId: number): Promise<ResourceAllocation[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockResourceAllocations.filter(allocation => allocation.projectId === projectId);
  }

  // Time Entry methods
  static async getTimeEntries(): Promise<TimeEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockTimeEntries];
  }

  static async getTimeEntriesByResource(resourceId: number): Promise<TimeEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockTimeEntries.filter(entry => entry.resourceId === resourceId);
  }

  static async getTimeEntriesByProject(projectId: number): Promise<TimeEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockTimeEntries.filter(entry => entry.projectId === projectId);
  }

  static async getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const start = new Date(startDate);
    const end = new Date(endDate);

    return mockTimeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }

  // Time Off methods
  static async getTimeOff(): Promise<TimeOff[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockTimeOff];
  }

  static async getTimeOffByResource(resourceId: number): Promise<TimeOff[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockTimeOff.filter(timeOff => timeOff.resourceId === resourceId);
  }

  // Non-Project Activity methods
  static async getNonProjectActivities(): Promise<NonProjectActivity[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockNonProjectActivities];
  }

  static async getNonProjectActivity(id: number): Promise<NonProjectActivity | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockNonProjectActivities.find(activity => activity.id === id);
  }
}
