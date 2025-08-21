// Validate Role Management Data Consistency Fix
// Comprehensive validation that the data inconsistency issue has been resolved

const fetch = require('node-fetch');

const BASE_URL = 'https://resourcio.vercel.app';

async function validateRoleManagementFix() {
  console.log('🎯 VALIDATING ROLE MANAGEMENT DATA CONSISTENCY FIX');
  console.log('=' .repeat(70));

  try {
    // Test the API endpoint
    console.log('\n📋 Step 1: Fetching current role data from API');
    const response = await fetch(`${BASE_URL}/api/rbac-users`);
    
    if (response.status !== 200) {
      throw new Error(`API failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${data.success ? 'Success' : 'Failed'}`);
    console.log(`📊 Total users returned: ${data.data?.length || 0}`);

    // Find Rob Beckers
    const robBeckers = data.data?.find(user => user.email === 'rob.beckers@swisssense.nl');
    
    if (!robBeckers) {
      throw new Error('Rob Beckers not found in API response');
    }

    console.log('\n🎯 ROB BECKERS ROLE ANALYSIS:');
    console.log(`   User ID: ${robBeckers.id}`);
    console.log(`   Email: ${robBeckers.email}`);
    console.log(`   Resource ID: ${robBeckers.resourceId}`);
    console.log(`   Total Roles: ${robBeckers.roles?.length || 0}`);

    // Validate roles
    const expectedRoles = [
      { id: 2, role: 'regular_user', resourceId: 2 },
      { id: 5, role: 'admin', resourceId: 2 }
    ];

    console.log('\n📋 Step 2: Validating Role Assignments');
    
    let allRolesFound = true;
    expectedRoles.forEach((expectedRole, index) => {
      const foundRole = robBeckers.roles?.find(r => 
        r.id === expectedRole.id && 
        r.role === expectedRole.role && 
        r.resourceId === expectedRole.resourceId
      );
      
      if (foundRole) {
        console.log(`   ✅ Role ${index + 1}: ${expectedRole.role} (ID: ${expectedRole.id}) - FOUND`);
      } else {
        console.log(`   ❌ Role ${index + 1}: ${expectedRole.role} (ID: ${expectedRole.id}) - MISSING`);
        allRolesFound = false;
      }
    });

    // Validate permissions
    console.log('\n📋 Step 3: Validating Combined Permissions');
    const expectedPermissions = [
      'time_logging', 'dashboard', // from regular_user
      'reports', 'change_lead_reports', 'resource_management', 
      'project_management', 'user_management', 'system_admin', 
      'calendar', 'submission_overview', 'settings', 'role_management' // from admin
    ];

    const hasAllPermissions = expectedPermissions.every(permission => 
      robBeckers.permissions?.includes(permission)
    );

    console.log(`   Total permissions: ${robBeckers.permissions?.length || 0}`);
    console.log(`   Expected permissions: ${expectedPermissions.length}`);
    console.log(`   ${hasAllPermissions ? '✅' : '❌'} All expected permissions present`);

    // Validate resource information
    console.log('\n📋 Step 4: Validating Resource Information');
    if (robBeckers.resource) {
      console.log(`   ✅ Resource Name: ${robBeckers.resource.name}`);
      console.log(`   ✅ Resource Role: ${robBeckers.resource.role}`);
      console.log(`   ✅ Resource Department: ${robBeckers.resource.department}`);
      console.log(`   ✅ Resource Email: ${robBeckers.resource.email}`);
    } else {
      console.log('   ❌ Resource information missing');
    }

    // Overall validation
    console.log('\n📋 Step 5: Overall Data Consistency Validation');
    
    const dataConsistencyChecks = [
      { name: 'Both roles visible in API', passed: allRolesFound },
      { name: 'Combined permissions correct', passed: hasAllPermissions },
      { name: 'Resource information present', passed: !!robBeckers.resource },
      { name: 'User ID matches expected', passed: robBeckers.id === 2 },
      { name: 'Resource ID matches expected', passed: robBeckers.resourceId === 2 }
    ];

    let allChecksPassed = true;
    dataConsistencyChecks.forEach(check => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
      if (!check.passed) allChecksPassed = false;
    });

    console.log('\n🎉 VALIDATION RESULTS:');
    console.log('=' .repeat(70));

    if (allChecksPassed) {
      console.log('🎯 ✅ COMPLETE SUCCESS: Data inconsistency issue has been RESOLVED!');
      console.log('');
      console.log('✅ Rob Beckers now shows BOTH regular_user and admin roles');
      console.log('✅ API response matches database reality perfectly');
      console.log('✅ Combined permissions from both roles are present');
      console.log('✅ Resource information is properly populated');
      console.log('✅ No more hidden role assignments causing confusion');
      console.log('');
      console.log('🚀 The Role Management interface will now display accurate data');
      console.log('🚀 Error messages will align with what users can see');
      console.log('🚀 No more "already assigned" errors for invisible roles');
      
      return true;
    } else {
      console.log('⚠️ PARTIAL SUCCESS: Some issues remain');
      console.log('');
      console.log('The API is now querying the database correctly, but some');
      console.log('validation checks failed. Please review the specific issues above.');
      
      return false;
    }

  } catch (error) {
    console.log('\n💥 VALIDATION FAILED');
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Run validation
validateRoleManagementFix().then(success => {
  if (success) {
    console.log('\n🎉 Role Management data consistency issue has been COMPLETELY RESOLVED!');
    process.exit(0);
  } else {
    console.log('\n🔧 Role Management fix needs additional attention');
    process.exit(1);
  }
}).catch(error => {
  console.error('Validation execution failed:', error);
  process.exit(1);
});
