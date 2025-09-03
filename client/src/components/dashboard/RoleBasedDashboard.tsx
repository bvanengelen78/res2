// Authentication removed - public access
// RBAC guards removed - public access
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  Clock, 
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { Link } from 'wouter'

export function RoleBasedDashboard() {
  // Authentication removed - public access
  const user = { name: 'Demo User', email: 'demo@example.com' }
  const hasRole = () => true
  const hasPermission = () => true

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.email?.split('@')[0]}!
            </h2>
            <p className="text-gray-600 mt-1">
              Here's what you can do based on your role
            </p>
          </div>
          <div className="flex gap-2">
            {hasRole('admin') && (
              <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            {hasRole('manager') && (
              <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                <BarChart3 className="h-3 w-3 mr-1" />
                Manager
              </Badge>
            )}
            {hasRole('user') && (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <Clock className="h-3 w-3 mr-1" />
                User
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Admin Dashboard */}
      <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5" />
              Administrator Dashboard
            </CardTitle>
            <CardDescription>
              Full system access and user management capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/user-management">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-red-200 hover:bg-red-50">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">User Management</div>
                      <div className="text-sm text-gray-600">Manage users and roles</div>
                    </div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-red-200 hover:bg-red-50">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">System Settings</div>
                      <div className="text-sm text-gray-600">Configure system</div>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-red-200 hover:bg-red-50">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">All Reports</div>
                      <div className="text-sm text-gray-600">Access all reports</div>
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      {/* Manager Dashboard */}
      <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <BarChart3 className="h-5 w-5" />
              Manager Dashboard
            </CardTitle>
            <CardDescription>
              Team management and reporting capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/resources">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-blue-200 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Resource Management</div>
                      <div className="text-sm text-gray-600">Manage team resources</div>
                    </div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/projects">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-blue-200 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Project Management</div>
                      <div className="text-sm text-gray-600">Oversee projects</div>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-blue-200 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Team Reports</div>
                      <div className="text-sm text-gray-600">View team metrics</div>
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      {/* User Dashboard */}
      <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Clock className="h-5 w-5" />
              User Dashboard
            </CardTitle>
            <CardDescription>
              Time tracking and personal productivity tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/mobile-time-logging">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-green-200 hover:bg-green-50">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Time Logging</div>
                      <div className="text-sm text-gray-600">Track your time</div>
                    </div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/calendar">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-green-200 hover:bg-green-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Calendar</div>
                      <div className="text-sm text-gray-600">View your schedule</div>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/submission-overview">
                <Button variant="outline" className="w-full justify-start h-auto p-4 border-green-200 hover:bg-green-50">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">My Submissions</div>
                      <div className="text-sm text-gray-600">View your work</div>
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      {/* Permission-Based Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Actions available based on your permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hasPermission('time_logging') && (
              <Link href="/mobile-time-logging">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <Clock className="h-3 w-3 mr-1" />
                  Log Time
                </Badge>
              </Link>
            )}
            {hasPermission('reports') && (
              <Link href="/reports">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  View Reports
                </Badge>
              </Link>
            )}
            {hasPermission('resource_management') && (
              <Link href="/resources">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <Users className="h-3 w-3 mr-1" />
                  Manage Resources
                </Badge>
              </Link>
            )}
            {hasPermission('project_management') && (
              <Link href="/projects">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Manage Projects
                </Badge>
              </Link>
            )}
            {hasPermission('user_management') && (
              <Link href="/user-management">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <Shield className="h-3 w-3 mr-1" />
                  Manage Users
                </Badge>
              </Link>
            )}
            {hasPermission('settings') && (
              <Link href="/settings">
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Badge>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
