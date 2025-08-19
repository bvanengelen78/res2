import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format, addWeeks, differenceInDays, parseISO } from "date-fns";

interface Project {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
  priority: 'high' | 'medium' | 'low';
  resources?: Array<{
    id: number;
    name: string;
    utilization: number;
  }>;
}

interface Resource {
  id: number;
  name: string;
  utilization: number;
  allocatedHours: number;
  capacity: number;
  department?: string;
  role?: string;
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

interface SmartNotificationsPanelProps {
  projects: Project[];
  resources: Resource[];
  alerts?: AlertsData;
  className?: string;
}

interface PredictiveAlert {
  id: string;
  type: 'capacity' | 'deadline' | 'resource';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  prediction: string;
  actionUrl?: string;
  daysAhead: number;
}



export function SmartNotificationsPanel({ projects, resources, alerts, className }: SmartNotificationsPanelProps) {

  // Generate Predictive Alerts
  const predictiveAlerts = useMemo((): PredictiveAlert[] => {
    const alertsList: PredictiveAlert[] = [];

    // Get resources with utilization data from alerts or fallback to resources
    let resourcesWithUtilization: AlertResource[] = [];

    if (alerts?.categories) {
      alerts.categories.forEach(category => {
        resourcesWithUtilization.push(...category.resources);
      });
    } else if (resources && Array.isArray(resources) && resources.length > 0) {
      resourcesWithUtilization = resources
        .filter(r => r.utilization !== undefined)
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

    // Capacity prediction alerts
    resourcesWithUtilization.forEach(resource => {
      if (resource.utilization > 90 && resource.utilization <= 100) {
        alertsList.push({
          id: `capacity-${resource.id}`,
          type: 'capacity',
          severity: 'warning',
          title: 'Approaching Capacity Limit',
          description: `${resource.name} will likely exceed capacity next sprint`,
          prediction: `Current: ${resource.utilization}% → Predicted: ${Math.min(resource.utilization + 15, 150)}%`,
          actionUrl: `/resources/${resource.id}#allocations`,
          daysAhead: 7
        });
      } else if (resource.utilization > 100) {
        alertsList.push({
          id: `overallocation-${resource.id}`,
          type: 'capacity',
          severity: 'critical',
          title: 'Critical Overallocation',
          description: `${resource.name} is severely overallocated`,
          prediction: `Immediate reallocation required to prevent burnout`,
          actionUrl: `/resources/${resource.id}#allocations`,
          daysAhead: 0
        });
      }
    });

    // Project deadline predictions
    if (projects && Array.isArray(projects)) {
      projects.forEach(project => {
      const endDate = parseISO(project.endDate);
      const daysRemaining = differenceInDays(endDate, new Date());
      const expectedProgress = Math.max(0, Math.min(100, 100 - (daysRemaining / 90) * 100));
      const progressGap = expectedProgress - project.progress;
      
      if (progressGap > 20 && daysRemaining > 0) {
        alertsList.push({
          id: `deadline-${project.id}`,
          type: 'deadline',
          severity: progressGap > 40 ? 'critical' : 'warning',
          title: 'Project Behind Schedule',
          description: `${project.name} is ${progressGap.toFixed(0)}% behind expected progress`,
          prediction: `Risk of missing deadline in ${daysRemaining} days`,
          actionUrl: `/projects/${project.id}`,
          daysAhead: daysRemaining
        });
      }
      });
    }

    return alertsList.sort((a, b) => {
      const severityWeight = { critical: 3, warning: 2, info: 1 };
      return severityWeight[b.severity] - severityWeight[a.severity];
    }).slice(0, 5);
  }, [projects, resources, alerts]);



  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };



  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      
      {/* Predictive Alerts */}
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            Smart Notifications
          </CardTitle>
          <p className="text-sm text-gray-600">Predictive alerts and early warnings</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {predictiveAlerts.length > 0 ? (
            predictiveAlerts.map((alert) => (
              <div key={alert.id} className="p-3 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.daysAhead > 0 && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          {alert.daysAhead}d ahead
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{alert.description}</p>
                    <p className="text-xs text-gray-500">{alert.prediction}</p>
                  </div>
                  {alert.actionUrl && (
                    <Link href={alert.actionUrl}>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Zap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">All systems running smoothly</p>
              <p className="text-xs">No predictive alerts at this time</p>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
