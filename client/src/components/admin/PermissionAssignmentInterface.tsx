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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Key, Users, Search, Edit, Save, X, AlertCircle, Shield, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
// Authentication removed - public access
import { useToast } from '@/hooks/use-toast'

interface UserWithPermissions {
  id: string
  email: string
  full_name: string | null
  roles: Array<{
    id: number
    name: string
    display_name: string
    permissions: Permission[]
  }>
  direct_permissions: Permission[]
}

interface Permission {
  id: number
  name: string
  description: string
  category: string
  is_active: boolean
}

interface Role {
  id: number
  name: string
  display_name: string
  description: string
  permissions: Permission[]
}

export function PermissionAssignmentInterface() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const { user: currentUser } = useSupabaseAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch users with their roles and permissions
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users-permissions'],
    queryFn: async () => {
      try {
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('is_active', true)
          .order('email')

        if (profilesError) throw profilesError

        const usersWithPermissions: UserWithPermissions[] = []

        for (const profile of userProfiles || []) {
          // Get user roles with permissions
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select(`
              roles (
                id,
                name,
                display_name,
                role_permissions (
                  permissions (
                    id,
                    name,
                    description,
                    category,
                    is_active
                  )
                )
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true)

          if (rolesError) {
            console.warn(`Error fetching roles for user ${profile.id}:`, rolesError)
          }

          // Get direct permissions (if any)
          const { data: directPermissions, error: directPermError } = await supabase
            .from('user_permissions')
            .select(`
              permissions (
                id,
                name,
                description,
                category,
                is_active
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true)

          if (directPermError) {
            console.warn(`Error fetching direct permissions for user ${profile.id}:`, directPermError)
          }

          const roles = userRoles?.map(ur => ({
            ...ur.roles,
            permissions: ur.roles?.role_permissions?.map(rp => rp.permissions).filter(Boolean) || []
          })).filter(Boolean) || []

          const direct_permissions = directPermissions?.map(dp => dp.permissions).filter(Boolean) || []

          usersWithPermissions.push({
            ...profile,
            roles,
            direct_permissions
          })
        }

        return usersWithPermissions
      } catch (error) {
        throw error
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // Fetch all available permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['admin', 'all-permissions-assignment'],
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

  // Assign direct permission mutation
  const assignPermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionIds }: { userId: string; permissionIds: number[] }) => {
      // Remove existing direct permissions
      await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId)

      // Add new direct permissions
      if (permissionIds.length > 0) {
        const userPermissions = permissionIds.map(permissionId => ({
          user_id: userId,
          permission_id: permissionId,
          assigned_by: currentUser?.id
        }))

        const { error } = await supabase
          .from('user_permissions')
          .insert(userPermissions)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-permissions'] })
      setIsAssignDialogOpen(false)
      setSelectedPermissions([])
      toast({
        title: 'Permissions Updated',
        description: 'User permissions have been successfully updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update permissions: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleAssignPermissions = () => {
    if (!selectedUser) return
    assignPermissionMutation.mutate({ 
      userId: selectedUser.id, 
      permissionIds: selectedPermissions 
    })
  }

  const handleOpenAssignDialog = (user: UserWithPermissions) => {
    setSelectedUser(user)
    setSelectedPermissions(user.direct_permissions.map(p => p.id))
    setIsAssignDialogOpen(true)
  }

  const handlePermissionToggle = (permissionId: number, checked: boolean) => {
    setSelectedPermissions(prev => 
      checked 
        ? [...prev, permissionId]
        : prev.filter(id => id !== permissionId)
    )
  }

  const getAllUserPermissions = (user: UserWithPermissions): Permission[] => {
    const rolePermissions = user.roles.flatMap(role => role.permissions)
    const allPermissions = [...rolePermissions, ...user.direct_permissions]
    
    // Remove duplicates
    const uniquePermissions = allPermissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.id === permission.id)
    )
    
    return uniquePermissions
  }

  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

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
                <Key className="w-5 h-5" />
                <span>Permission Assignment</span>
              </CardTitle>
              <CardDescription>
                Assign direct permissions to users beyond their role permissions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Total Permissions</TableHead>
                  <TableHead>Direct Permissions</TableHead>
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
                  filteredUsers.map((user) => {
                    const allPermissions = getAllUserPermissions(user)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role.id} variant="outline">
                                {role.display_name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {allPermissions.length} permissions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.direct_permissions.length > 0 ? "default" : "outline"}>
                            {user.direct_permissions.length} direct
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permission Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions for {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
            <DialogDescription>
              Assign direct permissions to this user. Role-based permissions are inherited automatically.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Current Role Permissions */}
              <div>
                <h4 className="font-medium mb-2">Role-Based Permissions (Inherited)</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {selectedUser.roles.length === 0 ? (
                    <p className="text-sm text-gray-500">No roles assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.roles.map((role) => (
                        <div key={role.id}>
                          <div className="flex items-center space-x-2 mb-1">
                            <Shield className="w-4 h-4" />
                            <span className="font-medium">{role.display_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-6">
                            {role.permissions.map((permission) => (
                              <Badge key={permission.id} variant="secondary" className="text-xs">
                                {permission.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Direct Permission Assignment */}
              <div>
                <h4 className="font-medium mb-2">Direct Permissions</h4>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {allPermissions && Object.entries(
                    allPermissions.reduce((acc, permission) => {
                      const category = permission.category || 'General'
                      if (!acc[category]) acc[category] = []
                      acc[category].push(permission)
                      return acc
                    }, {} as Record<string, Permission[]>)
                  ).map(([category, permissions]) => (
                    <div key={category}>
                      <h5 className="font-medium text-sm mb-2">{category}</h5>
                      <div className="space-y-2 ml-4">
                        {permissions.map((permission) => {
                          const isInherited = selectedUser.roles.some(role =>
                            role.permissions.some(p => p.id === permission.id)
                          )
                          return (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(permission.id, checked as boolean)
                                }
                                disabled={isInherited}
                              />
                              <Label 
                                htmlFor={`permission-${permission.id}`}
                                className={`text-sm cursor-pointer ${isInherited ? 'text-gray-400' : ''}`}
                              >
                                {permission.name}
                                {isInherited && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Inherited
                                  </Badge>
                                )}
                              </Label>
                              <span className="text-xs text-gray-500">
                                {permission.description}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignPermissions}
                  disabled={assignPermissionMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {assignPermissionMutation.isPending ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
