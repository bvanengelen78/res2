import React, { useMemo, useState, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


import {
  Users,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  Calendar,
  RefreshCw,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { apiRequest } from '@/lib/queryClient';
import { calculatePeriodMultiplier } from "@/lib/period-utils";
import type { Resource as SharedResource, ResourceAllocation } from '@shared/schema';


// Use the shared Resource type and extend it for local needs
interface Resource extends SharedResource {
  utilization?: number;
  allocatedHours?: number;
  skills?: string[];
}

interface AlertResource {
  id: number;
  name: string;
  utilization: number;
  allocatedHours: number;
  capacity: number;
  department?: string;
  role?: string;
}

interface AlertCategory {
  type: string;
  title: string;
  description: string;
  count: number;
  resources: AlertResource[];
  threshold?: number;
  color?: string;
  icon?: string;
}

interface AlertsData {
  categories: AlertCategory[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    unassignedCount: number;
  };
}

interface RoleSkillHeatmapProps {
  resources: Resource[];
  alerts?: AlertsData;
  className?: string;
  currentPeriod?: {
    startDate: string;
    endDate: string;
    label: string;
  };
  isTransitioning?: boolean;
}

interface RoleCluster {
  role: string;
  resources: Resource[];
  totalCapacity: number;
  totalAllocated: number;
  averageUtilization: number;
  availableHours: number;
  status: 'healthy' | 'near-full' | 'overloaded' | 'gap';
  gapAnalysis: {
    shortage: number;
    surplus: number;
    recommendation: string;
  };
}



export function RoleSkillHeatmap({
  resources,
  alerts,
  className,
  currentPeriod,
  isTransitioning = false
}: RoleSkillHeatmapProps) {
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [selectedResourceIndex, setSelectedResourceIndex] = useState<Map<string, number>>(new Map());

  // Constants for effective capacity calculation (matching other components)
  const DEFAULT_NON_PROJECT_HOURS = 8;

  // Fetch heatmap data that includes ALL resources with utilization (not just alerts)
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["/api/dashboard/heatmap", currentPeriod?.startDate, currentPeriod?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPeriod?.startDate) params.append('startDate', currentPeriod.startDate);
      if (currentPeriod?.endDate) params.append('endDate', currentPeriod.endDate);

      const response = await fetch(`/api/dashboard/heatmap?${params}`);
      if (!response.ok) throw new Error('Failed to fetch heatmap data');
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Use heatmap loading state for accurate loading indication
  const allocationsLoading = heatmapLoading;

  // Calculate period-aware effective capacity for a resource
  const calculateEffectiveCapacity = useCallback((resource: Resource): number => {
    const weeklyBaseCapacity = parseFloat(resource.weeklyCapacity || '40');
    const weeklyEffectiveCapacity = Math.max(0, weeklyBaseCapacity - DEFAULT_NON_PROJECT_HOURS);

    // Scale capacity based on the selected period
    if (!currentPeriod) {
      return weeklyEffectiveCapacity; // Default to weekly if no period specified
    }

    // Calculate period multiplier based on the period type using shared utility
    const periodMultiplier = calculatePeriodMultiplier(currentPeriod.startDate, currentPeriod.endDate);
    return weeklyEffectiveCapacity * periodMultiplier;
  }, [currentPeriod]);

  // Use shared period multiplier calculation

  // Helper functions for stacked card management
  const toggleRoleExpansion = useCallback((role: string) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
        // Reset selected resource index when collapsing
        setSelectedResourceIndex(prevMap => {
          const newMap = new Map(prevMap);
          newMap.delete(role);
          return newMap;
        });
      } else {
        newSet.add(role);
        // Set to first resource when expanding
        setSelectedResourceIndex(prevMap => new Map(prevMap).set(role, 0));
      }
      return newSet;
    });
  }, []);

  const navigateResource = useCallback((role: string, direction: 'prev' | 'next', totalResources: number) => {
    setSelectedResourceIndex(prevMap => {
      const currentIndex = prevMap.get(role) || 0;
      let newIndex;

      if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalResources;
      } else {
        newIndex = currentIndex === 0 ? totalResources - 1 : currentIndex - 1;
      }

      return new Map(prevMap).set(role, newIndex);
    });
  }, []);



  // Calculate real-time utilization data using heatmap endpoint (includes ALL resources)
  const resourcesWithUtilization = useMemo(() => {
    // Always start with all resources to ensure complete role coverage
    if (!resources.length) return [];

    // Create a map of heatmap data for quick lookup
    const heatmapResourceMap = new Map();
    if (heatmapData && Array.isArray(heatmapData)) {
      heatmapData.forEach(heatmapResource => {
        heatmapResourceMap.set(heatmapResource.id, heatmapResource);
      });
    } else if (heatmapData && !Array.isArray(heatmapData)) {
      console.warn('[RoleSkillHeatmap] heatmapData is not an array:', typeof heatmapData, heatmapData);
    }

    // Process all resources using heatmap data (which includes ALL resources with utilization)
    return resources.map(resource => {
      const heatmapResource = heatmapResourceMap.get(resource.id);

      if (heatmapResource) {
        // Use heatmap data which includes ALL resources with correct utilization
        return {
          id: heatmapResource.id,
          name: heatmapResource.name,
          utilization: heatmapResource.utilization, // Includes "normal" utilization like Boyan's 78%
          allocatedHours: heatmapResource.allocatedHours,
          capacity: heatmapResource.capacity,
          department: heatmapResource.department,
          role: resource.role // Use role from resources table for consistency
        };
      } else {
        // Fallback for resources not in heatmap (should be rare)
        const periodAwareCapacity = calculateEffectiveCapacity(resource);
        return {
          id: resource.id,
          name: resource.name,
          utilization: 0,
          allocatedHours: 0,
          capacity: periodAwareCapacity,
          department: resource.department,
          role: resource.role
        };
      }
    });
  }, [resources, heatmapData, calculateEffectiveCapacity]);

  // Group resources by role/skill cluster
  const roleClusters = useMemo((): RoleCluster[] => {
    const roleGroups = resourcesWithUtilization.reduce((acc, resource) => {
      // Use role first, then department as fallback, then 'General'
      const role = resource.role || resource.department || 'General';

      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push({
        id: resource.id,
        name: resource.name,
        utilization: resource.utilization,
        allocatedHours: resource.allocatedHours,
        capacity: resource.capacity,
        department: resource.department,
        role: resource.role
      });
      return acc;
    }, {} as Record<string, Resource[]>);

    return Object.entries(roleGroups).map(([role, roleResources]) => {
      // Use effective capacity for all calculations
      const totalEffectiveCapacity = roleResources.reduce((sum, r) => sum + r.capacity, 0);
      const totalAllocated = roleResources.reduce((sum, r) => sum + r.allocatedHours, 0);
      const averageUtilization = totalEffectiveCapacity > 0 ? (totalAllocated / totalEffectiveCapacity) * 100 : 0;
      const availableHours = Math.max(0, totalEffectiveCapacity - totalAllocated);

      let status: 'healthy' | 'near-full' | 'overloaded' | 'gap';
      if (averageUtilization > 100) status = 'overloaded';
      else if (averageUtilization > 85) status = 'near-full';
      else if (averageUtilization < 30) status = 'gap';
      else status = 'healthy';

      const shortage = Math.max(0, totalAllocated - totalEffectiveCapacity);
      const surplus = Math.max(0, totalEffectiveCapacity - totalAllocated);

      // Generate period-aware recommendations
      let recommendation = '';
      const periodMultiplier = currentPeriod ? calculatePeriodMultiplier(currentPeriod.startDate, currentPeriod.endDate) : 1;
      const effectiveCapacityPerResource = 32 * periodMultiplier; // (40h - 8h non-project) * period multiplier
      const periodLabel = currentPeriod?.label || 'period';

      if (status === 'overloaded') {
        const additionalResourcesNeeded = Math.ceil(shortage / effectiveCapacityPerResource);
        recommendation = `Need ${additionalResourcesNeeded} additional ${role} resource${additionalResourcesNeeded > 1 ? 's' : ''} for ${periodLabel}`;
      } else if (status === 'gap') {
        const availableResources = Math.floor(surplus / effectiveCapacityPerResource);
        recommendation = `${availableResources} ${role} resource${availableResources > 1 ? 's' : ''} available for new projects in ${periodLabel}`;
      } else if (status === 'near-full') {
        recommendation = `Monitor closely - approaching capacity limit for ${periodLabel}`;
      } else {
        recommendation = `Well-balanced allocation for ${periodLabel}`;
      }

      return {
        role,
        resources: roleResources,
        totalCapacity: totalEffectiveCapacity,
        totalAllocated,
        averageUtilization: Math.round(averageUtilization), // Round to whole number
        availableHours: Math.round(availableHours), // Round to whole hours
        status,
        gapAnalysis: {
          shortage,
          surplus,
          recommendation
        }
      };
    }).sort((a, b) => b.availableHours - a.availableHours); // Sort by most available hours
  }, [resourcesWithUtilization]);

  // Sorted and limited roles for display
  const sortedAndLimitedRoles = useMemo(() => {
    // Increase limits to accommodate all roles in the organization
    // Default shows top 8 roles, expanded shows all roles (up to 20)
    const MAX_VISIBLE_ROLES = showAllRoles ? 20 : 8;
    return roleClusters.slice(0, MAX_VISIBLE_ROLES);
  }, [roleClusters, showAllRoles]);



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-600 border-green-200';
      case 'near-full': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'overloaded': return 'bg-red-100 text-red-600 border-red-200';
      case 'gap': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'near-full': return Clock;
      case 'overloaded': return AlertTriangle;
      case 'gap': return TrendingUp;
      default: return Users;
    }
  };

  return (
    <Card className={cn("bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 max-w-5xl w-full", className)}>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Role Heatmap
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {currentPeriod ? `${currentPeriod.label} - ` : ''}Resource allocation by role and capacity analysis
              </p>
            </div>
          </div>

        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {/* Loading State */}
        {allocationsLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Loading allocation data...</span>
          </div>
        )}

        {/* Content with transition effects */}
        <div className={cn(
          "transition-all duration-300",
          allocationsLoading ? "opacity-50" : "opacity-100",
          isTransitioning ? "opacity-80" : "opacity-100"
        )}>
          {/* Current Role Allocation */}
          <div className="space-y-4">
              <div className="grid gap-3">
              {sortedAndLimitedRoles.map((cluster) => {
                const StatusIcon = getStatusIcon(cluster.status);
                const hasMultipleResources = cluster.resources.length > 1;
                const isExpanded = expandedRoles.has(cluster.role);
                const selectedIndex = selectedResourceIndex.get(cluster.role) || 0;
                const currentResource = hasMultipleResources && isExpanded ? cluster.resources[selectedIndex] : null;

                return (
                  <div key={cluster.role} className="relative">
                    {/* Stacked Card Effect for Multiple Resources */}
                    {hasMultipleResources && (
                      <>
                        {/* Background stack cards - create visual depth */}
                        <div className="absolute inset-0 bg-white rounded-xl border border-slate-200 stack-depth-1" />
                        {cluster.resources.length > 2 && (
                          <div className="absolute inset-0 bg-white rounded-xl border border-slate-200 stack-depth-2" />
                        )}
                      </>
                    )}

                    {/* Main Card */}
                    <div className={cn(
                      "relative bg-white border border-slate-200 rounded-xl role-stack-card",
                      hasMultipleResources
                        ? "shadow-md z-10"
                        : "hover:bg-slate-50 hover:shadow-sm"
                    )}>
                      {/* Role Summary Header */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <StatusIcon className={cn("h-5 w-5",
                              cluster.status === 'healthy' ? 'text-green-600' :
                              cluster.status === 'near-full' ? 'text-amber-600' :
                              cluster.status === 'overloaded' ? 'text-red-600' :
                              'text-blue-600'
                            )} />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-slate-900">{cluster.role}</h4>
                                {hasMultipleResources && (
                                  <button
                                    onClick={() => toggleRoleExpansion(cluster.role)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                                    aria-label={isExpanded ? 'Collapse to group view' : 'Expand to individual resources'}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>

                              {/* Show individual resource name for single-resource roles */}
                              {!hasMultipleResources && cluster.resources.length === 1 && (
                                <div className="mt-1">
                                  <p className="text-sm font-medium text-slate-700">
                                    {cluster.resources[0].name}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-slate-500">
                                  {cluster.resources.length} resource{cluster.resources.length > 1 ? 's' : ''}
                                  {hasMultipleResources && isExpanded && ` • Viewing ${selectedIndex + 1} of ${cluster.resources.length}`}
                                </p>
                                {hasMultipleResources && !isExpanded && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 group-view-badge">
                                    Group View
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusColor(cluster.status)}>
                              {cluster.averageUtilization}%
                            </Badge>
                            <Badge variant="outline" className="bg-blue-100 text-blue-600 border-blue-200">
                              {cluster.availableHours > 0 ? `+${cluster.availableHours}h` : `${cluster.availableHours}h`} available
                            </Badge>
                          </div>
                        </div>

                        {/* Summary or Individual Resource View */}
                        <div className="role-card-content">
                          {!isExpanded ? (
                            // Aggregated Role Summary View
                            <div className={cn("transition-all duration-300",
                              hasMultipleResources ? "individual-to-group-transition" : ""
                            )}>
                              <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>
                                    {hasMultipleResources ? 'Group' : 'Resource'} {currentPeriod?.label || 'Period'} Utilization
                                  </span>
                                  <span>{Math.round(cluster.totalAllocated)}h / {cluster.totalCapacity}h effective</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={cn("h-3 rounded-full progress-bar-animated",
                                      cluster.status === 'healthy' ? 'bg-green-500' :
                                      cluster.status === 'near-full' ? 'bg-yellow-500' :
                                      cluster.status === 'overloaded' ? 'bg-red-500' :
                                      'bg-blue-500'
                                    )}
                                    style={{
                                      '--progress-width': `${Math.min(100, cluster.averageUtilization)}%`,
                                      width: `${Math.min(100, cluster.averageUtilization)}%`
                                    } as React.CSSProperties}
                                  />
                                </div>
                              </div>

                            {/* Enhanced aggregated metrics for multi-resource roles */}
                            {hasMultipleResources && (
                              <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100 metrics-slide-in">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500">Total Allocated:</span>
                                    <div className="font-medium text-slate-900">{Math.round(cluster.totalAllocated)}h</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Total Capacity:</span>
                                    <div className="font-medium text-slate-900">{cluster.totalCapacity}h</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Group Utilization:</span>
                                    <div className={cn("font-medium",
                                      cluster.status === 'healthy' ? 'text-green-600' :
                                      cluster.status === 'near-full' ? 'text-amber-600' :
                                      cluster.status === 'overloaded' ? 'text-red-600' :
                                      'text-blue-600'
                                    )}>{cluster.averageUtilization}%</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Available:</span>
                                    <div className="font-medium text-blue-600">
                                      {cluster.availableHours > 0 ? `+${cluster.availableHours}h` : `${cluster.availableHours}h`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Only show recommendations for single resources */}
                            {!hasMultipleResources && (
                              <div className="flex items-start gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                                  cluster.status === 'healthy' ? 'bg-green-500' :
                                  cluster.status === 'near-full' ? 'bg-yellow-500' :
                                  cluster.status === 'overloaded' ? 'bg-red-500' :
                                  'bg-blue-500'
                                )} />
                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {cluster.gapAnalysis.recommendation}
                                </p>
                              </div>
                            )}

                            {hasMultipleResources && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => toggleRoleExpansion(cluster.role)}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View individual resources
                                </button>
                              </div>
                            )}
                            </div>
                          ) : (
                            // Individual Resource View (Expanded Stack Navigation)
                            <div className={cn("transition-all duration-300",
                              hasMultipleResources ? "group-to-individual-transition" : ""
                            )}>
                              {currentResource && (
                                <>
                                  {/* Enhanced Resource Navigation Header */}
                              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                <div className="flex items-center justify-between mb-2">
                                  <button
                                    onClick={() => navigateResource(cluster.role, 'prev', cluster.resources.length)}
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full nav-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={cluster.resources.length <= 1}
                                    aria-label="Previous resource"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </button>

                                  <div className="text-center flex-1">
                                    <h5 className="text-sm font-semibold text-slate-900">{currentResource.name}</h5>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-white/80">
                                        {selectedIndex + 1} of {cluster.resources.length}
                                      </Badge>
                                      <span className="text-xs text-slate-500">•</span>
                                      <span className="text-xs text-slate-600">
                                        {currentResource.utilization}% utilization
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => navigateResource(cluster.role, 'next', cluster.resources.length)}
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full nav-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={cluster.resources.length <= 1}
                                    aria-label="Next resource"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Resource navigation dots */}
                                <div className="flex justify-center gap-1">
                                  {cluster.resources.map((_, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setSelectedResourceIndex(prev => new Map(prev).set(cluster.role, index))}
                                      className={cn(
                                        "w-2 h-2 rounded-full resource-nav-dot",
                                        index === selectedIndex
                                          ? "bg-blue-600"
                                          : "bg-blue-200 hover:bg-blue-300"
                                      )}
                                      aria-label={`View resource ${index + 1}`}
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Individual Resource Metrics */}
                              <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-600 mb-2">
                                  <span>Individual {currentPeriod?.label || 'Period'} Utilization</span>
                                  <span>{Math.round(currentResource.allocatedHours)}h / {Math.round(currentResource.capacity)}h</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={cn("h-3 rounded-full progress-bar-animated",
                                      currentResource.utilization < 70 ? 'bg-green-500' :
                                      currentResource.utilization < 95 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    )}
                                    style={{
                                      '--progress-width': `${Math.min(100, currentResource.utilization)}%`,
                                      width: `${Math.min(100, currentResource.utilization)}%`
                                    } as React.CSSProperties}
                                  />
                                </div>
                              </div>

                              {/* Individual Resource Status */}
                              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-3 metrics-slide-in">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500">Allocated Hours:</span>
                                    <div className="font-medium text-slate-900">{Math.round(currentResource.allocatedHours)}h</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Capacity:</span>
                                    <div className="font-medium text-slate-900">{Math.round(currentResource.capacity)}h</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Utilization:</span>
                                    <div className={cn("font-medium",
                                      currentResource.utilization < 70 ? 'text-green-600' :
                                      currentResource.utilization < 95 ? 'text-amber-600' :
                                      'text-red-600'
                                    )}>{currentResource.utilization}%</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Available:</span>
                                    <div className="font-medium text-blue-600">
                                      {Math.round(currentResource.capacity - currentResource.allocatedHours)}h
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <p className="text-xs text-gray-600">
                                  Individual resource in {cluster.role} group
                                </p>
                                <button
                                  onClick={() => toggleRoleExpansion(cluster.role)}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                  Back to group view
                                </button>
                              </div>
                            </>
                          )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View More/Less Button */}
            {roleClusters.length > 8 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowAllRoles(!showAllRoles)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                >
                  {showAllRoles
                    ? 'View Less'
                    : `View More (${roleClusters.length - 8} more)`
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
