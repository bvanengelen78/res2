// Shared storage utilities for serverless functions
// Re-export storage instance with serverless optimizations

import { storage as originalStorage } from '../../server/storage';

// Create a singleton pattern for storage to avoid multiple connections
let storageInstance: typeof originalStorage | null = null;

export function getStorage() {
  if (!storageInstance) {
    storageInstance = originalStorage;
  }
  return storageInstance;
}

// Re-export all storage methods
export const storage = getStorage();
