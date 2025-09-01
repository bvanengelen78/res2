#!/usr/bin/env node

/**
 * Verify Testing Mode Script
 * 
 * This script verifies that testing mode is properly configured and working.
 * It checks for the presence of testing files and configurations.
 * 
 * Usage: node scripts/verify-testing-mode.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅', 
    warning: '⚠️',
    error: '❌',
    check: '🔍'
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

function checkFile(filePath, description, required = true) {
  const exists = fileExists(filePath);
  
  if (exists) {
    log(`${description}: Found`, 'success');
    return true;
  } else {
    const level = required ? 'error' : 'warning';
    log(`${description}: Missing`, level);
    return !required;
  }
}

function checkFileContent(filePath, searchText, description) {
  if (!fileExists(filePath)) {
    log(`${description}: File not found`, 'error');
    return false;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(searchText);
    
    if (found) {
      log(`${description}: Configuration found`, 'success');
      return true;
    } else {
      log(`${description}: Configuration missing`, 'error');
      return false;
    }
  } catch (error) {
    log(`${description}: Error reading file - ${error.message}`, 'error');
    return false;
  }
}

function verifyTestingMode() {
  log('🔍 Verifying ResourceFlow Testing Mode Configuration', 'check');
  
  let allChecksPass = true;
  
  // Check for testing mode indicator
  log('\n📋 Step 1: Checking for testing mode indicators', 'info');
  
  if (!checkFile('TESTING_MODE_ACTIVE.md', 'Testing mode indicator file')) {
    allChecksPass = false;
  }
  
  // Check core testing files
  log('\n📁 Step 2: Checking core testing files', 'info');
  
  const coreFiles = [
    { path: 'client/src/context/MockAuthContext.tsx', desc: 'Mock authentication context' },
    { path: 'client/src/App.testing.tsx', desc: 'Testing version of App component' },
    { path: 'api/lib/middleware.testing.js', desc: 'Testing API middleware' },
    { path: 'client/src/config/testing.ts', desc: 'Testing configuration' }
  ];
  
  for (const file of coreFiles) {
    if (!checkFile(file.path, file.desc)) {
      allChecksPass = false;
    }
  }
  
  // Check if production files are backed up
  log('\n💾 Step 3: Checking production file backups', 'info');
  
  const backupFiles = [
    { path: 'client/src/App.tsx.production', desc: 'App.tsx backup' },
    { path: 'api/lib/middleware.js.production', desc: 'middleware.js backup' }
  ];
  
  for (const file of backupFiles) {
    if (!checkFile(file.path, file.desc)) {
      allChecksPass = false;
    }
  }
  
  // Check if current files are using testing versions
  log('\n🔧 Step 4: Checking active file configurations', 'info');
  
  const configChecks = [
    {
      file: 'client/src/App.tsx',
      search: 'MockAuthProvider',
      desc: 'App.tsx using MockAuthProvider'
    },
    {
      file: 'api/lib/middleware.js',
      search: 'Mock authentication',
      desc: 'middleware.js using mock authentication'
    }
  ];
  
  for (const check of configChecks) {
    if (!checkFileContent(check.file, check.search, check.desc)) {
      allChecksPass = false;
    }
  }
  
  // Check package.json scripts
  log('\n📦 Step 5: Checking package.json scripts', 'info');
  
  if (!checkFileContent('package.json', 'testing:enable', 'Testing scripts in package.json')) {
    allChecksPass = false;
  }
  
  // Final verification
  log('\n🎯 Step 6: Final verification', 'info');
  
  if (allChecksPass) {
    log('\n🎉 Testing mode verification PASSED!', 'success');
    log('\n📋 Testing Mode Status: ACTIVE', 'success');
    log('✅ All authentication bypassed', 'success');
    log('✅ All permissions granted', 'success');
    log('✅ All features accessible', 'success');
    log('\n🚀 Ready for stakeholder testing!', 'success');
    
    log('\n📖 Next Steps:', 'info');
    log('1. Start the development server: npm run dev', 'info');
    log('2. Navigate to the application URL', 'info');
    log('3. Verify immediate access without login', 'info');
    log('4. Test all features and menu items', 'info');
    
  } else {
    log('\n❌ Testing mode verification FAILED!', 'error');
    log('\n🔧 Issues found - please resolve before testing:', 'error');
    log('1. Run: npm run testing:enable', 'info');
    log('2. Check for any error messages', 'info');
    log('3. Run this verification script again', 'info');
  }
  
  return allChecksPass;
}

// Check if we're in production mode
function checkProductionMode() {
  if (fileExists('PRODUCTION_MODE_ACTIVE.md')) {
    log('\n🔒 Production mode detected', 'warning');
    log('To enable testing mode, run: npm run testing:enable', 'info');
    return true;
  }
  return false;
}

// Run the verification
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('verify-testing-mode.js')) {
  if (checkProductionMode()) {
    process.exit(0);
  }

  const success = verifyTestingMode();
  process.exit(success ? 0 : 1);
}

export { verifyTestingMode };
