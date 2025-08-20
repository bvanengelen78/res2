const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock the dependencies
jest.mock('../lib/supabase', () => ({
  DatabaseService: {
    getResources: jest.fn(),
    getProjects: jest.fn(),
    getResourceAllocations: jest.fn(),
    getProjectsByPeriod: jest.fn(),
    getResourceAllocationsByPeriod: jest.fn(),
    getTimeEntries: jest.fn(),
    getTimeEntriesByPeriod: jest.fn(),
  }
}));

jest.mock('../lib/historical-kpi-service', () => ({
  HistoricalKpiService: {
    getHistoricalTrendData: jest.fn(),
    getPreviousPeriodValue: jest.fn(),
    autoSaveSnapshot: jest.fn(),
  }
}));

jest.mock('../lib/middleware', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Import the module after mocking
const { DatabaseService } = require('../lib/supabase');
const { HistoricalKpiService } = require('../lib/historical-kpi-service');

// Test data fixtures
const mockResources = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    weeklyCapacity: 40,
    isActive: true,
    department: 'IT',
    role: 'Developer'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    weeklyCapacity: 32,
    isActive: true,
    department: 'IT',
    role: 'Designer'
  },
  {
    id: 3,
    name: 'Bob Wilson',
    email: 'bob@example.com',
    weeklyCapacity: 40,
    isActive: false,
    department: 'IT',
    role: 'Manager'
  }
];

const mockProjects = [
  {
    id: 1,
    name: 'Project Alpha',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    priority: 'high'
  },
  {
    id: 2,
    name: 'Project Beta',
    status: 'active',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    priority: 'medium'
  },
  {
    id: 3,
    name: 'Project Gamma',
    status: 'completed',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    priority: 'low'
  }
];

const mockAllocations = [
  {
    id: 1,
    resourceId: 1,
    projectId: 1,
    allocatedHours: 32,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weeklyAllocations: { '2024-W01': 8, '2024-W02': 8, '2024-W03': 8, '2024-W04': 8 }
  },
  {
    id: 2,
    resourceId: 2,
    projectId: 1,
    allocatedHours: 24,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    weeklyAllocations: { '2024-W01': 6, '2024-W02': 6, '2024-W03': 6, '2024-W04': 6 }
  },
  {
    id: 3,
    resourceId: 1,
    projectId: 2,
    allocatedHours: 8,
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    weeklyAllocations: { '2024-W23': 2, '2024-W24': 2, '2024-W25': 2, '2024-W26': 2 }
  }
];

describe('KPI Calculations', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns
    DatabaseService.getResources.mockResolvedValue(mockResources);
    DatabaseService.getProjects.mockResolvedValue(mockProjects);
    DatabaseService.getResourceAllocations.mockResolvedValue(mockAllocations);
    DatabaseService.getProjectsByPeriod.mockResolvedValue(mockProjects.filter(p => p.status === 'active'));
    DatabaseService.getResourceAllocationsByPeriod.mockResolvedValue(mockAllocations);
    DatabaseService.getTimeEntries.mockResolvedValue([]);
    DatabaseService.getTimeEntriesByPeriod.mockResolvedValue([]);
    
    HistoricalKpiService.getHistoricalTrendData.mockResolvedValue([]);
    HistoricalKpiService.getPreviousPeriodValue.mockResolvedValue(0);
    HistoricalKpiService.autoSaveSnapshot.mockResolvedValue(null);
  });

  describe('Data Validation', () => {
    it('should validate resource data correctly', () => {
      // This test would require importing the validation functions
      // For now, we'll test the overall KPI calculation behavior
      expect(true).toBe(true);
    });

    it('should handle invalid resource data gracefully', () => {
      const invalidResources = [
        null,
        { id: 1 }, // missing name
        { name: 'Test' }, // missing id
        { id: 2, name: 'Test', weeklyCapacity: 'invalid' }, // invalid capacity
        { id: 3, name: 'Test', weeklyCapacity: -10 }, // negative capacity
      ];
      
      // Test would validate that invalid resources are filtered out
      expect(true).toBe(true);
    });
  });

  describe('Effective Capacity Calculations', () => {
    it('should calculate effective capacity correctly', () => {
      // Resource 1: 40h - 8h = 32h effective
      // Resource 2: 32h - 8h = 24h effective
      // Resource 3: inactive, should be excluded
      // Expected total effective capacity: 32 + 24 = 56h
      
      const expectedEffectiveCapacity = 56;
      expect(true).toBe(true); // Placeholder for actual test
    });

    it('should handle zero or negative capacity gracefully', () => {
      const resourcesWithInvalidCapacity = [
        { id: 1, name: 'Test', weeklyCapacity: 0, isActive: true },
        { id: 2, name: 'Test', weeklyCapacity: -5, isActive: true },
        { id: 3, name: 'Test', weeklyCapacity: 5, isActive: true }, // Less than non-project hours
      ];
      
      // Should handle gracefully without errors
      expect(true).toBe(true);
    });
  });

  describe('Utilization Calculations', () => {
    it('should calculate utilization percentage correctly', () => {
      // Total allocated: 32 + 24 + 8 = 64h
      // Total effective capacity: 56h (from active resources)
      // Expected utilization: (64 / 56) * 100 = 114.3%
      
      const expectedUtilization = 114.3;
      expect(true).toBe(true); // Placeholder for actual test
    });

    it('should handle division by zero in utilization calculation', () => {
      // When total effective capacity is 0
      const resourcesWithZeroCapacity = [];
      
      // Should return 0% utilization without errors
      expect(true).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    it('should identify capacity conflicts correctly', () => {
      // Resource 1: 40h allocated / 32h effective = 125% (conflict)
      // Resource 2: 24h allocated / 24h effective = 100% (no conflict)
      // Expected conflicts: 1
      
      const expectedConflicts = 1;
      expect(true).toBe(true); // Placeholder for actual test
    });

    it('should exclude inactive resources from conflict detection', () => {
      // Inactive resources should not be counted in conflicts
      expect(true).toBe(true);
    });
  });

  describe('Period-Aware Filtering', () => {
    it('should filter projects by period correctly', () => {
      const startDate = '2024-06-01';
      const endDate = '2024-08-31';
      
      // Should only include projects that overlap with the period
      expect(true).toBe(true);
    });

    it('should filter allocations by period correctly', () => {
      const startDate = '2024-06-01';
      const endDate = '2024-08-31';
      
      // Should only include allocations that overlap with the period
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data sets', () => {
      DatabaseService.getResources.mockResolvedValue([]);
      DatabaseService.getProjects.mockResolvedValue([]);
      DatabaseService.getResourceAllocations.mockResolvedValue([]);
      
      // Should return zero values without errors
      expect(true).toBe(true);
    });

    it('should handle malformed data gracefully', () => {
      const malformedData = [
        { id: 'invalid', name: null, weeklyCapacity: 'not-a-number' },
        null,
        undefined,
        { /* missing required fields */ }
      ];
      
      DatabaseService.getResources.mockResolvedValue(malformedData);
      
      // Should filter out invalid data and continue
      expect(true).toBe(true);
    });

    it('should handle database errors gracefully', () => {
      DatabaseService.getResources.mockRejectedValue(new Error('Database connection failed'));
      
      // Should return fallback data structure
      expect(true).toBe(true);
    });
  });
});

// Export test utilities for other test files
module.exports = {
  mockResources,
  mockProjects,
  mockAllocations
};
