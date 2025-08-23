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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Search, UserPlus, Edit, Trash2, Shield, AlertCircle, Settings, History, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { AdminUserRegistration } from '@/components/auth/AdminUserRegistration'
import { useToast } from '@/hooks/use-toast'
import type { UserProfile, Role, UserRole, PermissionType } from '@/types/rbac'

interface UserWithRoles extends UserProfile {
  roles: Role[]
  role_assignments: Array<{
    id: number
    role: Role
    assigned_at: string
    assigned_by?: string
  }>
}

interface Permission {
  id: number
  name: string
  description: string
  category: string
  is_active: boolean
}

interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export function EnhancedUserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const { user: currentUser } = useSupabaseAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch users with roles
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      try {
        // Get all user profiles
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (profilesError) throw profilesError

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
                display_name,
                is_active
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true)

          if (rolesError) {
            console.warn('Error fetching roles for user:', profile.email, rolesError)
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
        console.error('Error fetching users:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // Fetch available roles with permissions
  const { data: rolesWithPermissions, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin', 'roles-with-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permissions (
              id,
              name,
              description,
              category,
              is_active
            )
          )
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      
      return data?.map(role => ({
        ...role,
        permissions: role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
      })) as RoleWithPermissions[]
    },
  })

  // Fetch all permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return data as Permission[]
    },
  })

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const response = await fetch('/api/rbac/assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId,
          roleName: newRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign role')
      }

      return await response.json()
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/rbac/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to deactivate user')
      }

      return await response.json()
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

  if (usersError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load users: {usersError.message}
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
                <span>Enhanced User Management</span>
              </CardTitle>
              <CardDescription>
                Comprehensive user, role, and permission management
              </CardDescription>
            </div>
            <AdminUserRegistration
              onUserCreated={() => {
                // Cache invalidation is handled by AdminUserRegistration component
                // Provide additional user feedback with enhanced debugging
                console.log('🎉 User creation callback triggered in EnhancedUserManagement')

                // Log current users state for debugging
                const currentUsers = queryClient.getQueryData(['admin', 'users'])
                console.log('📊 Current users in cache after creation:', {
                  hasData: !!currentUsers,
                  userCount: Array.isArray(currentUsers) ? currentUsers.length : 'N/A',
                  timestamp: new Date().toISOString()
                })

                // Force a manual refetch as additional safety measure
                setTimeout(async () => {
                  try {
                    console.log('🔄 Manual refetch triggered as safety measure...')
                    await queryClient.refetchQueries({
                      queryKey: ['admin', 'users'],
                      type: 'active'
                    })
                    console.log('✅ Manual refetch completed')
                  } catch (error) {
                    console.error('❌ Manual refetch failed:', error)
                  }
                }, 500)

                toast({
                  title: "User List Updated",
                  description: "The user management interface has been refreshed with the new user.",
                  duration: 3000,
                })
                console.log('✅ User created successfully - UI refresh process completed')
              }}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Audit Trail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* User Management Content - will be expanded */}
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
                    {usersLoading ? (
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
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              {/* Role Management Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Role Management</h3>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Role
                  </Button>
                </div>

                <div className="grid gap-4">
                  {rolesLoading ? (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading roles...</span>
                      </div>
                    </div>
                  ) : (
                    rolesWithPermissions?.map((role) => (
                      <Card key={role.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{role.display_name}</CardTitle>
                              <CardDescription>{role.description}</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={role.name === 'admin' ? 'destructive' : 'default'}>
                                {role.name}
                              </Badge>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Permissions ({role.permissions.length})</h4>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.map((permission) => (
                                <Badge key={permission.id} variant="outline" className="text-xs">
                                  {permission.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              {/* Permission Management Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Permission Management</h3>
                  <Button variant="outline" size="sm">
                    <Key className="w-4 h-4 mr-2" />
                    Create Permission
                  </Button>
                </div>

                {allPermissions && (
                  <div className="space-y-6">
                    {Object.entries(
                      allPermissions.reduce((acc, permission) => {
                        const category = permission.category || 'General'
                        if (!acc[category]) acc[category] = []
                        acc[category].push(permission)
                        return acc
                      }, {} as Record<string, Permission[]>)
                    ).map(([category, permissions]) => (
                      <Card key={category}>
                        <CardHeader>
                          <CardTitle className="text-base">{category}</CardTitle>
                          <CardDescription>
                            {permissions.length} permission{permissions.length !== 1 ? 's' : ''} in this category
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">{permission.name}</Badge>
                                    {!permission.is_active && (
                                      <Badge variant="destructive">Inactive</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              {/* Audit Trail Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Audit Trail</h3>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="role_assigned">Role Assigned</SelectItem>
                        <SelectItem value="role_removed">Role Removed</SelectItem>
                        <SelectItem value="user_created">User Created</SelectItem>
                        <SelectItem value="user_deactivated">User Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <History className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Sample audit entries - in real implementation, this would come from a query */}
                        <TableRow>
                          <TableCell className="text-sm">
                            {new Date().toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Role Assigned</Badge>
                          </TableCell>
                          <TableCell>john.doe@example.com</TableCell>
                          <TableCell>{currentUser?.email}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            Assigned 'manager' role
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">
                            {new Date(Date.now() - 3600000).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">User Created</Badge>
                          </TableCell>
                          <TableCell>jane.smith@example.com</TableCell>
                          <TableCell>{currentUser?.email}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            New user account created
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <History className="w-4 h-4" />
                              <span>Audit trail implementation in progress...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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
