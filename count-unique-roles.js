// Count unique roles to understand the grouping
// Run with: node count-unique-roles.js

console.log('🎯 Counting Unique Roles for Role & Skill Heatmap\n');

async function countUniqueRoles() {
  try {
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
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get active resources (same as API)
    console.log('📊 Step 1: Get active resources');
    const { data: resources, error } = await supabase
      .from('resources')
      .select('id, name, role, department')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('name', { ascending: true });
    
    if (error) {
      console.log('❌ Error fetching resources:', error);
      return;
    }
    
    console.log(`   📋 Active resources: ${resources.length}`);
    
    // Group by role (same logic as component)
    console.log('\n📊 Step 2: Group resources by role');
    const roleGroups = resources.reduce((acc, resource) => {
      // Use role first, then department as fallback, then 'General'
      const role = resource.role || resource.department || 'General';
      
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(resource);
      return acc;
    }, {});
    
    console.log(`   📋 Unique roles: ${Object.keys(roleGroups).length}`);
    
    // Sort by resource count (descending)
    const sortedRoles = Object.entries(roleGroups)
      .map(([role, roleResources]) => ({
        role,
        count: roleResources.length,
        resources: roleResources
      }))
      .sort((a, b) => b.count - a.count);
    
    console.log('\n📊 Step 3: Role distribution');
    sortedRoles.forEach((roleGroup, index) => {
      console.log(`   ${index + 1}. ${roleGroup.role}: ${roleGroup.count} resource(s)`);
      roleGroup.resources.forEach(r => {
        console.log(`      - ${r.name} (ID: ${r.id})`);
      });
    });
    
    console.log('\n📊 Step 4: Check component limits');
    console.log(`   📋 Default view (5 roles): Shows ${Math.min(5, sortedRoles.length)} role groups`);
    console.log(`   📋 Expanded view (10 roles): Shows ${Math.min(10, sortedRoles.length)} role groups`);
    console.log(`   📋 Total roles available: ${sortedRoles.length}`);
    
    if (sortedRoles.length > 10) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log(`   The component limits display to 10 roles, but we have ${sortedRoles.length} unique roles.`);
      console.log(`   This means ${sortedRoles.length - 10} role groups are hidden.`);
      
      console.log('\n   📋 Hidden role groups (beyond 10):');
      sortedRoles.slice(10).forEach((roleGroup, index) => {
        console.log(`      ${index + 11}. ${roleGroup.role}: ${roleGroup.count} resource(s)`);
        roleGroup.resources.forEach(r => {
          console.log(`         - ${r.name}`);
        });
      });
    } else {
      console.log('\n✅ All role groups fit within the 10-role limit.');
    }
    
    // Calculate total resources in first 10 groups
    const resourcesInFirst10 = sortedRoles.slice(0, 10).reduce((sum, group) => sum + group.count, 0);
    const resourcesInFirst5 = sortedRoles.slice(0, 5).reduce((sum, group) => sum + group.count, 0);
    
    console.log('\n📊 Step 5: Resource count analysis');
    console.log(`   📋 Resources in first 5 role groups: ${resourcesInFirst5}`);
    console.log(`   📋 Resources in first 10 role groups: ${resourcesInFirst10}`);
    console.log(`   📋 Total active resources: ${resources.length}`);
    
    if (resourcesInFirst10 < resources.length) {
      const hiddenResources = resources.length - resourcesInFirst10;
      console.log(`   ⚠️  ${hiddenResources} resources are hidden due to role group limit!`);
    }
    
    console.log('\n🎯 Recommendation:');
    if (sortedRoles.length > 10) {
      console.log(`   Increase MAX_VISIBLE_ROLES from 10 to ${sortedRoles.length} to show all role groups.`);
    } else {
      console.log('   The current limit of 10 roles is sufficient.');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

countUniqueRoles();
