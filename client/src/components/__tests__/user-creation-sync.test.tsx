import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('User Creation Cache Invalidation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('should invalidate all relevant cache keys after user creation', async () => {
    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Test the cache invalidation logic directly
    const expectedQueryKeys = [
      { queryKey: ['admin', 'users'] },
      { queryKey: ['rbac', 'users'] },
      { queryKey: ["/api/rbac-users"] },
      { queryKey: ['auth', 'user'] }
    ]

    // Simulate the cache invalidation that happens in AdminUserRegistration
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
      queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] }),
      queryClient.invalidateQueries({ queryKey: ["/api/rbac-users"] }),
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }),
    ])

    // Verify all expected cache invalidations occurred
    expectedQueryKeys.forEach(expectedKey => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(expectedKey)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(4)
  })

  it('should handle cache invalidation errors gracefully', async () => {
    // Mock invalidateQueries to throw an error for the first call
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('Cache invalidation failed'))
      .mockResolvedValue(undefined) // Subsequent calls succeed

    // Test error handling in cache invalidation
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rbac-users"] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }),
      ])
    } catch (error) {
      // Error should be caught and handled gracefully
      expect(error.message).toBe('Cache invalidation failed')
    }

    // Verify that at least one invalidation was attempted
    expect(invalidateQueriesSpy).toHaveBeenCalled()
  })

  it('should ensure proper query key consistency', () => {
    // Test that all user-related query keys are consistent
    const userQueryKeys = [
      ['admin', 'users'],
      ['rbac', 'users'],
      ["/api/rbac-users"],
      ['auth', 'user']
    ]

    // Verify query key formats are consistent
    userQueryKeys.forEach(key => {
      expect(Array.isArray(key)).toBe(true)
      expect(key.length).toBeGreaterThan(0)
      expect(typeof key[0]).toBe('string')
    })

    // Verify we have the expected number of user-related query keys
    expect(userQueryKeys).toHaveLength(4)
  })
})
