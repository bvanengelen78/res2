import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Search, UserPlus, Edit, Trash2, Shield, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { AdminUserRegistration } from '@/components/auth/AdminUserRegistration'
import { useToast } from '@/hooks/use-toast'
import type { UserProfile, Role, UserRole } from '@/types/rbac'

interface UserWithRoles extends UserProfile {
  roles: Role[]
  role_assignments: Array<{
    id: number
    role: Role
    assigned_at: string
    assigned_by?: string
  }>
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { user: currentUser } = useSupabaseAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch users with roles
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      try {
        // First, get all user profiles
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesError) throw profilesError

        // Then, get user roles with role details for each user
        const usersWithRoles: UserWithRoles[] = []

        for (const profile of userProfiles || []) {
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select(`
              id,
              assigned_at,
              assigned_by,
              is_active,
              roles (
                id,
                name,
                description,
                is_active
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true)

          if (rolesError) {
            // Continue with empty roles rather than failing completely
            usersWithRoles.push({
              ...profile,
              roles: [],
              role_assignments: []
            })
            continue
          }

          const roles = userRoles?.map(ur => ur.roles).filter(Boolean) || []
          const roleAssignments = userRoles?.map(ur => ({
            id: ur.id,
            role: ur.roles,
            assigned_at: ur.assigned_at,
            assigned_by: ur.assigned_by
          })).filter(ra => ra.role) || []

          usersWithRoles.push({
            ...profile,
            roles,
            role_assignments: roleAssignments
          })
        }

        return usersWithRoles
      } catch (error) {
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch available roles
  const { data: availableRoles } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as Role[]
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Deactivate user instead of deleting
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'User Deactivated',
        description: 'User has been successfully deactivated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to deactivate user: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      // First, deactivate existing roles
      await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)

      // Then assign new role
      const { data: role } = await supabase
        .from('roles')
        .select('id')
        .eq('name', newRole)
        .single()

      if (!role) throw new Error('Role not found')

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: role.id,
          assigned_by: currentUser?.id,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setIsEditDialogOpen(false)
      toast({
        title: 'Role Updated',
        description: 'User role has been successfully updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update user role: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Filter users based on search and role filter
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || 
                       user.roles.some(role => role.name === roleFilter)
    
    return matchesSearch && matchesRole && user.is_active
  }) || []

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: 'Error',
        description: 'You cannot deactivate your own account.',
        variant: 'destructive',
      })
      return
    }

    if (confirm('Are you sure you want to deactivate this user?')) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleUpdateRole = (newRole: UserRole) => {
    if (!selectedUser) return
    updateUserRoleMutation.mutate({ userId: selectedUser.id, newRole })
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load users: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <AdminUserRegistration 
              onUserCreated={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
            />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge 
                              key={role.id} 
                              variant={role.name === 'admin' ? 'destructive' : role.name === 'manager' ? 'default' : 'secondary'}
                            >
                              {role.display_name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Role</label>
                <div className="mt-1">
                  {selectedUser.roles.map((role) => (
                    <Badge key={role.id} variant="outline">
                      {role.display_name}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">New Role</label>
                <Select onValueChange={(value) => handleUpdateRole(value as UserRole)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
