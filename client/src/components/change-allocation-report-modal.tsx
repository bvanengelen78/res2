import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Target, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Project, Resource } from '@shared/schema';
import * as XLSX from 'xlsx';

interface ChangeAllocationReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportGenerated?: () => void; // Callback to refresh recent reports
}

interface ReportCriteria {
  startDate: string;
  endDate: string;
  projectIds: number[];
  resourceIds: number[];
  groupBy: 'project' | 'resource';
}

export function ChangeAllocationReportModal({ open, onOpenChange, onReportGenerated }: ChangeAllocationReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [criteria, setCriteria] = useState<ReportCriteria>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    projectIds: [],
    resourceIds: [],
    groupBy: 'project',
  });
  const { toast } = useToast();

  // Fetch projects (filtered for Change type)
  const { data: changeProjects = [], isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    select: (projects) => projects.filter(p => p.type === 'change'),
  });

  // Fetch resources
  const { data: resources = [], isLoading: resourcesLoading, error: resourcesError } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
  });

  // Handle project selection
  const handleProjectToggle = (projectId: number) => {
    setCriteria(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }));
  };

  // Handle resource selection
  const handleResourceToggle = (resourceId: number) => {
    setCriteria(prev => ({
      ...prev,
      resourceIds: prev.resourceIds.includes(resourceId)
        ? prev.resourceIds.filter(id => id !== resourceId)
        : [...prev.resourceIds, resourceId]
    }));
  };

  // Handle select all projects
  const handleSelectAllProjects = () => {
    setCriteria(prev => ({
      ...prev,
      projectIds: prev.projectIds.length === changeProjects.length 
        ? [] 
        : changeProjects.map(p => p.id)
    }));
  };

  // Handle select all resources
  const handleSelectAllResources = () => {
    setCriteria(prev => ({
      ...prev,
      resourceIds: prev.resourceIds.length === resources.length 
        ? [] 
        : resources.map(r => r.id)
    }));
  };

  // Generate report and export to Excel
  const handleGenerateReport = async () => {
    if (criteria.projectIds.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one project to generate the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('/api/reports/change-allocation', {
        method: 'POST',
        body: JSON.stringify(criteria),
      });

      // Handle both old and new response formats
      const reportData = response.data || response;
      const metadata = response.metadata;

      if (reportData.length === 0) {
        toast({
          title: "No Data Found",
          description: "No allocation data found for the selected criteria.",
          variant: "default",
        });
        setIsGenerating(false);
        return;
      }

      console.log('[MODAL] Report metadata:', metadata);

      // Generate Excel file
      const workbook = XLSX.utils.book_new();

      // Main report sheet
      const reportSheet = XLSX.utils.json_to_sheet(reportData.map(row => ({
        'Change ID': row.changeId,
        'Change Title': row.changeTitle,
        'Change Status': row.projectStatus,
        'Stream': row.projectStream || 'General',
        'Change Lead': row.changeLeadName,
        'Resource Name': row.resourceName,
        'Resource Department': row.resourceDepartment,
        'Resource Role': row.allocationRole || 'Not specified',
        'Estimated Hours': row.estimatedHours.toFixed(2),
        'Allocated Hours': row.allocatedHours.toFixed(2),
        'Actual Hours': row.actualHours.toFixed(2),
        'Variance (Hours)': row.variance.toFixed(2),
        'Variance (%)': `${row.variancePercentage.toFixed(1)}%`,
        'Utilization Rate (%)': `${row.utilizationRate.toFixed(1)}%`,
      })));

      XLSX.utils.book_append_sheet(workbook, reportSheet, 'Change Allocation Report');

      // Weekly breakdown sheet if available
      const weeklyData = [];
      reportData.forEach(row => {
        if (row.weeklyBreakdown && row.weeklyBreakdown.length > 0) {
          row.weeklyBreakdown.forEach(week => {
            weeklyData.push({
              'Change ID': row.changeId,
              'Change Title': row.changeTitle,
              'Resource Name': row.resourceName,
              'Week Start Date': week.weekStartDate,
              'Hours Logged': week.hours.toFixed(2),
            });
          });
        }
      });

      if (weeklyData.length > 0) {
        const weeklySheet = XLSX.utils.json_to_sheet(weeklyData);
        XLSX.utils.book_append_sheet(workbook, weeklySheet, 'Weekly Breakdown');
      }

      // Summary sheet
      const totalEstimated = reportData.reduce((sum, row) => sum + row.estimatedHours, 0);
      const totalAllocated = reportData.reduce((sum, row) => sum + row.allocatedHours, 0);
      const totalActual = reportData.reduce((sum, row) => sum + row.actualHours, 0);
      const totalVariance = totalActual - totalAllocated;
      const avgUtilization = reportData.length > 0
        ? reportData.reduce((sum, row) => sum + row.utilizationRate, 0) / reportData.length
        : 0;

      const summarySheet = XLSX.utils.json_to_sheet([{
        'Metric': 'Total Estimated Hours',
        'Value': totalEstimated.toFixed(2),
      }, {
        'Metric': 'Total Allocated Hours',
        'Value': totalAllocated.toFixed(2),
      }, {
        'Metric': 'Total Actual Hours',
        'Value': totalActual.toFixed(2),
      }, {
        'Metric': 'Total Variance (Hours)',
        'Value': totalVariance.toFixed(2),
      }, {
        'Metric': 'Total Variance (%)',
        'Value': totalAllocated > 0 ? `${((totalVariance / totalAllocated) * 100).toFixed(1)}%` : '0%',
      }, {
        'Metric': 'Average Utilization Rate (%)',
        'Value': `${avgUtilization.toFixed(1)}%`,
      }, {
        'Metric': 'Number of Allocations',
        'Value': reportData.length,
      }]);

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Metadata sheet
      const metadataSheet = XLSX.utils.json_to_sheet([{
        'Report Type': 'Change Allocation Report',
        'Generated At': format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        'Date Range': `${criteria.startDate} to ${criteria.endDate}`,
        'Projects Selected': criteria.projectIds.length,
        'Resources Filter': criteria.resourceIds.length > 0 ? `${criteria.resourceIds.length} selected` : 'All resources',
        'Grouped By': criteria.groupBy === 'project' ? 'Project/Change' : 'Resource',
        'Export Version': '1.0',
      }]);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

      // Generate filename and download
      const dateRange = `${format(new Date(criteria.startDate), 'MMM_dd')}_to_${format(new Date(criteria.endDate), 'MMM_dd_yyyy')}`;
      const filename = `Change_Allocation_Report_${dateRange}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      // Calculate file size estimate (rough approximation)
      const estimatedSize = `${(reportData.length * 0.5 + 0.5).toFixed(1)} MB`;

      // Add to recent reports
      try {
        console.log('Adding report to recent reports...', {
          name: `Change Allocation Report – ${format(new Date(criteria.startDate), 'MMMM yyyy')}`,
          type: 'Change Allocation',
          size: estimatedSize,
          criteria: criteria
        });

        const response = await apiRequest('/api/reports/recent', {
          method: 'POST',
          body: JSON.stringify({
            name: `Change Allocation Report – ${format(new Date(criteria.startDate), 'MMMM yyyy')}`,
            type: 'Change Allocation',
            size: estimatedSize,
            criteria: criteria
          }),
        });

        console.log('Successfully added report to recent reports:', response);

        // Trigger refresh of recent reports
        if (onReportGenerated) {
          onReportGenerated();
        }
      } catch (error) {
        console.error('Failed to add report to recent reports:', error);
        // Don't fail the entire operation if this fails
        toast({
          title: "Warning",
          description: "Report generated successfully, but failed to add to recent reports.",
          variant: "destructive",
        });
      }

      // Handle successful report generation
      toast({
        title: "Report Generated",
        description: `Change Allocation Report exported as ${filename}`,
      });

      // Close modal
      onOpenChange(false);

    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate Change Allocation Report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-teal-600" />
            <span>Generate Change Allocation Report</span>
          </DialogTitle>
          <DialogDescription>
            Configure report criteria to analyze resource utilization per change with estimated vs actual hours.
          </DialogDescription>
        </DialogHeader>

        {/* Loading and Error States */}
        {(projectsLoading || resourcesLoading) && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Loading data...</span>
          </div>
        )}

        {(projectsError || resourcesError) && (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Error loading data. Please try again.</span>
          </div>
        )}

        {!projectsLoading && !resourcesLoading && !projectsError && !resourcesError && (
          <div className="space-y-6">
            {/* Time Range Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Time Range</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-xs text-gray-600">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={criteria.startDate}
                  onChange={(e) => setCriteria(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-xs text-gray-600">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={criteria.endDate}
                  onChange={(e) => setCriteria(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Projects Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Projects (Changes)</Label>
                <Badge variant="outline" className="text-xs">
                  {criteria.projectIds.length} selected
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllProjects}
                className="text-xs"
              >
                {criteria.projectIds.length === changeProjects.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-32 border rounded-md p-3">
              <div className="space-y-2">
                {changeProjects.map((project) => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={criteria.projectIds.includes(project.id)}
                      onCheckedChange={() => handleProjectToggle(project.id)}
                    />
                    <Label
                      htmlFor={`project-${project.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {project.name}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                ))}
                {changeProjects.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No change projects found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Resources Selection (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Resources (Optional)</Label>
                <Badge variant="outline" className="text-xs">
                  {criteria.resourceIds.length > 0 ? `${criteria.resourceIds.length} selected` : 'All resources'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllResources}
                className="text-xs"
              >
                {criteria.resourceIds.length === resources.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-32 border rounded-md p-3">
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`resource-${resource.id}`}
                      checked={criteria.resourceIds.includes(resource.id)}
                      onCheckedChange={() => handleResourceToggle(resource.id)}
                    />
                    <Label
                      htmlFor={`resource-${resource.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {resource.name}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {resource.department}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Grouping Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Group By</Label>
            <Select
              value={criteria.groupBy}
              onValueChange={(value: 'project' | 'resource') => 
                setCriteria(prev => ({ ...prev, groupBy: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project/Change</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || criteria.projectIds.length === 0 || projectsLoading || resourcesLoading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
