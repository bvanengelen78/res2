import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Download, Send, Eye, CheckCircle, XCircle, Filter, Users, FileText, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";
import type { Department, Resource, WeeklySubmission } from "@shared/schema";
import { PermissionGuard } from "@/components/auth/RBACGuard";
import "@/styles/dashboard-blue-theme.css";

interface SubmissionOverview {
  resource: Resource;
  department: Department;
  submission: WeeklySubmission | null;
  hasTimeEntries: boolean;
}

interface WeeklyStats {
  totalResources: number;
  submitted: number;
  notSubmitted: number;
  byDepartment: Record<string, { total: number; submitted: number; notSubmitted: number }>;
}

function getWeekOptions() {
  const options = [];
  const today = new Date();
  
  // Generate last 8 weeks including current week
  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const label = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    
    options.push({
      value: weekStartStr,
      label,
      isCurrent: i === 0,
    });
  }
  
  return options;
}

export default function SubmissionOverview() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [sendReminderDialog, setSendReminderDialog] = useState<{ isOpen: boolean; resourceIds: number[] }>({
    isOpen: false,
    resourceIds: [],
  });
  const [exportLoading, setExportLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const weekOptions = getWeekOptions();

  // Fetch departments for filter
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/settings/departments"],
  });

  // Fetch submission overview data
  const { data: submissionData = [], isLoading } = useQuery<SubmissionOverview[]>({
    queryKey: ["/api/time-logging/submission-overview", selectedWeek, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({ week: selectedWeek });
      if (selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }
      
      const response = await apiRequest(`/api/time-logging/submission-overview?${params}`);
      
      // Debug logging to check data
      console.log("Submission Overview Data:", response);
      response.forEach((item: any) => {
        if (item.resource.name === "Rob Beckers") {
          console.log("Rob Beckers submission data:", item);
        }
      });
      
      return response;
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (resourceIds: number[]) => {
      return await apiRequest("/api/time-logging/send-reminders", {
        method: "POST",
        body: JSON.stringify({
          weekStartDate: selectedWeek,
          resourceIds,
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Reminders Sent",
        description: `Successfully sent ${data.sentCount} reminder emails.`,
      });
      setSendReminderDialog({ isOpen: false, resourceIds: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-logging/submission-overview"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminders. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate stats
  const stats: WeeklyStats = {
    totalResources: submissionData.length,
    submitted: submissionData.filter(item => item.submission && item.submission.isSubmitted).length,
    notSubmitted: submissionData.filter(item => !item.submission || !item.submission.isSubmitted).length,
    byDepartment: {},
  };

  // Calculate department stats
  submissionData.forEach(item => {
    // Add null check for item.department to prevent runtime errors
    if (!item.department || !item.department.name) {
      console.warn('Submission item missing department data:', item);
      return; // Skip this item if department data is missing
    }

    const deptName = item.department.name;
    if (!stats.byDepartment[deptName]) {
      stats.byDepartment[deptName] = { total: 0, submitted: 0, notSubmitted: 0 };
    }
    stats.byDepartment[deptName].total++;

    if (item.submission && item.submission.isSubmitted) {
      stats.byDepartment[deptName].submitted++;
    } else {
      stats.byDepartment[deptName].notSubmitted++;
    }
  });

  const handleSendReminder = (resourceIds: number[]) => {
    setSendReminderDialog({ isOpen: true, resourceIds });
  };

  const handleExportToExcel = async () => {
    setExportLoading(true);
    try {
      const response = await apiRequest("/api/time-logging/export-submissions", {
        method: "POST",
        body: JSON.stringify({
          weekStartDate: selectedWeek,
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
        }),
      });
      
      // Create and download file
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `submission-overview-${selectedWeek}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Submission overview exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export submission overview.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const pendingResourceIds = submissionData
    .filter(item => !item.submission || !item.submission.isSubmitted)
    .map(item => item.resource.id)
    .filter(Boolean);

  return (
    <PermissionGuard permission="submission_overview">
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
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    Submission Overview
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                    Track weekly timesheet submissions and manage team compliance
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportToExcel}
                disabled={exportLoading || submissionData.length === 0}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              {pendingResourceIds.length > 0 && (
                <Button
                  onClick={() => handleSendReminder(pendingResourceIds)}
                  disabled={sendReminderMutation.isPending}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send All Reminders ({pendingResourceIds.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Week Selection</label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[280px] border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.label}
                        {option.isCurrent && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Current</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Department Filter</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[200px] border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{stats.totalResources}</div>
              <div className="text-sm font-medium text-gray-600">Total Resources</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Active team members</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
              <div className="text-sm font-medium text-gray-600">Submitted</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {stats.totalResources > 0 ? Math.round((stats.submitted / stats.totalResources) * 100) : 0}% completion rate
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">{stats.notSubmitted}</div>
              <div className="text-sm font-medium text-gray-600">Not Submitted</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Pending submissions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{Object.keys(stats.byDepartment).length}</div>
              <div className="text-sm font-medium text-gray-600">Departments</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Active departments</p>
        </div>
      </div>

      {/* Department Breakdown */}
      {Object.keys(stats.byDepartment).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Department Breakdown</h2>
            <p className="text-sm text-gray-600">Submission status by department</p>
          </div>
          <div className="space-y-4">
            {Object.entries(stats.byDepartment).map(([deptName, deptStats]) => (
              <div key={deptName} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{deptName}</div>
                    <Badge variant="outline" className="mt-1 text-xs bg-white border-gray-200 text-gray-600">
                      {deptStats.total} members
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-green-600">{deptStats.submitted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-red-50 rounded">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-red-600">{deptStats.notSubmitted}</span>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className="text-sm font-semibold text-gray-900">
                      {Math.round((deptStats.submitted / deptStats.total) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">complete</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Submission Details</h2>
          <p className="text-sm text-gray-600">Individual submission status for selected week</p>
        </div>
        <div className="overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                Loading submission data...
              </div>
            </div>
          ) : submissionData.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-3 bg-gray-50 rounded-lg inline-block mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No resources found</p>
              <p className="text-sm text-gray-400">Try adjusting your filter criteria</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-900 py-4">Resource</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4">Department</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4">Submitted At</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissionData.map((item) => {
                    const isSubmitted = item.submission && item.submission.isSubmitted;
                    const submissionDate = item.submission?.submittedAt;

                    // Debug logging for Rob Beckers
                    if (item.resource.name === "Rob Beckers") {
                      console.log("Rob Beckers display logic:", {
                        hasSubmission: !!item.submission,
                        submissionData: item.submission,
                        isSubmitted,
                        submissionDate
                      });
                    }

                    return (
                      <TableRow key={item.resource.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {item.resource.profileImage ? (
                                <img
                                  src={item.resource.profileImage}
                                  alt={item.resource.name}
                                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                                  {item.resource.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{item.resource.name}</div>
                              <div className="text-sm text-gray-500">{item.resource.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                            {item.department.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {isSubmitted ? (
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-green-50 rounded">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <span className="text-green-700 font-medium">Submitted</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-red-50 rounded">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <span className="text-red-700 font-medium">Not Submitted</span>
                                {!item.hasTimeEntries && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <div className="p-1 bg-yellow-50 rounded">
                                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>No time entries found for this week</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {submissionDate ? (
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-blue-50 rounded">
                                <Clock className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm text-gray-700">
                                {format(new Date(submissionDate), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not submitted</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/time-logging/${item.resource.id}?week=${selectedWeek}`, '_blank')}
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View time log</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {!isSubmitted && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSendReminder([item.resource.id])}
                                      disabled={sendReminderMutation.isPending}
                                      className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Send reminder email</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Send Reminder Dialog */}
      <Dialog open={sendReminderDialog.isOpen} onOpenChange={(open) => setSendReminderDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reminder Emails</DialogTitle>
            <DialogDescription>
              Send reminder emails to users who haven't submitted their time logs for the selected week.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <Send className="h-4 w-4" />
            <AlertDescription>
              This will send reminder emails to {sendReminderDialog.resourceIds.length} user(s) who haven't submitted their time logs 
              for the week of {format(new Date(selectedWeek), 'MMM d, yyyy')}.
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendReminderDialog({ isOpen: false, resourceIds: [] })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendReminderMutation.mutate(sendReminderDialog.resourceIds)}
              disabled={sendReminderMutation.isPending}
            >
              {sendReminderMutation.isPending ? "Sending..." : "Send Reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </main>
    </PermissionGuard>
  );
}