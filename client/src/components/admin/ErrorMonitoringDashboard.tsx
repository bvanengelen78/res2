import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, RefreshCw, Download, Trash2, Eye } from 'lucide-react'
import { useErrorHandler, type ErrorReport } from '@/lib/error-handler'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function ErrorMonitoringDashboard() {
  const { getRecentErrors, clearErrors } = useErrorHandler()
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  useEffect(() => {
    loadErrors()
  }, [])

  const loadErrors = () => {
    const recentErrors = getRecentErrors(50)
    setErrors(recentErrors)
  }

  const handleClearErrors = () => {
    clearErrors()
    setErrors([])
  }

  const handleExportErrors = () => {
    const dataStr = JSON.stringify(errors, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `error-report-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getSeverityColor = (severity: ErrorReport['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getErrorsByComponent = () => {
    const componentErrors = errors.reduce((acc, error) => {
      const component = error.context.component || 'Unknown'
      if (!acc[component]) {
        acc[component] = []
      }
      acc[component].push(error)
      return acc
    }, {} as Record<string, ErrorReport[]>)

    return Object.entries(componentErrors).map(([component, errors]) => ({
      component,
      count: errors.length,
      lastError: errors[errors.length - 1],
      severities: errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }))
  }

  const getErrorsByAction = () => {
    const actionErrors = errors.reduce((acc, error) => {
      const action = error.context.action || 'Unknown'
      if (!acc[action]) {
        acc[action] = []
      }
      acc[action].push(error)
      return acc
    }, {} as Record<string, ErrorReport[]>)

    return Object.entries(actionErrors).map(([action, errors]) => ({
      action,
      count: errors.length,
      lastError: errors[errors.length - 1]
    }))
  }

  const componentStats = getErrorsByComponent()
  const actionStats = getErrorsByAction()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Error Monitoring Dashboard</span>
              </CardTitle>
              <CardDescription>
                Monitor and analyze application errors for better debugging and user experience
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={loadErrors}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportErrors} disabled={errors.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearErrors} disabled={errors.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {errors.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No errors recorded. This is good news! Errors will appear here when they occur.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="recent" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="recent">Recent Errors ({errors.length})</TabsTrigger>
                <TabsTrigger value="components">By Component ({componentStats.length})</TabsTrigger>
                <TabsTrigger value="actions">By Action ({actionStats.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(-20).reverse().map((error) => (
                        <TableRow key={error.id}>
                          <TableCell className="text-sm">
                            {new Date(error.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{error.context.component || 'N/A'}</TableCell>
                          <TableCell>{error.context.action || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {error.error.message}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedError(error)
                                setIsDetailDialogOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="components" className="space-y-4">
                <div className="grid gap-4">
                  {componentStats.map(({ component, count, lastError, severities }) => (
                    <Card key={component}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{component}</CardTitle>
                          <Badge variant="outline">{count} errors</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex space-x-2">
                            {Object.entries(severities).map(([severity, count]) => (
                              <Badge key={severity} className={getSeverityColor(severity as ErrorReport['severity'])}>
                                {severity}: {count}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-gray-500">
                            Last: {new Date(lastError.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="grid gap-4">
                  {actionStats.map(({ action, count, lastError }) => (
                    <Card key={action}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{action}</CardTitle>
                          <Badge variant="outline">{count} errors</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Component: {lastError.context.component || 'N/A'}
                          </span>
                          <span className="text-gray-500">
                            Last: {new Date(lastError.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected error
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Error ID</label>
                  <p className="text-sm text-gray-600">{selectedError.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedError.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Badge className={getSeverityColor(selectedError.severity)}>
                    {selectedError.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Component</label>
                  <p className="text-sm text-gray-600">{selectedError.context.component || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {selectedError.error.message}
                </p>
              </div>

              {selectedError.error.stack && (
                <div>
                  <label className="text-sm font-medium">Stack Trace</label>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {selectedError.error.stack}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Context</label>
                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(selectedError.context, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
