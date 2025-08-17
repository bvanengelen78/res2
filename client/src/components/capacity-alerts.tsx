import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles, Flame, TrendingDown, Info } from "lucide-react";
import { OverallocationResolver } from "./overallocation-resolver";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Alert {
  type: 'error' | 'warning' | 'success' | 'critical' | 'info';
  title: string;
  message: string;
  action?: string | null;
}

interface CapacityAlertsProps {
  alerts: Alert[];
}

export function CapacityAlerts({ alerts }: CapacityAlertsProps) {
  const [resolverOpen, setResolverOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{
    id: number;
    name: string;
    utilization: number;
    allocatedHours: number;
    capacity: number;
  } | null>(null);

  const { data: heatmapData } = useQuery({
    queryKey: ["/api/dashboard/heatmap"],
  });

  const handleActionClick = (alert: Alert) => {
    // Extract resource name from alert message
    const resourceName = alert.message.split(' is allocated')[0] || alert.message.split(' is only')[0];

    // Find the resource in heatmap data
    const resource = heatmapData?.find((r: any) => r.name === resourceName);

    if (resource) {
      setSelectedResource({
        id: resource.id,
        name: resource.name,
        utilization: resource.utilization,
        allocatedHours: resource.allocatedHours,
        capacity: resource.capacity,
      });

      // Different actions based on alert type
      if (alert.type === 'critical' || alert.type === 'error' || alert.type === 'warning') {
        setResolverOpen(true);
      } else if (alert.type === 'info') {
        // For under-utilization, could open a project assignment dialog
        // For now, open the resolver to show allocation details
        setResolverOpen(true);
      }
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'critical':
        return <Flame className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <TrendingDown className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200 shadow-red-100/50";
      case 'critical':
        return "bg-gradient-to-r from-red-100 to-red-200/50 border-red-300 shadow-red-200/50 ring-1 ring-red-200";
      case 'warning':
        return "bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 shadow-amber-100/50";
      case 'success':
        return "bg-gradient-to-r from-green-50 to-green-100/50 border-green-200 shadow-green-100/50";
      case 'info':
        return "bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200 shadow-blue-100/50";
      default:
        return "bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200 shadow-gray-100/50";
    }
  };

  const getButtonStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return "bg-red-100 text-red-700 hover:bg-red-200 border-red-300";
      case 'critical':
        return "bg-red-200 text-red-800 hover:bg-red-300 font-semibold border-red-400 shadow-sm";
      case 'warning':
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300";
      case 'success':
        return "bg-green-100 text-green-700 hover:bg-green-200 border-green-300";
      case 'info':
        return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300";
    }
  };

  const getActionText = (alert: Alert) => {
    switch (alert.type) {
      case 'critical':
        return 'Resolve Immediately';
      case 'error':
        return 'Resolve Issue';
      case 'warning':
        return 'Monitor & Plan';
      case 'info':
        return 'View Opportunities';
      case 'success':
        return 'View Details';
      default:
        return alert.action || 'View Details';
    }
  };

  return (
    <div>
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
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 ease-out",
                  "flex items-center p-4 border rounded-xl shadow-sm",
                  "hover:shadow-md hover:-translate-y-0.5",
                  getAlertStyles(alert.type)
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative z-10 flex items-center w-full">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 ml-4">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-700 transition-colors">
                      {alert.message}
                    </p>
                  </div>
                  {alert.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "px-4 py-2 text-xs font-medium rounded-full transition-all duration-200",
                        "hover:scale-105 hover:shadow-md border",
                        getButtonStyles(alert.type)
                      )}
                      onClick={() => handleActionClick(alert)}
                    >
                      {getActionText(alert)}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">All systems optimal</p>
                <p className="text-sm text-gray-500 mt-1">No capacity issues detected</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
