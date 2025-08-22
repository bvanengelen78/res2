// Comprehensive API Monitoring and Testing Strategy
// Prevents future API regressions and ensures reliability

const BASE_URL = 'https://resourcio.vercel.app';

// Critical API endpoints that must always work
const CRITICAL_ENDPOINTS = [
  // Authentication (highest priority)
  { path: '/api/login', method: 'POST', critical: true, category: 'auth' },
  { path: '/api/me', method: 'GET', critical: true, category: 'auth' },
  { path: '/api/logout', method: 'POST', critical: true, category: 'auth' },
  
  // User management (high priority)
  { path: '/api/rbac-users', method: 'GET', critical: true, category: 'rbac' },
  { path: '/api/ping?action=reset-password&userId=2', method: 'POST', critical: true, category: 'password' },
  
  // Core functionality (medium priority)
  { path: '/api/resources', method: 'GET', critical: true, category: 'resources' },
  { path: '/api/projects', method: 'GET', critical: true, category: 'projects' },
  { path: '/api/dashboard/kpis', method: 'GET', critical: true, category: 'dashboard' },
  
  // Health checks (low priority but important)
  { path: '/api/ping', method: 'GET', critical: false, category: 'health' },
  { path: '/api/health', method: 'GET', critical: false, category: 'health' },
];

// Test scenarios for different user types
const TEST_SCENARIOS = {
  admin: {
    email: 'admin@resourceflow.com',
    expectedPermissions: ['user_management', 'role_management', 'system_admin'],
    criticalEndpoints: [
      '/api/rbac-users',
      '/api/ping?action=reset-password&userId=2'
    ]
  },
  regular_user: {
    email: 'rob.beckers@swisssense.nl',
    expectedPermissions: ['time_logging', 'dashboard'],
    criticalEndpoints: [
      '/api/me',
      '/api/dashboard/kpis'
    ]
  }
};

/**
 * Comprehensive API Health Monitor
 * Runs continuous checks and alerts on failures
 */
class APIHealthMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: { status: 'unknown', score: 0 },
      categories: {},
      failures: [],
      recommendations: []
    };
  }

  async runFullHealthCheck() {
    console.log('🔍 STARTING COMPREHENSIVE API HEALTH CHECK');
    console.log('=' .repeat(70));

    // Test each critical endpoint
    for (const endpoint of CRITICAL_ENDPOINTS) {
      await this.testEndpoint(endpoint);
    }

    // Generate overall health score
    this.calculateHealthScore();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Display results
    this.displayResults();
    
    return this.results;
  }

  async testEndpoint(endpoint) {
    const category = endpoint.category;
    if (!this.results.categories[category]) {
      this.results.categories[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        endpoints: []
      };
    }

    try {
      const startTime = Date.now();
      
      // For GET requests, test directly
      if (endpoint.method === 'GET') {
        const response = await fetch(`${BASE_URL}${endpoint.path}`);
        const responseTime = Date.now() - startTime;
        
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: response.status,
          responseTime,
          available: response.status !== 404,
          critical: endpoint.critical,
          category: endpoint.category
        };

        this.recordResult(result);
        return result;
      }

      // For POST requests, we can't test without auth, so check if endpoint exists
      if (endpoint.method === 'POST') {
        // Try OPTIONS request to see if endpoint exists
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: 'OPTIONS'
        });
        const responseTime = Date.now() - startTime;
        
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: response.status,
          responseTime,
          available: response.status !== 404,
          critical: endpoint.critical,
          category: endpoint.category,
          note: 'OPTIONS check only - POST requires authentication'
        };

        this.recordResult(result);
        return result;
      }

    } catch (error) {
      const result = {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'ERROR',
        responseTime: 0,
        available: false,
        critical: endpoint.critical,
        category: endpoint.category,
        error: error.message
      };

      this.recordResult(result);
      return result;
    }
  }

  recordResult(result) {
    const category = this.results.categories[result.category];
    category.total++;
    category.endpoints.push(result);

    if (result.available && result.status !== 'ERROR') {
      category.passed++;
      console.log(`   ✅ ${result.method} ${result.endpoint} - ${result.status} (${result.responseTime}ms)`);
    } else {
      category.failed++;
      if (result.critical) {
        this.results.failures.push(result);
      }
      console.log(`   ❌ ${result.method} ${result.endpoint} - ${result.status} ${result.error ? '(' + result.error + ')' : ''}`);
    }
  }

  calculateHealthScore() {
    let totalEndpoints = 0;
    let availableEndpoints = 0;
    let criticalFailures = 0;

    for (const [category, data] of Object.entries(this.results.categories)) {
      totalEndpoints += data.total;
      availableEndpoints += data.passed;
      
      // Critical failures have higher weight
      const categoryFailures = data.endpoints.filter(e => !e.available && e.critical).length;
      criticalFailures += categoryFailures;
    }

    // Calculate base score
    const baseScore = totalEndpoints > 0 ? (availableEndpoints / totalEndpoints) * 100 : 0;
    
    // Penalize critical failures heavily
    const criticalPenalty = criticalFailures * 20; // 20 points per critical failure
    
    const finalScore = Math.max(0, baseScore - criticalPenalty);
    
    this.results.overall = {
      status: finalScore >= 90 ? 'healthy' : finalScore >= 70 ? 'degraded' : 'critical',
      score: Math.round(finalScore),
      totalEndpoints,
      availableEndpoints,
      criticalFailures
    };
  }

  generateRecommendations() {
    const { overall, failures } = this.results;
    
    if (overall.criticalFailures > 0) {
      this.results.recommendations.push(
        `🚨 URGENT: ${overall.criticalFailures} critical endpoint(s) failing - immediate attention required`
      );
    }

    if (overall.score < 70) {
      this.results.recommendations.push(
        '⚠️ API health is below acceptable threshold - investigate failing endpoints'
      );
    }

    if (failures.length > 0) {
      this.results.recommendations.push(
        `🔧 Fix ${failures.length} failing endpoint(s): ${failures.map(f => f.endpoint).join(', ')}`
      );
    }

    // Category-specific recommendations
    for (const [category, data] of Object.entries(this.results.categories)) {
      if (data.failed > 0) {
        this.results.recommendations.push(
          `📋 ${category.toUpperCase()}: ${data.failed}/${data.total} endpoints failing`
        );
      }
    }

    if (this.results.recommendations.length === 0) {
      this.results.recommendations.push('✅ All systems operational - no immediate action required');
    }
  }

  displayResults() {
    console.log('\n🎯 API HEALTH SUMMARY');
    console.log('=' .repeat(70));
    console.log(`Overall Status: ${this.results.overall.status.toUpperCase()}`);
    console.log(`Health Score: ${this.results.overall.score}/100`);
    console.log(`Available Endpoints: ${this.results.overall.availableEndpoints}/${this.results.overall.totalEndpoints}`);
    console.log(`Critical Failures: ${this.results.overall.criticalFailures}`);

    console.log('\n📊 CATEGORY BREAKDOWN:');
    for (const [category, data] of Object.entries(this.results.categories)) {
      const percentage = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
      console.log(`   ${category.toUpperCase()}: ${data.passed}/${data.total} (${percentage}%)`);
    }

    console.log('\n💡 RECOMMENDATIONS:');
    this.results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    if (this.results.failures.length > 0) {
      console.log('\n🚨 CRITICAL FAILURES:');
      this.results.failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.method} ${failure.endpoint} - ${failure.status}`);
      });
    }
  }
}

/**
 * Monitoring Strategy Implementation
 */
const MonitoringStrategy = {
  // Run health checks on deployment
  async validateDeployment() {
    console.log('🚀 DEPLOYMENT VALIDATION');
    const monitor = new APIHealthMonitor();
    const results = await monitor.runFullHealthCheck();
    
    if (results.overall.criticalFailures > 0) {
      console.log('\n❌ DEPLOYMENT VALIDATION FAILED');
      console.log('Critical endpoints are not working - rollback recommended');
      return false;
    }
    
    console.log('\n✅ DEPLOYMENT VALIDATION PASSED');
    return true;
  },

  // Continuous monitoring (would be run periodically)
  async continuousMonitoring() {
    console.log('📊 CONTINUOUS MONITORING');
    const monitor = new APIHealthMonitor();
    return await monitor.runFullHealthCheck();
  },

  // Test specific functionality
  async testPasswordResetFlow() {
    console.log('🔐 TESTING PASSWORD RESET FLOW');
    
    try {
      // Test the temporary password reset endpoint
      const response = await fetch(`${BASE_URL}/api/ping?action=reset-password&userId=2`, {
        method: 'OPTIONS' // Can't test POST without auth
      });
      
      const available = response.status !== 404;
      console.log(`Password reset endpoint: ${available ? '✅ Available' : '❌ Not Found'}`);
      
      return available;
    } catch (error) {
      console.log(`Password reset endpoint: ❌ Error - ${error.message}`);
      return false;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIHealthMonitor, MonitoringStrategy, CRITICAL_ENDPOINTS };
}

// Run monitoring if called directly
if (require.main === module) {
  MonitoringStrategy.validateDeployment().then(success => {
    if (success) {
      console.log('\n🎉 API MONITORING COMPLETE - SYSTEM HEALTHY');
      process.exit(0);
    } else {
      console.log('\n🔥 API MONITORING COMPLETE - CRITICAL ISSUES DETECTED');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Monitoring failed:', error);
    process.exit(1);
  });
}
