// Complete Authentication Flow Test
// Tests the entire authentication flow that the frontend uses

import fetch from 'node-fetch';

const BASE_URL = 'https://resourcio.vercel.app';
const TEST_CREDENTIALS = {
  email: 'admin@resourceflow.com',
  password: 'admin123',
  rememberMe: false
};

class AuthFlowTester {
  constructor() {
    this.tokens = null;
    this.user = null;
  }

  async makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
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

  async testStep(stepName, testFunction) {
    try {
      console.log(`\n🧪 ${stepName}`);
      const result = await testFunction();
      console.log(`✅ ${stepName} - SUCCESS`);
      return result;
    } catch (error) {
      console.log(`❌ ${stepName} - FAILED: ${error.message}`);
      throw error;
    }
  }

  async runCompleteAuthFlow() {
    console.log('🚀 Starting Complete Authentication Flow Test');
    console.log('=' .repeat(60));

    try {
      // Step 1: Login
      await this.testStep('Step 1: User Login', async () => {
        const response = await this.makeRequest('/api/login-enterprise-simple', 'POST', TEST_CREDENTIALS);
        
        if (response.status !== 200) {
          throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(response.data)}`);
        }

        if (!response.data.user || !response.data.tokens) {
          throw new Error('Login response missing user or tokens');
        }

        this.tokens = response.data.tokens;
        this.user = response.data.user;

        console.log(`   📋 User ID: ${this.user.id}`);
        console.log(`   📋 Email: ${this.user.email}`);
        console.log(`   📋 Roles: ${this.user.roles.map(r => r.role).join(', ')}`);
        console.log(`   📋 Permissions: ${this.user.permissions.length} permissions`);
        console.log(`   📋 Access Token: ${this.tokens.accessToken.substring(0, 50)}...`);
        console.log(`   📋 Refresh Token: ${this.tokens.refreshToken.substring(0, 50)}...`);

        return response.data;
      });

      // Step 2: Verify token with /api/me
      await this.testStep('Step 2: Verify Token with /api/me', async () => {
        const response = await this.makeRequest('/api/me', 'GET', null, {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        });

        if (response.status !== 200) {
          throw new Error(`Token verification failed with status ${response.status}: ${JSON.stringify(response.data)}`);
        }

        if (!response.data.user) {
          throw new Error('Token verification response missing user data');
        }

        console.log(`   📋 Verified User ID: ${response.data.user.id}`);
        console.log(`   📋 Verified Email: ${response.data.user.email}`);

        return response.data;
      });

      // Step 3: Test token refresh
      await this.testStep('Step 3: Token Refresh', async () => {
        const response = await this.makeRequest('/api/refresh', 'POST', {
          refreshToken: this.tokens.refreshToken
        });

        if (response.status !== 200) {
          throw new Error(`Token refresh failed with status ${response.status}: ${JSON.stringify(response.data)}`);
        }

        if (!response.data.tokens) {
          throw new Error('Token refresh response missing new tokens');
        }

        const oldAccessToken = this.tokens.accessToken;
        this.tokens = response.data.tokens;

        console.log(`   📋 New Access Token: ${this.tokens.accessToken.substring(0, 50)}...`);
        console.log(`   📋 New Refresh Token: ${this.tokens.refreshToken.substring(0, 50)}...`);
        console.log(`   📋 Token Changed: ${oldAccessToken !== this.tokens.accessToken ? 'Yes' : 'No'}`);

        return response.data;
      });

      // Step 4: Verify new token works
      await this.testStep('Step 4: Verify New Token Works', async () => {
        const response = await this.makeRequest('/api/me', 'GET', null, {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        });

        if (response.status !== 200) {
          throw new Error(`New token verification failed with status ${response.status}: ${JSON.stringify(response.data)}`);
        }

        console.log(`   📋 New Token Verified Successfully`);

        return response.data;
      });

      // Step 5: Logout
      await this.testStep('Step 5: User Logout', async () => {
        const response = await this.makeRequest('/api/logout', 'POST', null, {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        });

        if (response.status !== 200) {
          throw new Error(`Logout failed with status ${response.status}: ${JSON.stringify(response.data)}`);
        }

        console.log(`   📋 Logout Message: ${response.data.message}`);

        return response.data;
      });

      // Step 6: Verify token is invalidated (optional - depends on implementation)
      await this.testStep('Step 6: Verify Token After Logout (Optional)', async () => {
        const response = await this.makeRequest('/api/me', 'GET', null, {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        });

        // This might still work since we don't have token blacklisting yet
        // But we'll log the result for information
        console.log(`   📋 Token Status After Logout: ${response.status === 200 ? 'Still Valid' : 'Invalidated'}`);
        console.log(`   📋 Note: Token blacklisting not implemented yet, so token may still be valid`);

        return response.data;
      });

      console.log('\n🎉 Complete Authentication Flow Test - SUCCESS!');
      console.log('=' .repeat(60));
      console.log('✅ All authentication endpoints are working correctly');
      console.log('✅ Login flow works end-to-end');
      console.log('✅ Token verification works');
      console.log('✅ Token refresh works');
      console.log('✅ Logout works');
      console.log('✅ No 404 errors in authentication flow');
      console.log('\n🚀 The application should now load properly after authentication!');

    } catch (error) {
      console.log('\n💥 Authentication Flow Test - FAILED!');
      console.log('=' .repeat(60));
      console.error('❌ Error:', error.message);
      console.log('\n🔍 This indicates there are still issues with the authentication flow.');
      throw error;
    }
  }

  async testErrorScenarios() {
    console.log('\n🔍 Testing Error Scenarios');
    console.log('-' .repeat(40));

    // Test invalid credentials
    try {
      const response = await this.makeRequest('/api/login-enterprise-simple', 'POST', {
        email: 'invalid@example.com',
        password: 'wrongpassword',
        rememberMe: false
      });
      console.log(`✅ Invalid credentials test: ${response.status} ${response.data.message}`);
    } catch (error) {
      console.log(`❌ Invalid credentials test failed: ${error.message}`);
    }

    // Test invalid token
    try {
      const response = await this.makeRequest('/api/me', 'GET', null, {
        'Authorization': 'Bearer invalid-token'
      });
      console.log(`✅ Invalid token test: ${response.status} ${response.data.message}`);
    } catch (error) {
      console.log(`❌ Invalid token test failed: ${error.message}`);
    }

    // Test invalid refresh token
    try {
      const response = await this.makeRequest('/api/refresh', 'POST', {
        refreshToken: 'invalid-refresh-token'
      });
      console.log(`✅ Invalid refresh token test: ${response.status} ${response.data.message}`);
    } catch (error) {
      console.log(`❌ Invalid refresh token test failed: ${error.message}`);
    }
  }
}

// Run the complete test
const tester = new AuthFlowTester();

async function runAllTests() {
  try {
    await tester.runCompleteAuthFlow();
    await tester.testErrorScenarios();
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
