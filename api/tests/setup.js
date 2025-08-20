// Test setup file
require('dotenv').config({ path: '.env.test' });

// Global test utilities
global.testUtils = {
  // Helper to create mock request objects
  createMockRequest: (query = {}, body = {}) => ({
    query,
    body,
    headers: {},
    method: 'GET'
  }),

  // Helper to create mock response objects
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    return res;
  },

  // Helper to create mock user objects
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    resourceId: 1,
    isActive: true,
    ...overrides
  }),

  // Helper to create mock validated data
  createMockValidatedData: (overrides = {}) => ({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    department: null,
    includeTrends: true,
    ...overrides
  }),

  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to assert KPI structure
  assertKpiStructure: (kpis) => {
    expect(kpis).toHaveProperty('activeProjects');
    expect(kpis).toHaveProperty('totalProjects');
    expect(kpis).toHaveProperty('availableResources');
    expect(kpis).toHaveProperty('totalResources');
    expect(kpis).toHaveProperty('utilization');
    expect(kpis).toHaveProperty('conflicts');
    
    // Validate types
    expect(typeof kpis.activeProjects).toBe('number');
    expect(typeof kpis.totalProjects).toBe('number');
    expect(typeof kpis.availableResources).toBe('number');
    expect(typeof kpis.totalResources).toBe('number');
    expect(typeof kpis.utilization).toBe('number');
    expect(typeof kpis.conflicts).toBe('number');
    
    // Validate ranges
    expect(kpis.activeProjects).toBeGreaterThanOrEqual(0);
    expect(kpis.totalProjects).toBeGreaterThanOrEqual(0);
    expect(kpis.availableResources).toBeGreaterThanOrEqual(0);
    expect(kpis.totalResources).toBeGreaterThanOrEqual(0);
    expect(kpis.utilization).toBeGreaterThanOrEqual(0);
    expect(kpis.conflicts).toBeGreaterThanOrEqual(0);
    
    // Logical constraints
    expect(kpis.activeProjects).toBeLessThanOrEqual(kpis.totalProjects);
    expect(kpis.availableResources).toBeLessThanOrEqual(kpis.totalResources);
  },

  // Helper to assert trend data structure
  assertTrendDataStructure: (trendData) => {
    expect(trendData).toHaveProperty('activeProjects');
    expect(trendData).toHaveProperty('availableResources');
    expect(trendData).toHaveProperty('utilization');
    expect(trendData).toHaveProperty('conflicts');
    
    Object.values(trendData).forEach(trend => {
      expect(trend).toHaveProperty('current_value');
      expect(trend).toHaveProperty('previous_value');
      expect(trend).toHaveProperty('period_label');
      expect(trend).toHaveProperty('trend_data');
      
      expect(typeof trend.current_value).toBe('number');
      expect(typeof trend.previous_value).toBe('number');
      expect(typeof trend.period_label).toBe('string');
      expect(Array.isArray(trend.trend_data)).toBe(true);
    });
  }
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restore console after tests
afterAll(() => {
  global.console = originalConsole;
});
