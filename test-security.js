#!/usr/bin/env node

// Security Test Runner
// Runs comprehensive security tests and generates a security report

const { SecurityTestingService } = require('./api/lib/security-testing');
const fs = require('fs').promises;
const path = require('path');

async function runSecurityTests() {
  console.log('🔒 ResourceFlow Security Test Suite');
  console.log('=====================================\n');
  
  try {
    // Initialize security testing service
    const securityTester = new SecurityTestingService();
    
    // Run comprehensive security tests
    const report = await securityTester.runSecurityTests();
    
    // Display summary
    console.log('\n📊 Security Test Summary');
    console.log('========================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests} ✅`);
    console.log(`Failed: ${report.summary.failedTests} ❌`);
    console.log(`Vulnerabilities: ${report.summary.vulnerabilities} 🚨`);
    
    if (report.summary.vulnerabilities > 0) {
      console.log('\n🚨 Vulnerability Breakdown:');
      console.log(`  Critical: ${report.summary.criticalIssues}`);
      console.log(`  High: ${report.summary.highIssues}`);
      console.log(`  Medium: ${report.summary.mediumIssues}`);
      console.log(`  Low: ${report.summary.lowIssues}`);
    }
    
    // Display test results by category
    console.log('\n📋 Test Results by Category');
    console.log('============================');
    
    const categories = [...new Set(report.testResults.map(t => t.category))];
    for (const category of categories) {
      const categoryTests = report.testResults.filter(t => t.category === category);
      const passed = categoryTests.filter(t => t.passed).length;
      const total = categoryTests.length;
      
      console.log(`\n${category.toUpperCase()}: ${passed}/${total} passed`);
      
      // Show failed tests
      const failed = categoryTests.filter(t => !t.passed);
      for (const test of failed) {
        console.log(`  ❌ ${test.testName}: ${test.details}`);
      }
      
      // Show passed tests (brief)
      const passedTests = categoryTests.filter(t => t.passed);
      if (passedTests.length > 0) {
        console.log(`  ✅ ${passedTests.length} tests passed`);
      }
    }
    
    // Display vulnerabilities
    if (report.vulnerabilities.length > 0) {
      console.log('\n🚨 Security Vulnerabilities');
      console.log('============================');
      
      for (const vuln of report.vulnerabilities) {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[vuln.severity] || '⚪';
        
        console.log(`\n${severityIcon} ${vuln.severity.toUpperCase()}: ${vuln.testName}`);
        console.log(`   Category: ${vuln.category}`);
        console.log(`   Details: ${vuln.details}`);
        
        if (vuln.recommendations && vuln.recommendations.length > 0) {
          console.log(`   Recommendations:`);
          vuln.recommendations.forEach(rec => console.log(`     - ${rec}`));
        }
      }
    }
    
    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Security Recommendations');
      console.log('============================');
      
      for (const recommendation of report.recommendations) {
        console.log(`• ${recommendation}`);
      }
    }
    
    // Save detailed report to file
    const reportPath = path.join(__dirname, 'security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate HTML report
    await generateHtmlReport(report);
    
    // Exit with appropriate code
    const hasVulnerabilities = report.summary.vulnerabilities > 0;
    const hasCriticalIssues = report.summary.criticalIssues > 0;
    
    if (hasCriticalIssues) {
      console.log('\n🔴 CRITICAL SECURITY ISSUES FOUND - IMMEDIATE ACTION REQUIRED');
      process.exit(1);
    } else if (hasVulnerabilities) {
      console.log('\n🟡 Security vulnerabilities found - review and address');
      process.exit(1);
    } else {
      console.log('\n✅ All security tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Security test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function generateHtmlReport(report) {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ResourceFlow Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .critical { color: #dc3545; background-color: #f8d7da; }
        .high { color: #fd7e14; background-color: #fff3cd; }
        .medium { color: #ffc107; background-color: #fff3cd; }
        .low { color: #28a745; background-color: #d4edda; }
        .test-category { margin-bottom: 30px; }
        .test-category h3 { background: #007bff; color: white; padding: 10px; margin: 0; border-radius: 4px 4px 0 0; }
        .test-list { border: 1px solid #ddd; border-top: none; }
        .test-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .test-item:last-child { border-bottom: none; }
        .test-passed { background-color: #d4edda; }
        .test-failed { background-color: #f8d7da; }
        .vulnerability { margin-bottom: 20px; padding: 15px; border-radius: 4px; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .recommendations ul { margin: 10px 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 ResourceFlow Security Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="number passed">${report.summary.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number failed">${report.summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Vulnerabilities</h3>
                <div class="number failed">${report.summary.vulnerabilities}</div>
            </div>
        </div>
        
        ${generateTestCategoriesHtml(report.testResults)}
        
        ${report.vulnerabilities.length > 0 ? generateVulnerabilitiesHtml(report.vulnerabilities) : ''}
        
        <div class="recommendations">
            <h3>💡 Security Recommendations</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>
  `;
  
  const htmlPath = path.join(__dirname, 'security-report.html');
  await fs.writeFile(htmlPath, htmlTemplate);
  console.log(`📄 HTML report saved to: ${htmlPath}`);
}

function generateTestCategoriesHtml(testResults) {
  const categories = [...new Set(testResults.map(t => t.category))];
  
  return categories.map(category => {
    const categoryTests = testResults.filter(t => t.category === category);
    const testItemsHtml = categoryTests.map(test => `
      <div class="test-item ${test.passed ? 'test-passed' : 'test-failed'}">
        <span>${test.passed ? '✅' : '❌'} ${test.testName}</span>
        <span>${test.details}</span>
      </div>
    `).join('');
    
    return `
      <div class="test-category">
        <h3>${category.toUpperCase()}</h3>
        <div class="test-list">
          ${testItemsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function generateVulnerabilitiesHtml(vulnerabilities) {
  const vulnHtml = vulnerabilities.map(vuln => `
    <div class="vulnerability ${vuln.severity}">
      <h4>${vuln.severity.toUpperCase()}: ${vuln.testName}</h4>
      <p><strong>Category:</strong> ${vuln.category}</p>
      <p><strong>Details:</strong> ${vuln.details}</p>
      ${vuln.recommendations && vuln.recommendations.length > 0 ? 
        `<p><strong>Recommendations:</strong></p><ul>${vuln.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>` : 
        ''
      }
    </div>
  `).join('');
  
  return `
    <div>
      <h3>🚨 Security Vulnerabilities</h3>
      ${vulnHtml}
    </div>
  `;
}

// Run the security tests
if (require.main === module) {
  runSecurityTests();
}

module.exports = { runSecurityTests };
