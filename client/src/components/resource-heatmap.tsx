import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverallocationResolver } from "./overallocation-resolver";
import { useState } from "react";
import { Settings } from "lucide-react";

interface WeeklyBreakdown {
  week: string;
  hours: number;
  capacity: number;
}

interface HeatmapResource {
  id: number;
  name: string;
  department: string;
  utilization: number;
  allocatedHours: number;
  capacity: number;
  status: 'available' | 'near-capacity' | 'overallocated';
  projects: number;
  weeklyBreakdown?: WeeklyBreakdown[];
}

interface ResourceHeatmapProps {
  resources: HeatmapResource[];
  selectedPeriod?: string;
  departmentFilter?: string;
}

export function ResourceHeatmap({ resources, selectedPeriod, departmentFilter }: ResourceHeatmapProps) {
  const [resolverOpen, setResolverOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<HeatmapResource | null>(null);

  const handleResolveClick = (resource: HeatmapResource) => {
    setSelectedResource(resource);
    setResolverOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-400';
      case 'near-capacity':
        return 'bg-yellow-400';
      case 'overallocated':
        return 'bg-red-400';
      default:
        return 'bg-gray-200';
    }
  };

  const getStatusBadge = (status: string, utilization: number) => {
    const variants = {
      'available': 'default',
      'near-capacity': 'secondary',
      'overallocated': 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {utilization}%
      </Badge>
    );
  };

  const getLegendItems = () => [
    { label: 'Available', color: 'bg-green-400' },
    { label: 'Near Capacity', color: 'bg-yellow-400' },
    { label: 'Overallocated', color: 'bg-red-400' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Resource Capacity Heatmap
            </CardTitle>
            {selectedPeriod && (
              <p className="text-sm text-gray-600 mt-1">
                📅 Displaying data for: {selectedPeriod}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {resources.length} resource{resources.length !== 1 ? 's' : ''}
              {departmentFilter && departmentFilter !== 'all' && (
                <span className="ml-1">in {departmentFilter}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.slice(0, 6).map((resource) => (
            <TooltipProvider key={resource.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group flex items-center justify-between p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 hover:border-gray-300/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${getStatusColor(resource.status)}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {resource.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {resource.department} • {resource.projects} projects
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-xs text-gray-600 font-medium">
                        <div><span className="font-semibold text-gray-900">{resource.allocatedHours}h</span> / {resource.capacity}h</div>
                      </div>
                      {getStatusBadge(resource.status, resource.utilization)}
                      {resource.status === 'overallocated' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveClick(resource)}
                          className="h-6 px-2 text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 font-medium"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  <div className="space-y-2">
                    <div className="font-medium">{resource.name} - Capacity Details</div>
                    <div className="text-sm">
                      <div>Total Allocated: {resource.allocatedHours}h</div>
                      <div>Total Capacity: {resource.capacity}h</div>
                      <div>Utilization: {resource.utilization}%</div>
                    </div>
                    {resource.weeklyBreakdown && resource.weeklyBreakdown.length > 0 && (
                      <div className="border-t pt-2">
                        <div className="text-xs font-medium mb-1">Weekly Breakdown:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {resource.weeklyBreakdown.slice(0, 4).map((week) => (
                            <div key={week.week} className="flex justify-between text-xs">
                              <span>{week.week}:</span>
                              <span>{week.hours}h / {week.capacity}h</span>
                            </div>
                          ))}
                          {resource.weeklyBreakdown.length > 4 && (
                            <div className="text-xs text-gray-500">
                              ...and {resource.weeklyBreakdown.length - 4} more weeks
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {getLegendItems().map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-3 h-3 rounded-sm mr-1 ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
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
    </Card>
  );
}
