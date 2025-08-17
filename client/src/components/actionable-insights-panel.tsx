import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Clock, 
  ArrowRight,
  Zap,
  Target,
  AlertCircle,
  Info,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Resource {
  id: number;
  name: string;
  utilization: number;
  allocatedHours: number;
  capacity: number;
  department?: string;
  role?: string;
  projects?: Array<{
    id: number;
    name: string;
    priority: 'high' | 'medium' | 'low';
    status: string;
  }>;
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

interface ActionableInsightsPanelProps {
  resources?: Resource[];
  alerts?: AlertsData;
  className?: string;
}

interface Bottleneck {
  resource: Resource;
  severity: 'critical' | 'high' | 'medium';
  reason: string;
  impact: string;
  actionable: string;
}

interface UntappedPotential {
  resource: Resource;
  availableHours: number;
  skillGap: string;
  opportunity: string;
}

interface CriticalOverlap {
  resource: Resource;
  conflictingProjects: Array<{
    id: number;
    name: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  riskLevel: 'high' | 'medium' | 'low';
}

export function ActionableInsightsPanel({ resources = [], alerts, className }: ActionableInsightsPanelProps) {

  // Calculate Top 3 Bottlenecks from alerts data
  const bottlenecks = useMemo((): Bottleneck[] => {
    let overallocatedResources: AlertResource[] = [];

    // Get overallocated resources from alerts data
    if (alerts?.categories) {
      const criticalCategory = alerts.categories.find(cat => cat.type === 'critical');
      const errorCategory = alerts.categories.find(cat => cat.type === 'error');

      if (criticalCategory) overallocatedResources.push(...criticalCategory.resources);
      if (errorCategory) overallocatedResources.push(...errorCategory.resources);
    }

    // Fallback to resources data if no alerts
    if (overallocatedResources.length === 0 && resources.length > 0) {
      overallocatedResources = resources
        .filter(r => r.utilization && r.utilization > 100)
        .map(r => ({
          id: r.id,
          name: r.name,
          utilization: r.utilization,
          allocatedHours: r.allocatedHours || 0,
          capacity: r.capacity || 40,
          department: r.department,
          role: r.role
        }));
    }

    const bottleneckData = overallocatedResources
      .map(resource => {
        const severity: 'critical' | 'high' | 'medium' = resource.utilization > 150 ? 'critical' :
                        resource.utilization > 120 ? 'high' : 'medium';

        return {
          resource: {
            id: resource.id,
            name: resource.name,
            utilization: resource.utilization,
            allocatedHours: resource.allocatedHours,
            capacity: resource.capacity,
            department: resource.department,
            role: resource.role
          },
          severity,
          reason: `${resource.utilization}% allocated (${resource.allocatedHours}h/${resource.capacity}h)`,
          impact: `Blocking ${Math.ceil(resource.utilization / 100)} high-priority project${Math.ceil(resource.utilization / 100) > 1 ? 's' : ''}`,
          actionable: severity === 'critical' ?
            'Immediate reallocation required' :
            'Consider redistributing workload'
        };
      })
      .sort((a, b) => b.resource.utilization - a.resource.utilization)
      .slice(0, 3);

    return bottleneckData;
  }, [resources, alerts]);

  // Calculate Untapped Potential from alerts data
  const untappedPotential = useMemo((): UntappedPotential[] => {
    let underutilizedResources: AlertResource[] = [];

    // Get underutilized resources from alerts data
    if (alerts?.categories) {
      const infoCategory = alerts.categories.find(cat => cat.type === 'info');
      if (infoCategory) underutilizedResources.push(...infoCategory.resources);
    }

    // Fallback to resources data if no alerts
    if (underutilizedResources.length === 0 && resources.length > 0) {
      underutilizedResources = resources
        .filter(r => r.utilization && r.utilization < 70 && r.utilization > 0)
        .map(r => ({
          id: r.id,
          name: r.name,
          utilization: r.utilization,
          allocatedHours: r.allocatedHours || 0,
          capacity: r.capacity || 40,
          department: r.department,
          role: r.role
        }));
    }

    const potentialData = underutilizedResources
      .map(resource => {
        const availableHours = resource.capacity - resource.allocatedHours;
        return {
          resource: {
            id: resource.id,
            name: resource.name,
            utilization: resource.utilization,
            allocatedHours: resource.allocatedHours,
            capacity: resource.capacity,
            department: resource.department,
            role: resource.role
          },
          availableHours,
          skillGap: resource.role || 'General',
          opportunity: availableHours > 20 ?
            'High capacity for new projects' :
            'Available for additional tasks'
        };
      })
      .sort((a, b) => b.availableHours - a.availableHours)
      .slice(0, 3);

    return potentialData;
  }, [resources, alerts]);

  // Calculate Critical Overlaps from highly overallocated resources
  const criticalOverlaps = useMemo((): CriticalOverlap[] => {
    let highlyOverallocatedResources: AlertResource[] = [];

    // Get critically overallocated resources (>120%) indicating multi-project conflicts
    if (alerts?.categories) {
      const criticalCategory = alerts.categories.find(cat => cat.type === 'critical');
      if (criticalCategory) {
        highlyOverallocatedResources = criticalCategory.resources.filter(r => r.utilization > 120);
      }
    }

    // Fallback to resources data if no alerts
    if (highlyOverallocatedResources.length === 0 && resources.length > 0) {
      highlyOverallocatedResources = resources
        .filter(r => r.utilization && r.utilization > 120)
        .map(r => ({
          id: r.id,
          name: r.name,
          utilization: r.utilization,
          allocatedHours: r.allocatedHours || 0,
          capacity: r.capacity || 40,
          department: r.department,
          role: r.role
        }));
    }

    const conflictData = highlyOverallocatedResources
      .map(resource => {
        // Simulate conflicting projects based on overallocation
        const projectCount = Math.ceil(resource.utilization / 100);
        const conflictingProjects = Array.from({ length: Math.min(projectCount, 3) }, (_, i) => ({
          id: i + 1,
          name: `Project ${String.fromCharCode(65 + i)}`,
          priority: i === 0 ? 'high' as const : 'medium' as const
        }));

        return {
          resource: {
            id: resource.id,
            name: resource.name,
            utilization: resource.utilization,
            allocatedHours: resource.allocatedHours,
            capacity: resource.capacity,
            department: resource.department,
            role: resource.role
          },
          conflictingProjects,
          riskLevel: resource.utilization > 150 ? 'high' as const :
                    resource.utilization > 120 ? 'medium' as const : 'low' as const
        };
      })
      .sort((a, b) => b.resource.utilization - a.resource.utilization)
      .slice(0, 3);

    return conflictData;
  }, [resources, alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      
      {/* Top 3 Bottlenecks */}
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            Top 3 Bottlenecks
          </CardTitle>
          <p className="text-sm text-gray-600">Resources blocking progress</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottlenecks.length > 0 ? (
            bottlenecks.map((bottleneck, index) => (
              <div key={bottleneck.resource.id} className="p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{bottleneck.resource.name}</span>
                      <Badge variant="outline" className={getSeverityColor(bottleneck.severity)}>
                        {bottleneck.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{bottleneck.reason}</p>
                    <p className="text-xs text-gray-500">{bottleneck.impact}</p>
                  </div>
                  <Link href={`/resources/${bottleneck.resource.id}#allocations`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="text-xs font-medium text-blue-600">
                  {bottleneck.actionable}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No critical bottlenecks detected</p>
              <p className="text-xs">All resources within capacity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Untapped Potential */}
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
            Untapped Potential
          </CardTitle>
          <p className="text-sm text-gray-600">Underutilized resources</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {untappedPotential.length > 0 ? (
            untappedPotential.map((potential) => (
              <div key={potential.resource.id} className="p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{potential.resource.name}</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        +{potential.availableHours}h
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{potential.skillGap}</p>
                    <p className="text-xs text-gray-500">{potential.opportunity}</p>
                  </div>
                  <Link href={`/resources/${potential.resource.id}#allocations`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="text-xs font-medium text-green-600">
                  Available for new assignments
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">All resources well-utilized</p>
              <p className="text-xs">No significant underutilization</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Overlaps */}
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="p-2 rounded-lg bg-orange-100">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            Critical Overlaps
          </CardTitle>
          <p className="text-sm text-gray-600">Multi-project conflicts</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {criticalOverlaps.length > 0 ? (
            criticalOverlaps.map((overlap) => (
              <div key={overlap.resource.id} className="p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{overlap.resource.name}</span>
                      <Badge variant="outline" className={getRiskColor(overlap.riskLevel)}>
                        {overlap.riskLevel} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {overlap.conflictingProjects.length} concurrent projects
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {overlap.conflictingProjects.slice(0, 2).map((project) => (
                        <span key={project.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {project.name}
                        </span>
                      ))}
                      {overlap.conflictingProjects.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{overlap.conflictingProjects.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/resources/${overlap.resource.id}#allocations`}>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="text-xs font-medium text-orange-600">
                  Review project priorities
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No critical overlaps</p>
              <p className="text-xs">Resource allocation well-distributed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
