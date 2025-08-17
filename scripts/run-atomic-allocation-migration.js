// Script to run the atomic weekly allocation function migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

async function runMigration() {
  console.log('Running atomic weekly allocation function migration...');
  
  // Create Supabase client with admin key
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_atomic_weekly_allocation_function.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL directly using the Supabase REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      console.error('Error executing migration:', error);
      
      // Check if the exec_sql function doesn't exist
      if (error.code === '42883') {
        console.log('The exec_sql function does not exist. You need to run this SQL in the Supabase SQL editor manually.');
        console.log('Please copy the SQL from migrations/create_atomic_weekly_allocation_function.sql and run it in the Supabase SQL editor.');
      }
      
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('The update_weekly_allocation_atomic function has been created.');
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();
