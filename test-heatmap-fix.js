// Test the Role & Skill Heatmap fix
// Run with: node test-heatmap-fix.js

console.log('🎯 Testing Role & Skill Heatmap Fix\n');

async function testHeatmapFix() {
  try {
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get active resources (same as API)
    console.log('📊 Step 1: Simulate component logic with new limits');
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
    
    console.log(`   📋 Total active resources: ${resources.length}`);
    
    // Simulate component grouping logic
    const roleGroups = resources.reduce((acc, resource) => {
      const role = resource.role || resource.department || 'General';
      if (!acc[role]) acc[role] = [];
      acc[role].push(resource);
      return acc;
    }, {});
    
    // Convert to role clusters (simplified)
    const roleClusters = Object.entries(roleGroups).map(([role, roleResources]) => ({
      role,
      resources: roleResources,
      count: roleResources.length
    })).sort((a, b) => b.count - a.count); // Sort by resource count
    
    console.log(`   📋 Total role clusters: ${roleClusters.length}`);
    
    // Test new limits
    console.log('\n📊 Step 2: Test new display limits');
    
    // Default view (8 roles)
    const defaultView = roleClusters.slice(0, 8);
    const defaultResourceCount = defaultView.reduce((sum, cluster) => sum + cluster.count, 0);
    
    console.log(`   📋 Default view (8 roles): ${defaultView.length} role groups, ${defaultResourceCount} resources`);
    console.log('      Roles shown:');
    defaultView.forEach((cluster, index) => {
      console.log(`         ${index + 1}. ${cluster.role} (${cluster.count} resource${cluster.count > 1 ? 's' : ''})`);
    });
    
    // Expanded view (20 roles, but we only have 17)
    const expandedView = roleClusters.slice(0, 20);
    const expandedResourceCount = expandedView.reduce((sum, cluster) => sum + cluster.count, 0);
    
    console.log(`\n   📋 Expanded view (up to 20 roles): ${expandedView.length} role groups, ${expandedResourceCount} resources`);
    console.log('      Additional roles shown:');
    expandedView.slice(8).forEach((cluster, index) => {
      console.log(`         ${index + 9}. ${cluster.role} (${cluster.count} resource${cluster.count > 1 ? 's' : ''})`);
    });
    
    // Check if Boyan is visible
    console.log('\n📊 Step 3: Verify Boyan Kamphaus visibility');
    const boyanCluster = roleClusters.find(cluster => 
      cluster.resources.some(r => r.name.includes('Boyan') || r.name.includes('Kamphaus'))
    );
    
    if (boyanCluster) {
      const boyanIndex = roleClusters.indexOf(boyanCluster);
      const visibleInDefault = boyanIndex < 8;
      const visibleInExpanded = boyanIndex < 20;
      
      console.log(`   📋 Boyan's role: "${boyanCluster.role}"`);
      console.log(`   📋 Role cluster position: ${boyanIndex + 1} of ${roleClusters.length}`);
      console.log(`   📋 Visible in default view (8 roles): ${visibleInDefault ? '✅ YES' : '❌ NO'}`);
      console.log(`   📋 Visible in expanded view (20 roles): ${visibleInExpanded ? '✅ YES' : '❌ NO'}`);
      
      if (!visibleInDefault) {
        console.log(`   ⚠️  Boyan will only be visible when "View More" is clicked`);
      }
    } else {
      console.log('   ❌ Boyan Kamphaus not found');
    }
    
    console.log('\n📊 Step 4: Summary of improvements');
    console.log(`   📋 Before fix:`);
    console.log(`      - Default: 5 roles, ~5 resources visible`);
    console.log(`      - Expanded: 10 roles, ~10 resources visible`);
    console.log(`      - Hidden: ${resources.length - 10} resources`);
    
    console.log(`   📋 After fix:`);
    console.log(`      - Default: 8 roles, ${defaultResourceCount} resources visible`);
    console.log(`      - Expanded: ${expandedView.length} roles, ${expandedResourceCount} resources visible`);
    console.log(`      - Hidden: ${resources.length - expandedResourceCount} resources`);
    
    if (expandedResourceCount === resources.length) {
      console.log('\n✅ SUCCESS: All resources are now visible in the Role & Skill Heatmap!');
    } else {
      console.log('\n⚠️  Some resources are still hidden. Consider increasing limits further.');
    }
    
    // Check View More button logic
    console.log('\n📊 Step 5: View More button behavior');
    if (roleClusters.length > 8) {
      const moreCount = roleClusters.length - 8;
      console.log(`   📋 "View More" button will show: "${moreCount} more" roles`);
      console.log(`   📋 Button will be visible: ✅ YES (${roleClusters.length} > 8)`);
    } else {
      console.log(`   📋 "View More" button will be visible: ❌ NO (${roleClusters.length} ≤ 8)`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHeatmapFix();
