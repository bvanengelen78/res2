import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Plus, Edit, Trash2, Users, Key, AlertCircle, Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'
import { useToast } from '@/hooks/use-toast'
import type { UserRole, PermissionType } from '@/types/rbac'

interface Role {
  id: number
  name: string
  display_name: string
  description: string
  is_active: boolean
  created_at: string
  permissions: Permission[]
  user_count?: number
}

interface Permission {
  id: number
  name: string
  description: string
  category: string
  is_active: boolean
}

interface CreateRoleData {
  name: string
  display_name: string
  description: string
  permissions: number[]
}

export function RoleHierarchyManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [createRoleData, setCreateRoleData] = useState<CreateRoleData>({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  })
  const { user: currentUser } = useSupabaseAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch roles with permissions and user counts
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['admin', 'roles-hierarchy'],
    queryFn: async () => {
      const { data: rolesData, error: rolesError } = await supabase
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

      if (rolesError) throw rolesError

      // Get user counts for each role
      const rolesWithCounts = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)
            .eq('is_active', true)

          return {
            ...role,
            permissions: role.role_permissions?.map(rp => rp.permissions).filter(Boolean) || [],
            user_count: count || 0
          }
        })
      )

      return rolesWithCounts as Role[]
    },
  })

  // Fetch all available permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['admin', 'all-permissions'],
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

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      // Create the role
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: roleData.name,
          display_name: roleData.display_name,
          description: roleData.description,
        })
        .select()
        .single()

      if (roleError) throw roleError

      // Assign permissions to the role
      if (roleData.permissions.length > 0) {
        const rolePermissions = roleData.permissions.map(permissionId => ({
          role_id: newRole.id,
          permission_id: permissionId
        }))

        const { error: permissionsError } = await supabase
          .from('role_permissions')
          .insert(rolePermissions)

        if (permissionsError) throw permissionsError
      }

      return newRole
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles-hierarchy'] })
      setIsCreateDialogOpen(false)
      setCreateRoleData({ name: '', display_name: '', description: '', permissions: [] })
      toast({
        title: 'Role Created',
        description: 'New role has been successfully created.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create role: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      // Check if role has users assigned
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)
        .eq('is_active', true)

      if (count && count > 0) {
        throw new Error('Cannot delete role with assigned users')
      }

      // Deactivate the role
      const { error } = await supabase
        .from('roles')
        .update({ is_active: false })
        .eq('id', roleId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles-hierarchy'] })
      toast({
        title: 'Role Deleted',
        description: 'Role has been successfully deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete role: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  const handleCreateRole = () => {
    if (!createRoleData.name || !createRoleData.display_name) {
      toast({
        title: 'Validation Error',
        description: 'Role name and display name are required.',
        variant: 'destructive',
      })
      return
    }

    createRoleMutation.mutate(createRoleData)
  }

  const handleDeleteRole = (role: Role) => {
    if (role.user_count && role.user_count > 0) {
      toast({
        title: 'Cannot Delete Role',
        description: `This role has ${role.user_count} user(s) assigned. Remove all users before deleting.`,
        variant: 'destructive',
      })
      return
    }

    if (confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      deleteRoleMutation.mutate(role.id)
    }
  }

  const handlePermissionToggle = (permissionId: number, checked: boolean) => {
    setCreateRoleData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(id => id !== permissionId)
    }))
  }

  const getRoleHierarchyLevel = (roleName: string): number => {
    switch (roleName) {
      case 'admin': return 3
      case 'manager': return 2
      case 'user': return 1
      default: return 0
    }
  }

  const sortedRoles = roles?.sort((a, b) => getRoleHierarchyLevel(b.name) - getRoleHierarchyLevel(a.name))

  if (rolesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load roles: {rolesError.message}
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
                <Shield className="w-5 h-5" />
                <span>Role Hierarchy Management</span>
              </CardTitle>
              <CardDescription>
                Manage roles, permissions, and access hierarchy
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Define a new role with specific permissions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input
                        id="role-name"
                        placeholder="e.g., project_manager"
                        value={createRoleData.name}
                        onChange={(e) => setCreateRoleData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        placeholder="e.g., Project Manager"
                        value={createRoleData.display_name}
                        onChange={(e) => setCreateRoleData(prev => ({ ...prev, display_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the role's responsibilities..."
                      value={createRoleData.description}
                      onChange={(e) => setCreateRoleData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Permissions</Label>
                    <div className="mt-2 space-y-4 max-h-64 overflow-y-auto">
                      {allPermissions && Object.entries(
                        allPermissions.reduce((acc, permission) => {
                          const category = permission.category || 'General'
                          if (!acc[category]) acc[category] = []
                          acc[category].push(permission)
                          return acc
                        }, {} as Record<string, Permission[]>)
                      ).map(([category, permissions]) => (
                        <div key={category}>
                          <h4 className="font-medium text-sm mb-2">{category}</h4>
                          <div className="space-y-2 ml-4">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={createRoleData.permissions.includes(permission.id)}
                                  onCheckedChange={(checked) => 
                                    handlePermissionToggle(permission.id, checked as boolean)
                                  }
                                />
                                <Label 
                                  htmlFor={`permission-${permission.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {permission.name}
                                </Label>
                                <span className="text-xs text-gray-500">
                                  {permission.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateRole}
                      disabled={createRoleMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {rolesLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading roles...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRoles?.map((role) => (
                <Card key={role.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          getRoleHierarchyLevel(role.name) === 3 ? 'bg-red-500' :
                          getRoleHierarchyLevel(role.name) === 2 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <div>
                          <CardTitle className="text-base">{role.display_name}</CardTitle>
                          <CardDescription>{role.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{role.user_count} users</span>
                        </Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Key className="w-3 h-3" />
                          <span>{role.permissions.length} permissions</span>
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteRole(role)}
                          disabled={deleteRoleMutation.isPending || (role.user_count && role.user_count > 0)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Permissions</h4>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <Badge key={permission.id} variant="secondary" className="text-xs">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
