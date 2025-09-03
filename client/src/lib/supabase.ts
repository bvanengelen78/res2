import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://usckkrovosqijdmgmnaj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzY2trcm92b3NxaWpkbWdtbmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMjgyODcsImV4cCI6MjA2NzgwNDI4N30.qn9QcS516qRI64hPkQh4v-fwMQ9SdPhGeewXBiUwAR0'

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Singleton pattern to ensure only one Supabase client instance
let supabaseInstance: SupabaseClient | null = null

function createSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
      storage: undefined, // Disable storage completely
    },
    global: {
      headers: {
        'x-application-name': 'resourceflow-public',
      },
    },
    // Disable realtime for public access
    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },
  })

  return supabaseInstance
}

// Create single Supabase client instance
export const supabase = createSupabaseClient()

// Export the same instance for backward compatibility
export const supabaseClient = supabase

// Database types (to be updated with actual schema)
export type Database = {
  public: {
    Tables: {
      // Will be populated with actual schema
    }
    Views: {
      // Will be populated with actual views
    }
    Functions: {
      // Will be populated with actual functions
    }
    Enums: {
      // Will be populated with actual enums
    }
  }
}

// Public access - no authentication types needed

// Export the main client as default (singleton instance)
export default supabase

// Helper function to get the client instance (for debugging)
export const getSupabaseClient = () => supabase
