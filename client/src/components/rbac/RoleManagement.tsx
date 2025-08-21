import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Shield, Eye, UserCheck, UserX, Settings, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { RoleGuard } from "@/components/rbac/RoleGuard";
import { SetPasswordDialog } from "@/components/rbac/SetPasswordDialog";
import { PERMISSIONS } from "@shared/schema";
import type { RoleType, PermissionType } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface RolePermissionsEditorProps {
  role: RoleInfo;
  onSave: (permissions: PermissionType[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function RolePermissionsEditor({ role, onSave, onCancel, isLoading }: RolePermissionsEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>(role.permissions);

  const allPermissions: PermissionType[] = [
    'time_logging',
    'dashboard',
    'reports',
    'change_lead_reports',
    'resource_management',
    'project_management',
    'user_management',
    'system_admin',
    'calendar',
    'submission_overview',
    'settings',
    'role_management',
  ];

  const getPermissionDisplayName = (permission: PermissionType): string => {
    switch (permission) {
      case 'time_logging':
        return 'Time Logging';
      case 'reports':
        return 'Reports';
      case 'change_lead_reports':
        return 'Change Lead Reports';
      case 'resource_management':
        return 'Resource Management';
      case 'project_management':
        return 'Project Management';
      case 'user_management':
        return 'User Management';
      case 'system_admin':
        return 'System Administration';
      case 'dashboard':
        return 'Dashboard';
      case 'calendar':
        return 'Calendar';
      case 'submission_overview':
        return 'Submission Overview';
      case 'settings':
        return 'Settings';
      case 'role_management':
        return 'Role Management';
      default:
        return permission;
    }
  };

  const handlePermissionToggle = (permission: PermissionType, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  const handleSave = () => {
    onSave(selectedPermissions);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {allPermissions.map((permission) => (
          <div key={permission} className="flex items-center space-x-2">
            <Checkbox
              id={permission}
              checked={selectedPermissions.includes(permission)}
              onCheckedChange={(checked) => handlePermissionToggle(permission, checked as boolean)}
            />
            <label
              htmlFor={permission}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {getPermissionDisplayName(permission)}
            </label>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </div>
  );
}

const roleAssignmentSchema = z.object({
  resourceId: z.number().min(1, "Resource is required"),
  role: z.string().min(1, "Role is required"),
});

type RoleAssignmentForm = z.infer<typeof roleAssignmentSchema>;

interface User {
  id: number;
  email: string;
  resourceId?: number;
  roles: Array<{ id: number; role: RoleType; resourceId?: number }>;
  permissions: PermissionType[];
  resource?: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

interface RoleInfo {
  role: RoleType;
  permissions: PermissionType[];
}

export function RoleManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{ role: RoleType; resourceId?: number } | null>(null);
  const [editingRole, setEditingRole] = useState<RoleInfo | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Queries
  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/rbac-users"],
    queryFn: async () => {
      const response = await apiRequest("/api/rbac-users");
      // Extract data array from API response wrapper {success: true, data: Array, timestamp: '...'}
      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }
      // Fallback for unexpected response format
      console.warn('[ROLE_MANAGEMENT] Unexpected users response format:', response);
      return [];
    },
    retry: (failureCount, error) => {
      // Don't retry on timeout or connection errors more than once
      if (error?.message?.includes('timeout') || error?.message?.includes('connection')) {
        return failureCount < 1;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/rbac/roles"],
    queryFn: () => apiRequest("/api/rbac/roles"),
  });

  const { data: resources } = useQuery({
    queryKey: ["/api/resources"],
    queryFn: () => apiRequest("/api/resources"),
  });

  // Function to get password audit for a user
  const getPasswordAudit = (userId: number) => {
    return useQuery({
      queryKey: ["/api/admin/users", userId, "password-audit"],
      queryFn: () => apiRequest(`/api/admin/users/${userId}/password-audit`),
      enabled: hasPermission('system_admin'),
      retry: false, // Don't retry on failure
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
  };

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: (data: { resourceId: number; role: string }) =>
      apiRequest("/api/rbac/assign-role", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Role assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rbac/users"] });
      setIsAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign role", description: error.message, variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (data: { userId: number; role: string; resourceId?: number }) =>
      apiRequest("/api/rbac/remove-role", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Role removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rbac/users"] });
      setIsRemoveDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove role", description: error.message, variant: "destructive" });
    },
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: (data: { role: string; permissions: PermissionType[] }) =>
      apiRequest("/api/rbac/update-role-permissions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Role permissions updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/rbac/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rbac/users"] });
      setIsEditRoleDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update role permissions", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<RoleAssignmentForm>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: {
      resourceId: 0,
      role: "",
    },
  });



  const handleAssignRole = (data: RoleAssignmentForm) => {
    assignRoleMutation.mutate(data);
  };



  const handleRemoveRole = () => {
    if (selectedUser && selectedRole) {
      removeRoleMutation.mutate({
        userId: selectedUser.id,
        role: selectedRole.role,
        resourceId: selectedRole.resourceId,
      });
    }
  };

  const handleUpdateRolePermissions = (role: RoleType, permissions: PermissionType[]) => {
    updateRolePermissionsMutation.mutate({ role, permissions });
  };

  const openAssignDialog = (user?: User) => {
    setSelectedUser(user || null);
    form.reset({
      resourceId: 0,
      role: "",
    });
    setIsAssignDialogOpen(true);
  };

  const openEditRoleDialog = (roleInfo: RoleInfo) => {
    setEditingRole(roleInfo);
    setIsEditRoleDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setIsPasswordDialogOpen(true);
  };

  // Component to display password audit info
  const PasswordAuditInfo = ({ user }: { user: User }) => {
    const { data: auditData, isLoading, error } = getPasswordAudit(user.id);

    if (!hasPermission('system_admin')) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="text-xs text-gray-400 mt-1">
          Loading audit...
        </div>
      );
    }

    if (error) {
      // Silently handle audit errors - the feature is optional
      return (
        <div className="text-xs text-gray-400 mt-1">
          Audit unavailable
        </div>
      );
    }

    const lastReset = auditData?.[0];
    if (!lastReset) {
      return (
        <div className="text-xs text-gray-500 mt-1">
          No password reset history
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-xs text-gray-500 mt-1 cursor-help">
              Last reset: {new Date(lastReset.resetAt).toLocaleDateString()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div><strong>Reset by:</strong> {lastReset.adminUser?.email || 'Unknown'}</div>
              <div><strong>Date:</strong> {new Date(lastReset.resetAt).toLocaleString()}</div>
              {lastReset.ipAddress && (
                <div><strong>IP:</strong> {lastReset.ipAddress}</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getRoleDisplayName = (role: RoleType): string => {
    switch (role) {
      case 'regular_user':
        return 'Regular User';
      case 'change_lead':
        return 'Change Lead';
      case 'manager_change':
        return 'Manager Change';
      case 'business_controller':
        return 'Business Controller';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  const getPermissionDisplayName = (permission: PermissionType): string => {
    switch (permission) {
      case 'time_logging':
        return 'Time Logging';
      case 'reports':
        return 'Reports';
      case 'change_lead_reports':
        return 'Change Lead Reports';
      case 'resource_management':
        return 'Resource Management';
      case 'project_management':
        return 'Project Management';
      case 'user_management':
        return 'User Management';
      case 'system_admin':
        return 'System Administration';
      case 'dashboard':
        return 'Dashboard';
      case 'calendar':
        return 'Calendar';
      case 'submission_overview':
        return 'Submission Overview';
      case 'settings':
        return 'Settings';
      case 'role_management':
        return 'Role Management';
      default:
        return permission;
    }
  };

  const getRoleBadgeColor = (role: RoleType): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager_change':
        return 'bg-purple-100 text-purple-800';
      case 'business_controller':
        return 'bg-blue-100 text-blue-800';
      case 'change_lead':
        return 'bg-green-100 text-green-800';
      case 'regular_user':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (usersLoading || rolesLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading role management...</span>
        </div>
        <div className="text-sm text-muted-foreground">
          This may take a moment for large datasets.
        </div>
      </div>
    );
  }

  // Handle errors with retry option
  if (usersError) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            <h3 className="font-medium text-red-800">Failed to load role management data</h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {usersError?.message?.includes('timeout')
              ? 'The request timed out. This usually happens with large datasets or slow connections.'
              : usersError?.message?.includes('connection')
              ? 'Unable to connect to the database. Please check your connection.'
              : 'An error occurred while loading user roles. Please try again.'}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => refetchUsers()}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard permission={PERMISSIONS.ROLE_MANAGEMENT}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users?.filter((user: User) => user.roles.some(r => r.role === 'admin')).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Definitions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Definitions
                </CardTitle>
                <CardDescription>
                  Overview of all available roles and their permissions
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditRoleDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Edit Permissions
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roles?.map((roleInfo: RoleInfo) => (
                <div key={roleInfo.role} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{getRoleDisplayName(roleInfo.role)}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getRoleBadgeColor(roleInfo.role)} whitespace-nowrap max-w-full truncate`}>
                        {roleInfo.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditRoleDialog(roleInfo)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roleInfo.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {getPermissionDisplayName(permission)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Role Management
                </CardTitle>
                <CardDescription>
                  Assign and manage user roles for access control
                </CardDescription>
              </div>
              <Button
                onClick={() => openAssignDialog()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User to Role Management
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div>
                        {user.resource?.name || 'N/A'}
                        <PasswordAuditInfo user={user} />
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.resource ? (
                        <div className="text-sm">
                          <div className="max-w-32 truncate whitespace-nowrap" title={user.resource.role}>{user.resource.role}</div>
                          <div className="text-muted-foreground truncate">{user.resource.department}</div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge
                            key={`${role.role}-${role.resourceId || 'global'}`}
                            className={`${getRoleBadgeColor(role.role)} whitespace-nowrap max-w-full truncate`}
                          >
                            {getRoleDisplayName(role.role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {getPermissionDisplayName(permission)}
                          </Badge>
                        ))}
                        {user.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(user)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {user.roles.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsRemoveDialogOpen(true);
                            }}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                        {hasPermission('system_admin') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordDialog(user)}
                            title="Set/Reset Password"
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Role Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? `Assign a role to ${selectedUser.resource?.name || selectedUser.email}`
                  : "Select a user and assign them a role"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAssignRole)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="resourceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a resource" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {resources?.map((resource: any) => (
                            <SelectItem key={resource.id} value={resource.id.toString()}>
                              {resource.name} ({resource.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles?.map((roleInfo: RoleInfo) => (
                            <SelectItem key={roleInfo.role} value={roleInfo.role}>
                              {getRoleDisplayName(roleInfo.role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignRoleMutation.isPending}>
                    {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Remove Role Dialog */}
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Remove Role</DialogTitle>
              <DialogDescription>
                Select a role to remove from {selectedUser?.resource?.name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                {selectedUser?.roles.map((role) => (
                  <div
                    key={`${role.role}-${role.resourceId || 'global'}`}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{getRoleDisplayName(role.role)}</div>
                      {role.resourceId && (
                        <div className="text-sm text-muted-foreground">
                          Resource ID: {role.resourceId}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRole({ role: role.role, resourceId: role.resourceId });
                        handleRemoveRole();
                      }}
                      disabled={removeRoleMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



        {/* Edit Role Permissions Dialog */}
        <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Role Permissions</DialogTitle>
              <DialogDescription>
                {editingRole 
                  ? `Configure permissions for ${getRoleDisplayName(editingRole.role)}`
                  : "Configure role permissions"
                }
              </DialogDescription>
            </DialogHeader>

            {editingRole && (
              <RolePermissionsEditor
                role={editingRole}
                onSave={(permissions) => handleUpdateRolePermissions(editingRole.role, permissions)}
                onCancel={() => setIsEditRoleDialogOpen(false)}
                isLoading={updateRolePermissionsMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Set Password Dialog */}
        <SetPasswordDialog
          user={selectedUser}
          isOpen={isPasswordDialogOpen}
          onClose={() => {
            setIsPasswordDialogOpen(false);
            setSelectedUser(null);
          }}
        />
      </div>
    </RoleGuard>
  );
}