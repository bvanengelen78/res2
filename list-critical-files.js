#!/usr/bin/env node

/**
 * List Critical Files for MVP Testing Mode Deployment
 * 
 * This script lists all the critical files that must be uploaded to the new repository
 * to ensure MVP testing mode works correctly.
 */

import fs from 'fs';
import path from 'path';

const criticalFiles = [
  // Authentication Bypass Files
  'client/src/context/MockAuthContext.tsx',
  'client/src/App.testing.tsx', 
  'api/lib/middleware.testing.js',
  
  // Modified Core Files (Testing Mode Active)
  'client/src/App.tsx',
  'api/lib/middleware.js',
  
  // Production Backup Files
  'client/src/App.tsx.production',
  'api/lib/middleware.js.production',
  
  // Testing Scripts
  'scripts/enable-testing-mode.js',
  'scripts/disable-testing-mode.js', 
  'scripts/verify-testing-mode.js',
  
  // Documentation
  'TESTING_MODE_ACTIVE.md',
  'STAKEHOLDER_TESTING_READY.md',
  'TESTING_MODE_SETUP.md',
  'REPOSITORY_MIGRATION_STATUS.md',
  'MANUAL_DEPLOYMENT_GUIDE.md',
  
  // Configuration Files
  'client/src/config/testing.ts',
  'package.json',
  
  // Core Application Files
  'client/src/main.tsx',
  'client/src/index.css',
  'client/src/App.css',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  
  // Server Files
  'server/index.ts',
  'server/routes.ts',
  
  // Essential Config
  '.env.example',
  'README.md',
  'vercel.json'
];

function checkFile(filePath) {
  try {
    const exists = fs.existsSync(filePath);
    const stats = exists ? fs.statSync(filePath) : null;
    return {
      path: filePath,
      exists,
      size: stats ? stats.size : 0,
      modified: stats ? stats.mtime.toISOString() : null
    };
  } catch (error) {
    return {
      path: filePath,
      exists: false,
      error: error.message
    };
  }
}

function listCriticalFiles() {
  console.log('🔍 MVP Testing Mode - Critical Files Check\n');
  
  const results = criticalFiles.map(checkFile);
  
  console.log('✅ EXISTING FILES (Ready for Upload):');
  console.log('=====================================');
  
  const existingFiles = results.filter(f => f.exists);
  existingFiles.forEach(file => {
    const sizeKB = (file.size / 1024).toFixed(1);
    console.log(`✅ ${file.path} (${sizeKB} KB)`);
  });
  
  console.log(`\n📊 Summary: ${existingFiles.length}/${criticalFiles.length} critical files found\n`);
  
  const missingFiles = results.filter(f => !f.exists);
  if (missingFiles.length > 0) {
    console.log('⚠️ MISSING FILES:');
    console.log('=================');
    missingFiles.forEach(file => {
      console.log(`❌ ${file.path}`);
    });
    console.log('');
  }
  
  console.log('🚀 DEPLOYMENT READY STATUS:');
  console.log('===========================');
  
  const testingModeFiles = [
    'client/src/context/MockAuthContext.tsx',
    'client/src/App.tsx',
    'TESTING_MODE_ACTIVE.md',
    'scripts/enable-testing-mode.js'
  ];
  
  const testingModeReady = testingModeFiles.every(file => 
    results.find(r => r.path === file)?.exists
  );
  
  if (testingModeReady) {
    console.log('✅ MVP Testing Mode files are ready for deployment');
    console.log('✅ Authentication bypass will be active after upload');
    console.log('✅ Stakeholder testing can proceed immediately');
  } else {
    console.log('❌ MVP Testing Mode files are incomplete');
    console.log('❌ Manual setup may be required after upload');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('==============');
  console.log('1. Upload all existing files to https://github.com/bvanengelen78/resourcio');
  console.log('2. Verify TESTING_MODE_ACTIVE.md appears in the repository');
  console.log('3. Wait for Vercel deployment (2-3 minutes)');
  console.log('4. Test https://resourcio.vercel.app/ for immediate access');
  console.log('5. Confirm no login screen appears');
  
  return {
    total: criticalFiles.length,
    existing: existingFiles.length,
    missing: missingFiles.length,
    testingModeReady
  };
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('list-critical-files.js')) {
  listCriticalFiles();
}

export { listCriticalFiles };
