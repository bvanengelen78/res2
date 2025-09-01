import React, { useState } from 'react'
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
import { Users, Search, UserPlus, Edit, Trash2, Shield, AlertCircle, Settings, History, Key, X, Plus, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { AdminUserRegistration } from '@/components/auth/AdminUserRegistration'
import { useToast } from '@/hooks/use-toast'
import { useErrorHandler } from '@/lib/error-handler'
import { authApi } from '@/lib/auth-api'
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
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const { user: currentUser } = useSupabaseAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { handleError, getUserMessage, getRecoveryOptions } = useErrorHandler()

  // Fetch users with roles using backend API (bypasses RLS)
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const response = await authApi.get<UserWithRoles[]>(`/api/rbac/user-profiles?t=${Date.now()}`)

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user profiles')
      }

      return response.data || []
    },
    staleTime: 0, // Disable cache temporarily to see fresh data
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  })

  // Fetch available roles with permissions via backend (bypass RLS)
  const { data: rolesWithPermissions, isLoading: rolesWithPermissionsLoading } = useQuery({
    queryKey: ['admin', 'roles-with-permissions'],
    queryFn: async () => {
      const response = await authApi.get<RoleWithPermissions[]>('/api/rbac/roles-hierarchy')

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch roles')
      }

      return response.data || []
    },
  })

  // Fetch all permissions via backend (bypass RLS)
  const { data: allPermissions } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const response = await authApi.get<Permission[]>('/api/rbac/permissions')

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch permissions')
      }

      return response.data || []
    },
  })

  // Fetch available roles for assignment
  const { data: availableRoles, isLoading: availableRolesLoading } = useQuery({
    queryKey: ['admin', 'available-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name, description')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as Role[]
    },
  })

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      // Get the role name from available roles
      const role = rolesWithPermissions?.find(r => r.id === roleId)
      if (!role) {
        throw new Error('Role not found')
      }

      const response = await authApi.post('/api/rbac/assign-role', {
        userId,
        roleName: role.name,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to assign role')
      }

      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setIsEditDialogOpen(false)
      toast({
        title: 'Role Assigned',
        description: 'User role has been successfully updated.',
      })
    },
    onError: (error: Error) => {
      const errorId = handleError(error, {
        component: 'UserManagement',
        action: 'assignRole',
        userId: currentUser?.id
      })

      const userMessage = getUserMessage(error, { component: 'UserManagement' })
      const recoveryOptions = getRecoveryOptions(error, { component: 'UserManagement' })

      toast({
        title: 'Error Assigning Role',
        description: `${userMessage} (Error ID: ${errorId})`,
        variant: 'destructive',
      })

      console.log('Recovery suggestions:', recoveryOptions)
    },
  })

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      // Get the role name from user's current roles
      const role = selectedUser?.roles.find(r => r.id === roleId)
      if (!role) {
        throw new Error('Role not found in user roles')
      }

      const response = await authApi.post('/api/rbac/remove-role', {
        userId,
        roleName: role.name,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove role')
      }

      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'Role Removed',
        description: 'User role has been successfully removed.',
      })
    },
    onError: (error: Error) => {
      const errorId = handleError(error, {
        component: 'UserManagement',
        action: 'removeRole',
        userId: currentUser?.id
      })

      const userMessage = getUserMessage(error, { component: 'UserManagement' })

      toast({
        title: 'Error Removing Role',
        description: `${userMessage} (Error ID: ${errorId})`,
        variant: 'destructive',
      })
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const response = await authApi.post('/api/rbac/change-password', {
        userId,
        newPassword,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to change password')
      }

      return response.data
    },
    onSuccess: () => {
      setNewPassword('')
      setShowPasswordField(false)
      toast({
        title: 'Password Changed',
        description: 'User password has been successfully updated.',
      })
    },
    onError: (error: Error) => {
      const errorId = handleError(error, {
        component: 'UserManagement',
        action: 'changePassword',
        userId: currentUser?.id
      })

      const userMessage = getUserMessage(error, { component: 'UserManagement' })

      toast({
        title: 'Error Changing Password',
        description: `${userMessage} (Error ID: ${errorId})`,
        variant: 'destructive',
      })
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await authApi.delete('/api/rbac/delete-user', { userId })

      if (!response.success) {
        throw new Error(response.error || 'Failed to deactivate user')
      }

      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'User Deactivated',
        description: 'User has been successfully deactivated.',
      })
    },
    onError: (error: Error) => {
      const errorId = handleError(error, {
        component: 'UserManagement',
        action: 'deleteUser',
        userId: currentUser?.id
      })

      const userMessage = getUserMessage(error, { component: 'UserManagement' })

      toast({
        title: 'Error Deactivating User',
        description: `${userMessage} (Error ID: ${errorId})`,
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

  const handleAssignRole = (roleId: number) => {
    if (!selectedUser) return
    assignRoleMutation.mutate({ userId: selectedUser.id, roleId })
  }

  const handleRemoveRole = (roleId: number) => {
    if (!selectedUser) return
    removeRoleMutation.mutate({ userId: selectedUser.id, roleId })
  }

  const handleChangePassword = () => {
    if (!selectedUser || !newPassword.trim()) return
    changePasswordMutation.mutate({ userId: selectedUser.id, newPassword })
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
  }

  if (usersError) {
    const errorId = handleError(usersError, {
      component: 'UserManagement',
      action: 'fetchUsers',
      userId: currentUser?.id
    })

    const userMessage = getUserMessage(usersError, { component: 'UserManagement' })
    const recoveryOptions = getRecoveryOptions(usersError, { component: 'UserManagement' })

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{userMessage}</p>
            <p className="text-xs">Error ID: {errorId}</p>
            <div className="text-xs">
              <p className="font-medium">Try:</p>
              <ul className="list-disc list-inside">
                {recoveryOptions.map((option, index) => (
                  <li key={index}>{option}</li>
                ))}
              </ul>
            </div>
          </div>
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
                // Provide additional user feedback
                toast({
                  title: "User List Updated",
                  description: "The user management interface has been refreshed with the new user.",
                  duration: 3000,
                })
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
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
                  {rolesWithPermissionsLoading ? (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Assign or remove roles for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Current Roles */}
              <div>
                <label className="text-sm font-medium mb-2 block">Current Roles</label>
                <div className="space-y-2">
                  {selectedUser.roles.length > 0 ? (
                    selectedUser.roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{role.display_name}</Badge>
                          <div>
                            <p className="text-sm font-medium">{role.display_name}</p>
                            <p className="text-xs text-gray-500">{role.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(role.id)}
                          disabled={removeRoleMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No roles assigned</p>
                  )}
                </div>
              </div>

              {/* Available Roles */}
              <div>
                <label className="text-sm font-medium mb-2 block">Available Roles</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableRoles?.filter(role =>
                    !selectedUser.roles.some(userRole => userRole.id === role.id)
                  ).map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">{role.display_name}</Badge>
                        <div>
                          <p className="text-sm font-medium">{role.display_name}</p>
                          <p className="text-xs text-gray-500">{role.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignRole(role.id)}
                        disabled={assignRoleMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
                {availableRoles?.filter(role =>
                  !selectedUser.roles.some(userRole => userRole.id === role.id)
                ).length === 0 && (
                  <p className="text-sm text-gray-500 italic">All available roles are already assigned</p>
                )}
              </div>

              {/* Password Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Password Management</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordField(!showPasswordField)}
                  >
                    <Key className="w-4 h-4 mr-1" />
                    {showPasswordField ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>

                {showPasswordField && (
                  <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                    <div className="flex space-x-2">
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={changePasswordMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateRandomPassword}
                        disabled={changePasswordMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPasswordField(false)
                          setNewPassword('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending || !newPassword.trim()}
                      >
                        {changePasswordMutation.isPending ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
