import React, { useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  UserX,
  TrendingDown,
  TrendingUp,
  Settings,
  UserPlus,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Calculator,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertCategory, AlertResource } from "@shared/schema";
import { ResourceAlertBreakdownModal } from "./resource-alert-breakdown-modal";

interface AlertDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AlertCategory | null;
  onResourceAction?: (action: string, resource: AlertResource) => void;
  onBulkAction?: (action: string, resources: AlertResource[]) => void;
  isLoading?: boolean;
  error?: string | null;
  currentPeriod?: {
    startDate: string;
    endDate: string;
    label: string;
  };
  periodFilter?: string;
}

const getAlertIcon = (type: AlertCategory['type']) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="h-5 w-5" />;
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'info':
      return <TrendingDown className="h-5 w-5" />;
    case 'unassigned':
      return <UserX className="h-5 w-5" />;
    case 'untapped':
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getAlertStyles = (type: AlertCategory['type']) => {
  switch (type) {
    case 'critical':
      return {
        icon: "text-red-600 bg-red-100",
        badge: "bg-red-100 text-red-700 border-red-300",
        utilization: "text-red-700 font-semibold"
      };
    case 'error':
      return {
        icon: "text-orange-600 bg-orange-100",
        badge: "bg-orange-100 text-orange-700 border-orange-300",
        utilization: "text-orange-700 font-semibold"
      };
    case 'warning':
      return {
        icon: "text-yellow-600 bg-yellow-100",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
        utilization: "text-yellow-700 font-semibold"
      };
    case 'info':
      return {
        icon: "text-blue-600 bg-blue-100",
        badge: "bg-blue-100 text-blue-700 border-blue-300",
        utilization: "text-blue-700 font-semibold"
      };
    case 'unassigned':
      return {
        icon: "text-gray-600 bg-gray-100",
        badge: "bg-gray-100 text-gray-700 border-gray-300",
        utilization: "text-gray-700 font-semibold"
      };
    case 'untapped':
      return {
        icon: "text-green-600 bg-green-100",
        badge: "bg-green-100 text-green-700 border-green-300",
        utilization: "text-green-700 font-semibold"
      };
    default:
      return {
        icon: "text-gray-600 bg-gray-100",
        badge: "bg-gray-100 text-gray-700 border-gray-300",
        utilization: "text-gray-700 font-semibold"
      };
  }
};

const getActionButtons = (type: AlertCategory['type'], resource: AlertResource, onAction?: (action: string, resource: AlertResource) => void) => {
  const buttons = [];

  if (type === 'critical' || type === 'error') {
    buttons.push(
      <Button
        key="resolve"
        size="sm"
        variant="outline"
        className="text-xs px-3 py-1 hover:bg-red-50 hover:border-red-300 border-red-200 text-red-700 transition-all duration-200"
        onClick={() => onAction?.('resolve', resource)}
      >
        <Settings className="h-3 w-3 mr-1" />
        Resolve
      </Button>
    );
  }

  if (type === 'unassigned' || type === 'info') {
    buttons.push(
      <Button
        key="assign"
        size="sm"
        variant="outline"
        className="text-xs px-3 py-1 hover:bg-blue-50 hover:border-blue-300 border-blue-200 text-blue-700 transition-all duration-200"
        onClick={() => onAction?.('assign', resource)}
      >
        <UserPlus className="h-3 w-3 mr-1" />
        Assign
      </Button>
    );
  }

  if (type === 'untapped') {
    buttons.push(
      <Button
        key="assign"
        size="sm"
        variant="outline"
        className="text-xs px-3 py-1 hover:bg-green-50 hover:border-green-300 border-green-200 text-green-700 transition-all duration-200"
        onClick={() => onAction?.('assign', resource)}
      >
        <UserPlus className="h-3 w-3 mr-1" />
        Assign Project
      </Button>
    );
  }

  buttons.push(
    <Button
      key="view"
      size="sm"
      variant="outline"
      className="text-xs px-3 py-1 hover:bg-gray-50 hover:border-gray-300 border-gray-200 text-gray-700 transition-all duration-200 hover:shadow-sm"
      onClick={() => onAction?.('view', resource)}
    >
      <Calendar className="h-3 w-3 mr-1" />
      View Plan
    </Button>
  );

  return buttons;
};

// Enhanced resource item component with detailed calculation breakdown
const ResourceItem = React.memo(({
  resource,
  categoryType,
  onResourceAction,
  isSelected,
  onSelectionChange,
  onDetailedBreakdown
}: {
  resource: AlertResource;
  categoryType: AlertCategory['type'];
  onResourceAction?: (action: string, resource: AlertResource) => void;
  isSelected?: boolean;
  onSelectionChange?: (resourceId: number, selected: boolean) => void;
  onDetailedBreakdown?: (resourceId: number, resourceName: string) => void;
}) => {
  const styles = getAlertStyles(categoryType);

  // Calculate detailed metrics
  const utilizationPercentage = resource.utilization;
  const overallocation = Math.max(0, resource.allocatedHours - resource.capacity);
  const underutilization = Math.max(0, resource.capacity - resource.allocatedHours);
  const availableHours = Math.max(0, resource.capacity - resource.allocatedHours);

  // Determine alert reason and recommendations
  const getAlertReason = () => {
    if (categoryType === 'critical' && utilizationPercentage > 100) {
      return `Over-allocated by ${overallocation.toFixed(1)} hours (${(utilizationPercentage - 100).toFixed(1)}% over capacity)`;
    }
    if (categoryType === 'warning' && utilizationPercentage > 85) {
      return `Near capacity limit with ${availableHours.toFixed(1)} hours remaining`;
    }
    if (categoryType === 'info' && utilizationPercentage < 70) {
      return `Under-utilized with ${underutilization.toFixed(1)} hours available capacity`;
    }
    if (categoryType === 'unassigned' && utilizationPercentage === 0) {
      return `No project assignments - full ${resource.capacity} hour capacity available`;
    }
    return `Utilization at ${utilizationPercentage.toFixed(1)}%`;
  };

  const getRecommendations = () => {
    const recommendations = [];
    if (categoryType === 'critical') {
      recommendations.push("Redistribute workload to other team members");
      recommendations.push("Consider extending project timelines");
      recommendations.push("Evaluate project priorities and defer non-critical tasks");
    } else if (categoryType === 'warning') {
      recommendations.push("Monitor closely for potential overallocation");
      recommendations.push("Prepare backup resources if needed");
    } else if (categoryType === 'info') {
      recommendations.push("Assign additional projects or tasks");
      recommendations.push("Consider cross-training opportunities");
      recommendations.push("Evaluate skill development initiatives");
    } else if (categoryType === 'unassigned') {
      recommendations.push("Review upcoming project requirements");
      recommendations.push("Assign to high-priority initiatives");
      recommendations.push("Consider training or development activities");
    }
    return recommendations;
  };

  return (
    <div className={cn(
      "border rounded-2xl shadow-sm transition-all duration-200",
      "hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300",
      isSelected && "ring-2 ring-blue-500 ring-opacity-50 border-blue-300 bg-blue-50"
    )}>
      {/* Main Resource Info */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1">
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(resource.id, !!checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 text-sm">
                {resource.name}
              </h4>
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", styles.badge)}
              >
                {resource.utilization}%
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="font-medium">{resource.department || resource.role || 'General'}</span>
              <span>•</span>
              <span className={cn("font-medium", styles.utilization)}>
                {resource.allocatedHours}h / {resource.capacity}h total
              </span>
              {/* Show peak week information for multi-week periods */}
              {(resource as any).peakWeek && (
                <>
                  <span>•</span>
                  <span className="text-xs text-blue-600 font-medium">
                    Peak: {resource.utilization}% (Week {(resource as any).peakWeek.split('-W')[1]})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDetailedBreakdown?.(resource.id, resource.name)}
            className="text-xs px-2 py-1 h-7 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
          >
            <Calculator className="h-3 w-3 mr-1" />
            Detailed Breakdown
          </Button>
          {getActionButtons(categoryType, resource, onResourceAction)}
        </div>
      </div>


    </div>
  );
});

ResourceItem.displayName = 'ResourceItem';

export function AlertDetailsModal({
  open,
  onOpenChange,
  category,
  onResourceAction,
  onBulkAction,
  isLoading = false,
  error = null,
  currentPeriod,
  periodFilter = 'thisMonth'
}: AlertDetailsModalProps) {
  // All hooks must be called at the top level before any conditional logic
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'utilization' | 'department'>('utilization');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResources, setSelectedResources] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Enhanced breakdown modal state
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedResourceForBreakdown, setSelectedResourceForBreakdown] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Handle detailed breakdown request
  const handleDetailedBreakdown = useCallback((resourceId: number, resourceName: string) => {
    setSelectedResourceForBreakdown({ id: resourceId, name: resourceName });
    setBreakdownModalOpen(true);
  }, []);

  // Handle resource selection
  const handleSelectionChange = useCallback((resourceId: number, selected: boolean) => {
    setSelectedResources(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(resourceId);
      } else {
        newSet.delete(resourceId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  }, []);

  // Handle resource action with loading state
  const handleResourceActionWithLoading = useCallback(async (action: string, resource: AlertResource) => {
    setActionLoading(`${action}-${resource.id}`);
    try {
      await onResourceAction?.(action, resource);
    } catch (error) {
      console.error('Resource action failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [onResourceAction]);

  // Handle bulk action with loading state
  const handleBulkActionWithLoading = useCallback(async (action: string) => {
    setActionLoading(`bulk-${action}`);
    try {
      const selectedResourceObjects = category?.resources.filter(r => selectedResources.has(r.id)) || [];
      await onBulkAction?.(action, selectedResourceObjects);
      setSelectedResources(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [onBulkAction, category?.resources, selectedResources]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!category?.resources) return;

    if (selectedResources.size === category.resources.length) {
      setSelectedResources(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedResources(new Set(category.resources.map(r => r.id)));
      setShowBulkActions(true);
    }
  }, [category?.resources, selectedResources.size]);

  // Filter and sort resources
  const filteredAndSortedResources = useMemo(() => {
    if (!category?.resources) return [];

    let filtered = category.resources.filter(resource =>
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resource.department || resource.role || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'utilization':
          comparison = a.utilization - b.utilization;
          break;
        case 'department':
          const aDept = a.department || a.role || '';
          const bDept = b.department || b.role || '';
          comparison = aDept.localeCompare(bDept);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [category?.resources, searchTerm, sortBy, sortOrder]);

  // Early return after all hooks are declared
  if (!category) return null;

  const styles = getAlertStyles(category.type);
  
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", styles.icon)}>
                {getAlertIcon(category.type)}
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {category.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {category.description} • {filteredAndSortedResources.length} of {category.count} resource{category.count !== 1 ? 's' : ''} • Categorized by peak weekly utilization
                </DialogDescription>
              </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedResources.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkActionWithLoading('resolve')}
                  disabled={actionLoading === 'bulk-resolve'}
                  className="text-xs"
                >
                  {actionLoading === 'bulk-resolve' ? 'Processing...' : 'Bulk Resolve'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Filters and Controls */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilization">Utilization</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Select All */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              {selectedResources.size === (category?.resources?.length || 0) ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Select All
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Error loading resources</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-2xl">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" style={{ width: '60%' }} />
                        <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: '40%' }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
                      <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedResources.map((resource) => (
                  <ResourceItem
                    key={resource.id}
                    resource={resource}
                    categoryType={category.type}
                    onResourceAction={handleResourceActionWithLoading}
                    isSelected={selectedResources.has(resource.id)}
                    onSelectionChange={handleSelectionChange}
                    onDetailedBreakdown={handleDetailedBreakdown}
                  />
                ))}

                {filteredAndSortedResources.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">No resources found</p>
                    <p className="text-sm">
                      {searchTerm ? 'Try adjusting your search terms' : 'No resources match the current filters'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {category.threshold && (
                <span>Threshold: {category.threshold}% • </span>
              )}
              Showing {filteredAndSortedResources.length} of {category?.resources?.length || 0} resource{(category?.resources?.length || 0) !== 1 ? 's' : ''}
              {selectedResources.size > 0 && (
                <span> • {selectedResources.size} selected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedResources.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedResources(new Set());
                    setShowBulkActions(false);
                  }}
                >
                  Clear Selection
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Enhanced Resource Alert Breakdown Modal */}
    {selectedResourceForBreakdown && currentPeriod && (
      <ResourceAlertBreakdownModal
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
        resourceId={selectedResourceForBreakdown.id}
        resourceName={selectedResourceForBreakdown.name}
        currentPeriod={currentPeriod}
        periodFilter={periodFilter}
      />
    )}
  </>
  );
}
