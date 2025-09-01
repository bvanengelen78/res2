#!/usr/bin/env node

/**
 * Enable Testing Mode Script
 * 
 * This script prepares the ResourceFlow application for MVP testing by:
 * 1. Backing up production files
 * 2. Replacing authentication with mock implementations
 * 3. Disabling all access controls
 * 4. Enabling full feature access for stakeholders
 * 
 * Usage: node scripts/enable-testing-mode.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_SUFFIX = '.production';
const TESTING_SUFFIX = '.testing';

// File mappings for testing mode
const fileMappings = [
  {
    production: 'client/src/App.tsx',
    testing: 'client/src/App.testing.tsx',
    description: 'Main App component with mock authentication'
  },
  {
    production: 'api/lib/middleware.js',
    testing: 'api/lib/middleware.testing.js', 
    description: 'API middleware with bypassed authentication'
  }
];

// Additional files to create/modify for testing
const testingConfigs = [
  {
    file: 'client/src/config/testing.ts',
    content: `/**
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
`,
    description: 'Testing configuration file'
  }
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

function backupFile(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  
  if (!fileExists(filePath)) {
    log(`File not found: ${filePath}`, 'warning');
    return false;
  }
  
  if (fileExists(backupPath)) {
    log(`Backup already exists: ${backupPath}`, 'info');
    return true;
  }
  
  try {
    fs.copyFileSync(filePath, backupPath);
    log(`Backed up: ${filePath} → ${backupPath}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to backup ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

function replaceFile(sourcePath, targetPath) {
  if (!fileExists(sourcePath)) {
    log(`Testing file not found: ${sourcePath}`, 'error');
    return false;
  }
  
  try {
    fs.copyFileSync(sourcePath, targetPath);
    log(`Replaced: ${targetPath} with testing version`, 'success');
    return true;
  } catch (error) {
    log(`Failed to replace ${targetPath}: ${error.message}`, 'error');
    return false;
  }
}

function createTestingFile(config) {
  const dir = path.dirname(config.file);
  
  // Create directory if it doesn't exist
  if (!fileExists(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${dir}`, 'success');
    } catch (error) {
      log(`Failed to create directory ${dir}: ${error.message}`, 'error');
      return false;
    }
  }
  
  try {
    fs.writeFileSync(config.file, config.content);
    log(`Created: ${config.file}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to create ${config.file}: ${error.message}`, 'error');
    return false;
  }
}

function enableTestingMode() {
  log('🚀 Starting ResourceFlow Testing Mode Setup', 'info');
  log('This will disable all authentication and enable full feature access', 'warning');
  
  let success = true;
  
  // Step 1: Backup and replace core files
  log('\n📁 Step 1: Backing up production files and enabling testing versions', 'info');
  
  for (const mapping of fileMappings) {
    log(`\nProcessing: ${mapping.description}`, 'info');
    
    // Backup production file
    if (!backupFile(mapping.production)) {
      success = false;
      continue;
    }
    
    // Replace with testing version
    if (!replaceFile(mapping.testing, mapping.production)) {
      success = false;
      continue;
    }
  }
  
  // Step 2: Create testing configuration files
  log('\n⚙️ Step 2: Creating testing configuration files', 'info');
  
  for (const config of testingConfigs) {
    if (!createTestingFile(config)) {
      success = false;
    }
  }
  
  // Step 3: Create testing instructions
  const instructionsContent = `# ResourceFlow Testing Mode - ACTIVE

## 🧪 Testing Mode Status: ENABLED

The application is now configured for stakeholder testing with the following changes:

### ✅ Authentication Disabled
- All login requirements removed
- Automatic authentication with mock user
- No password or credentials needed

### ✅ Full Feature Access
- All menu items visible and functional
- All permissions granted automatically
- No role-based restrictions

### ✅ Available Features for Testing
- Dashboard (Main & Management views)
- Project Management (Create, Edit, View, Allocations)
- Resource Management (View, Edit, Allocations)
- Time Logging & Submission Overview
- Reports & Change Lead Reports
- Settings & User Management
- Calendar Integration

### 🎯 Testing Instructions for Stakeholders

1. **Access the Application**: Simply navigate to the application URL
2. **No Login Required**: You'll be automatically logged in as "Test Stakeholder"
3. **Full Access**: All features are available - explore freely
4. **Test All Features**: Every menu item and functionality is accessible

### 🔄 To Restore Production Mode

Run: \`node scripts/disable-testing-mode.js\`

### 📝 Mock User Details
- Name: Test Stakeholder
- Email: stakeholder@test.com
- Role: Director (with all permissions)
- Department: IT Architecture & Delivery

---
**Generated on:** ${new Date().toISOString()}
**Mode:** Testing/MVP Demo
`;

  try {
    fs.writeFileSync('TESTING_MODE_ACTIVE.md', instructionsContent);
    log('Created testing instructions: TESTING_MODE_ACTIVE.md', 'success');
  } catch (error) {
    log(`Failed to create testing instructions: ${error.message}`, 'error');
    success = false;
  }
  
  // Final status
  if (success) {
    log('\n🎉 Testing mode successfully enabled!', 'success');
    log('\n📋 Next Steps:', 'info');
    log('1. Restart your development server', 'info');
    log('2. Navigate to the application - no login required', 'info');
    log('3. All features are now accessible for testing', 'info');
    log('4. Share the application URL with stakeholders', 'info');
    log('\n⚠️  Remember to run disable-testing-mode.js before production deployment', 'warning');
  } else {
    log('\n❌ Some errors occurred during setup', 'error');
    log('Please check the logs above and resolve any issues', 'error');
  }
  
  return success;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('enable-testing-mode.js')) {
  enableTestingMode();
}

export { enableTestingMode };
