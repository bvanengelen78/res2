import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ProjectForm } from "@/components/project-form";
import { EnhancedProjectFilters } from "@/components/enhanced-project-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calendar, Users, Filter, Search, Building, Crown, Target, Edit, Trash2, Eye, Clock, AlertCircle, CheckCircle2, Briefcase, LayoutGrid, List } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Project, Resource } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useSavedProjectFilters } from "@/hooks/use-saved-project-filters";
import "@/styles/dashboard-blue-theme.css";
import "@/styles/dashboard-transitions.css";
import { animationMonitor, detectDeviceCapabilities, getOptimizedAnimationConfig } from "@/utils/animation-performance";
import {
  applyOptimizedAnimations,
  waitForAnimationCompletion,
  batchCleanupAnimations,
  shouldEnableAnimations
} from '@/utils/animation-utils';

export default function Projects() {
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFiltersSticky, setIsFiltersSticky] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animationConfig, setAnimationConfig] = useState(getOptimizedAnimationConfig());

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { currentFilter, effectiveFilter, hasActiveFilters, updateFilter } = useSavedProjectFilters();



  const { data: projects, isLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: resources = [], error: resourcesError } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Get unique OGSM charters from projects for filtering
  const availableOgsmCharters = useMemo(() => {
    if (!projects) return [];
    const charters = projects
      .map((project: Project) => project.ogsmCharter)
      .filter(Boolean)
      .filter((charter, index, arr) => arr.indexOf(charter) === index);
    return charters;
  }, [projects]);

  // Handle scroll to make filters sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsFiltersSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Enhanced animation management with proper completion detection (matching dashboard)
  useEffect(() => {
    if (isInitialLoad && !isLoading && !projectsError && !resourcesError) {
      if (!shouldEnableAnimations()) {
        // Skip animations entirely for reduced motion or low-end devices
        setIsInitialLoad(false);
        batchCleanupAnimations('.projects-entrance, .project-card-entrance, .filters-entrance, .project-header-entrance');
        return;
      }

      // Start performance monitoring
      const animationId = animationMonitor.startAnimation('projects-entrance', projects?.length || 0);
      console.log(`🎬 [ANIMATION] Starting projects page entrance animations (${animationConfig.performanceTier} tier)`);

      // Minimal delay for DOM readiness
      const timer = setTimeout(async () => {
        setIsInitialLoad(false);

        // Calculate optimal timeout based on actual animation configuration
        const maxAnimationDelay = animationConfig.enableStagger ?
          (4 * animationConfig.staggerDelay) : 0;
        const totalAnimationTime = maxAnimationDelay + animationConfig.animationDuration;
        const timeoutCap = Math.min(totalAnimationTime + 100, 500); // Cap at 500ms

        try {
          // Wait for animations to complete using proper event listeners
          const elements = document.querySelectorAll('.projects-entrance, .project-card-entrance, .filters-entrance, .project-header-entrance');
          console.log(`🎬 [ANIMATION] Found ${elements.length} elements to monitor`);

          // Log which elements have animations
          elements.forEach((el, index) => {
            const computedStyle = window.getComputedStyle(el);
            const animationName = computedStyle.animationName;
            console.log(`🎬 [ANIMATION] Element ${index + 1}: ${el.className} - Animation: ${animationName}`);
          });

          await waitForAnimationCompletion(Array.from(elements), timeoutCap);

          // Clean up animation properties
          batchCleanupAnimations('.projects-entrance, .project-card-entrance, .filters-entrance, .project-header-entrance');
          animationMonitor.endAnimation(animationId);

          console.log(`✅ [ANIMATION] Projects entrance completed efficiently`);
        } catch (error) {
          console.warn('⚠️ [ANIMATION] Animation completion detection failed, using fallback', error);
          batchCleanupAnimations('.projects-entrance, .project-card-entrance, .filters-entrance, .project-header-entrance');
          animationMonitor.endAnimation(animationId);
        }
      }, animationConfig.performanceTier === 'low-end' ? 0 : 16); // Single frame delay for high-end

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, isLoading, projectsError, resourcesError, animationConfig, projects?.length]);

  // Detect user's motion preferences and device capabilities
  useEffect(() => {
    // Detect device capabilities on mount
    detectDeviceCapabilities();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      console.log(`🎭 [ACCESSIBILITY] Reduced motion preference: ${e.matches ? 'enabled' : 'disabled'}`);

      // Update animation config when preferences change
      setAnimationConfig(getOptimizedAnimationConfig());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    return projects.filter((project: Project) => {
      // Search filter (use debounced effectiveFilter for search only)
      const searchTerm = effectiveFilter.searchTerm?.toLowerCase() || '';
      const matchesSearch = !searchTerm ||
        project.name.toLowerCase().includes(searchTerm) ||
        project.description?.toLowerCase().includes(searchTerm);

      // All other filters use currentFilter for immediate response
      const matchesStatus = currentFilter.statusFilter === 'all' ||
        project.status?.toLowerCase() === currentFilter.statusFilter?.toLowerCase();

      const matchesType = currentFilter.typeFilter === 'all' ||
        project.type?.toLowerCase() === currentFilter.typeFilter?.toLowerCase();

      const matchesStream = currentFilter.streamFilter === 'all' ||
        project.stream === currentFilter.streamFilter;

      const matchesPriority = currentFilter.priorityFilter === 'all' ||
        project.priority === currentFilter.priorityFilter;

      const matchesDirector = currentFilter.directorFilter === 'all' ||
        project.directorId?.toString() === currentFilter.directorFilter;

      const matchesChangeLead = currentFilter.changeLeadFilter === 'all' ||
        project.changeLeadId?.toString() === currentFilter.changeLeadFilter;

      const matchesBusinessLead = currentFilter.businessLeadFilter === 'all' ||
        project.businessLeadId?.toString() === currentFilter.businessLeadFilter;

      const matchesOgsmCharter = currentFilter.ogsmCharterFilter === 'all' ||
        project.ogsmCharter === currentFilter.ogsmCharterFilter;

      return matchesSearch && matchesStatus && matchesType && matchesStream &&
             matchesPriority && matchesDirector && matchesChangeLead &&
             matchesBusinessLead && matchesOgsmCharter;
    });
  }, [projects, effectiveFilter, currentFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'closure':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'change':
        return 'bg-purple-100 text-purple-800';
      case 'business':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStreamColor = (stream: string) => {
    switch (stream) {
      case 'staff':
        return 'bg-orange-100 text-orange-800';
      case 'region':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceName = (resourceId: number | null) => {
    if (!resourceId) return null;
    const resource = resources.find(r => r.id === resourceId);
    return resource?.name || null;
  };

  const formatOgsmCharter = (charter: string) => {
    // Since we now store the actual charter names, just return them directly
    return charter;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate project progress based on dates
  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / totalDuration) * 100);
  };

  // Calculate days until deadline
  const getDaysUntilDeadline = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format deadline text
  const formatDeadlineText = (endDate: string) => {
    const days = getDaysUntilDeadline(endDate);
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return '';
  };

  // Get deadline color
  const getDeadlineColor = (endDate: string) => {
    const days = getDaysUntilDeadline(endDate);
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-orange-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-gray-500';
  };

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });
      setDeletingProject(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    },
  });

  // Truncate long text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Error handling
  if (projectsError || resourcesError) {
    return (
      <div className="min-h-screen dashboard-blue-theme bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Projects</h3>
            <p className="text-gray-600 mb-6">
              {projectsError?.message || resourcesError?.message || 'An unexpected error occurred while loading the project data.'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen dashboard-blue-theme bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
                    <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                      Project Overview
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                      Manage your projects and track their progress
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Enhanced skeleton loading with staggered animations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl shadow-sm p-6 h-64 relative overflow-hidden ${
                  isInitialLoad
                    ? `project-card-entrance gpu-accelerated stagger-delay-${Math.min(i, 5)}`
                    : 'animate-pulse'
                }`}
              >
                <div className="space-y-4">
                  <div className="h-4 skeleton-enhanced w-3/4"></div>
                  <div className="h-3 skeleton-enhanced w-1/2"></div>
                  <div className="h-20 skeleton-enhanced"></div>
                  <div className="flex gap-2">
                    <div className="h-6 skeleton-enhanced w-16"></div>
                    <div className="h-6 skeleton-enhanced w-20"></div>
                  </div>
                  <div className="h-8 skeleton-enhanced w-full"></div>
                </div>
                {/* Loading shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Enhanced Header with Gradient Background */}
        <div className={`relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden ${
          isInitialLoad ? 'projects-entrance projects-entrance-header gpu-accelerated' : ''
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight" id="page-title">
                      Project Overview
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium" aria-describedby="page-title">
                      Manage your projects and track their progress
                      {filteredProjects.length !== projects?.length && (
                        <span className="ml-2 text-xs sm:text-sm opacity-90" aria-live="polite">
                          ({filteredProjects.length} of {projects?.length} shown)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
                {/* View Mode Toggle */}
                <div
                  className="flex border border-white/30 rounded-lg p-1 bg-white/20 backdrop-blur-sm shadow-lg"
                  role="group"
                  aria-label="View mode selection"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={`px-3 text-white hover:bg-white/20 transition-all duration-200 ${
                          viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/80'
                        }`}
                        aria-pressed={viewMode === 'grid'}
                        aria-label="Switch to grid view"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="sr-only">Grid View</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid View</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={`px-3 text-white hover:bg-white/20 transition-all duration-200 ${
                          viewMode === 'list' ? 'bg-white/30 text-white' : 'text-white/80'
                        }`}
                        aria-pressed={viewMode === 'list'}
                        aria-label="Switch to list view"
                      >
                        <List className="h-4 w-4" />
                        <span className="sr-only">List View</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                </div>

                <Button
                  onClick={() => setProjectFormOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  aria-label="Add new project"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Project
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Bar */}
        <div className={`${
          isInitialLoad ? 'projects-entrance projects-entrance-filters gpu-accelerated stagger-delay-1' : ''
        }`}>
          <EnhancedProjectFilters
            resources={resources}
            ogsmCharters={availableOgsmCharters}
            isSticky={isFiltersSticky}
            className="border-b border-blue-200/50 bg-white/80 backdrop-blur-sm"
            currentFilter={currentFilter}
            updateFilter={updateFilter}
          />


        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Project Display */}
          <section className={`${
            isInitialLoad ? 'projects-entrance projects-entrance-content gpu-accelerated stagger-delay-2' : ''
          }`}>
            {filteredProjects?.length === 0 ? (
              <Card className="rounded-xl shadow-sm border-blue-200/50 bg-white/95 backdrop-blur-sm">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {hasActiveFilters()
                      ? "Try adjusting your filters to see more projects."
                      : "Get started by creating your first project to begin tracking progress and managing resources."
                    }
                  </p>
                  {!hasActiveFilters() && (
                    <Button
                      onClick={() => setProjectFormOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Project
                    </Button>
                  )}
                </CardContent>
              </Card>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
                  : "space-y-3 sm:space-y-4"
              }
              role="grid"
              aria-label={`Projects displayed in ${viewMode} view`}
            >
          {filteredProjects?.map((project: Project, index) => {
            const progress = calculateProgress(project.startDate, project.endDate);
            const deadlineText = formatDeadlineText(project.endDate);
            const deadlineColor = getDeadlineColor(project.endDate);

              if (viewMode === 'list') {
                return (
                  <Card
                    key={project.id}
                    className={`group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 rounded-xl shadow-sm border-blue-200/50 bg-white/95 backdrop-blur-sm hover:bg-white ${
                      isInitialLoad
                        ? `project-card-entrance gpu-accelerated micro-stagger-${Math.min(index % 4, 3)}`
                        : ''
                    }`}
                  >
                    <CardContent className="p-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Building className="h-6 w-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0 mr-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="max-h-[3rem] overflow-hidden">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors cursor-help project-title-clamp">
                                      {project.name}
                                    </h3>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{project.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge className={`${getPriorityColor(project.priority)} font-medium text-xs px-2.5 py-1 border-2`}>
                                {project.priority}
                              </Badge>
                              <Badge className={`${getStatusColor(project.status)} font-medium text-xs px-2.5 py-1 border-2`}>
                                {project.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{progress}% Complete</span>
                            </div>

                            {project.businessLead && (
                              <div className="flex items-center space-x-1">
                                <Crown className="h-4 w-4 text-gray-400" />
                                <span>{getResourceName(project.businessLead)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getTypeColor(project.type)} border-2 font-medium text-xs`}>
                              <Building className="h-3 w-3 mr-1.5" />
                              {project.type}
                            </Badge>
                            {project.stream && (
                              <Badge variant="outline" className={`${getStreamColor(project.stream)} border-2 font-medium text-xs`}>
                                {project.stream}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                          onClick={() => setLocation(`/projects/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProject(project)}
                          className="px-3 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingProject(project)}
                          className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

              return (
                <Card
                  key={project.id}
                  className={`group relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.02] cursor-pointer rounded-xl shadow-sm border-blue-200/50 bg-white/95 backdrop-blur-sm hover:bg-white hover:border-blue-300/50 ${
                    isInitialLoad
                      ? `project-card-entrance gpu-accelerated stagger-delay-${Math.min(index, 5)}`
                      : ''
                  }`}
                >
                  <CardHeader className="pb-3 relative z-10 flex-shrink-0">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-[3.5rem] overflow-hidden">
                            <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors cursor-help project-title-clamp">
                              {project.name}
                            </CardTitle>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{project.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Badge className={`${getPriorityColor(project.priority)} font-medium text-xs px-2.5 py-1 text-center`}>
                        {project.priority}
                      </Badge>
                      <Badge className={`${getStatusColor(project.status)} font-medium text-xs px-2.5 py-1 text-center`}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Description with tooltip for long text */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm text-gray-600 line-clamp-2 cursor-help">
                          {project.description || 'No description available'}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{project.description || 'No description available'}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Project Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs font-medium text-gray-700">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Project Type and Stream */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${getTypeColor(project.type)} border-2 font-medium`}>
                        <Building className="h-3 w-3 mr-1.5" />
                        {project.type}
                      </Badge>
                      {project.stream && (
                        <Badge variant="outline" className={`${getStreamColor(project.stream)} border-2 font-medium`}>
                          {project.stream}
                        </Badge>
                      )}
                    </div>

                    {/* Leadership Team */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leadership Team</div>
                      <div className="space-y-2">
                      {project.directorId && (
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                            <Crown className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{getResourceName(project.directorId)}</div>
                            <div className="text-xs text-gray-500">Director</div>
                          </div>
                        </div>
                      )}
                      {project.changeLeadId && (
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <Target className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{getResourceName(project.changeLeadId)}</div>
                            <div className="text-xs text-gray-500">Change Lead</div>
                          </div>
                        </div>
                      )}
                      {project.businessLeadId && (
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                            <Briefcase className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{getResourceName(project.businessLeadId)}</div>
                            <div className="text-xs text-gray-500">Business Lead</div>
                          </div>
                        </div>
                      )}
                        {!project.directorId && !project.changeLeadId && !project.businessLeadId && (
                          <div className="text-sm text-gray-400 italic">No leadership assigned</div>
                        )}
                      </div>
                    </div>

                    {/* Timeline & Status */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Timeline</div>
                      <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                          <Calendar className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium">{formatDate(project.startDate)} - {formatDate(project.endDate)}</div>
                          <div className="text-xs text-gray-500">Project Duration</div>
                        </div>
                      </div>
                      {deadlineText && (
                        <div className="flex items-center text-sm">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            deadlineColor.includes('red') ? 'bg-red-100' :
                            deadlineColor.includes('yellow') ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <Clock className={`h-4 w-4 ${
                              deadlineColor.includes('red') ? 'text-red-600' :
                              deadlineColor.includes('yellow') ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <div className={`font-medium ${deadlineColor}`}>{deadlineText}</div>
                            <div className="text-xs text-gray-500">Deadline Status</div>
                          </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OGSM Charter */}
                    {project.ogsmCharter && (
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">OGSM Charter</div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 cursor-help">
                              <div className="text-sm font-medium text-blue-900 line-clamp-2">
                                {formatOgsmCharter(project.ogsmCharter)}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{formatOgsmCharter(project.ogsmCharter)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                          onClick={() => setLocation(`/projects/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProject(project)}
                          className="px-3 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingProject(project)}
                          className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
          </section>
        </div>

        {/* Project Forms and Dialogs */}
      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
      />

      <ProjectForm
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null);
          }
        }}
        project={editingProject}
        mode="edit"
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingProject && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium text-gray-900">{deletingProject.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {deletingProject.description || 'No description'}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900">Before deleting, please ensure:</div>
                    <ul className="mt-2 text-sm text-amber-800 space-y-1">
                      <li>• All active resource allocations are handled</li>
                      <li>• Time entries and reports are archived</li>
                      <li>• Stakeholders are notified</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingProject && deleteProjectMutation.mutate(deletingProject.id)}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Forms */}
      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
      />

      <ProjectForm
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null);
          }
        }}
        project={editingProject}
        mode="edit"
      />

      {/* Project Details Modal */}
      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {viewingProject?.name}
            </DialogTitle>
            <DialogDescription>
              Complete project details and information
            </DialogDescription>
          </DialogHeader>
          
          {viewingProject && (
            <div className="space-y-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(viewingProject.status)}>
                  {viewingProject.status}
                </Badge>
                <Badge className={getPriorityColor(viewingProject.priority)}>
                  {viewingProject.priority}
                </Badge>
                <Badge variant="outline" className={getTypeColor(viewingProject.type)}>
                  {viewingProject.type}
                </Badge>
                {viewingProject.stream && (
                  <Badge variant="outline" className={getStreamColor(viewingProject.stream)}>
                    {viewingProject.stream}
                  </Badge>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Project Progress</span>
                  <span className="text-sm text-gray-500">
                    {calculateProgress(viewingProject.startDate, viewingProject.endDate)}%
                  </span>
                </div>
                <Progress value={calculateProgress(viewingProject.startDate, viewingProject.endDate)} />
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">
                  {viewingProject.description || 'No description provided'}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">Start:</span>
                    <span className="ml-2">{formatDate(viewingProject.startDate)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">End:</span>
                    <span className="ml-2">{formatDate(viewingProject.endDate)}</span>
                  </div>
                  {formatDeadlineText(viewingProject.endDate) && (
                    <div className={`flex items-center text-sm font-medium ${getDeadlineColor(viewingProject.endDate)}`}>
                      <Clock className="h-4 w-4 mr-2" />
                      {formatDeadlineText(viewingProject.endDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Leadership */}
              <div>
                <h4 className="font-medium mb-2">Leadership</h4>
                <div className="space-y-2">
                  {viewingProject.directorId && (
                    <div className="flex items-center text-sm">
                      <Crown className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">Director:</span>
                      <span className="ml-2">{getResourceName(viewingProject.directorId)}</span>
                    </div>
                  )}
                  {viewingProject.changeLeadId && (
                    <div className="flex items-center text-sm">
                      <Target className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">Change Lead:</span>
                      <span className="ml-2">{getResourceName(viewingProject.changeLeadId)}</span>
                    </div>
                  )}
                  {viewingProject.businessLeadId && (
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">Business Lead:</span>
                      <span className="ml-2">{getResourceName(viewingProject.businessLeadId)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Strategic Alignment */}
              {viewingProject.ogsmCharter && (
                <div>
                  <h4 className="font-medium mb-2">Strategic Alignment</h4>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">OGSM Charter:</span> {formatOgsmCharter(viewingProject.ogsmCharter)}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Financial</h4>
                  <div className="space-y-1 text-sm">
                    {viewingProject.budget && (
                      <div>
                        <span className="font-medium">Budget:</span> €{viewingProject.budget.toLocaleString()}
                      </div>
                    )}
                    {viewingProject.cost && (
                      <div>
                        <span className="font-medium">Cost:</span> €{viewingProject.cost.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Classification</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Type:</span> {viewingProject.type}
                    </div>
                    {viewingProject.stream && (
                      <div>
                        <span className="font-medium">Stream:</span> {viewingProject.stream}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deletingProject && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium text-gray-900">{deletingProject.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {deletingProject.description || 'No description'}
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-amber-900">Before deleting, please ensure:</div>
                    <ul className="mt-2 text-sm text-amber-800 space-y-1">
                      <li>• All active resource allocations are handled</li>
                      <li>• Time entries and reports are archived</li>
                      <li>• Stakeholders are notified</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingProject(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingProject && deleteProjectMutation.mutate(deletingProject.id)}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </TooltipProvider>
  );
}
