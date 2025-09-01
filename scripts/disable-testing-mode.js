#!/usr/bin/env node

/**
 * Disable Testing Mode Script
 * 
 * This script restores the ResourceFlow application to production mode by:
 * 1. Restoring backed up production files
 * 2. Removing testing configurations
 * 3. Re-enabling authentication and access controls
 * 
 * Usage: node scripts/disable-testing-mode.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_SUFFIX = '.production';

// Files to restore from backups
const filesToRestore = [
  'client/src/App.tsx',
  'api/lib/middleware.js'
];

// Testing files to remove
const testingFilesToRemove = [
  'client/src/config/testing.ts',
  'TESTING_MODE_ACTIVE.md'
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅', 
    warning: '⚠️',
    error: '❌'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function restoreFile(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  
  if (!fileExists(backupPath)) {
    log(`No backup found for: ${filePath}`, 'warning');
    return false;
  }
  
  try {
    fs.copyFileSync(backupPath, filePath);
    log(`Restored: ${filePath} from backup`, 'success');
    return true;
  } catch (error) {
    log(`Failed to restore ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

function removeFile(filePath) {
  if (!fileExists(filePath)) {
    log(`File not found (already removed): ${filePath}`, 'info');
    return true;
  }
  
  try {
    fs.unlinkSync(filePath);
    log(`Removed: ${filePath}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to remove ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

function disableTestingMode() {
  log('🔄 Starting ResourceFlow Production Mode Restoration', 'info');
  log('This will restore authentication and access controls', 'info');
  
  let success = true;
  
  // Step 1: Restore production files from backups
  log('\n📁 Step 1: Restoring production files from backups', 'info');
  
  for (const filePath of filesToRestore) {
    if (!restoreFile(filePath)) {
      success = false;
    }
  }
  
  // Step 2: Remove testing configuration files
  log('\n🗑️ Step 2: Removing testing configuration files', 'info');
  
  for (const filePath of testingFilesToRemove) {
    if (!removeFile(filePath)) {
      success = false;
    }
  }
  
  // Step 3: Create production restoration notice
  const restorationContent = `# ResourceFlow Production Mode - RESTORED

## 🔒 Production Mode Status: ACTIVE

The application has been restored to production mode with the following changes:

### ✅ Authentication Restored
- Login requirements re-enabled
- User credentials required for access
- Session management active

### ✅ Access Controls Restored
- Role-based permissions enforced
- Menu items filtered by user permissions
- Feature access controlled by user roles

### ✅ Security Features Active
- Authentication middleware enabled
- Permission checks enforced
- User session validation required

### 🚀 Production Deployment Ready

The application is now ready for production deployment with full security controls.

### 🧪 To Re-enable Testing Mode

Run: \`node scripts/enable-testing-mode.js\`

---
**Restored on:** ${new Date().toISOString()}
**Mode:** Production
`;

  try {
    fs.writeFileSync('PRODUCTION_MODE_ACTIVE.md', restorationContent);
    log('Created production restoration notice: PRODUCTION_MODE_ACTIVE.md', 'success');
  } catch (error) {
    log(`Failed to create restoration notice: ${error.message}`, 'error');
    success = false;
  }
  
  // Final status
  if (success) {
    log('\n🔒 Production mode successfully restored!', 'success');
    log('\n📋 Next Steps:', 'info');
    log('1. Restart your development server', 'info');
    log('2. Authentication is now required for access', 'info');
    log('3. All security controls are active', 'info');
    log('4. Application is ready for production deployment', 'info');
  } else {
    log('\n❌ Some errors occurred during restoration', 'error');
    log('Please check the logs above and resolve any issues', 'error');
  }
  
  return success;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  disableTestingMode();
}

export { disableTestingMode };
