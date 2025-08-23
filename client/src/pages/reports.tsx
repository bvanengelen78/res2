import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Download, TrendingUp, Users, Calendar, BarChart3, AlertTriangle, RefreshCw, Target, Trash2, MoreVertical, Clock, Mail, Share2, Filter, Search, Plus } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ReportsGuard } from '@/components/auth/RBACGuard';
import { ChangeAllocationReportModal } from '@/components/change-allocation-report-modal';
import { EmailDeliveryModal } from '@/components/email-delivery-modal';
import { ReportSchedulingModal } from '@/components/report-scheduling-modal';
import type { Resource } from '@shared/schema';
import "@/styles/dashboard-blue-theme.css";

// TypeScript interfaces for report data structures

interface RecentReport {
  id: number;
  name: string;
  type: string;
  generatedAt: string;
  generatedBy: string;
  size: string;
  downloadUrl?: string;
}

interface ReportTemplate {
  title: string;
  description: string;
  icon: any;
  color: string;
  href?: string;
  roleRequired?: string;
  permissions?: string[];
}



export default function Reports() {
  const [isChangeAllocationModalOpen, setIsChangeAllocationModalOpen] = useState(false);
  const [isEmailDeliveryModalOpen, setIsEmailDeliveryModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState<RecentReport | null>(null);
  const [selectedTemplateForScheduling, setSelectedTemplateForScheduling] = useState<ReportTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const { toast } = useToast();

  // Check current user's role
  const { data: currentUser } = useQuery<{ resource: Resource }>({
    queryKey: ['/api/me'],
  });



  // Separate query for recent reports
  const {
    data: recentReports = [],
    isLoading: isLoadingRecentReports,
    refetch: refetchRecentReports
  } = useQuery({
    queryKey: ['/api/reports/recent'],
    queryFn: () => apiRequest('/api/reports/recent'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Report templates with role-based access
  const reportTemplates: ReportTemplate[] = [
    {
      title: 'Resource Utilization Report',
      description: 'Monthly overview of resource allocation and utilization rates',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
      permissions: ['reports'],
    },
    {
      title: 'Capacity Planning Report',
      description: 'Forecast future resource needs based on current projects',
      icon: Users,
      color: 'bg-green-100 text-green-600',
      permissions: ['reports'],
    },
    {
      title: 'Project Timeline Report',
      description: 'Comprehensive overview of all project timelines and milestones',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      permissions: ['reports'],
    },
    {
      title: 'Change Allocation Report',
      description: 'Resource utilization per change with estimated vs actual hours analysis',
      icon: Target,
      color: 'bg-teal-100 text-teal-600',
      permissions: ['reports'],
    },
    {
      title: 'Change Effort Report',
      description: 'View and export estimated vs. actual hours logged per change',
      icon: BarChart3,
      color: 'bg-orange-100 text-orange-600',
      href: '/change-effort-report',
      roleRequired: 'Manager Change',
      permissions: ['change_lead_reports'],
    },
    {
      title: 'Business Controller Report',
      description: 'Overview of actual hours worked by resource per change',
      icon: FileText,
      color: 'bg-indigo-100 text-indigo-600',
      href: '/business-controller-report',
      roleRequired: 'Business Controller',
      permissions: ['reports'],
    },
    {
      title: 'Automated Report Scheduler',
      description: 'Schedule recurring reports with email delivery',
      icon: Clock,
      color: 'bg-amber-100 text-amber-600',
      permissions: ['reports'],
    },
    {
      title: 'Custom Report Builder',
      description: 'Create custom reports with drag-and-drop interface',
      icon: Plus,
      color: 'bg-emerald-100 text-emerald-600',
      permissions: ['reports'],
    },
    {
      title: 'Report Analytics Dashboard',
      description: 'Advanced analytics and trend analysis for reports',
      icon: BarChart3,
      color: 'bg-violet-100 text-violet-600',
      permissions: ['reports'],
    },
  ];

  // Memoized filter templates based on user roles for performance
  const accessibleTemplates = useMemo(() => {
    return reportTemplates.filter(template => {
      if (!template.roleRequired) return true;
      return currentUser?.resource?.roles?.includes(template.roleRequired);
    });
  }, [currentUser?.resource?.roles]);

  // Filtered recent reports based on search and filter criteria
  const filteredRecentReports = useMemo(() => {
    return recentReports.filter(report => {
      const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || report.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [recentReports, searchTerm, filterType]);

  // Get unique report types for filter dropdown
  const reportTypes = useMemo(() => {
    const types = [...new Set(recentReports.map(report => report.type))];
    return types;
  }, [recentReports]);



  // Handle Change Allocation Report generation
  const handleChangeAllocationReport = () => {
    setIsChangeAllocationModalOpen(true);
  };

  // Handle email delivery
  const handleEmailReport = (report: RecentReport) => {
    setSelectedReportForEmail(report);
    setIsEmailDeliveryModalOpen(true);
  };

  // Handle report scheduling
  const handleScheduleReport = (template: ReportTemplate) => {
    setSelectedTemplateForScheduling(template);
    setIsSchedulingModalOpen(true);
  };

  // Handle delete report
  const handleDeleteReport = (reportId: number) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete report
  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeletingReport(true);
    try {
      await apiRequest(`/api/reports/recent/${reportToDelete}`, {
        method: 'DELETE',
      });

      toast({
        title: "Report Deleted",
        description: "The report has been removed from your recent reports.",
      });

      // Refresh the recent reports list
      refetchRecentReports();
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast({
        title: "Error",
        description: "Failed to delete the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingReport(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  // Handle clear all reports
  const handleClearAllReports = async () => {
    try {
      await apiRequest('/api/reports/recent', {
        method: 'DELETE',
      });

      toast({
        title: "All Reports Cleared",
        description: "All recent reports have been removed.",
      });

      // Refresh the recent reports list
      refetchRecentReports();
    } catch (error) {
      console.error('Failed to clear all reports:', error);
      toast({
        title: "Error",
        description: "Failed to clear all reports. Please try again.",
        variant: "destructive",
      });
    }
  };



  return (
    <ReportsGuard
      fallback={
        <main className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
          <div className="max-w-7xl mx-auto">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Access denied. You don't have permission to view reports.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      }
    >
      <main className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Enhanced Header with Gradient Background */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                      Reports
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                      Generate insights and export data for analysis
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">

        {/* Main Content */}
        {/* Report Templates */}
        <Card className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Report Templates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
                  <div className="space-y-4">
                    {accessibleTemplates.map((template) => {
                      const Icon = template.icon;
                      const isDisabled = template.roleRequired && !currentUser?.resource?.roles?.includes(template.roleRequired);

                      return (
                        <div
                          key={template.title}
                          className={`flex items-start space-x-3 p-4 border rounded-lg transition-all duration-200 ${
                            isDisabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-50 hover:shadow-md cursor-pointer'
                          }`}
                        >
                          <div className={`p-2 rounded-full ${template.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{template.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {template.roleRequired && (
                                <Badge variant="outline" className="text-xs">
                                  {template.roleRequired} role required
                                </Badge>
                              )}
                              {['Automated Report Scheduler', 'Custom Report Builder', 'Report Analytics Dashboard'].includes(template.title) && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  Coming Soon
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {template.href ? (
                              <Link href={template.href}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isDisabled}
                                  className="bg-white hover:bg-gray-50"
                                >
                                  Generate
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isDisabled || ['Automated Report Scheduler', 'Custom Report Builder', 'Report Analytics Dashboard'].includes(template.title)}
                                className="bg-white hover:bg-gray-50"
                                onClick={() => {
                                  if (template.title === 'Change Allocation Report') {
                                    handleChangeAllocationReport();
                                  } else if (['Automated Report Scheduler', 'Custom Report Builder', 'Report Analytics Dashboard'].includes(template.title)) {
                                    toast({
                                      title: "Coming Soon",
                                      description: `${template.title} feature is currently in development.`,
                                    });
                                  }
                                }}
                              >
                                {['Automated Report Scheduler', 'Custom Report Builder', 'Report Analytics Dashboard'].includes(template.title) ? 'Coming Soon' : 'Generate'}
                              </Button>
                            )}

                            {/* Schedule Button - only for schedulable reports */}
                            {!['Automated Report Scheduler', 'Custom Report Builder', 'Report Analytics Dashboard'].includes(template.title) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isDisabled}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                                onClick={() => handleScheduleReport(template)}
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="bg-white rounded-xl shadow-sm p-6">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Recent Reports</CardTitle>
                {recentReports.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllReports}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
          </CardHeader>
          <CardContent className="pt-0">
            {/* Quick Stats */}
            {recentReports.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{recentReports.length}</p>
                  <p className="text-sm text-gray-600">Total Reports</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{reportTypes.length}</p>
                  <p className="text-sm text-gray-600">Report Types</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{filteredRecentReports.length}</p>
                  <p className="text-sm text-gray-600">Filtered Results</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {recentReports.filter(r => {
                      const reportDate = new Date(r.generatedAt);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return reportDate >= weekAgo;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-600">This Week</p>
                </div>
              </div>
            )}

            {/* Search and Filter Controls */}
            {recentReports.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {reportTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
                <div className="space-y-4">
                  {isLoadingRecentReports ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-5 w-5" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : filteredRecentReports.length > 0 ? (
                    filteredRecentReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{report.name}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(report.generatedAt), 'MMM dd, yyyy')} •
                              {report.type} •
                              {report.size} •
                              by {report.generatedBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-gray-50"
                            onClick={() => handleEmailReport(report)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-gray-50"
                            onClick={() => {
                              if (report.downloadUrl) {
                                window.open(report.downloadUrl, '_blank');
                              } else {
                                toast({
                                  title: "Download Unavailable",
                                  description: "This report is no longer available for download.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteReport(report.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : recentReports.length > 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No reports match your search criteria</p>
                      <p className="text-sm mt-1">Try adjusting your search or filter settings</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setFilterType('all');
                        }}
                        className="mt-3"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent reports available</p>
                      <p className="text-sm mt-1">Generate your first report to see it here</p>
                    </div>
                  )}
                </div>
          </CardContent>
        </Card>
        </div>
      </main>

      {/* Change Allocation Report Modal */}
      <ChangeAllocationReportModal
        open={isChangeAllocationModalOpen}
        onOpenChange={setIsChangeAllocationModalOpen}
        onReportGenerated={refetchRecentReports}
      />

      {/* Email Delivery Modal */}
      <EmailDeliveryModal
        open={isEmailDeliveryModalOpen}
        onOpenChange={setIsEmailDeliveryModalOpen}
        reportData={selectedReportForEmail ? {
          name: selectedReportForEmail.name,
          type: selectedReportForEmail.type,
          size: selectedReportForEmail.size,
          downloadUrl: selectedReportForEmail.downloadUrl
        } : undefined}
        onEmailSent={() => {
          toast({
            title: "Email Sent",
            description: "Report has been sent successfully.",
          });
        }}
      />

      {/* Report Scheduling Modal */}
      <ReportSchedulingModal
        open={isSchedulingModalOpen}
        onOpenChange={setIsSchedulingModalOpen}
        reportTemplate={selectedTemplateForScheduling ? {
          title: selectedTemplateForScheduling.title,
          type: selectedTemplateForScheduling.title,
          description: selectedTemplateForScheduling.description
        } : undefined}
        onScheduleCreated={() => {
          toast({
            title: "Schedule Created",
            description: "Report schedule has been created successfully.",
          });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingReport}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReport}
              disabled={isDeletingReport}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingReport ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ReportsGuard>
  );
}
