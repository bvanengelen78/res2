// Shared auth service for serverless functions
// Re-export auth service with serverless optimizations

import { authService as originalAuthService } from '../../server/auth';

// Create a singleton pattern for auth service
let authServiceInstance: typeof originalAuthService | null = null;

export function getAuthService() {
  if (!authServiceInstance) {
    authServiceInstance = originalAuthService;
  }
  return authServiceInstance;
}

// Re-export all auth service methods
export const authService = getAuthService();
