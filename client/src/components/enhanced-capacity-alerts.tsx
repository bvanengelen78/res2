import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Users, Zap, TrendingUp, Clock, Target, ChevronDown, ChevronUp } from "lucide-react";
import { AlertCategoryCard } from "./alert-category-card";
import { AlertDetailsModal } from "./alert-details-modal";
import { OverallocationResolver } from "./overallocation-resolver";
import { Badge } from "@/components/ui/badge";
import { useRealTimeSync } from "@/hooks/use-real-time-sync";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { getAlertsPeriodInfo, getAlertsPeriodDescription } from "@/lib/alerts-period-utils";

import type { EnhancedCapacityAlerts, AlertCategory, AlertResource, Resource } from "@shared/schema";



interface EnhancedCapacityAlertsProps {
  alerts: EnhancedCapacityAlerts | null;
  isLoading?: boolean;
  kpis?: {
    conflicts?: number;
    [key: string]: any;
  };
  resources?: Resource[];
  currentPeriod?: {
    startDate: string;
    endDate: string;
    label: string;
  };
  periodFilter?: string;
  isTransitioning?: boolean;
}

export function EnhancedCapacityAlerts({ alerts, isLoading, kpis, resources = [], currentPeriod, periodFilter = 'thisMonth', isTransitioning = false }: EnhancedCapacityAlertsProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | null>(null);
  const [resolverOpen, setResolverOpen] = useState(false);
  const [isExecutiveSummaryExpanded, setIsExecutiveSummaryExpanded] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{
    id: number;
    name: string;
    utilization: number;
    allocatedHours: number;
    capacity: number;
  } | null>(null);

  // Enhanced period description with current date awareness
  const enhancedPeriodDescription = useMemo(() => {
    if (!currentPeriod) return '';

    // Get enhanced period info that includes current date awareness
    const alertsPeriodInfo = getAlertsPeriodInfo(periodFilter, currentPeriod);
    return getAlertsPeriodDescription(alertsPeriodInfo);
  }, [currentPeriod, periodFilter]);



  // Real-time synchronization hook
  const { syncAllocationChange } = useRealTimeSync();

  // Navigation and toast hooks
  const [, setLocation] = useLocation();
  const { toast } = useToast();





  // Memoized handlers for performance
  const handleViewAll = useCallback((category: AlertCategory) => {
    setSelectedCategory(category);
    setDetailsModalOpen(true);
  }, []);

  const handleResourceAction = useCallback(async (action: string, resource: AlertResource) => {
    try {
      if (action === 'resolve') {
        setSelectedResource({
          id: resource.id,
          name: resource.name,
          utilization: resource.utilization,
          allocatedHours: resource.allocatedHours,
          capacity: resource.capacity,
        });
        setResolverOpen(true);
        setDetailsModalOpen(false);
      } else if (action === 'assign') {
        // Navigate to resource detail page for assignment
        setLocation(`/resources/${resource.id}`);
        setDetailsModalOpen(false);
        toast({
          title: "Navigating to Resource",
          description: `Opening ${resource.name}'s allocation page`,
        });
      } else if (action === 'view') {
        // Navigate to resource allocation view with direct scroll to allocations section
        setLocation(`/resources/${resource.id}#allocations`);
        setDetailsModalOpen(false);
        toast({
          title: "Viewing Resource Plan",
          description: `Opening ${resource.name}'s allocation details with direct scroll`,
        });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Unable to complete the requested action. Please try again.",
        variant: "destructive",
      });
    }
  }, [setLocation, toast]);

  // Handle bulk actions with real-time sync
  const handleBulkAction = useCallback(async (action: string, resources: AlertResource[]) => {
    try {
      if (action === 'resolve') {
        // For bulk resolve, we'll need to implement bulk resolution logic
        // For now, show a toast indicating the action
        toast({
          title: "Bulk Action",
          description: `Resolving ${resources.length} resource${resources.length > 1 ? 's' : ''}...`,
        });

        // Trigger real-time sync to refresh data
        await syncAllocationChange();

        toast({
          title: "Bulk Resolve Complete",
          description: `Successfully processed ${resources.length} resource${resources.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error) {
      toast({
        title: "Bulk Action Failed",
        description: "Unable to complete bulk action. Please try again.",
        variant: "destructive",
      });
    }
  }, [syncAllocationChange, toast]);



  // Use alerts prop directly (period filtering handled by dashboard)
  const activeAlerts = alerts;
  const activeIsLoading = isLoading;

  // Memoized computed values
  const hasAlerts = useMemo(() =>
    activeAlerts && activeAlerts.summary.totalAlerts > 0,
    [activeAlerts?.summary.totalAlerts]
  );

  const sortedCategories = useMemo(() => {
    if (!activeAlerts?.categories) return [];

    // Sort categories by priority: critical, error, warning, info, unassigned
    const priorityOrder = { critical: 0, error: 1, warning: 2, info: 3, unassigned: 4 };
    return activeAlerts.categories.sort((a, b) =>
      (priorityOrder[a.type] || 99) - (priorityOrder[b.type] || 99)
    );
  }, [activeAlerts?.categories]);

  // Management insights for critical alerts - MOVED BEFORE CONDITIONAL RETURNS
  const managementInsights = useMemo(() => {
    if (!activeAlerts?.categories) return null;

    const criticalCategory = activeAlerts.categories.find(cat => cat.type === 'critical');
    const errorCategory = activeAlerts.categories.find(cat => cat.type === 'error');
    const totalCriticalResources = (criticalCategory?.count || 0) + (errorCategory?.count || 0);

    if (totalCriticalResources === 0) return null;

    return {
      totalCritical: totalCriticalResources,
      criticalResources: criticalCategory?.resources || [],
      errorResources: errorCategory?.resources || [],
      recommendations: [
        `${totalCriticalResources} resource${totalCriticalResources > 1 ? 's' : ''} require immediate attention`,
        'Review project priorities and redistribute workload',
        'Consider hiring additional resources or extending deadlines'
      ]
    };
  }, [activeAlerts?.categories]);

  if (activeIsLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Capacity Alerts
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Monitor resource allocation and capacity issues
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-2xl"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg text-white",
              managementInsights ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-blue-500 to-blue-600"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-slate-900">
                {managementInsights ? 'Critical Capacity Issues' : 'Capacity Alerts'}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {enhancedPeriodDescription ? `${enhancedPeriodDescription} - ` : ''}
                {managementInsights ? 'Immediate management attention required' : 'Week-based analysis detecting peak utilization issues'}
              </p>
            </div>
            {activeAlerts && (
              <div className="text-right">
                <div className={cn(
                  "text-2xl font-bold",
                  managementInsights ? "text-red-600" : "text-slate-900"
                )}>
                  {managementInsights ? managementInsights.totalCritical : activeAlerts.summary.totalAlerts}
                </div>
                <div className="text-xs text-slate-500">
                  {managementInsights ? 'Critical Issues' : 'Total Alerts'}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          {/* Content with transition effects */}
          <div className={cn(
            "transition-all duration-300",
            isTransitioning ? "opacity-80" : "opacity-100"
          )}>
            {/* Collapsible Executive Summary */}
            {managementInsights && (
              <div className="mb-6 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border border-red-200 rounded-xl shadow-sm overflow-hidden">
                {/* Collapsible Header */}
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 cursor-pointer hover:from-red-600 hover:to-red-700 transition-all duration-200"
                  onClick={() => setIsExecutiveSummaryExpanded(!isExecutiveSummaryExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Executive Summary</h3>
                      <p className="text-red-100 text-sm">
                        {isExecutiveSummaryExpanded
                          ? "Critical capacity issues requiring immediate attention"
                          : `${managementInsights?.totalCritical || 0} critical issues • ${(managementInsights?.criticalResources?.length || 0) + (managementInsights?.errorResources?.length || 0)} resources affected • Click to expand`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isExecutiveSummaryExpanded && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{managementInsights?.totalCritical || 0}</div>
                          <div className="text-xs text-red-100">Critical Issues</div>
                        </div>
                      )}
                      <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                        {isExecutiveSummaryExpanded ? (
                          <ChevronUp className="h-4 w-4 text-white" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Content with smooth animation */}
                <div className={`transition-all duration-300 ease-in-out ${
                  isExecutiveSummaryExpanded
                    ? 'max-h-[1000px] opacity-100'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Critical Resources Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-red-100 rounded-lg">
                            <Users className="h-4 w-4 text-red-600" />
                          </div>
                          <h4 className="font-semibold text-red-800 text-base">Critical Resources</h4>
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {managementInsights?.totalCritical || 0} affected
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {[...(managementInsights?.criticalResources || []), ...(managementInsights?.errorResources || [])]
                            .slice(0, 3)
                            .map((resource, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-red-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="font-medium text-slate-900 text-sm">{resource.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-red-700">{resource.utilization}%</div>
                                    <div className="text-xs text-red-600">utilized</div>
                                  </div>
                                  <TrendingUp className="h-4 w-4 text-red-500" />
                                </div>
                              </div>
                            ))}

                          {(managementInsights?.totalCritical || 0) > 3 && (
                            <div className="flex items-center justify-center p-3 bg-red-50 rounded-lg border border-red-100">
                              <span className="text-sm font-medium text-red-700">
                                +{(managementInsights?.totalCritical || 0) - 3} more resources require attention
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Immediate Actions Section */}
                      <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                          <Zap className="h-4 w-4 text-orange-600" />
                        </div>
                        <h4 className="font-semibold text-orange-800 text-base">Immediate Actions</h4>
                        <Badge variant="outline" className="ml-auto text-xs border-orange-200 text-orange-700">
                          Priority
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {(managementInsights?.recommendations || []).map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-orange-100">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-800 leading-relaxed">{rec}</p>
                            </div>
                            <Target className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          </div>
                        ))}
                      </div>

                        {/* Call to Action */}
                        <div className="mt-4 p-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">
                              Time-sensitive: Review and act within 24 hours
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasAlerts ? (
              <div className="space-y-4">
                {/* Critical Issues First */}
                {sortedCategories.filter(cat => cat.type === 'critical' || cat.type === 'error').map((category) => (
                  <AlertCategoryCard
                    key={category.type}
                    category={category}
                    onViewAll={handleViewAll}
                  />
                ))}

                {/* Other Issues */}
                {sortedCategories.filter(cat => cat.type !== 'critical' && cat.type !== 'error').length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Other Alerts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedCategories.filter(cat => cat.type !== 'critical' && cat.type !== 'error').map((category) => (
                        <AlertCategoryCard
                          key={category.type}
                          category={category}
                          onViewAll={handleViewAll}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">All systems optimal</p>
                <p className="text-sm text-gray-500 mt-1">
                  No capacity issues detected
                  {alerts?.metadata.department && alerts.metadata.department !== 'all' &&
                    ` in ${alerts.metadata.department}`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Details Modal */}
      <AlertDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        category={selectedCategory}
        onResourceAction={handleResourceAction}
        onBulkAction={handleBulkAction}
        isLoading={isLoading}
        currentPeriod={currentPeriod}
        periodFilter={periodFilter}
      />

      {/* Overallocation Resolver */}
      {selectedResource && (
        <OverallocationResolver
          open={resolverOpen}
          onOpenChange={setResolverOpen}
          resourceId={selectedResource.id}
          resourceName={selectedResource.name}
          currentUtilization={selectedResource.utilization}
          allocatedHours={selectedResource.allocatedHours}
          capacity={selectedResource.capacity}
        />
      )}
    </div>
  );
}
