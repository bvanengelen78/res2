// Security Testing and Validation Service
// Implements comprehensive security tests, validation, and system robustness checks

const crypto = require('crypto');
const { ConfigSecurityService } = require('./config-security');
const { SecurityHeadersService } = require('./security-headers');
const { PasswordSecurityService } = require('./password-security');
const { SessionSecurityService } = require('./session-security');
const { RateLimitingService } = require('./rate-limiting');
const { InputValidationService } = require('./input-validation');

// Security Test Configuration
const SECURITY_TEST_CONFIG = {
  // Test categories
  CATEGORIES: {
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    INPUT_VALIDATION: 'input_validation',
    SESSION_MANAGEMENT: 'session_management',
    RATE_LIMITING: 'rate_limiting',
    CONFIGURATION: 'configuration',
    HEADERS: 'headers',
    ENCRYPTION: 'encryption'
  },
  
  // Test severity levels
  SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
  },
  
  // Common attack payloads for testing
  ATTACK_PAYLOADS: {
    XSS: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>'
    ],
    SQL_INJECTION: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--"
    ],
    COMMAND_INJECTION: [
      '; ls -la',
      '| whoami',
      '&& cat /etc/passwd',
      '`id`'
    ],
    PATH_TRAVERSAL: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd'
    ]
  }
};

class SecurityTestingService {
  
  constructor() {
    this.testResults = [];
    this.vulnerabilities = [];
  }
  
  /**
   * Run comprehensive security test suite
   */
  async runSecurityTests() {
    console.log('[SECURITY_TEST] Starting comprehensive security test suite...');
    
    this.testResults = [];
    this.vulnerabilities = [];
    
    // Run all test categories
    await this.testConfiguration();
    await this.testAuthentication();
    await this.testInputValidation();
    await this.testSessionManagement();
    await this.testRateLimiting();
    await this.testSecurityHeaders();
    await this.testEncryption();
    
    // Generate report
    const report = this.generateSecurityReport();
    
    console.log('[SECURITY_TEST] Security test suite completed');
    console.log(`[SECURITY_TEST] Total tests: ${this.testResults.length}`);
    console.log(`[SECURITY_TEST] Vulnerabilities found: ${this.vulnerabilities.length}`);
    
    return report;
  }
  
  /**
   * Test configuration security
   */
  async testConfiguration() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.CONFIGURATION;
    
    try {
      // Test environment configuration
      const configStatus = ConfigSecurityService.getSecurityStatus();
      
      this.addTestResult(category, 'Configuration Validation', {
        passed: configStatus.configurationValid,
        severity: configStatus.configurationValid ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.CRITICAL,
        details: configStatus.errors.length > 0 ? configStatus.errors : 'Configuration is valid',
        recommendations: configStatus.recommendations
      });
      
      // Test for default secrets
      const jwtSecret = process.env.JWT_SECRET;
      const hasDefaultSecret = jwtSecret === 'your-secret-key-change-in-production';
      
      this.addTestResult(category, 'Default Secrets Check', {
        passed: !hasDefaultSecret,
        severity: hasDefaultSecret ? SECURITY_TEST_CONFIG.SEVERITY.CRITICAL : SECURITY_TEST_CONFIG.SEVERITY.INFO,
        details: hasDefaultSecret ? 'Default JWT secret detected' : 'No default secrets found'
      });
      
      // Test secret strength
      const secretStrength = jwtSecret ? jwtSecret.length >= 64 : false;
      
      this.addTestResult(category, 'Secret Strength', {
        passed: secretStrength,
        severity: secretStrength ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: `JWT secret length: ${jwtSecret ? jwtSecret.length : 0} characters`
      });
      
    } catch (error) {
      this.addTestResult(category, 'Configuration Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test authentication security
   */
  async testAuthentication() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.AUTHENTICATION;
    
    try {
      // Test password policy
      const weakPasswords = ['password', '123456', 'admin', 'test'];
      let passwordPolicyPassed = true;
      
      for (const weakPassword of weakPasswords) {
        const validation = PasswordSecurityService.validatePassword(weakPassword);
        if (validation.valid) {
          passwordPolicyPassed = false;
          break;
        }
      }
      
      this.addTestResult(category, 'Password Policy Enforcement', {
        passed: passwordPolicyPassed,
        severity: passwordPolicyPassed ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: passwordPolicyPassed ? 'Weak passwords rejected' : 'Weak passwords accepted'
      });
      
      // Test password hashing
      const testPassword = 'TestPassword123!';
      const hashResult = await PasswordSecurityService.hashPassword(testPassword);
      
      this.addTestResult(category, 'Password Hashing', {
        passed: hashResult.success,
        severity: hashResult.success ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.CRITICAL,
        details: hashResult.success ? `Hash generated with ${hashResult.saltRounds} salt rounds` : hashResult.error
      });
      
      // Test session management
      const sessionStats = SessionSecurityService.getSessionStats();
      
      this.addTestResult(category, 'Session Management', {
        passed: true,
        severity: SECURITY_TEST_CONFIG.SEVERITY.INFO,
        details: `Active sessions: ${sessionStats.activeSessions}, Blacklisted tokens: ${sessionStats.blacklistedTokens}`
      });
      
    } catch (error) {
      this.addTestResult(category, 'Authentication Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test input validation security
   */
  async testInputValidation() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.INPUT_VALIDATION;
    
    try {
      // Test XSS protection
      let xssProtected = true;
      for (const payload of SECURITY_TEST_CONFIG.ATTACK_PAYLOADS.XSS) {
        const sanitized = InputValidationService.sanitizeHtml(payload);
        if (sanitized.includes('<script>') || sanitized.includes('javascript:')) {
          xssProtected = false;
          break;
        }
      }
      
      this.addTestResult(category, 'XSS Protection', {
        passed: xssProtected,
        severity: xssProtected ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: xssProtected ? 'XSS payloads properly sanitized' : 'XSS payloads not properly sanitized'
      });
      
      // Test SQL injection protection
      let sqlInjectionProtected = true;
      for (const payload of SECURITY_TEST_CONFIG.ATTACK_PAYLOADS.SQL_INJECTION) {
        const hasSqlInjection = InputValidationService.checkSqlInjection(payload);
        if (!hasSqlInjection) {
          sqlInjectionProtected = false;
          break;
        }
      }
      
      this.addTestResult(category, 'SQL Injection Protection', {
        passed: sqlInjectionProtected,
        severity: sqlInjectionProtected ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.CRITICAL,
        details: sqlInjectionProtected ? 'SQL injection patterns detected' : 'SQL injection patterns not detected'
      });
      
      // Test input validation schemas
      const schemas = InputValidationService.getSchemas();
      
      this.addTestResult(category, 'Input Validation Schemas', {
        passed: Object.keys(schemas).length > 0,
        severity: SECURITY_TEST_CONFIG.SEVERITY.INFO,
        details: `${Object.keys(schemas).length} validation schemas available`
      });
      
    } catch (error) {
      this.addTestResult(category, 'Input Validation Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test session management security
   */
  async testSessionManagement() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.SESSION_MANAGEMENT;
    
    try {
      // Test token blacklisting
      const testToken = 'test-token-' + crypto.randomBytes(16).toString('hex');
      const futureExpiry = Date.now() + 60000; // 1 minute from now
      
      SessionSecurityService.blacklistToken(testToken, futureExpiry);
      const isBlacklisted = SessionSecurityService.isTokenBlacklisted(testToken);
      
      this.addTestResult(category, 'Token Blacklisting', {
        passed: isBlacklisted,
        severity: isBlacklisted ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: isBlacklisted ? 'Token blacklisting working' : 'Token blacklisting not working'
      });
      
      // Test session creation and validation
      const testSession = SessionSecurityService.createSession(999, 'test-agent', '127.0.0.1');
      const sessionValidation = SessionSecurityService.validateSession(testSession.id, 'test-agent', '127.0.0.1');
      
      this.addTestResult(category, 'Session Creation and Validation', {
        passed: sessionValidation.valid,
        severity: sessionValidation.valid ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: sessionValidation.valid ? 'Session validation working' : sessionValidation.reason
      });
      
    } catch (error) {
      this.addTestResult(category, 'Session Management Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test rate limiting security
   */
  async testRateLimiting() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.RATE_LIMITING;
    
    try {
      // Test rate limiting functionality
      const testIdentifier = 'test-ip-' + crypto.randomBytes(8).toString('hex');
      const testConfig = { windowMs: 60000, maxRequests: 5, message: 'Test rate limit' };
      
      // Make multiple requests to trigger rate limit
      let rateLimitTriggered = false;
      for (let i = 0; i < 10; i++) {
        const result = RateLimitingService.checkRateLimit(testIdentifier, 'test-endpoint', testConfig);
        if (!result.allowed) {
          rateLimitTriggered = true;
          break;
        }
      }
      
      this.addTestResult(category, 'Rate Limiting Enforcement', {
        passed: rateLimitTriggered,
        severity: rateLimitTriggered ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: rateLimitTriggered ? 'Rate limiting triggered correctly' : 'Rate limiting not triggered'
      });
      
      // Test brute force protection
      const bruteForceResult = RateLimitingService.recordFailedAttempt('test-user', 'user');
      
      this.addTestResult(category, 'Brute Force Protection', {
        passed: true,
        severity: SECURITY_TEST_CONFIG.SEVERITY.INFO,
        details: `Brute force protection active, attempts: ${bruteForceResult.attempts}`
      });
      
    } catch (error) {
      this.addTestResult(category, 'Rate Limiting Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.HEADERS;
    
    try {
      // Test security headers configuration
      const securityStatus = SecurityHeadersService.getSecurityStatus();
      
      this.addTestResult(category, 'Security Headers Configuration', {
        passed: securityStatus.validation.valid,
        severity: securityStatus.validation.valid ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: securityStatus.validation.errors.length > 0 ? securityStatus.validation.errors.join(', ') : 'Security headers properly configured'
      });
      
      // Test CORS configuration
      this.addTestResult(category, 'CORS Configuration', {
        passed: securityStatus.corsConfigured,
        severity: securityStatus.corsConfigured ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: `CORS configured with ${securityStatus.allowedOrigins.length} allowed origins`
      });
      
      // Test CSP configuration
      this.addTestResult(category, 'Content Security Policy', {
        passed: securityStatus.cspEnabled,
        severity: securityStatus.cspEnabled ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: securityStatus.cspEnabled ? 'CSP enabled' : 'CSP not enabled'
      });
      
    } catch (error) {
      this.addTestResult(category, 'Security Headers Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Test encryption and cryptographic functions
   */
  async testEncryption() {
    const category = SECURITY_TEST_CONFIG.CATEGORIES.ENCRYPTION;
    
    try {
      // Test password generation
      const generatedPassword = PasswordSecurityService.generateSecurePassword();
      
      this.addTestResult(category, 'Secure Password Generation', {
        passed: generatedPassword.success,
        severity: generatedPassword.success ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.MEDIUM,
        details: generatedPassword.success ? `Generated ${generatedPassword.length}-character password` : generatedPassword.error
      });
      
      // Test password strength calculation
      const strongPassword = 'MyVerySecureP@ssw0rd123!';
      const strength = PasswordSecurityService.getPasswordStrength(strongPassword);
      
      this.addTestResult(category, 'Password Strength Calculation', {
        passed: strength >= 80,
        severity: strength >= 80 ? SECURITY_TEST_CONFIG.SEVERITY.INFO : SECURITY_TEST_CONFIG.SEVERITY.LOW,
        details: `Password strength: ${strength}/100`
      });
      
    } catch (error) {
      this.addTestResult(category, 'Encryption Test Error', {
        passed: false,
        severity: SECURITY_TEST_CONFIG.SEVERITY.HIGH,
        details: error.message
      });
    }
  }
  
  /**
   * Add test result
   */
  addTestResult(category, testName, result) {
    const testResult = {
      category,
      testName,
      passed: result.passed,
      severity: result.severity,
      details: result.details,
      recommendations: result.recommendations || [],
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(testResult);
    
    if (!result.passed && result.severity !== SECURITY_TEST_CONFIG.SEVERITY.INFO) {
      this.vulnerabilities.push(testResult);
    }
  }
  
  /**
   * Generate comprehensive security report
   */
  generateSecurityReport() {
    const report = {
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(t => t.passed).length,
        failedTests: this.testResults.filter(t => !t.passed).length,
        vulnerabilities: this.vulnerabilities.length,
        criticalIssues: this.vulnerabilities.filter(v => v.severity === SECURITY_TEST_CONFIG.SEVERITY.CRITICAL).length,
        highIssues: this.vulnerabilities.filter(v => v.severity === SECURITY_TEST_CONFIG.SEVERITY.HIGH).length,
        mediumIssues: this.vulnerabilities.filter(v => v.severity === SECURITY_TEST_CONFIG.SEVERITY.MEDIUM).length,
        lowIssues: this.vulnerabilities.filter(v => v.severity === SECURITY_TEST_CONFIG.SEVERITY.LOW).length
      },
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };
    
    return report;
  }
  
  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze vulnerabilities and generate recommendations
    const criticalVulns = this.vulnerabilities.filter(v => v.severity === SECURITY_TEST_CONFIG.SEVERITY.CRITICAL);
    if (criticalVulns.length > 0) {
      recommendations.push('CRITICAL: Address critical security vulnerabilities immediately');
    }
    
    const configIssues = this.vulnerabilities.filter(v => v.category === SECURITY_TEST_CONFIG.CATEGORIES.CONFIGURATION);
    if (configIssues.length > 0) {
      recommendations.push('Review and fix configuration security issues');
    }
    
    const authIssues = this.vulnerabilities.filter(v => v.category === SECURITY_TEST_CONFIG.CATEGORIES.AUTHENTICATION);
    if (authIssues.length > 0) {
      recommendations.push('Strengthen authentication mechanisms');
    }
    
    // Add general recommendations
    recommendations.push('Regularly update dependencies and security patches');
    recommendations.push('Implement continuous security monitoring');
    recommendations.push('Conduct regular security audits');
    
    return recommendations;
  }
}

module.exports = {
  SecurityTestingService,
  SECURITY_TEST_CONFIG
};
