const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        })),
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        lte: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Import the KPI handler after mocking
const kpisHandler = require('../dashboard/kpis.js');

describe('KPI Integration Tests', () => {
  let mockReq, mockRes, mockContext;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      includeTrends: 'true'
    });

    mockRes = testUtils.createMockResponse();

    mockContext = {
      user: testUtils.createMockUser(),
      validatedData: testUtils.createMockValidatedData()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('KPI Handler', () => {
    it('should return valid KPI structure on success', async () => {
      // Mock successful database responses
      const { DatabaseService } = require('../lib/supabase');
      DatabaseService.getResources = jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          weeklyCapacity: 40,
          isActive: true,
          department: 'IT'
        }
      ]);

      DatabaseService.getProjects = jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Test Project',
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      ]);

      DatabaseService.getResourceAllocations = jest.fn().mockResolvedValue([
        {
          id: 1,
          resourceId: 1,
          projectId: 1,
          allocatedHours: 32,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      ]);

      await kpisHandler(mockReq, mockRes, mockContext);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const kpis = mockRes.json.mock.calls[0][0];

      // Validate KPI structure
      testUtils.assertKpiStructure(kpis);

      // Validate trend data if included
      if (kpis.trendData) {
        testUtils.assertTrendDataStructure(kpis.trendData);
      }
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { DatabaseService } = require('../lib/supabase');
      DatabaseService.getResources = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await kpisHandler(mockReq, mockRes, mockContext);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const kpis = mockRes.json.mock.calls[0][0];

      // Should return fallback structure
      testUtils.assertKpiStructure(kpis);

      // All values should be 0 in fallback
      expect(kpis.activeProjects).toBe(0);
      expect(kpis.totalProjects).toBe(0);
      expect(kpis.availableResources).toBe(0);
      expect(kpis.totalResources).toBe(0);
      expect(kpis.utilization).toBe(0);
      expect(kpis.conflicts).toBe(0);
    });

    it('should validate date parameters correctly', async () => {
      // Test with invalid date range
      mockContext.validatedData.startDate = '2024-12-31';
      mockContext.validatedData.endDate = '2024-01-01'; // End before start

      await kpisHandler(mockReq, mockRes, mockContext);

      // Should handle gracefully and return fallback data
      expect(mockRes.json).toHaveBeenCalledTimes(1);
    });

    it('should filter by department correctly', async () => {
      mockContext.validatedData.department = 'IT';

      const { DatabaseService } = require('../lib/supabase');
      DatabaseService.getResources = jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'IT User',
          department: 'IT',
          weeklyCapacity: 40,
          isActive: true
        },
        {
          id: 2,
          name: 'HR User',
          department: 'HR',
          weeklyCapacity: 40,
          isActive: true
        }
      ]);

      DatabaseService.getProjects = jest.fn().mockResolvedValue([]);
      DatabaseService.getResourceAllocations = jest.fn().mockResolvedValue([]);

      await kpisHandler(mockReq, mockRes, mockContext);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const kpis = mockRes.json.mock.calls[0][0];

      // Should only count IT resources
      expect(kpis.totalResources).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large mock datasets
      const largeResourceSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        weeklyCapacity: 40,
        isActive: true,
        department: 'IT'
      }));

      const largeProjectSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Project ${i + 1}`,
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }));

      const largeAllocationSet = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        resourceId: (i % 1000) + 1,
        projectId: (i % 100) + 1,
        allocatedHours: 8,
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }));

      const { DatabaseService } = require('../lib/supabase');
      DatabaseService.getResources = jest.fn().mockResolvedValue(largeResourceSet);
      DatabaseService.getProjects = jest.fn().mockResolvedValue(largeProjectSet);
      DatabaseService.getResourceAllocations = jest.fn().mockResolvedValue(largeAllocationSet);

      const startTime = Date.now();
      await kpisHandler(mockReq, mockRes, mockContext);
      const endTime = Date.now();

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      const kpis = mockRes.json.mock.calls[0][0];
      testUtils.assertKpiStructure(kpis);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain logical consistency between KPIs', async () => {
      const { DatabaseService } = require('../lib/supabase');
      DatabaseService.getResources = jest.fn().mockResolvedValue([
        { id: 1, name: 'User 1', weeklyCapacity: 40, isActive: true },
        { id: 2, name: 'User 2', weeklyCapacity: 40, isActive: true },
        { id: 3, name: 'User 3', weeklyCapacity: 40, isActive: false }
      ]);

      DatabaseService.getProjects = jest.fn().mockResolvedValue([
        { id: 1, name: 'Project 1', status: 'active' },
        { id: 2, name: 'Project 2', status: 'completed' }
      ]);

      DatabaseService.getResourceAllocations = jest.fn().mockResolvedValue([
        { id: 1, resourceId: 1, projectId: 1, allocatedHours: 40 },
        { id: 2, resourceId: 2, projectId: 1, allocatedHours: 20 }
      ]);

      await kpisHandler(mockReq, mockRes, mockContext);

      const kpis = mockRes.json.mock.calls[0][0];

      // Logical consistency checks
      expect(kpis.activeProjects).toBeLessThanOrEqual(kpis.totalProjects);
      expect(kpis.availableResources).toBeLessThanOrEqual(kpis.totalResources);
      expect(kpis.totalResources).toBe(2); // Only active resources
      expect(kpis.conflicts).toBeGreaterThanOrEqual(0);
    });
  });
});

module.exports = {
  // Export test utilities for other test files
};
