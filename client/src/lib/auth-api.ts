import { supabase } from '@/lib/supabase'

/**
 * Centralized authentication API utility
 * Handles token retrieval, refresh, and API calls with proper error handling
 */

interface ApiRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | object
}

interface AuthenticatedApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

/**
 * Get a fresh authentication token with automatic refresh
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // First try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('[AUTH-API] Session error:', sessionError)
      return null
    }

    if (!session) {
      console.warn('[AUTH-API] No active session found')
      return null
    }

    // Check if token is close to expiry (within 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0
    const timeUntilExpiry = expiresAt - now

    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('[AUTH-API] Token expiring soon, refreshing...')
      
      // Refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('[AUTH-API] Token refresh failed:', refreshError)
        return session.access_token // Return original token as fallback
      }

      if (refreshedSession?.access_token) {
        console.log('[AUTH-API] Token refreshed successfully')
        return refreshedSession.access_token
      }
    }

    return session.access_token
  } catch (error) {
    console.error('[AUTH-API] Error getting auth token:', error)
    return null
  }
}

/**
 * Make an authenticated API request with automatic token handling
 */
export async function authenticatedApiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<AuthenticatedApiResponse<T>> {
  try {
    const { method = 'GET', headers = {}, body } = options

    // Get fresh authentication token
    const token = await getAuthToken()
    
    if (!token) {
      return {
        success: false,
        error: 'Authentication required - no valid token available',
        status: 401
      }
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers,
    }

    // Prepare body
    let requestBody: string | undefined
    if (body) {
      requestBody = typeof body === 'string' ? body : JSON.stringify(body)
    }

    console.log(`[AUTH-API] Making ${method} request to ${url}`)

    // Make the request
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: 'include',
    })

    console.log(`[AUTH-API] Response: ${response.status} ${response.statusText}`)

    // Handle different response types
    if (response.status === 204) {
      return { success: true, data: null as T }
    }

    let responseData: any
    try {
      responseData = await response.json()
    } catch (parseError) {
      console.warn('[AUTH-API] Failed to parse response as JSON')
      responseData = null
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.error || responseData?.message || `HTTP ${response.status}`,
        status: response.status,
        data: responseData
      }
    }

    return {
      success: true,
      data: responseData?.data || responseData,
      status: response.status
    }

  } catch (error) {
    console.error('[AUTH-API] Request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0
    }
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const authApi = {
  get: <T = any>(url: string, headers?: Record<string, string>) =>
    authenticatedApiRequest<T>(url, { method: 'GET', headers }),

  post: <T = any>(url: string, body?: object, headers?: Record<string, string>) =>
    authenticatedApiRequest<T>(url, { method: 'POST', body, headers }),

  put: <T = any>(url: string, body?: object, headers?: Record<string, string>) =>
    authenticatedApiRequest<T>(url, { method: 'PUT', body, headers }),

  delete: <T = any>(url: string, body?: object, headers?: Record<string, string>) =>
    authenticatedApiRequest<T>(url, { method: 'DELETE', body, headers }),

  patch: <T = any>(url: string, body?: object, headers?: Record<string, string>) =>
    authenticatedApiRequest<T>(url, { method: 'PATCH', body, headers }),
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken()
  return !!token
}

/**
 * Force a session refresh
 */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('[AUTH-API] Session refresh failed:', error)
      return false
    }

    return !!session?.access_token
  } catch (error) {
    console.error('[AUTH-API] Session refresh error:', error)
    return false
  }
}
