import { UserManagement } from '@/components/admin/UserManagement'
import { EnhancedUserManagement } from '@/components/admin/EnhancedUserManagement'
import { RoleHierarchyManager } from '@/components/admin/RoleHierarchyManager'
import { PermissionAssignmentInterface } from '@/components/admin/PermissionAssignmentInterface'
import { AdminGuard } from '@/components/auth/RBACGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Users, Key, Settings } from 'lucide-react'

export default function UserManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage user accounts, roles, and permissions
              </p>
            </div>
          </div>
        </div>

        {/* Admin Guard */}
        <AdminGuard
          fallback={
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-red-700">Access Denied</CardTitle>
                </div>
                <CardDescription>
                  You don't have permission to access user management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This page requires administrator privileges. Please contact your system administrator if you need access.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          }
        >
          <div className="space-y-8">
            {/* Enhanced Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
              <div className="relative max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">User & Role Management</h1>
                    <p className="text-blue-100">
                      Comprehensive administration of users, roles, and permissions
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-8 h-8 text-blue-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Management Interface Tabs */}
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role Hierarchy
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Permission Assignment
                </TabsTrigger>
                <TabsTrigger value="legacy" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Legacy Interface
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-6">
                <EnhancedUserManagement />
              </TabsContent>

              <TabsContent value="roles" className="space-y-6">
                <RoleHierarchyManager />
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6">
                <PermissionAssignmentInterface />
              </TabsContent>

              <TabsContent value="legacy" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>Legacy User Management</span>
                    </CardTitle>
                    <CardDescription>
                      Original user management interface for reference
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UserManagement />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </AdminGuard>
      </div>
    </div>
  )
}
