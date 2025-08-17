// Test script to add sample weekly allocation data and test the new functionality
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleWeeklyAllocations() {
  try {
    console.log('🔧 Adding sample weekly allocation data...\n');

    // First, get existing allocations
    const { data: allocations, error: allocError } = await supabase
      .from('resource_allocations')
      .select('*')
      .eq('status', 'active');

    if (allocError) {
      console.error('Error fetching allocations:', allocError);
      return;
    }

    console.log(`Found ${allocations.length} active allocations`);

    if (allocations.length === 0) {
      console.log('No active allocations found. Creating sample data...');
      
      // Get first resource and project
      const { data: resources } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .limit(1);

      if (resources.length === 0 || projects.length === 0) {
        console.log('No resources or projects found. Please add some first.');
        return;
      }

      // Create a sample allocation
      const { data: newAllocation, error: createError } = await supabase
        .from('resource_allocations')
        .insert({
          project_id: projects[0].id,
          resource_id: resources[0].id,
          allocated_hours: 20.00,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          role: 'Developer',
          status: 'active',
          weekly_allocations: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating allocation:', createError);
        return;
      }

      allocations.push(newAllocation);
      console.log('✅ Created sample allocation');
    }

    // Add weekly allocation data to the first allocation
    const allocation = allocations[0];
    
    // Generate sample weekly allocations for the current year
    const currentYear = new Date().getFullYear();
    const weeklyAllocations = {};
    
    // Add allocations for weeks 1-52 of current year
    for (let week = 1; week <= 52; week++) {
      const weekKey = `${currentYear}-W${week.toString().padStart(2, '0')}`;
      // Vary the hours: 16-24 hours per week with some variation
      const baseHours = 20;
      const variation = Math.sin(week / 8) * 4; // Sine wave for variation
      const hours = Math.max(8, Math.min(32, baseHours + variation));
      weeklyAllocations[weekKey] = Math.round(hours * 2) / 2; // Round to nearest 0.5
    }

    // Update the allocation with weekly data
    const { error: updateError } = await supabase
      .from('resource_allocations')
      .update({ weekly_allocations: weeklyAllocations })
      .eq('id', allocation.id);

    if (updateError) {
      console.error('Error updating weekly allocations:', updateError);
      return;
    }

    console.log('✅ Added weekly allocation data');
    console.log(`   Allocation ID: ${allocation.id}`);
    console.log(`   Resource ID: ${allocation.resource_id}`);
    console.log(`   Project ID: ${allocation.project_id}`);
    console.log(`   Sample weeks: ${Object.keys(weeklyAllocations).slice(0, 5).join(', ')}...`);
    console.log(`   Sample hours: ${Object.values(weeklyAllocations).slice(0, 5).join(', ')}...`);

    // If there are multiple allocations, add data to a second one too
    if (allocations.length > 1) {
      const secondAllocation = allocations[1];
      const secondWeeklyAllocations = {};
      
      for (let week = 1; week <= 52; week++) {
        const weekKey = `${currentYear}-W${week.toString().padStart(2, '0')}`;
        // Different pattern for second allocation
        const baseHours = 12;
        const variation = Math.cos(week / 6) * 3;
        const hours = Math.max(4, Math.min(20, baseHours + variation));
        secondWeeklyAllocations[weekKey] = Math.round(hours * 2) / 2;
      }

      const { error: secondUpdateError } = await supabase
        .from('resource_allocations')
        .update({ weekly_allocations: secondWeeklyAllocations })
        .eq('id', secondAllocation.id);

      if (!secondUpdateError) {
        console.log('✅ Added weekly allocation data to second allocation');
      }
    }

    console.log('\n🎉 Sample weekly allocation data added successfully!');
    console.log('You can now test the weekly allocation view in the application.');
    console.log(`Navigate to: http://localhost:5000/resources/${allocation.resource_id}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the test
addSampleWeeklyAllocations();
