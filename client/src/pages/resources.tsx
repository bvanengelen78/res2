import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { ResourceForm } from "@/components/resource-form";
import { EnhancedResourceCard } from "@/components/enhanced-resource-card";
import { EnhancedResourceCardV2 } from "@/components/enhanced-resource-card-v2";
import { ResourceTableView } from "@/components/resource-table-view";
import { EnhancedResourceFilters } from "@/components/enhanced-resource-filters";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Users, Filter, Search, Grid, List, LayoutGrid, Table, Zap, Settings } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Resource, Department } from "@shared/schema";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import "@/styles/dashboard-blue-theme.css";
import "@/styles/dashboard-transitions.css";
import { animationMonitor, detectDeviceCapabilities, getOptimizedAnimationConfig } from "@/utils/animation-performance";
import {
  applyOptimizedAnimations,
  waitForAnimationCompletion,
  batchCleanupAnimations,
  shouldEnableAnimations
} from '@/utils/animation-utils';



const ROLE_OPTIONS = [
  "Change Lead",
  "Manager Change",
  "Business Controller"
];

export default function Resources() {
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [isFiltersSticky, setIsFiltersSticky] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animationConfig, setAnimationConfig] = useState(getOptimizedAnimationConfig());

  const isMobile = useIsMobile();
  const { currentFilter, effectiveFilter, updateFilter, hasActiveFilters, clearAllFilters } = useSavedFilters();

  // Data fetching hooks - must be declared before animation effects that depend on them
  const { data: resources = [], isLoading, error: resourcesError, refetch: refetchResources } = useQuery({
    queryKey: ["/api/resources"],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Fetch Departments for filtering
  const { data: departments = [], error: departmentsError, refetch: refetchDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    staleTime: 300000, // 5 minutes (departments change less frequently)
    refetchOnWindowFocus: false,
  });

  // Enhanced animation management with proper completion detection (matching dashboard)
  useEffect(() => {
    if (isInitialLoad && !isLoading && !resourcesError && !departmentsError) {
      if (!shouldEnableAnimations()) {
        // Skip animations entirely for reduced motion or low-end devices
        setIsInitialLoad(false);
        batchCleanupAnimations('.resources-entrance, .resource-card-entrance, .filters-entrance, .resource-header-entrance');
        return;
      }

      // Start performance monitoring
      const animationId = animationMonitor.startAnimation('resources-entrance', resources?.length || 0);
      console.log(`🎬 [ANIMATION] Starting resources page entrance animations (${animationConfig.performanceTier} tier)`);

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
          const elements = document.querySelectorAll('.resources-entrance, .resource-card-entrance, .filters-entrance, .resource-header-entrance');
          console.log(`🎬 [ANIMATION] Found ${elements.length} elements to monitor`);

          // Log which elements have animations
          elements.forEach((el, index) => {
            const computedStyle = window.getComputedStyle(el);
            const animationName = computedStyle.animationName;
            console.log(`🎬 [ANIMATION] Element ${index + 1}: ${el.className} - Animation: ${animationName}`);
          });

          await waitForAnimationCompletion(Array.from(elements), timeoutCap);

          // Clean up animation properties
          batchCleanupAnimations('.resources-entrance, .resource-card-entrance, .filters-entrance, .resource-header-entrance');
          animationMonitor.endAnimation(animationId);

          console.log(`✅ [ANIMATION] Resources entrance completed efficiently`);
        } catch (error) {
          console.warn('⚠️ [ANIMATION] Animation completion detection failed, using fallback', error);
          batchCleanupAnimations('.resources-entrance, .resource-card-entrance, .filters-entrance, .resource-header-entrance');
          animationMonitor.endAnimation(animationId);
        }
      }, animationConfig.performanceTier === 'low-end' ? 0 : 16); // Single frame delay for high-end

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, isLoading, resourcesError, departmentsError, animationConfig, resources?.length]);

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





  // Get unique roles from resources for filtering
  const availableRoles = useMemo(() => {
    if (!resources) return ROLE_OPTIONS;
    const uniqueRoles = [...new Set(resources.map((r: Resource) => r.role))].filter(Boolean);
    return [...ROLE_OPTIONS, ...uniqueRoles.filter(role => !ROLE_OPTIONS.includes(role))];
  }, [resources]);

  // Get unique skills from resources for filtering
  const availableSkills = useMemo(() => {
    if (!resources) return [];
    const allSkills: string[] = [];

    resources.forEach((resource: Resource) => {
      if (resource.skills) {
        if (typeof resource.skills === 'string') {
          // Handle comma-separated skills
          const skills = resource.skills.split(',').map(s => s.trim()).filter(Boolean);
          allSkills.push(...skills);
        } else if (Array.isArray(resource.skills)) {
          allSkills.push(...resource.skills.filter(Boolean));
        }
      }
    });

    // Return unique skills sorted alphabetically
    return [...new Set(allSkills)].sort();
  }, [resources]);

  // Fetch resource allocations for status calculation
  const { data: allAllocations = [], refetch: refetchAllocations } = useQuery({
    queryKey: ["/api/allocations"],
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Group allocations by resource ID
  const allocationsByResource = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    allAllocations.forEach((allocation: any) => {
      if (!grouped[allocation.resourceId]) {
        grouped[allocation.resourceId] = [];
      }
      grouped[allocation.resourceId].push(allocation);
    });
    return grouped;
  }, [allAllocations]);



  // Enhanced filtering with bulletproof search logic
  const filteredResources = useMemo(() => {
    if (!resources || !Array.isArray(resources)) return [];

    return resources.filter((resource: Resource) => {
      // Use immediate search term for now (we can add debouncing back later)
      const searchTerm = (currentFilter.searchTerm || '').toLowerCase().trim();

      // Search filter - match against all relevant fields (case-insensitive)
      const matchesSearch = !searchTerm || [
        resource.name,
        resource.email,
        resource.role,
        resource.department
      ].some(field => {
        if (!field) return false;
        return String(field).toLowerCase().trim().includes(searchTerm);
      });

      // Department filter - use currentFilter for immediate response
      const departmentFilter = currentFilter.departmentFilter || 'all';
      const matchesDepartment = departmentFilter === "all" ||
        (resource.department && resource.department.trim() === departmentFilter.trim());

      // Role filter - use currentFilter for immediate response
      const roleFilter = currentFilter.roleFilter || 'all';
      const matchesRole = roleFilter === "all" ||
        (resource.role && resource.role.trim() === roleFilter.trim());

      // Status filter - use currentFilter for immediate response
      const statusFilter = currentFilter.statusFilter || 'all';
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const resourceAllocations = allocationsByResource[resource.id] || [];
        const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
        const totalAllocated = resourceAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocatedHours) || 0), 0);
        const utilizationPercentage = weeklyCapacity > 0 ? (totalAllocated / weeklyCapacity) * 100 : 0;

        switch (statusFilter) {
          case 'available':
            matchesStatus = resource.isActive && utilizationPercentage < 80;
            break;
          case 'near-capacity':
            matchesStatus = resource.isActive && utilizationPercentage >= 80 && utilizationPercentage <= 100;
            break;
          case 'overallocated':
            matchesStatus = resource.isActive && utilizationPercentage > 100;
            break;
          case 'unassigned':
            matchesStatus = resource.isActive && totalAllocated === 0;
            break;
        }
      }

      // Capacity filter - use currentFilter for immediate response
      const capacityFilter = currentFilter.capacityFilter || 'all';
      let matchesCapacity = true;
      if (capacityFilter !== 'all') {
        const resourceAllocations = allocationsByResource[resource.id] || [];
        const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
        const totalAllocated = resourceAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocatedHours) || 0), 0);
        const utilizationPercentage = weeklyCapacity > 0 ? (totalAllocated / weeklyCapacity) * 100 : 0;

        switch (capacityFilter) {
          case 'under-50':
            matchesCapacity = utilizationPercentage < 50;
            break;
          case '50-80':
            matchesCapacity = utilizationPercentage >= 50 && utilizationPercentage < 80;
            break;
          case '80-100':
            matchesCapacity = utilizationPercentage >= 80 && utilizationPercentage <= 100;
            break;
          case 'over-100':
            matchesCapacity = utilizationPercentage > 100;
            break;
        }
      }

      // Skill filter (enhanced to search across skills more effectively) - use currentFilter for immediate response
      const skillFilter = currentFilter.skillFilter || '';
      const matchesSkill = !skillFilter || skillFilter === 'all' || (() => {
        if (!resource.skills) return false;

        // Handle different skill data types
        let skillsText = '';
        if (typeof resource.skills === 'string') {
          // Handle comma-separated skills
          skillsText = resource.skills.replace(/,/g, ' ');
        } else if (Array.isArray(resource.skills)) {
          skillsText = resource.skills.join(' ');
        } else {
          skillsText = String(resource.skills);
        }

        // Split skill filter by spaces and check if all terms match
        const filterTerms = skillFilter.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        const skillsLower = skillsText.toLowerCase();

        return filterTerms.every(term => skillsLower.includes(term));
      })();

      const passes = matchesSearch && matchesDepartment && matchesRole && matchesStatus && matchesCapacity && matchesSkill;

      return passes;
    });



    return filteredResults;
  }, [resources, currentFilter, allocationsByResource]);

  // Auto-switch to list view on mobile for better UX
  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('list');
    }
  }, [isMobile, viewMode]);

  // Handle scroll to make filters sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsFiltersSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list' | 'table') => {
    // Prevent table view on mobile
    if (isMobile && mode === 'table') {
      setViewMode('list');
    } else {
      setViewMode(mode);
    }
  }, [isMobile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header with Blue Gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight" id="page-title">
                      Resource Overview
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium" aria-describedby="page-title">
                      Manage your team members and their allocations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <EnhancedResourceCardV2
                key={i}
                resource={{} as Resource} // Empty resource for skeleton
                onEdit={() => {}}
                variant="grid"
                isLoading={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${
        isInitialLoad ? 'resources-entrance gpu-accelerated' : ''
      }`}>
        {/* Header with Blue Gradient */}
        <div className={`relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden ${
          isInitialLoad ? 'resource-header-entrance gpu-accelerated' : ''
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
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight" id="page-title">
                      Resource Overview
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium" aria-describedby="page-title">
                      Manage your team members and their allocations
                      {filteredResources.length !== resources?.length && (
                        <span className="ml-2 text-xs sm:text-sm opacity-90" aria-live="polite">
                          ({filteredResources.length} of {resources?.length} shown)
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
                        onClick={() => handleViewModeChange('grid')}
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
                        onClick={() => handleViewModeChange('list')}
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

                  {!isMobile && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => handleViewModeChange('table')}
                          className={`px-3 text-white hover:bg-white/20 transition-all duration-200 ${
                            viewMode === 'table' ? 'bg-white/30 text-white' : 'text-white/80'
                          }`}
                          aria-pressed={viewMode === 'table'}
                          aria-label="Switch to table view"
                        >
                          <Table className="h-4 w-4" />
                          <span className="sr-only">Table View</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Table View</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <Button
                  onClick={() => setResourceFormOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  aria-label="Add new resource"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Resource
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Bar */}
        <EnhancedResourceFilters
          departments={departments}
          roles={availableRoles}
          skills={availableSkills}
          isSticky={isFiltersSticky}
          className={`border-b border-blue-200/50 bg-white/80 backdrop-blur-sm ${
            isInitialLoad ? 'filters-entrance gpu-accelerated' : ''
          }`}
          currentFilter={currentFilter}
          updateFilter={updateFilter}
        />

        {/* Main Content */}
        <div className={`max-w-7xl mx-auto px-6 py-8 ${
          isInitialLoad ? 'resources-entrance gpu-accelerated' : ''
        }`}>
          {/* Quick Actions */}
          {selectedResources.length > 0 && (
            <div className="mb-6">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedResources.length} selected
              </Badge>
            </div>
          )}

          {/* Resource Display */}
          {filteredResources.length === 0 ? (
            <Card className="rounded-2xl shadow-sm border-gray-200/80 bg-white/95 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
                <p className="text-gray-600 mb-6">
                  {hasActiveFilters()
                    ? "Try adjusting your filters to see more resources."
                    : "Get started by adding your first team member."
                  }
                </p>
                {!hasActiveFilters() && (
                  <Button onClick={() => setResourceFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Resource
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ${
                  isInitialLoad ? 'resources-entrance resources-entrance-grid gpu-accelerated' : ''
                }`}>
                  {filteredResources.map((resource: Resource, index) => (
                    <div
                      key={resource.id}
                      className={`${
                        isInitialLoad
                          ? `resource-card-entrance gpu-accelerated stagger-delay-${Math.min(index, 5)}`
                          : ''
                      }`}
                    >
                      <EnhancedResourceCardV2
                        resource={resource}
                        onEdit={setEditingResource}
                        variant="grid"
                        showActions={true}
                        allocations={allocationsByResource[resource.id] || []}
                        isLoading={isLoading}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className={`space-y-3 ${
                  isInitialLoad ? 'resources-entrance resources-entrance-list gpu-accelerated' : ''
                }`}>
                  {filteredResources.map((resource: Resource, index) => (
                    <div
                      key={resource.id}
                      className={`${
                        isInitialLoad
                          ? `resource-card-entrance gpu-accelerated micro-stagger-${Math.min(index % 4, 3)}`
                          : ''
                      }`}
                    >
                      <EnhancedResourceCardV2
                        resource={resource}
                        onEdit={setEditingResource}
                        variant="list"
                        showActions={true}
                        allocations={allocationsByResource[resource.id] || []}
                        isLoading={isLoading}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && !isMobile && (
                <ResourceTableView
                  resources={filteredResources}
                  onEdit={setEditingResource}
                  onSelectionChange={setSelectedResources}
                  allocations={allocationsByResource}
                />
              )}
            </>
          )}
        </div>

        {/* Resource Forms */}
        <ResourceForm
          open={resourceFormOpen}
          onOpenChange={setResourceFormOpen}
        />

        <ResourceForm
          open={!!editingResource}
          onOpenChange={(open) => {
            if (!open) {
              setEditingResource(null);
            }
          }}
          resource={editingResource}
          mode="edit"
        />
      </div>
    </TooltipProvider>
  );
}
