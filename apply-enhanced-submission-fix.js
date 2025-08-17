#!/usr/bin/env node

/**
 * Apply Enhanced Submission UI/UX Fix
 * 
 * This script applies the most stable implementation of the enhanced submission
 * components to resolve HMR/file persistence issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const timeLoggingFile = path.join(__dirname, 'client/src/pages/time-logging.tsx');

// The stable import that should be added
const stableImport = `import { EnhancedTimeLoggingWrapper, useEnhancedSubmission } from '@/components/enhanced-time-logging-wrapper';`;

// The hook declaration that should be added
const hookDeclaration = `  const { triggerCelebration, handleCelebrationTrigger } = useEnhancedSubmission();`;

// The celebration trigger that should be added to onSuccess
const celebrationTrigger = `      // Trigger celebration animation
      triggerCelebration();
      `;

function applyFix() {
  console.log('🔧 Applying Enhanced Submission UI/UX Fix...\n');
  
  try {
    // Read the current file
    let content = fs.readFileSync(timeLoggingFile, 'utf8');
    
    // Check if already applied
    if (content.includes('EnhancedTimeLoggingWrapper')) {
      console.log('✅ Enhanced submission components already applied!');
      return true;
    }
    
    // Apply the import
    if (!content.includes(stableImport)) {
      const importRegex = /(import { useRBAC } from '@\/hooks\/useRBAC';)/;
      content = content.replace(importRegex, `$1\n${stableImport}`);
      console.log('✅ Added stable import');
    }
    
    // Apply the hook declaration
    if (!content.includes('useEnhancedSubmission')) {
      const hookRegex = /(const inputRefs = useRef<Record<string, HTMLInputElement \| null>>\({}\);)/;
      content = content.replace(hookRegex, `$1\n${hookDeclaration}`);
      console.log('✅ Added hook declaration');
    }
    
    // Apply the celebration trigger
    if (!content.includes('triggerCelebration()')) {
      const successRegex = /(onSuccess: \(\) => {\s*)(toast\({)/;
      content = content.replace(successRegex, `$1${celebrationTrigger}\n      // Show toast notification\n      $2`);
      console.log('✅ Added celebration trigger');
    }
    
    // Wrap the return statement
    if (!content.includes('<EnhancedTimeLoggingWrapper')) {
      // Find the main return statement
      const returnRegex = /(return \(\s*<div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">)/;
      const wrapperStart = `return (
    <EnhancedTimeLoggingWrapper
      weeklySubmission={weeklySubmission}
      onSubmit={() => submitWeekMutation.mutate()}
      onUnsubmit={() => unsubmitWeekMutation.mutate()}
      isSubmitting={submitWeekMutation.isPending}
      isUnsubmitting={unsubmitWeekMutation.isPending}
      selectedWeek={selectedWeek}
      hasAllocations={activeAllocations.length > 0}
      onCelebrationTrigger={handleCelebrationTrigger}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">`;
      
      content = content.replace(returnRegex, wrapperStart);
      
      // Close the wrapper
      const endRegex = /(      <\/main>\s*    <\/div>\s*  \);\s*})/;
      const wrapperEnd = `      </main>
      </div>
    </EnhancedTimeLoggingWrapper>
  );
}`;
      
      content = content.replace(endRegex, wrapperEnd);
      console.log('✅ Added wrapper components');
    }
    
    // Write the updated content
    fs.writeFileSync(timeLoggingFile, content, 'utf8');
    
    console.log('\n🎉 Enhanced submission UI/UX fix applied successfully!');
    console.log('\n📋 What was applied:');
    console.log('  • Stable import for enhanced components');
    console.log('  • Enhanced submission hook');
    console.log('  • Celebration trigger on submit');
    console.log('  • Wrapper component integration');
    
    console.log('\n🚀 Next steps:');
    console.log('  1. Restart the development server');
    console.log('  2. Navigate to /time-logging');
    console.log('  3. Test the enhanced submission features');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    return false;
  }
}

function checkStatus() {
  try {
    const content = fs.readFileSync(timeLoggingFile, 'utf8');
    
    const checks = [
      { name: 'Enhanced wrapper import', test: content.includes('EnhancedTimeLoggingWrapper') },
      { name: 'Enhanced submission hook', test: content.includes('useEnhancedSubmission') },
      { name: 'Celebration trigger', test: content.includes('triggerCelebration()') },
      { name: 'Wrapper component usage', test: content.includes('<EnhancedTimeLoggingWrapper') }
    ];
    
    console.log('📊 Current Status:');
    checks.forEach(check => {
      console.log(`  ${check.test ? '✅' : '❌'} ${check.name}`);
    });
    
    const allApplied = checks.every(check => check.test);
    
    if (allApplied) {
      console.log('\n🎉 All enhancements are properly applied!');
    } else {
      console.log('\n⚠️  Some enhancements are missing. Run with --apply to fix.');
    }
    
    return allApplied;
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--apply')) {
  applyFix();
} else if (args.includes('--status')) {
  checkStatus();
} else {
  console.log('🔧 Enhanced Submission UI/UX Fix Tool\n');
  console.log('Usage:');
  console.log('  node apply-enhanced-submission-fix.js --status   # Check current status');
  console.log('  node apply-enhanced-submission-fix.js --apply    # Apply the fix');
  console.log('\nThis tool resolves HMR/file persistence issues with the enhanced submission components.');
}
