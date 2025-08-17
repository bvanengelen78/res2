// Script to run the management dashboard KPI functions migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

async function runMigration() {
  console.log('Running management dashboard KPI functions migration...');
  
  // Create Supabase client with admin key
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_management_dashboard_kpi_functions.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing KPI functions migration...');
    
    // Split the SQL into individual function definitions
    const functionDefinitions = migrationSql.split(/(?=CREATE OR REPLACE FUNCTION)/);
    
    for (const functionSql of functionDefinitions) {
      if (functionSql.trim()) {
        console.log('Creating function...');
        const { data, error } = await supabase.rpc('exec_sql', { sql: functionSql.trim() });
        
        if (error) {
          console.error('Error executing function definition:', error);
          
          // If exec_sql doesn't exist, provide manual instructions
          if (error.code === '42883') {
            console.log('\n⚠️  The exec_sql function does not exist in your Supabase project.');
            console.log('Please run the following SQL manually in the Supabase SQL editor:');
            console.log('\n' + '='.repeat(80));
            console.log(migrationSql);
            console.log('='.repeat(80) + '\n');
            return;
          }
          
          throw error;
        }
      }
    }
    
    console.log('✅ Management dashboard KPI functions migration completed successfully!');
    console.log('\nThe following RPC functions are now available:');
    console.log('- get_active_projects_trend()');
    console.log('- get_under_utilised_resources()');
    console.log('- get_over_utilised_resources()');
    console.log('- get_utilisation_rate_trend()');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === '42883') {
      console.log('\n📋 Manual Migration Required:');
      console.log('Copy the contents of migrations/create_management_dashboard_kpi_functions.sql');
      console.log('and run it in the Supabase SQL editor manually.');
    }
    
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);
