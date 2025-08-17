import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File to monitor
const timeLoggingFile = path.join(__dirname, '../client/src/pages/time-logging.tsx');

// Required imports that should be present
const requiredImports = [
  "import { SubmissionToastBanner, SubmitWeekCelebration, useSubmitCelebration } from '@/components/enhanced-submission-components';"
];

// Required hook declaration
const requiredHook = "const { showCelebration, triggerCelebration, hideCelebration } = useSubmitCelebration();";

// Required celebration trigger
const requiredTrigger = "triggerCelebration();";

// Required components at end
const requiredComponents = [
  "<SubmissionToastBanner",
  "<SubmitWeekCelebration"
];

function checkFileIntegrity() {
  try {
    const content = fs.readFileSync(timeLoggingFile, 'utf8');
    
    let hasIssues = false;
    const issues = [];
    
    // Check for required imports
    requiredImports.forEach(importStr => {
      if (!content.includes(importStr)) {
        hasIssues = true;
        issues.push(`Missing import: ${importStr}`);
      }
    });
    
    // Check for required hook
    if (!content.includes(requiredHook)) {
      hasIssues = true;
      issues.push(`Missing hook declaration: ${requiredHook}`);
    }
    
    // Check for celebration trigger
    if (!content.includes(requiredTrigger)) {
      hasIssues = true;
      issues.push(`Missing celebration trigger: ${requiredTrigger}`);
    }
    
    // Check for required components
    requiredComponents.forEach(component => {
      if (!content.includes(component)) {
        hasIssues = true;
        issues.push(`Missing component: ${component}`);
      }
    });
    
    if (hasIssues) {
      console.log('🚨 File integrity issues detected:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('\n📝 Please re-apply the enhanced submission components.');
      return false;
    } else {
      console.log('✅ File integrity check passed - all components present');
      return true;
    }
  } catch (error) {
    console.error('❌ Error checking file:', error.message);
    return false;
  }
}

function startMonitoring() {
  console.log('🔍 Starting file integrity monitoring...');
  console.log(`📁 Monitoring: ${timeLoggingFile}`);
  
  // Initial check
  checkFileIntegrity();
  
  // Watch for changes
  fs.watchFile(timeLoggingFile, { interval: 2000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('\n📝 File changed, checking integrity...');
      setTimeout(() => {
        checkFileIntegrity();
      }, 1000); // Wait a bit for file operations to complete
    }
  });
  
  console.log('👀 Monitoring active. Press Ctrl+C to stop.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitoring();
}

export { checkFileIntegrity, startMonitoring };
