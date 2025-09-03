#!/usr/bin/env node

/**
 * Fix Custom Authentication Endpoints
 * 
 * This script identifies and fixes API endpoints that use custom authentication
 * instead of the middleware system, ensuring consistent demo mode behavior.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns that indicate custom authentication
const customAuthPatterns = [
  /verifyToken\s*\(/,
  /jwt\.verify\s*\(/,
  /Authorization.*required/,
  /authHeader.*startsWith.*Bearer/,
  /return.*401.*Authentication required/
];

// Files to exclude from checking (these are expected to have custom auth)
const excludeFiles = [
  'middleware.js',
  'middleware.js.production', 
  'middleware.testing.js',
  'supabase-auth.ts',
  'debug-middleware.js',
  'env-debug.js',
  'ping.js' // Has demo login functionality
];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅', 
    warning: '⚠️',
    error: '❌',
    fix: '🔧'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function findApiFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.js') && !excludeFiles.includes(item)) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

function hasCustomAuth(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file uses withMiddleware (good)
    const usesMiddleware = content.includes('withMiddleware');
    
    // Check if file has custom auth patterns (bad)
    const hasCustomPatterns = customAuthPatterns.some(pattern => pattern.test(content));
    
    return {
      hasCustomAuth: hasCustomPatterns && !usesMiddleware,
      usesMiddleware,
      hasCustomPatterns,
      content
    };
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'error');
    return { hasCustomAuth: false, usesMiddleware: false, hasCustomPatterns: false };
  }
}

function analyzeEndpoints() {
  log('🔍 Scanning API endpoints for custom authentication patterns...', 'info');
  
  const apiDir = path.join(process.cwd(), 'api');
  const apiFiles = findApiFiles(apiDir);
  
  log(`Found ${apiFiles.length} API files to analyze`, 'info');
  
  const results = {
    customAuthFiles: [],
    middlewareFiles: [],
    mixedFiles: [],
    totalFiles: apiFiles.length
  };
  
  for (const filePath of apiFiles) {
    const analysis = hasCustomAuth(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (analysis.hasCustomAuth) {
      results.customAuthFiles.push({
        path: relativePath,
        fullPath: filePath,
        analysis
      });
      log(`❌ Custom auth detected: ${relativePath}`, 'error');
    } else if (analysis.usesMiddleware) {
      results.middlewareFiles.push({
        path: relativePath,
        fullPath: filePath,
        analysis
      });
      log(`✅ Uses middleware: ${relativePath}`, 'success');
    } else if (analysis.hasCustomPatterns) {
      results.mixedFiles.push({
        path: relativePath,
        fullPath: filePath,
        analysis
      });
      log(`⚠️ Mixed patterns: ${relativePath}`, 'warning');
    }
  }
  
  return results;
}

function generateReport(results) {
  log('\n📊 Analysis Report', 'info');
  log(`Total files analyzed: ${results.totalFiles}`, 'info');
  log(`Files using middleware: ${results.middlewareFiles.length}`, 'success');
  log(`Files with custom auth: ${results.customAuthFiles.length}`, 'error');
  log(`Files with mixed patterns: ${results.mixedFiles.length}`, 'warning');
  
  if (results.customAuthFiles.length > 0) {
    log('\n🔧 Files requiring fixes:', 'fix');
    results.customAuthFiles.forEach(file => {
      log(`  - ${file.path}`, 'fix');
    });
  }
  
  if (results.mixedFiles.length > 0) {
    log('\n⚠️ Files requiring review:', 'warning');
    results.mixedFiles.forEach(file => {
      log(`  - ${file.path}`, 'warning');
    });
  }
  
  // Generate detailed report file
  const reportContent = `# API Authentication Analysis Report

Generated: ${new Date().toISOString()}

## Summary
- Total files analyzed: ${results.totalFiles}
- Files using middleware: ${results.middlewareFiles.length}
- Files with custom auth: ${results.customAuthFiles.length}
- Files with mixed patterns: ${results.mixedFiles.length}

## Files Using Middleware (✅ Good)
${results.middlewareFiles.map(f => `- ${f.path}`).join('\n')}

## Files with Custom Authentication (❌ Needs Fix)
${results.customAuthFiles.map(f => `- ${f.path}`).join('\n')}

## Files with Mixed Patterns (⚠️ Needs Review)
${results.mixedFiles.map(f => `- ${f.path}`).join('\n')}

## Recommended Actions

### For Custom Auth Files:
1. Convert to use withMiddleware wrapper
2. Set requireAuth: false for demo mode
3. Remove custom JWT verification logic
4. Use middleware's user object instead

### For Mixed Pattern Files:
1. Review authentication logic
2. Ensure consistency with middleware system
3. Test in both development and production

## Next Steps
1. Fix custom authentication files
2. Test all endpoints in demo mode
3. Verify Vercel production deployment
4. Confirm TanStack Query cache errors are resolved
`;

  fs.writeFileSync('api-auth-analysis-report.md', reportContent);
  log('📄 Detailed report saved to: api-auth-analysis-report.md', 'success');
}

// Main execution
function main() {
  log('🚀 Starting API Authentication Analysis', 'info');
  
  try {
    const results = analyzeEndpoints();
    generateReport(results);
    
    if (results.customAuthFiles.length === 0) {
      log('\n🎉 All API endpoints are using the middleware system correctly!', 'success');
      log('✅ Ready for demo mode deployment', 'success');
    } else {
      log('\n🔧 Action required: Fix custom authentication endpoints', 'fix');
      log('📋 See api-auth-analysis-report.md for detailed instructions', 'info');
    }
    
  } catch (error) {
    log(`Analysis failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('fix-custom-auth-endpoints.js')) {
  main();
}

export { analyzeEndpoints, generateReport };
