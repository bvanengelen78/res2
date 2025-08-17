import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Resource, Project, ResourceAllocation, TimeEntry } from '@shared/schema';
import * as XLSX from 'xlsx';

interface ChangeEffortData {
  changeId: number;
  changeTitle: string;
  changeDescription: string;
  project: Project;
  resources: Array<{
    resourceId: number;
    resourceName: string;
    department: string;
    estimatedHours: number;
    actualHours: number;
    deviation: number;
    deviationPercentage: number;
    missingTimeLogs: boolean;
    allocation: ResourceAllocation;
  }>;
  totalEstimatedHours: number;
  totalActualHours: number;
  totalDeviation: number;
  totalDeviationPercentage: number;
  changeLead: Resource | null;
  status: string;
}

export default function ChangeEffortReport() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ChangeEffortData[]>([]);
  const { toast } = useToast();

  // Fetch projects (filtered for Change type)
  const { data: changeProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    select: (projects) => projects.filter(p => p.type === 'change'),
  });

  // Check if current user has Manager Change role
  const { data: currentUser } = useQuery<{ resource: Resource }>({
    queryKey: ['/api/auth/me'],
  });

  const hasManagerChangeRole = currentUser?.resource?.roles?.includes('Manager Change');

  // Generate report data
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const data = await apiRequest('/api/reports/change-effort', {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          projectId: selectedProject === 'all' ? undefined : parseInt(selectedProject),
        }),
      });
      setReportData(data);
      
      if (data.length === 0) {
        toast({
          title: "No Data Found",
          description: "No change effort data found for the selected date range and project filter.",
          variant: "default",
        });
      } else {
        toast({
          title: "Report Generated",
          description: `Found ${data.length} change(s) with effort data.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate change effort report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = reportData.map(change => ({
      'Change ID': change.changeId,
      'Change Title': change.changeTitle,
      'Project': change.project.name,
      'Status': change.status,
      'Change Lead': change.changeLead?.name || 'Not assigned',
      'Total Estimated Hours': change.totalEstimatedHours,
      'Total Actual Hours': change.totalActualHours,
      'Total Deviation (Hours)': change.totalDeviation,
      'Total Deviation (%)': `${change.totalDeviationPercentage.toFixed(1)}%`,
      'Department': change.project.stream || 'General',
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Detailed sheet
    const detailedData: any[] = [];
    reportData.forEach(change => {
      change.resources.forEach(resource => {
        detailedData.push({
          'Change ID': change.changeId,
          'Change Title': change.changeTitle,
          'Resource Name': resource.resourceName,
          'Department': resource.department,
          'Estimated Hours': resource.estimatedHours,
          'Actual Hours': resource.actualHours,
          'Deviation (Hours)': resource.deviation,
          'Deviation (%)': `${resource.deviationPercentage.toFixed(1)}%`,
          'Missing Time Logs': resource.missingTimeLogs ? 'Yes' : 'No',
          'Allocation Role': resource.allocation.role,
          'Allocation Status': resource.allocation.status,
          'Project': change.project.name,
          'Change Lead': change.changeLead?.name || 'Not assigned',
        });
      });
    });
    
    const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed');
    
    // Generate filename
    const filename = `Change_Effort_Report_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export Complete",
      description: `Report exported as ${filename}`,
    });
  };

  const getDeviationColor = (percentage: number) => {
    if (percentage > 10) return 'text-red-600 bg-red-50';
    if (percentage < -10) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getDeviationIcon = (percentage: number) => {
    if (percentage > 10) return <TrendingUp className="h-4 w-4" />;
    if (percentage < -10) return <TrendingDown className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (!hasManagerChangeRole) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only users with "Manager Change" role can access this report.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Change Effort Report</h1>
          <p className="text-gray-600">View and export estimated vs. actual hours per change</p>
        </div>
        {reportData.length > 0 && (
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="project">Project Filter</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {changeProjects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Changes</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.length}</p>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Estimated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.reduce((sum, change) => sum + change.totalEstimatedHours, 0).toFixed(1)}h
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Actual</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.reduce((sum, change) => sum + change.totalActualHours, 0).toFixed(1)}h
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overall Deviation</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.reduce((sum, change) => sum + change.totalDeviation, 0).toFixed(1)}h
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Report Table */}
          <Card>
            <CardHeader>
              <CardTitle>Change Effort Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Change</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Estimated</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Deviation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Missing Logs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((change) =>
                      change.resources.map((resource, index) => (
                        <TableRow key={`${change.changeId}-${resource.resourceId}`}>
                          {index === 0 && (
                            <TableCell rowSpan={change.resources.length} className="font-medium">
                              <div>
                                <p className="font-semibold">{change.changeTitle}</p>
                                <p className="text-sm text-gray-600">{change.project.name}</p>
                                {change.changeLead && (
                                  <p className="text-xs text-gray-500">Lead: {change.changeLead.name}</p>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <p className="font-medium">{resource.resourceName}</p>
                              <p className="text-sm text-gray-600">{resource.allocation.role}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {resource.department}
                            </Badge>
                          </TableCell>
                          <TableCell>{resource.estimatedHours.toFixed(1)}h</TableCell>
                          <TableCell>{resource.actualHours.toFixed(1)}h</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${getDeviationColor(resource.deviationPercentage)}`}>
                              {getDeviationIcon(resource.deviationPercentage)}
                              <span className="text-sm font-medium">
                                {resource.deviation > 0 ? '+' : ''}{resource.deviation.toFixed(1)}h
                              </span>
                              <span className="text-xs">
                                ({resource.deviationPercentage > 0 ? '+' : ''}{resource.deviationPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={resource.allocation.status === 'active' ? 'default' : 'secondary'}>
                              {resource.allocation.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {resource.missingTimeLogs ? (
                              <Badge variant="destructive">Missing</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700">Complete</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Change Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportData.map((change) => (
              <Card key={change.changeId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{change.changeTitle}</CardTitle>
                  <p className="text-sm text-gray-600">{change.project.name}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estimated:</span>
                      <span className="font-medium">{change.totalEstimatedHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actual:</span>
                      <span className="font-medium">{change.totalActualHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Deviation:</span>
                      <span className={`font-medium ${change.totalDeviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {change.totalDeviation > 0 ? '+' : ''}{change.totalDeviation.toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Resources:</span>
                      <span className="font-medium">{change.resources.length}</span>
                    </div>
                    {change.changeLead && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Lead:</span>
                        <span className="font-medium text-sm">{change.changeLead.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reportData.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No data available for the selected date range.</p>
              <p className="text-sm text-gray-500 mt-2">
                Generate a report to view change effort analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}