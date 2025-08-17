import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/project-form";
import { ProjectResourceAllocationTable } from "@/components/project-resource-allocation-table";
import { ProjectTimeline, generateMockTimelineData } from "@/components/project-timeline/index";
import { ProjectWithAllocations } from "@shared/schema";
import { ArrowLeft, Building, Calendar, Users, Target, Edit, Trash2, AlertTriangle, CheckCircle, Clock, Info, Maximize2, Minimize2, Crown, Shield, Briefcase, TrendingUp, UserCheck, BarChart3, Timer, Activity, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format, startOfWeek, getWeek, getYear } from "date-fns";

// Helper function to get role badge styling
function getRoleBadgeStyle(role: string) {
  switch (role.toLowerCase()) {
    case 'director':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'change lead':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'business lead':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// Helper function to get role icon
function getRoleIcon(role: string) {
  switch (role.toLowerCase()) {
    case 'director':
      return Crown;
    case 'change lead':
      return Shield;
    case 'business lead':
      return Briefcase;
    default:
      return Users;
  }
}

// Helper function to get role color theme
function getRoleColorTheme(role: string) {
  switch (role.toLowerCase()) {
    case 'director':
      return {
        border: 'border-purple-100/50',
        hover: 'hover:bg-purple-50/30',
        ring: 'ring-purple-200/50',
        iconBg: 'bg-white border-purple-200',
        iconColor: 'text-purple-600',
        avatarBg: 'bg-purple-100 text-purple-700'
      };
    case 'change lead':
      return {
        border: 'border-blue-100/50',
        hover: 'hover:bg-blue-50/30',
        ring: 'ring-blue-200/50',
        iconBg: 'bg-white border-blue-200',
        iconColor: 'text-blue-600',
        avatarBg: 'bg-blue-100 text-blue-700'
      };
    case 'business lead':
      return {
        border: 'border-green-100/50',
        hover: 'hover:bg-green-50/30',
        ring: 'ring-green-200/50',
        iconBg: 'bg-white border-green-200',
        iconColor: 'text-green-600',
        avatarBg: 'bg-green-100 text-green-700'
      };
    default:
      return {
        border: 'border-gray-100/50',
        hover: 'hover:bg-gray-50/30',
        ring: 'ring-gray-200/50',
        iconBg: 'bg-white border-gray-200',
        iconColor: 'text-gray-600',
        avatarBg: 'bg-gray-100 text-gray-700'
      };
  }
}

// Helper function to calculate project KPIs
function calculateProjectKPIs(project: ProjectWithAllocations) {
  if (!project.allocations || project.allocations.length === 0) {
    return {
      totalAllocatedHours: 0,
      currentWeekUtilization: 0,
      assignedResources: 0,
      progress: 0,
    };
  }

  // Calculate total allocated hours across all allocations
  const totalAllocatedHours = project.allocations.reduce((total, allocation) => {
    if (allocation.weeklyAllocations) {
      const weeklyTotal = Object.values(allocation.weeklyAllocations).reduce((sum, hours) => sum + hours, 0);
      return total + weeklyTotal;
    }
    return total + parseFloat(allocation.allocatedHours || '0');
  }, 0);

  // Calculate current week utilization
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekKey = `${getYear(currentWeek)}-W${getWeek(currentWeek, { weekStartsOn: 1 }).toString().padStart(2, '0')}`;

  const currentWeekHours = project.allocations.reduce((total, allocation) => {
    return total + (allocation.weeklyAllocations?.[currentWeekKey] || 0);
  }, 0);

  const totalCapacity = project.allocations.reduce((total, allocation) => {
    return total + parseFloat(allocation.resource.weeklyCapacity || '40');
  }, 0);

  const currentWeekUtilization = totalCapacity > 0 ? (currentWeekHours / totalCapacity) * 100 : 0;

  // Calculate progress based on project timeline
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const today = new Date();

  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = Math.max(0, today.getTime() - startDate.getTime());
  const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

  return {
    totalAllocatedHours: Math.round(totalAllocatedHours),
    currentWeekUtilization: Math.round(currentWeekUtilization),
    assignedResources: project.allocations.length,
    progress: Math.round(progress),
  };
}

// Leadership Member Card Component
function LeadershipMemberCard({ member, role, onClick }: { member: any, role: string, onClick?: () => void }) {
  const theme = getRoleColorTheme(role);
  const RoleIcon = getRoleIcon(role);
  const badgeStyle = getRoleBadgeStyle(role);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`group flex items-center gap-3 p-3 rounded-2xl bg-white/80 border ${theme.border} hover:shadow-md ${theme.hover} transition-all duration-200 cursor-pointer`}
          onClick={onClick}
        >
          <div className="relative">
            <Avatar className={`h-10 w-10 ring-2 ${theme.ring} ring-offset-1`}>
              <AvatarImage src={member.profileImage} />
              <AvatarFallback className={`${theme.avatarBg} font-semibold text-sm`}>
                {member.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`absolute -bottom-1 -right-1 p-1 ${theme.iconBg} rounded-full shadow-sm border`}>
                  <RoleIcon className={`h-3 w-3 ${theme.iconColor}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{role}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{member.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={`text-xs font-medium ${badgeStyle} rounded-full px-2 py-0.5`}>
                {role}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">{member.department}</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click to view {member.name}'s profile</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = parseInt(params?.id || "0");
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Scroll detection for sticky navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: project, isLoading, error } = useQuery<ProjectWithAllocations>({
    queryKey: ["/api/projects", projectId],
    queryFn: () => apiRequest(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  // Calculate project KPIs
  const projectKPIs = project ? calculateProjectKPIs(project) : null;

  const deleteProjectMutation = useMutation({
    mutationFn: () => apiRequest(`/api/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      setLocation("/projects");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or has been deleted.</p>
            <Link href="/projects">
              <Button>Back to Projects</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      draft: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      closure: { variant: "outline" as const, icon: CheckCircle, color: "text-blue-600" },
      rejected: { variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: "outline" as const, color: "text-green-600" },
      medium: { variant: "secondary" as const, color: "text-yellow-600" },
      high: { variant: "destructive" as const, color: "text-red-600" },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Badge variant={config.variant}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <main className={fullscreenMode ? "p-4 md:p-6" : "p-4 md:p-6 max-w-7xl mx-auto"}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">Project Details & Resource Allocation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenMode(!fullscreenMode)}
                >
                  {fullscreenMode ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {fullscreenMode ? "Exit fullscreen mode" : "Enter fullscreen mode"}
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={() => setEditFormOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectMutation.mutate()}
              disabled={deleteProjectMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Sticky Navigation Bar */}
        <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'translate-y-0 opacity-100 shadow-lg bg-white/95 backdrop-blur-sm border-b border-gray-200'
            : '-translate-y-full opacity-0'
        }`}>
          <div className={`${fullscreenMode ? "px-4 md:px-6" : "px-4 md:px-6 max-w-7xl mx-auto"} py-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/projects">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h2>
                  <p className="text-xs text-gray-500">Project Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenMode(!fullscreenMode)}
                >
                  {fullscreenMode ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditFormOpen(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      {fullscreenMode ? (
        // Fullscreen mode: Resource allocation takes full width
        <div className="space-y-6">
          <Tabs defaultValue="allocations" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
            </TabsList>

            <TabsContent value="allocations" className="space-y-4">
              <ProjectResourceAllocationTable projectId={projectId} fullscreen={true} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <ProjectTimeline
                projectId={projectId}
                data={generateMockTimelineData(projectId)}
                fullscreen={true}
                onItemUpdate={(item) => {
                  // Handle timeline item updates
                }}
                onViewportChange={(viewport) => {
                  // Handle timeline viewport changes
                }}
                onSettingsChange={(settings) => {
                  // Handle timeline settings changes
                }}
                onExport={(options) => {
                  // Handle timeline export requests
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Normal mode: Grid layout with sidebar
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content - Takes more space on wide screens */}
          <div className="xl:col-span-3 space-y-6">
            {/* Project Overview */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building className="h-6 w-6 text-blue-600" />
                  Project Overview
                </CardTitle>
                <p className="text-gray-600 text-sm">Comprehensive project description and objectives</p>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <div className="prose prose-gray max-w-none">
                    <div className="bg-white/60 rounded-lg p-6 border border-blue-100">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 text-lg">Project Description</h4>
                        <div className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                          {project.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No Description Available</p>
                    <p className="text-sm">Add a project description to provide context and objectives.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resource Allocation Management */}
            <Tabs defaultValue="allocations" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
                <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              </TabsList>

              <TabsContent value="allocations" className="space-y-4">
                <ProjectResourceAllocationTable projectId={projectId} fullscreen={false} />
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <ProjectTimeline
                  projectId={projectId}
                  data={generateMockTimelineData(projectId)}
                  fullscreen={false}
                  onItemUpdate={(item) => {
                    // Handle timeline item updates
                  }}
                  onViewportChange={(viewport) => {
                    // Handle timeline viewport changes
                  }}
                  onSettingsChange={(settings) => {
                    // Handle timeline settings changes
                  }}
                  onExport={(options) => {
                    // Handle timeline export requests
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leadership Team */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg min-w-0 flex-1">
                    <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">Leadership Team</span>
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium bg-blue-100/80 text-blue-800 border-blue-200/60 px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap flex-shrink-0"
                  >
                    {[project.director, project.changeLead, project.businessLead].filter(Boolean).length} members
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.director && (
                  <LeadershipMemberCard
                    member={project.director}
                    role="Director"
                    onClick={() => {
                      setSelectedMember(project.director);
                      setProfileModalOpen(true);
                    }}
                  />
                )}

                {project.changeLead && (
                  <LeadershipMemberCard
                    member={project.changeLead}
                    role="Change Lead"
                    onClick={() => {
                      setSelectedMember(project.changeLead);
                      setProfileModalOpen(true);
                    }}
                  />
                )}

                {project.businessLead && (
                  <LeadershipMemberCard
                    member={project.businessLead}
                    role="Business Lead"
                    onClick={() => {
                      setSelectedMember(project.businessLead);
                      setProfileModalOpen(true);
                    }}
                  />
                )}

                {/* Empty State */}
                {!project.director && !project.changeLead && !project.businessLead && (
                  <div className="text-center py-6 px-4">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">No leadership assigned yet</p>
                    <p className="text-xs text-gray-500 mb-3">Assign team leaders to improve project governance</p>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Assign Leaders
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Metrics */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Project Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectKPIs && (
                  <>
                    {/* Total Allocated Hours */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Timer className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Total Allocated</p>
                          <p className="text-xs text-gray-500">Across all resources</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{projectKPIs.totalAllocatedHours}h</p>
                      </div>
                    </div>

                    {/* Current Week Utilization */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                          <Activity className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Current Week</p>
                          <p className="text-xs text-gray-500">Capacity utilization</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          projectKPIs.currentWeekUtilization > 100 ? 'text-red-600' :
                          projectKPIs.currentWeekUtilization > 80 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {projectKPIs.currentWeekUtilization}%
                        </p>
                      </div>
                    </div>

                    {/* Assigned Resources */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <UserCheck className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Team Size</p>
                          <p className="text-xs text-gray-500">Assigned resources</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">{projectKPIs.assignedResources}</p>
                      </div>
                    </div>

                    {/* Project Progress */}
                    <div className="p-3 rounded-lg bg-white/60 border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-100">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Timeline Progress</p>
                            <p className="text-xs text-gray-500">Based on project dates</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">{projectKPIs.progress}%</p>
                      </div>
                      <Progress value={projectKPIs.progress} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Classification */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                    {getPriorityBadge(project.priority)}
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-medium text-gray-900">Timeline</p>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Start:</span>
                      <span className="font-medium">{format(new Date(project.startDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>End:</span>
                      <span className="font-medium">{format(new Date(project.endDate), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* OGSM Charter */}
                {project.ogsmCharter && (
                  <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">OGSM Charter</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {project.ogsmCharter}
                    </Badge>
                  </div>
                )}

                {/* Stream */}
                {project.stream && (
                  <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Stream</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {project.stream}
                    </Badge>
                  </div>
                )}

                {/* Estimated Hours */}
                {project.estimatedHours && parseFloat(project.estimatedHours.toString()) > 0 ? (
                  <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Estimated Hours</p>
                    <p className="text-sm font-semibold text-gray-900">{project.estimatedHours}h</p>
                  </div>
                ) : null}

                {/* Project Type */}
                <div className="p-3 rounded-lg bg-white/60 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Project Type</p>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {project.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedMember?.profileImage} />
                <AvatarFallback className="bg-blue-100 text-blue-800 font-semibold">
                  {selectedMember?.name?.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{selectedMember?.name}</h3>
                <p className="text-sm text-gray-600">{selectedMember?.role}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Department</p>
                <p className="text-sm font-medium text-gray-900">{selectedMember?.department}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{selectedMember?.email}</p>
              </div>
            </div>

            {selectedMember?.skills && selectedMember.skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {selectedMember.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Weekly Capacity</p>
                <p className="text-sm font-medium text-gray-900">{selectedMember?.weeklyCapacity || 40}h</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                <Badge variant={selectedMember?.isActive ? "default" : "secondary"} className="text-xs">
                  {selectedMember?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        project={project}
        mode="edit"
      />
      </main>
    </TooltipProvider>
  );
}
