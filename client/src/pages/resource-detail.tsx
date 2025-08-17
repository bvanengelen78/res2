import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnhancedProjectAllocationView } from "@/components/enhanced-project-allocation-view";
import { ResourceDeleteDialog } from "@/components/resource-delete-dialog";
import { ResourceForm } from "@/components/resource-form";
import { ResourceKPIPanel } from "@/components/resource-kpi-panel";
import { ResourceUtilizationMiniGraph } from "@/components/resource-utilization-mini-graph";
import { ProfileImageUpload } from "@/components/profile-image-upload";
import { TimeOffManagement } from "@/components/time-off-management";
import { CapacityManagement } from "@/components/capacity-management";
import { ResourceWithAllocations } from "@shared/schema";
import { ArrowLeft, Mail, Clock, User, Edit, Trash2, Building, Star, Info } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

// Department color mapping for avatar rings (consistent with resource cards)
const DEPARTMENT_COLORS = {
  'IT Architecture & Delivery': 'ring-blue-500',
  'Business Operations': 'ring-green-500',
  'Finance': 'ring-yellow-500',
  'Human Resources': 'ring-indigo-500',
  // Legacy department names for backward compatibility
  'Engineering': 'ring-blue-500',
  'Design': 'ring-purple-500',
  'Product': 'ring-green-500',
  'Marketing': 'ring-pink-500',
  'Sales': 'ring-orange-500',
  'Operations': 'ring-gray-500',
  'HR': 'ring-indigo-500',
  'default': 'ring-gray-400'
};

// Status calculation helper (consistent with resource cards)
function calculateResourceStatus(resource: any, allocations: any[] = []) {
  const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocatedHours) || 0), 0);
  const utilizationPercentage = weeklyCapacity > 0 ? (totalAllocated / weeklyCapacity) * 100 : 0;

  if (!resource.isActive) {
    return { status: 'inactive', color: 'bg-gray-100 text-gray-600', icon: '⚫' };
  }

  if (totalAllocated === 0) {
    return { status: 'unassigned', color: 'bg-blue-100 text-blue-700', icon: '🔵' };
  }

  if (utilizationPercentage > 100) {
    return { status: 'over-allocated', color: 'bg-red-100 text-red-700', icon: '🔴' };
  }

  if (utilizationPercentage >= 100) {
    return { status: 'fully allocated', color: 'bg-green-100 text-green-700', icon: '🟢' };
  }

  return { status: 'partially allocated', color: 'bg-amber-100 text-amber-700', icon: '🟡' };
}

// Get initials for avatar fallback (consistent with resource cards)
function getInitials(name: string | undefined | null) {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function ResourceDetail() {
  const [, params] = useRoute("/resources/:id");
  const [, setLocation] = useLocation();
  const resourceId = parseInt(params?.id || "0");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [shouldHighlightAllocations, setShouldHighlightAllocations] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Handle automatic scrolling to allocation section when hash is present
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash === '#allocations') {
        // Enable highlighting for the allocation component
        setShouldHighlightAllocations(true);
        // Wait for the component to render and animations to complete
        const scrollTimer = setTimeout(() => {
          // Primary target: Use the ID selector for reliable targeting
          let allocationSection = document.getElementById('allocations-section');

          // Fallback: Use data attribute selector
          if (!allocationSection) {
            allocationSection = document.querySelector('[data-allocation-section]');
          }

          // Secondary fallback: Use the complex CSS selector as last resort
          if (!allocationSection) {
            allocationSection = document.querySelector(
              '#root > div.flex.h-screen.overflow-hidden > div.flex-1.overflow-auto.main-content-bg > main > div.space-y-4.sm\\:space-y-6.animate-in.fade-in-50.duration-500 > div.animate-in.slide-in-from-bottom-4.duration-700.delay-300'
            );
          }

          if (allocationSection) {
            // Scroll to the allocation section with smooth behavior
            allocationSection.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });

            // Add visual highlight effect with transition
            allocationSection.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50', 'transition-all', 'duration-300');

            // Remove highlight after 3 seconds with fade out
            setTimeout(() => {
              allocationSection?.classList.add('ring-opacity-0');
              setTimeout(() => {
                allocationSection?.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50', 'ring-opacity-0', 'transition-all', 'duration-300');
              }, 300);
            }, 3000);

            // Show toast notification
            toast({
              title: "Allocation Section",
              description: "Scrolled to resource allocation details",
            });
          } else {
            // Final fallback: try to find any allocation-related element
            const fallbackElement = document.querySelector('.enhanced-project-allocation, .allocation-section, .project-allocation');
            if (fallbackElement) {
              fallbackElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });

              toast({
                title: "Allocation Section",
                description: "Scrolled to resource details",
              });
            }
          }
        }, 1200); // Wait for animations to complete (increased for better reliability)

        return () => clearTimeout(scrollTimer);
      }
    };

    // Handle initial load with hash
    handleHashScroll();

    // Handle hash changes (if user navigates with hash)
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, [toast]);

  const { data: resource, isLoading, error } = useQuery<ResourceWithAllocations>({
    queryKey: ["/api/resources", resourceId],
    queryFn: () => apiRequest(`/api/resources/${resourceId}`),
    enabled: !!resourceId,
  });

  const { data: relationships } = useQuery({
    queryKey: ["/api/resources", resourceId, "relationships"],
    queryFn: () => apiRequest(`/api/resources/${resourceId}/relationships`),
    enabled: !!resourceId && deleteDialogOpen,
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Success",
        description: "Resource deleted successfully",
      });
      setDeleteDialogOpen(false);
      setLocation("/resources");
    },
    onError: (error: any) => {
      console.error("Resource deletion error:", error);

      let errorMessage = "Failed to delete resource";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Calculate resource status and department color (consistent with resource cards)
  const resourceStatus = useMemo(() => {
    if (!resource) return { status: 'inactive', color: 'bg-gray-100 text-gray-600', icon: '⚫' };
    return calculateResourceStatus(resource, resource.allocations || []);
  }, [resource]);

  const departmentColor = resource ?
    (DEPARTMENT_COLORS[resource.department as keyof typeof DEPARTMENT_COLORS] || DEPARTMENT_COLORS.default) :
    DEPARTMENT_COLORS.default;

  // Calculate total allocated hours for capacity management
  const totalAllocatedHours = resource?.allocations?.filter(a => a.status === 'active')
    .reduce((sum, allocation) => sum + parseFloat(allocation.allocatedHours), 0) || 0;

  if (isLoading) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </main>
    );
  }

  if (error || !resource) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/resources">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Resource Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-gray-500">The requested resource could not be found.</p>
              <Link href="/resources">
                <Button className="mt-4" variant="outline">
                  Back to Resources
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }



  return (
    <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/resources">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Resource Details</h1>
            <p className="text-sm text-gray-600 mt-1 hidden sm:block">Comprehensive resource information and capacity management</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditFormOpen(true)}
                  className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <Edit className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit resource information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete resource (data will be preserved)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
        {/* Enhanced Resource Overview - Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in-50 duration-500">
          {/* Left Column - Resource Profile & Mini Insights */}
          <div className="xl:col-span-1 space-y-4">
            {/* Compact Resource Profile Card */}
            <Card className="border-gray-200 hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Resource Header */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className={cn(
                        "h-12 w-12 ring-2 ring-offset-1",
                        departmentColor
                      )}>
                        <AvatarImage src={resource.profileImage} />
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                          {getInitials(resource.name)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Status Indicator */}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
                        resource.isActive ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {resource.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap max-w-full truncate">
                          {resource.role}
                        </Badge>
                        <Badge className={cn("text-xs whitespace-nowrap", resourceStatus.color)}>
                          {resourceStatus.icon} {resourceStatus.status.charAt(0).toUpperCase() + resourceStatus.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{resource.email}</span>
                    </div>
                    {resource.department && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{resource.department}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{resource.weeklyCapacity}h/week capacity</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mini Historical Utilization Graph */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Utilization History</h3>
                    <span className="text-xs text-gray-500">Last 8 weeks</span>
                  </div>
                  <ResourceUtilizationMiniGraph
                    resource={resource}
                    weeklyCapacity={parseFloat(resource.weeklyCapacity || '40')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Management KPI Dashboard */}
          <div className="xl:col-span-2">
            <ResourceKPIPanel
              resource={resource}
              totalAllocatedHours={totalAllocatedHours}
              resourceStatus={resourceStatus}
              isLoading={isLoading}
              className="h-fit"
            />
          </div>
        </div>

        {/* Capacity Management Section */}
        <div className="animate-in slide-in-from-bottom-4 duration-700 delay-150">
          <CapacityManagement
            resource={resource}
            totalAllocatedHours={totalAllocatedHours}
            className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
          />
        </div>

        {/* Resource Allocations Section */}
        {resource.id && (
          <div
            id="allocations-section"
            data-allocation-section
            className="animate-in slide-in-from-bottom-4 duration-700 delay-300 scroll-mt-4"
          >
            <EnhancedProjectAllocationView
              resourceId={resource.id}
              resource={resource}
              highlightOnMount={shouldHighlightAllocations}
            />
          </div>
        )}

        {/* Time Off Management Section */}
        {resource.id && (
          <div className="animate-in slide-in-from-bottom-4 duration-700 delay-450">
            <TimeOffManagement
              resource={resource}
            />
          </div>
        )}
      </div>

      <ResourceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resource={resource}
        onConfirm={() => deleteResourceMutation.mutate()}
        isDeleting={deleteResourceMutation.isPending}
        relatedData={relationships || {
          activeAllocations: resource.allocations?.filter(a => a.status === 'active').length || 0,
          timeEntries: 0,
          projectsAsDirector: 0,
          projectsAsChangeLead: 0,
          projectsAsBusinessLead: 0,
          timeOffEntries: 0,
          weeklySubmissions: 0,
          userAccounts: 0,
        }}
      />

      <ResourceForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        resource={resource}
        mode="edit"
      />
    </main>
  );
}