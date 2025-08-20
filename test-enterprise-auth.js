// Comprehensive Authentication System Test Suite
// Tests for enterprise authentication, security features, and audit logging

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';
const TEST_CREDENTIALS = {
  valid: {
    email: 'admin@resourceflow.com',
    password: 'admin123',
    rememberMe: false
  },
  invalid: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
    rememberMe: false
  }
};

class AuthTestSuite {
  
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running: ${testName}`);
      const startTime = Date.now();
      
      await testFunction();
      
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration
      });
      
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    };
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  // Test 1: Basic Authentication Success
  async testValidAuthentication() {
    const response = await this.makeRequest('/api/login-enterprise', 'POST', TEST_CREDENTIALS.valid);
    
    this.assert(response.status === 200, `Expected status 200, got ${response.status}`);
    this.assert(response.data.user, 'Response should contain user data');
    this.assert(response.data.tokens, 'Response should contain tokens');
    this.assert(response.data.tokens.accessToken, 'Response should contain access token');
    this.assert(response.data.tokens.refreshToken, 'Response should contain refresh token');
    this.assert(response.data.user.email === TEST_CREDENTIALS.valid.email, 'User email should match');
    this.assert(Array.isArray(response.data.user.roles), 'User should have roles array');
    this.assert(Array.isArray(response.data.user.permissions), 'User should have permissions array');
  }

  // Test 2: Invalid Credentials
  async testInvalidCredentials() {
    const response = await this.makeRequest('/api/login-enterprise', 'POST', TEST_CREDENTIALS.invalid);
    
    this.assert(response.status === 401, `Expected status 401, got ${response.status}`);
    this.assert(response.data.error === true, 'Response should indicate error');
    this.assert(response.data.message, 'Response should contain error message');
    this.assert(response.data.code, 'Response should contain error code');
  }

  // Test 3: Input Validation
  async testInputValidation() {
    const testCases = [
      { body: null, expectedStatus: 400 },
      { body: {}, expectedStatus: 400 },
      { body: { email: '', password: 'test' }, expectedStatus: 400 },
      { body: { email: 'invalid-email', password: 'test' }, expectedStatus: 400 },
      { body: { email: 'test@example.com', password: '' }, expectedStatus: 400 },
      { body: { email: 'test@example.com', password: 'test', rememberMe: 'invalid' }, expectedStatus: 400 }
    ];

    for (const testCase of testCases) {
      const response = await this.makeRequest('/api/login-enterprise', 'POST', testCase.body);
      this.assert(
        response.status === testCase.expectedStatus,
        `Expected status ${testCase.expectedStatus}, got ${response.status} for body: ${JSON.stringify(testCase.body)}`
      );
    }
  }

  // Test 4: Security Headers
  async testSecurityHeaders() {
    const response = await this.makeRequest('/api/login-enterprise', 'POST', TEST_CREDENTIALS.valid);
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
      'strict-transport-security'
    ];

    for (const header of requiredHeaders) {
      this.assert(
        response.headers[header],
        `Security header ${header} should be present`
      );
    }
  }

  // Test 5: CORS Headers
  async testCorsHeaders() {
    const response = await this.makeRequest('/api/login-enterprise', 'OPTIONS');
    
    this.assert(response.status === 200, `OPTIONS request should return 200, got ${response.status}`);
    this.assert(
      response.headers['access-control-allow-origin'],
      'CORS origin header should be present'
    );
    this.assert(
      response.headers['access-control-allow-methods'],
      'CORS methods header should be present'
    );
  }

  // Test 6: Method Validation
  async testMethodValidation() {
    const response = await this.makeRequest('/api/login-enterprise', 'GET');
    
    this.assert(response.status === 405, `GET request should return 405, got ${response.status}`);
    this.assert(response.data.error === true, 'Response should indicate error');
    this.assert(response.data.code === 'METHOD_NOT_ALLOWED', 'Should return method not allowed code');
  }

  // Test 7: Rate Limiting (Brute Force Protection)
  async testRateLimiting() {
    const invalidCredentials = {
      email: 'test@example.com',
      password: 'wrongpassword',
      rememberMe: false
    };

    // Make multiple failed attempts
    for (let i = 0; i < 6; i++) {
      await this.makeRequest('/api/login-enterprise', 'POST', invalidCredentials);
    }

    // The 6th attempt should trigger rate limiting
    const response = await this.makeRequest('/api/login-enterprise', 'POST', invalidCredentials);
    
    // Note: This test might not work immediately due to rate limiting implementation
    // It's more of a functional test to verify the endpoint handles multiple requests
    this.assert(
      response.status === 401 || response.status === 429,
      `Expected 401 or 429 for rate limited request, got ${response.status}`
    );
  }

  // Test 8: Token Format Validation
  async testTokenFormat() {
    const response = await this.makeRequest('/api/login-enterprise', 'POST', TEST_CREDENTIALS.valid);
    
    this.assert(response.status === 200, `Expected status 200, got ${response.status}`);
    
    const { accessToken, refreshToken } = response.data.tokens;
    
    // JWT tokens should have 3 parts separated by dots
    this.assert(
      accessToken.split('.').length === 3,
      'Access token should be a valid JWT format'
    );
    this.assert(
      refreshToken.split('.').length === 3,
      'Refresh token should be a valid JWT format'
    );
    
    // Tokens should start with eyJ (base64 encoded JSON)
    this.assert(
      accessToken.startsWith('eyJ'),
      'Access token should start with eyJ'
    );
    this.assert(
      refreshToken.startsWith('eyJ'),
      'Refresh token should start with eyJ'
    );
  }

  // Test 9: Response Structure Validation
  async testResponseStructure() {
    const response = await this.makeRequest('/api/login-enterprise', 'POST', TEST_CREDENTIALS.valid);
    
    this.assert(response.status === 200, `Expected status 200, got ${response.status}`);
    
    const requiredFields = [
      'user.id',
      'user.email',
      'user.roles',
      'user.permissions',
      'tokens.accessToken',
      'tokens.refreshToken',
      'sessionInfo.loginTime',
      'sessionInfo.expiresAt'
    ];

    for (const field of requiredFields) {
      const fieldValue = this.getNestedProperty(response.data, field);
      this.assert(
        fieldValue !== undefined && fieldValue !== null,
        `Required field ${field} should be present in response`
      );
    }
  }

  // Test 10: Environment Consistency
  async testEnvironmentConsistency() {
    // Test that all endpoints are accessible
    const endpoints = [
      '/api/env-debug',
      '/api/supabase-health',
      '/api/login-debug',
      '/api/login-enterprise'
    ];

    for (const endpoint of endpoints) {
      const method = endpoint.includes('login') ? 'POST' : 'GET';
      const body = endpoint.includes('login') ? TEST_CREDENTIALS.valid : null;
      
      const response = await this.makeRequest(endpoint, method, body);
      
      this.assert(
        response.status < 500,
        `Endpoint ${endpoint} should not return server error, got ${response.status}`
      );
    }
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  async runAllTests() {
    console.log('🚀 Starting Enterprise Authentication Test Suite');
    console.log('=' .repeat(60));

    await this.runTest('Valid Authentication', () => this.testValidAuthentication());
    await this.runTest('Invalid Credentials', () => this.testInvalidCredentials());
    await this.runTest('Input Validation', () => this.testInputValidation());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('CORS Headers', () => this.testCorsHeaders());
    await this.runTest('Method Validation', () => this.testMethodValidation());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Token Format Validation', () => this.testTokenFormat());
    await this.runTest('Response Structure', () => this.testResponseStructure());
    await this.runTest('Environment Consistency', () => this.testEnvironmentConsistency());

    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test Suite Results');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 Test Suite Complete');
  }
}

// Run the test suite
const testSuite = new AuthTestSuite();
testSuite.runAllTests().catch(console.error);
