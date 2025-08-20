/**
 * Mock data for Settings page when Supabase is not configured
 * This provides fallback data for development and testing
 */

import type { OgsmCharter, Department, NotificationSettings } from "@shared/schema";

export const mockOgsmCharters: OgsmCharter[] = [
  {
    id: 1,
    name: "Q1 2024 Digital Transformation",
    description: "Focus on modernizing our technology stack and improving digital capabilities",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-15T00:00:00Z"),
  },
  {
    id: 2,
    name: "Q2 2024 Customer Experience",
    description: "Enhance customer satisfaction through improved service delivery",
    isActive: true,
    createdAt: new Date("2024-04-01T00:00:00Z"),
    updatedAt: new Date("2024-04-10T00:00:00Z"),
  },
  {
    id: 3,
    name: "Q3 2024 Operational Excellence",
    description: "Streamline processes and improve operational efficiency",
    isActive: true,
    createdAt: new Date("2024-07-01T00:00:00Z"),
    updatedAt: new Date("2024-07-05T00:00:00Z"),
  },
];

export const mockDepartments: Department[] = [
  {
    id: 1,
    name: "IT Architecture & Delivery",
    description: "Responsible for technology architecture and software delivery",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 2,
    name: "Product Management",
    description: "Manages product strategy and roadmap",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 3,
    name: "Data & Analytics",
    description: "Handles data science and business intelligence",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 4,
    name: "Quality Assurance",
    description: "Ensures software quality and testing standards",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 5,
    name: "DevOps & Infrastructure",
    description: "Manages deployment pipelines and infrastructure",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

export const mockNotificationSettings: NotificationSettings[] = [
  {
    id: 1,
    type: "weekly_reminder",
    isEnabled: true,
    reminderDay: 5, // Friday
    reminderTime: "16:00",
    emailSubject: "Weekly Time Log Reminder",
    emailTemplate: "Hi [Name], please remember to submit your hours for Week [WeekNumber]. Click here to complete your log: [Link].",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 2,
    type: "deadline_reminder",
    isEnabled: true,
    reminderDay: 1, // Monday
    reminderTime: "09:00",
    emailSubject: "Project Deadline Reminder",
    emailTemplate: "Hi [Name], you have upcoming project deadlines this week. Please review your allocations: [Link].",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

/**
 * Mock settings service that provides fallback data
 */
export class MockSettingsService {
  static async getOgsmCharters(): Promise<OgsmCharter[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockOgsmCharters];
  }

  static async getOgsmCharter(id: number): Promise<OgsmCharter | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockOgsmCharters.find(charter => charter.id === id);
  }

  static async createOgsmCharter(data: Omit<OgsmCharter, 'id' | 'createdAt' | 'updatedAt'>): Promise<OgsmCharter> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newCharter: OgsmCharter = {
      ...data,
      id: Math.max(...mockOgsmCharters.map(c => c.id)) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockOgsmCharters.push(newCharter);
    return newCharter;
  }

  static async updateOgsmCharter(id: number, data: Partial<OgsmCharter>): Promise<OgsmCharter> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = mockOgsmCharters.findIndex(charter => charter.id === id);
    if (index === -1) {
      throw new Error('Charter not found');
    }
    mockOgsmCharters[index] = {
      ...mockOgsmCharters[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockOgsmCharters[index];
  }

  static async deleteOgsmCharter(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = mockOgsmCharters.findIndex(charter => charter.id === id);
    if (index !== -1) {
      mockOgsmCharters[index].isActive = false;
      mockOgsmCharters[index].updatedAt = new Date();
    }
  }

  static async getDepartments(): Promise<Department[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockDepartments];
  }

  static async getDepartment(id: number): Promise<Department | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockDepartments.find(dept => dept.id === id);
  }

  static async createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newDepartment: Department = {
      ...data,
      id: Math.max(...mockDepartments.map(d => d.id)) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDepartments.push(newDepartment);
    return newDepartment;
  }

  static async updateDepartment(id: number, data: Partial<Department>): Promise<Department> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = mockDepartments.findIndex(dept => dept.id === id);
    if (index === -1) {
      throw new Error('Department not found');
    }
    mockDepartments[index] = {
      ...mockDepartments[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockDepartments[index];
  }

  static async deleteDepartment(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = mockDepartments.findIndex(dept => dept.id === id);
    if (index !== -1) {
      mockDepartments[index].isActive = false;
      mockDepartments[index].updatedAt = new Date();
    }
  }

  static async getNotificationSettings(): Promise<NotificationSettings[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...mockNotificationSettings];
  }

  static async getNotificationSetting(id: number): Promise<NotificationSettings | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockNotificationSettings.find(setting => setting.id === id);
  }

  static async getNotificationSettingByType(type: string): Promise<NotificationSettings | undefined> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockNotificationSettings.find(setting => setting.type === type);
  }

  static async updateNotificationSetting(id: number, data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = mockNotificationSettings.findIndex(setting => setting.id === id);
    if (index === -1) {
      throw new Error('Notification setting not found');
    }
    mockNotificationSettings[index] = {
      ...mockNotificationSettings[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockNotificationSettings[index];
  }
}
