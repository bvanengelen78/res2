/**
 * Production-specific cache utilities for handling serverless environment issues
 */

import { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CacheInvalidationResult {
  success: boolean
  key: string
  error?: any
  timing: number
}

export interface ProductionCacheOptions {
  maxRetries?: number
  retryDelay?: number
  forceRefetch?: boolean
  clearAllCaches?: boolean
  debugMode?: boolean
}

/**
 * Enhanced cache invalidation specifically designed for production serverless environments
 */
export class ProductionCacheManager {
  private queryClient: QueryClient
  private debugMode: boolean

  constructor(queryClient: QueryClient, debugMode = false) {
    this.queryClient = queryClient
    this.debugMode = debugMode
  }

  private log(message: string, data?: any) {
    if (this.debugMode || process.env.NODE_ENV === 'development') {
      console.log(`[ProductionCache] ${message}`, data || '')
    }
  }

  private logError(message: string, error?: any) {
    console.error(`[ProductionCache] ${message}`, error || '')
  }

  /**
   * Invalidate user-related caches with production-specific handling
   */
  async invalidateUserCaches(options: ProductionCacheOptions = {}): Promise<CacheInvalidationResult[]> {
    const {
      maxRetries = 3,
      retryDelay = 500,
      forceRefetch = true,
      clearAllCaches = false,
      debugMode = false
    } = options

    this.log('Starting user cache invalidation', { options })

    const cacheKeys = [
      { key: ['admin', 'users'], name: 'admin-users', critical: true },
      { key: ['rbac', 'users'], name: 'rbac-users', critical: false },
      { key: ['/api/rbac-users'], name: 'api-rbac-users', critical: false },
      { key: ['auth', 'user'], name: 'auth-user', critical: false },
    ]

    const results: CacheInvalidationResult[] = []

    // Step 1: Clear all caches if requested (nuclear option)
    if (clearAllCaches) {
      try {
        this.log('Clearing all caches (nuclear option)')
        this.queryClient.clear()
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        this.logError('Failed to clear all caches', error)
      }
    }

    // Step 2: Invalidate specific caches with retry logic
    for (const { key, name, critical } of cacheKeys) {
      let attempt = 0
      let success = false
      let lastError: any = null
      const startTime = Date.now()

      while (attempt < maxRetries && !success) {
        try {
          this.log(`Invalidating ${name} (attempt ${attempt + 1}/${maxRetries})`)
          
          await this.queryClient.invalidateQueries({ queryKey: key })
          
          // For critical caches, also remove from cache entirely
          if (critical) {
            this.queryClient.removeQueries({ queryKey: key })
          }
          
          success = true
          this.log(`Successfully invalidated ${name}`)
        } catch (error) {
          lastError = error
          attempt++
          this.logError(`Failed to invalidate ${name} (attempt ${attempt})`, error)
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          }
        }
      }

      results.push({
        success,
        key: name,
        error: lastError,
        timing: Date.now() - startTime
      })
    }

    // Step 3: Force refetch critical data if requested
    if (forceRefetch) {
      try {
        this.log('Force refetching critical user data')
        await this.forceRefetchUserData()
      } catch (error) {
        this.logError('Failed to force refetch user data', error)
        results.push({
          success: false,
          key: 'force-refetch',
          error,
          timing: 0
        })
      }
    }

    // Step 4: Verify cache state
    await this.verifyCacheState()

    this.log('Cache invalidation completed', { results })
    return results
  }

  /**
   * Force refetch user data with fresh database query
   */
  private async forceRefetchUserData(): Promise<any> {
    return this.queryClient.fetchQuery({
      queryKey: ['admin', 'users'],
      queryFn: async () => {
        this.log('Fetching fresh user data from database')
        
        // Get user profiles
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesError) {
          this.logError('Failed to fetch user profiles', profilesError)
          throw profilesError
        }

        // Get roles for each user
        const usersWithRoles = await Promise.all(
          userProfiles.map(async (profile) => {
            const { data: userRoles, error: rolesError } = await supabase
              .from('user_roles')
              .select(`
                role:roles(
                  id,
                  name,
                  description
                )
              `)
              .eq('user_id', profile.id)

            if (rolesError) {
              this.logError(`Failed to fetch roles for user ${profile.id}`, rolesError)
              return { ...profile, roles: [] }
            }

            return {
              ...profile,
              roles: userRoles.map(ur => ur.role).filter(Boolean)
            }
          })
        )

        this.log('Fresh user data fetched', { userCount: usersWithRoles.length })
        return usersWithRoles
      },
      staleTime: 0, // Always fetch fresh data
      gcTime: 0, // Don't cache this forced fetch
    })
  }

  /**
   * Verify cache state and log for debugging
   */
  private async verifyCacheState(): Promise<void> {
    try {
      const cacheData = this.queryClient.getQueryData(['admin', 'users'])
      this.log('Cache state verification', {
        hasData: !!cacheData,
        dataType: typeof cacheData,
        isArray: Array.isArray(cacheData),
        length: Array.isArray(cacheData) ? cacheData.length : 'N/A',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      this.logError('Failed to verify cache state', error)
    }
  }

  /**
   * Production-safe cache invalidation with comprehensive error handling
   */
  async safeInvalidateUserCaches(): Promise<boolean> {
    try {
      // Try normal invalidation first
      const results = await this.invalidateUserCaches({
        maxRetries: 2,
        retryDelay: 300,
        forceRefetch: true,
        debugMode: true
      })

      const criticalSuccess = results.some(r => r.key === 'admin-users' && r.success)
      
      if (!criticalSuccess) {
        this.log('Critical cache invalidation failed, trying nuclear option')
        
        // Nuclear option: clear everything and refetch
        await this.invalidateUserCaches({
          maxRetries: 1,
          retryDelay: 100,
          forceRefetch: true,
          clearAllCaches: true,
          debugMode: true
        })
      }

      return true
    } catch (error) {
      this.logError('Safe cache invalidation failed completely', error)
      return false
    }
  }
}

/**
 * Create a production cache manager instance
 */
export function createProductionCacheManager(queryClient: QueryClient): ProductionCacheManager {
  return new ProductionCacheManager(queryClient, true)
}

/**
 * Quick utility for production cache invalidation
 */
export async function invalidateUserCachesProduction(queryClient: QueryClient): Promise<boolean> {
  const manager = createProductionCacheManager(queryClient)
  return manager.safeInvalidateUserCaches()
}
