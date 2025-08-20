// ARCHIVED DASHBOARD - Original implementation preserved
// This file contains the original dashboard implementation before the new blue-themed dashboard
// Preserved for reference and potential rollback

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { KPICards } from "@/components/kpi-cards";
import { EnhancedCapacityAlerts } from "@/components/enhanced-capacity-alerts";
import { HoursAllocationVsActual } from "@/components/hours-allocation-vs-actual";
import { QuickActions } from "@/components/quick-actions";
import { ResourceForm } from "@/components/resource-form";
import { ProjectForm } from "@/components/project-form";
import { TimeLoggingReminder } from "@/components/time-logging-reminder";
import { ActionableInsightsPanel } from "@/components/actionable-insights-panel";
import { SmartNotificationsPanel } from "@/components/smart-notifications-panel";
import { RoleSkillHeatmap } from "@/components/role-skill-heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cacheInvalidation } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { Calendar, Filter, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns";

export default function DashboardArchived() {
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("thisMonth");
  const { user } = useAuth();

  // Get user's first name for personalization
  const getUserFirstName = () => {
    if (user?.resource?.name) {
      return user.resource.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  };

  // Get current time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper function to get period dates and label
  const getPeriodInfo = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMMM yyyy')
        };
      case 'nextMonth':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
          startDate: format(startOfMonth(nextMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(nextMonth), 'yyyy-MM-dd'),
          label: format(nextMonth, 'MMMM yyyy')
        };
      case 'quarter':
        return {
          startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
          label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
        };
      case 'year':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(endOfYear(now), 'yyyy-MM-dd'),
          label: format(now, 'yyyy')
        };
      default:
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          label: format(now, 'MMMM yyyy')
        };
    }
  };

  const currentPeriod = getPeriodInfo(periodFilter);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/dashboard/kpis", departmentFilter, currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentFilter !== 'all') params.append('department', departmentFilter);

      return await apiRequest(`/api/dashboard/kpis?${params}`);
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/dashboard/alerts", departmentFilter, currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      return await apiRequest(`/api/dashboard/alerts?${params}`);
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["/api/resources"],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });



  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["/api/dashboard/timeline", departmentFilter, currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      return await apiRequest(`/api/dashboard/timeline?${params}`);
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Get unique departments from resources for filter dropdown
  const departments = useMemo(() => {
    if (!resources) return [];
    const depts = [...new Set(resources.map((r: any) => r.department || r.role || 'General').filter(Boolean))];
    return depts.sort();
  }, [resources]);

  if (kpisLoading || alertsLoading || resourcesLoading || timelineLoading) {
    return (
      <main className="relative">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
            <Skeleton className="h-5 w-48 bg-white/10" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-200" />
                <h1 className="text-3xl font-bold">
                  {getGreeting()}, {getUserFirstName()}! 👋
                </h1>
              </div>
              <p className="text-blue-100 text-lg">
                Here's your team at a glance
              </p>

              {/* Filter Controls */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white/80" />
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/80" />
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="nextMonth">Next Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Core KPI Cards - Must Keep */}
        <KPICards kpis={kpis || { activeProjects: 0, availableResources: 0, conflicts: 0, utilization: 0 }} />

        {/* Enhanced Capacity Alerts - Must Keep */}
        <EnhancedCapacityAlerts alerts={alerts} isLoading={alertsLoading} />

        {/* NEW: Actionable Insights Panel */}
        <ActionableInsightsPanel
          resources={resources || []}
          alerts={alerts}
          className="animate-in fade-in-50 duration-500"
        />

        {/* NEW: Smart Notifications Panel */}
        <SmartNotificationsPanel
          projects={timelineData || []}
          resources={resources || []}
          alerts={alerts}
          className="animate-in fade-in-50 duration-500 delay-100"
        />

        {/* Time Logging Reminder */}
        <TimeLoggingReminder showAllResources={true} />

        {/* Role & Skill Heatmap */}
        <RoleSkillHeatmap
          resources={resources || []}
          alerts={alerts}
          className="animate-in slide-in-from-left-4 duration-700"
        />

        {/* NEW: Hours Allocation vs. Actual - Replaces Interactive Timeline */}
        <HoursAllocationVsActual
          className="animate-in slide-in-from-bottom-4 duration-700 delay-200"
        />

        {/* Quick Actions - Must Keep */}
        <QuickActions
          onCreateProject={() => setProjectFormOpen(true)}
          onAddResource={() => setResourceFormOpen(true)}
          onGenerateReport={() => {
            // TODO: Implement report generation
            console.log("Generate report");
          }}
        />
      </div>

      <ResourceForm 
        open={resourceFormOpen} 
        onOpenChange={setResourceFormOpen} 
      />
      
      <ProjectForm 
        open={projectFormOpen} 
        onOpenChange={setProjectFormOpen} 
      />
    </main>
  );
}
