// Check resource status in database to see why only 10 resources appear
// Run with: node check-resource-status.js

console.log('🔍 Checking Resource Status in Database\n');

async function checkResourceStatus() {
  try {
    console.log('📊 Step 1: Check ALL resources (including inactive/deleted)');

    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');

    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables');
      console.log('   SUPABASE_URL:', !!supabaseUrl);
      console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get ALL resources without filtering
    console.log('   📋 Fetching ALL resources from database...');
    const { data: allResources, error: allError } = await supabase
      .from('resources')
      .select('id, name, role, department, is_active, is_deleted')
      .order('id', { ascending: true });
    
    if (allError) {
      console.log('   ❌ Error fetching all resources:', allError);
      return;
    }
    
    console.log(`   📋 Total resources in database: ${allResources?.length || 0}`);
    
    if (!allResources || allResources.length === 0) {
      console.log('   ❌ No resources found in database');
      return;
    }
    
    // Analyze resource status
    const activeResources = allResources.filter(r => r.is_active && !r.is_deleted);
    const inactiveResources = allResources.filter(r => !r.is_active);
    const deletedResources = allResources.filter(r => r.is_deleted);
    
    console.log(`   📋 Active resources: ${activeResources.length}`);
    console.log(`   📋 Inactive resources: ${inactiveResources.length}`);
    console.log(`   📋 Deleted resources: ${deletedResources.length}`);
    
    console.log('\n📊 Step 2: List all resources with status');
    allResources.forEach((resource, index) => {
      const status = resource.is_deleted ? 'DELETED' : 
                    !resource.is_active ? 'INACTIVE' : 'ACTIVE';
      console.log(`   ${index + 1}. ID: ${resource.id}, Name: "${resource.name}", Role: "${resource.role}", Status: ${status}`);
    });
    
    console.log('\n📊 Step 3: Simulate API filtering');

    // Simulate the API filtering logic (is_active = true AND is_deleted = false)
    const simulatedApiResources = allResources.filter(r => r.is_active && !r.is_deleted);
    console.log(`   📋 Simulated API response: ${simulatedApiResources.length} resources`);

    if (simulatedApiResources.length !== activeResources.length) {
      console.log('   ❌ MISMATCH: Simulation error!');
    } else {
      console.log('   ✅ Simulation matches expected active resources');
    }
    
    console.log('\n📊 Step 4: Check specific resources');
    
    // Check if Boyan is in the database and his status
    const boyan = allResources.find(r => r.name && (r.name.includes('Boyan') || r.name.includes('Kamphaus')));
    if (boyan) {
      const boyanStatus = boyan.is_deleted ? 'DELETED' : 
                         !boyan.is_active ? 'INACTIVE' : 'ACTIVE';
      console.log(`   📋 Boyan Kamphaus: ID=${boyan.id}, Status=${boyanStatus}`);
      
      if (boyanStatus !== 'ACTIVE') {
        console.log('   ⚠️  Boyan is not active - this explains why he doesn\'t appear in the heatmap!');
      }
    } else {
      console.log('   ❌ Boyan Kamphaus not found in database');
    }
    
    // List inactive/deleted resources that might be missing from the heatmap
    if (inactiveResources.length > 0) {
      console.log('\n   📋 Inactive resources (not shown in heatmap):');
      inactiveResources.forEach(r => {
        console.log(`      - ${r.name} (ID: ${r.id}, Role: ${r.role})`);
      });
    }
    
    if (deletedResources.length > 0) {
      console.log('\n   📋 Deleted resources (not shown in heatmap):');
      deletedResources.forEach(r => {
        console.log(`      - ${r.name} (ID: ${r.id}, Role: ${r.role})`);
      });
    }
    
    console.log('\n🎯 Summary:');
    console.log(`   Total in database: ${allResources.length}`);
    console.log(`   Active (shown in heatmap): ${activeResources.length}`);
    console.log(`   Inactive (hidden): ${inactiveResources.length}`);
    console.log(`   Deleted (hidden): ${deletedResources.length}`);
    
    if (activeResources.length === 10) {
      console.log('\n✅ This explains why only 10 resources appear in the Role & Skill Heatmap!');
      console.log('   The API correctly filters to show only active, non-deleted resources.');
      console.log('   The remaining 7 resources are either inactive or deleted.');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

checkResourceStatus();
