import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Filter, 
  Clock, 
  Users, 
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Resource, Project } from '@shared/schema';
import * as XLSX from 'xlsx';

interface BusinessControllerReportData {
  changeId: number;
  changeTitle: string;
  resourceId: number;
  resourceName: string;
  resourceEmail: string;
  department: string;
  role: string;
  month: string;
  totalActualHours: number;
  changeStatus: string;
  director: string | null;
  changeLead: string | null;
  stream: string | null;
  weeklyBreakdown: Array<{
    weekStartDate: string;
    hours: number;
  }>;
}

interface ReportSummary {
  totalChanges: number;
  totalResources: number;
  totalHours: number;
  avgHoursPerChange: number;
  topResourcesByHours: Array<{
    resourceName: string;
    department: string;
    totalHours: number;
  }>;
  mostActiveChanges: Array<{
    changeTitle: string;
    totalHours: number;
    resourceCount: number;
  }>;
}

export default function BusinessControllerReport() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<BusinessControllerReportData[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const { toast } = useToast();

  // Check if current user has Business Controller role
  const { data: currentUser } = useQuery<{ resource: Resource }>({
    queryKey: ['/api/auth/me'],
  });

  const hasBusinessControllerRole = currentUser?.resource?.roles?.includes('Business Controller');

  // Generate month options (current month ± 12 months)
  const monthOptions = Array.from({ length: 25 }, (_, i) => {
    const date = addMonths(subMonths(new Date(), 12), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  // Generate report data
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      
      const data = await apiRequest('/api/reports/business-controller', {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          showOnlyActive,
        }),
      });
      
      setReportData(data.reportData || []);
      setReportSummary(data.summary || null);
      
      if (data.reportData?.length === 0) {
        toast({
          title: "No Data Found",
          description: `No actual hours logged for changes in ${format(new Date(selectedMonth), 'MMMM yyyy')}.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Report Generated",
          description: `Found ${data.reportData?.length || 0} resource-change combinations with logged hours.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate business controller report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const monthName = format(new Date(selectedMonth), 'MMMM_yyyy');
    
    // Main report sheet
    const reportSheet = XLSX.utils.json_to_sheet(reportData.map(row => ({
      'Change ID': row.changeId,
      'Change Title': row.changeTitle,
      'Resource Name': row.resourceName,
      'Department': row.department,
      'Role': row.role || 'Not specified',
      'Month': format(new Date(row.month), 'MMMM yyyy'),
      'Total Actual Hours': row.totalActualHours,
      'Change Status': row.changeStatus,
      'Director': row.director || 'Not assigned',
      'Change Lead': row.changeLead || 'Not assigned',
      'Stream': row.stream || 'General',
    })));
    
    XLSX.utils.book_append_sheet(workbook, reportSheet, `${monthName}_Actuals`);
    
    // Summary by Change sheet
    const changeSummary = reportData.reduce((acc, row) => {
      const key = `${row.changeId}-${row.changeTitle}`;
      if (!acc[key]) {
        acc[key] = {
          'Change ID': row.changeId,
          'Change Title': row.changeTitle,
          'Total Hours': 0,
          'Resource Count': 0,
          'Status': row.changeStatus,
          'Stream': row.stream || 'General',
        };
      }
      acc[key]['Total Hours'] += row.totalActualHours;
      acc[key]['Resource Count']++;
      return acc;
    }, {} as Record<string, any>);
    
    const changeSummarySheet = XLSX.utils.json_to_sheet(Object.values(changeSummary));
    XLSX.utils.book_append_sheet(workbook, changeSummarySheet, 'Summary_by_Change');
    
    // Summary by Resource sheet
    const resourceSummary = reportData.reduce((acc, row) => {
      const key = `${row.resourceId}-${row.resourceName}`;
      if (!acc[key]) {
        acc[key] = {
          'Resource Name': row.resourceName,
          'Department': row.department,
          'Total Hours': 0,
          'Change Count': 0,
        };
      }
      acc[key]['Total Hours'] += row.totalActualHours;
      acc[key]['Change Count']++;
      return acc;
    }, {} as Record<string, any>);
    
    const resourceSummarySheet = XLSX.utils.json_to_sheet(Object.values(resourceSummary));
    XLSX.utils.book_append_sheet(workbook, resourceSummarySheet, 'Summary_by_Resource');
    
    // Generate filename
    const filename = `Business_Controller_Report_${monthName}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    toast({
      title: "Export Complete",
      description: `Report exported as ${filename}`,
    });
  };

  if (!hasBusinessControllerRole) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only users with "Business Controller" role can access this report.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Controller Report</h1>
          <p className="text-gray-600">Overview of actual hours worked by resource per change</p>
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
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="activeOnly" className="block text-sm font-medium text-gray-700 mb-1">
                Filter Type
              </label>
              <Select value={showOnlyActive ? 'active' : 'all'} onValueChange={(value) => setShowOnlyActive(value === 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="active">Only Active in Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Changes</p>
                  <p className="text-2xl font-bold text-gray-900">{reportSummary.totalChanges}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Resources</p>
                  <p className="text-2xl font-bold text-gray-900">{reportSummary.totalResources}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{reportSummary.totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Hours/Change</p>
                  <p className="text-2xl font-bold text-gray-900">{reportSummary.avgHoursPerChange.toFixed(1)}h</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Report Table */}
      {reportData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Actual Hours by Resource and Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Change Lead</TableHead>
                    <TableHead>Stream</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={`${row.changeId}-${row.resourceId}-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.changeTitle}</p>
                          <p className="text-sm text-gray-600">ID: {row.changeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.resourceName}</p>
                          <p className="text-sm text-gray-600">{row.resourceEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {row.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {row.role || 'Not specified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{row.totalActualHours.toFixed(1)}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.changeStatus === 'active' ? 'default' : 'secondary'}>
                          {row.changeStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{row.changeLead || 'Not assigned'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          {row.stream || 'General'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Resources and Changes */}
      {reportSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Resources by Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Top Resources by Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportSummary.topResourcesByHours.slice(0, 5).map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{resource.resourceName}</p>
                      <p className="text-sm text-gray-600">{resource.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{resource.totalHours.toFixed(1)}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Active Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Most Time-Consuming Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportSummary.mostActiveChanges.slice(0, 5).map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{change.changeTitle}</p>
                      <p className="text-sm text-gray-600">{change.resourceCount} resource(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{change.totalHours.toFixed(1)}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}