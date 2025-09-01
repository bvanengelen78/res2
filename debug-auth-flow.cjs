const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function debugAuthFlow() {
  console.log('🔍 Debugging Authentication Flow');
  console.log('=====================================');

  try {
    // Step 1: Login to get token
    console.log('\n1. 🔐 Login to get authentication token...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@swisssense.nl',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token length:', loginData.token?.length || 'No token');
    console.log('Token start:', loginData.token?.substring(0, 50) + '...' || 'No token');

    const token = loginData.token;
    if (!token) {
      console.error('❌ No token received from login');
      return;
    }

    // Step 2: Test token with user-profiles endpoint
    console.log('\n2. 🧪 Testing token with /api/rbac/user-profiles...');
    const userProfilesResponse = await fetch(`${BASE_URL}/api/rbac/user-profiles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response status:', userProfilesResponse.status, userProfilesResponse.statusText);
    console.log('Response headers:', Object.fromEntries(userProfilesResponse.headers.entries()));

    if (!userProfilesResponse.ok) {
      const errorText = await userProfilesResponse.text();
      console.error('❌ User profiles request failed');
      console.error('Error response:', errorText);
      
      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
      } catch (e) {
        console.error('Could not parse error as JSON');
      }
    } else {
      const userData = await userProfilesResponse.json();
      console.log('✅ User profiles request successful');
      console.log('Number of users returned:', userData.data?.length || 'No data array');
      console.log('Response structure:', Object.keys(userData));
    }

    // Step 3: Test token validation directly
    console.log('\n3. 🔍 Testing token validation with Supabase...');
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      console.log('SUPABASE_URL:', !!supabaseUrl);
      console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Testing token validation...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Token validation failed:', error.message);
      console.error('Error details:', error);
    } else if (!user) {
      console.error('❌ Token validation returned no user');
    } else {
      console.log('✅ Token validation successful');
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      console.log('User metadata keys:', Object.keys(user.user_metadata || {}));
    }

    // Step 4: Test user profile lookup
    console.log('\n4. 👤 Testing user profile lookup...');
    if (user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ User profile lookup failed:', profileError.message);
        console.error('Profile error details:', profileError);
      } else if (!userProfile) {
        console.error('❌ No user profile found');
      } else {
        console.log('✅ User profile found');
        console.log('Profile ID:', userProfile.id);
        console.log('Profile email:', userProfile.email);
        console.log('Profile fields:', Object.keys(userProfile));
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugAuthFlow().catch(console.error);
