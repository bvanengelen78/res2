import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface JobRole {
  id: string
  name: string
  description?: string
  department_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useJobRoles() {
  return useQuery({
    queryKey: ['job-roles'],
    queryFn: async (): Promise<JobRole[]> => {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching job roles:', error)
        throw new Error(`Failed to fetch job roles: ${error.message}`)
      }

      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook for creating a new job role
export function useCreateJobRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (jobRole: Omit<JobRole, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('job_roles')
        .insert([jobRole])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create job role: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      // Invalidate and refetch job roles
      queryClient.invalidateQueries({ queryKey: ['job-roles'] })
    },
  })
}

// Hook for updating a job role
export function useUpdateJobRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobRole> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_roles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update job role: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] })
    },
  })
}

// Hook for deleting a job role (soft delete)
export function useDeleteJobRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_roles')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete job role: ${error.message}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-roles'] })
    },
  })
}
