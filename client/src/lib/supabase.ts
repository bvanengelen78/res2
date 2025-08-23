import { createBrowserClient } from '@supabase/ssr'
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

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // Use PKCE flow for better security
      storage: window?.localStorage, // Explicitly use localStorage
      storageKey: 'supabase.auth.token', // Consistent storage key
    },
    global: {
      headers: {
        'x-application-name': 'resourceflow',
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

// Auth types
export interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    [key: string]: any
  }
  app_metadata?: {
    [key: string]: any
  }
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: AuthUser
}

// Export the main client as default (singleton instance)
export default supabase

// Helper function to get the client instance (for debugging)
export const getSupabaseClient = () => supabase
