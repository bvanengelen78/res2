/**
 * Testing Configuration
 * 
 * This file contains configuration overrides for testing mode.
 */

export const TESTING_MODE = true;

export const MOCK_USER_DATA = {
  id: 'mock-user-id',
  email: 'stakeholder@test.com',
  name: 'Test Stakeholder',
  role: 'Director',
  department: 'IT Architecture & Delivery',
  permissions: 'all'
};

export const TESTING_CONFIG = {
  bypassAuthentication: true,
  grantAllPermissions: true,
  showAllMenuItems: true,
  enableAllFeatures: true,
  mockDataEnabled: true
};

console.log('🧪 Testing mode enabled - All authentication bypassed');
