import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Load environment variables
config();

if (!process.env.SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL must be set. Please add your Supabase project URL to the environment variables. " +
    "Example: https://your-project-id.supabase.co"
  );
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_ANON_KEY must be set. Please add your Supabase anon key to the environment variables. " +
    "You can find this in your Supabase project settings under API."
  );
}

// Create Supabase client for auth and real-time features (anon key)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create Supabase client with service role for admin operations
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY must be set. Please add your Supabase service role key to the environment variables. " +
    "You can find this in your Supabase project settings under API. " +
    "WARNING: This key has admin privileges and should be kept secure."
  );
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// For database operations, we'll use the connection string with postgres-js
// This provides better performance for server-side database operations
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please add your Supabase database connection string to the environment variables.",
  );
}

// Create postgres client for Drizzle ORM with optimized connection settings
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Disable prepared statements for compatibility
  max: 5, // Reduced max connections to prevent pool exhaustion
  idle_timeout: 10, // Close idle connections after 10 seconds
  connect_timeout: 10, // Reduced connection timeout
  command_timeout: 30, // Command timeout in seconds
  ssl: 'require', // Require SSL for Supabase
  connection: {
    application_name: 'ResourceFlow',
  },
  // Add connection retry logic
  retry: {
    attempts: 3,
    delay: 1000,
  },
  // Enable connection pooling optimizations
  transform: {
    undefined: null,
  },
  // Add debug logging for connection issues
  debug: process.env.NODE_ENV === 'development' ? console.log : false,
});

// Create Drizzle database instance
export const db = drizzle(client, { schema });

// Export the postgres client for cleanup if needed
export { client };
