import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, cacheInvalidation } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, BarChart3, Users, Clock, ArrowRight, Undo2 } from "lucide-react";
import type { Resource, Project, ResourceAllocation } from "@shared/schema";

interface OverallocationResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: number;
  resourceName: string;
  currentUtilization: number;
  allocatedHours: number;
  capacity: number;
}

interface ResolutionSuggestion {
  id: string;
  type: 'redistribute' | 'reduce' | 'reassign';
  title: string;
  description: string;
  impact: {
    newUtilization: number;
    hoursSaved: number;
    affectedProjects: number;
  };
  actions: Array<{
    type: 'modify' | 'reassign';
    allocationId: number;
    projectName: string;
    currentHours: number;
    newHours?: number;
    targetResourceId?: number;
    targetResourceName?: string;
  }>;
}

export function OverallocationResolver({ 
  open, 
  onOpenChange, 
  resourceId, 
  resourceName, 
  currentUtilization, 
  allocatedHours, 
  capacity 
}: OverallocationResolverProps) {
  const [activeTab, setActiveTab] = useState("analysis");
  const [simulationChanges, setSimulationChanges] = useState<Map<number, number>>(new Map());
  const [selectedSuggestion, setSelectedSuggestion] = useState<ResolutionSuggestion | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allocations, isLoading } = useQuery<(ResourceAllocation & { project: Project })[]>({
    queryKey: ["/api/resources", resourceId, "allocations"],
    enabled: open,
  });

  const { data: availableResources } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
    enabled: open,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: open,
  });

  // Generate smart suggestions based on current allocations
  const generateSuggestions = (): ResolutionSuggestion[] => {
    if (!allocations || !availableResources) return [];

    const suggestions: ResolutionSuggestion[] = [];
    const activeAllocations = allocations.filter(a => a.status === 'active');
    const overageHours = allocatedHours - capacity;

    // Suggestion 1: Reduce hours on low-priority projects
    const lowPriorityAllocations = activeAllocations
      .filter(a => a.project.priority === 'low')
      .sort((a, b) => parseFloat(b.allocatedHours) - parseFloat(a.allocatedHours));

    if (lowPriorityAllocations.length > 0) {
      let hoursSaved = 0;
      const actions: ResolutionSuggestion['actions'] = [];
      
      for (const allocation of lowPriorityAllocations) {
        const reduction = Math.min(parseFloat(allocation.allocatedHours) * 0.3, overageHours - hoursSaved);
        if (reduction > 0) {
          actions.push({
            type: 'modify',
            allocationId: allocation.id,
            projectName: allocation.project.name,
            currentHours: parseFloat(allocation.allocatedHours),
            newHours: parseFloat(allocation.allocatedHours) - reduction,
          });
          hoursSaved += reduction;
        }
        if (hoursSaved >= overageHours) break;
      }

      if (hoursSaved > 0) {
        suggestions.push({
          id: 'reduce-low-priority',
          type: 'reduce',
          title: 'Reduce Low Priority Projects',
          description: `Reduce hours on ${actions.length} low-priority projects to resolve overallocation`,
          impact: {
            newUtilization: Math.round(((allocatedHours - hoursSaved) / capacity) * 100),
            hoursSaved,
            affectedProjects: actions.length,
          },
          actions,
        });
      }
    }

    // Suggestion 2: Reassign tasks to available resources
    const availableResourcesWithCapacity = availableResources
      .filter(r => r.id !== resourceId && r.isActive)
      .map(r => {
        const resourceAllocations = queryClient.getQueryData<(ResourceAllocation & { project: Project })[]>(["/api/resources", r.id, "allocations"]) || [];
        const resourceAllocatedHours = resourceAllocations
          .filter(a => a.status === 'active')
          .reduce((sum, a) => sum + parseFloat(a.allocatedHours), 0);
        const resourceCapacity = parseFloat(r.weeklyCapacity);
        const availableHours = resourceCapacity - resourceAllocatedHours;
        
        return {
          ...r,
          availableHours,
          utilization: (resourceAllocatedHours / resourceCapacity) * 100,
        };
      })
      .filter(r => r.availableHours > 0)
      .sort((a, b) => b.availableHours - a.availableHours);

    if (availableResourcesWithCapacity.length > 0) {
      let hoursSaved = 0;
      const actions: ResolutionSuggestion['actions'] = [];
      
      for (const allocation of activeAllocations) {
        if (hoursSaved >= overageHours) break;
        
        const targetResource = availableResourcesWithCapacity.find(r => 
          r.availableHours >= parseFloat(allocation.allocatedHours)
        );
        
        if (targetResource) {
          actions.push({
            type: 'reassign',
            allocationId: allocation.id,
            projectName: allocation.project.name,
            currentHours: parseFloat(allocation.allocatedHours),
            targetResourceId: targetResource.id,
            targetResourceName: targetResource.name,
          });
          hoursSaved += parseFloat(allocation.allocatedHours);
          targetResource.availableHours -= parseFloat(allocation.allocatedHours);
        }
      }

      if (actions.length > 0) {
        suggestions.push({
          id: 'reassign-tasks',
          type: 'reassign',
          title: 'Reassign to Available Resources',
          description: `Move ${actions.length} project assignments to available team members`,
          impact: {
            newUtilization: Math.round(((allocatedHours - hoursSaved) / capacity) * 100),
            hoursSaved,
            affectedProjects: actions.length,
          },
          actions,
        });
      }
    }

    // Suggestion 3: Redistribute hours across time periods
    if (activeAllocations.length > 1) {
      suggestions.push({
        id: 'redistribute-hours',
        type: 'redistribute',
        title: 'Redistribute Hours',
        description: 'Spread workload more evenly across current projects',
        impact: {
          newUtilization: Math.round(((allocatedHours - overageHours * 0.5) / capacity) * 100),
          hoursSaved: overageHours * 0.5,
          affectedProjects: activeAllocations.length,
        },
        actions: activeAllocations.map(a => ({
          type: 'modify' as const,
          allocationId: a.id,
          projectName: a.project.name,
          currentHours: parseFloat(a.allocatedHours),
          newHours: parseFloat(a.allocatedHours) * 0.9,
        })),
      });
    }

    return suggestions;
  };

  const applyChangesMutation = useMutation({
    mutationFn: async (changes: { allocationId: number; hours?: number; resourceId?: number }[]) => {
      const promises = changes.map(change => {
        if (change.resourceId) {
          // Reassign to different resource
          return apiRequest(`/api/allocations/${change.allocationId}`, {
            method: "PUT",
            body: JSON.stringify({
              resourceId: change.resourceId,
            }),
          });
        } else {
          // Modify hours
          return apiRequest(`/api/allocations/${change.allocationId}`, {
            method: "PUT",
            body: JSON.stringify({
              allocatedHours: change.hours?.toString(),
            }),
          });
        }
      });
      return Promise.all(promises);
    },
    onSuccess: async () => {
      // Invalidate all allocation-related data including dashboard
      await cacheInvalidation.invalidateAllocationRelatedData();
      toast({
        title: "Success",
        description: "Overallocation resolved successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply changes",
        variant: "destructive",
      });
    },
  });

  const handleApplySuggestion = (suggestion: ResolutionSuggestion) => {
    const changes = suggestion.actions.map(action => ({
      allocationId: action.allocationId,
      hours: action.newHours,
      resourceId: action.targetResourceId,
    }));
    
    applyChangesMutation.mutate(changes);
  };

  const handleSimulationChange = (allocationId: number, newHours: number) => {
    const newChanges = new Map(simulationChanges);
    newChanges.set(allocationId, newHours);
    setSimulationChanges(newChanges);
  };

  const calculateSimulatedUtilization = () => {
    if (!allocations) return currentUtilization;
    
    let totalHours = 0;
    for (const allocation of allocations.filter(a => a.status === 'active')) {
      const simulatedHours = simulationChanges.get(allocation.id) ?? parseFloat(allocation.allocatedHours);
      totalHours += simulatedHours;
    }
    
    return Math.round((totalHours / capacity) * 100);
  };

  const applySimulation = () => {
    if (simulationChanges.size === 0) return;
    
    const changes = Array.from(simulationChanges.entries()).map(([allocationId, hours]) => ({
      allocationId,
      hours,
    }));
    
    applyChangesMutation.mutate(changes);
  };

  const suggestions = generateSuggestions();

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolving Overallocation</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Analyzing allocations...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Resolve Overallocation - {resourceName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="simulation">What-If</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Allocation Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{currentUtilization}%</div>
                    <div className="text-sm text-gray-600">Current Utilization</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{allocatedHours}h</div>
                    <div className="text-sm text-gray-600">Allocated Hours</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{capacity}h</div>
                    <div className="text-sm text-gray-600">Weekly Capacity</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Project Allocations</h4>
                  {allocations?.filter(a => a.status === 'active').map((allocation) => (
                    <div key={allocation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">{allocation.project.name}</div>
                          <div className="text-sm text-gray-600">
                            {allocation.project.priority} priority • {allocation.role}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{allocation.allocatedHours}h</div>
                        <div className="text-sm text-gray-600">
                          {Math.round((parseFloat(allocation.allocatedHours) / capacity) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <div className="space-y-4">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {suggestion.impact.newUtilization}% utilization
                        </Badge>
                      </div>
                      <p className="text-gray-600">{suggestion.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-semibold text-green-600">
                            -{suggestion.impact.hoursSaved}h
                          </div>
                          <div className="text-xs text-gray-600">Hours Saved</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-semibold text-blue-600">
                            {suggestion.impact.newUtilization}%
                          </div>
                          <div className="text-xs text-gray-600">New Utilization</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-semibold text-gray-600">
                            {suggestion.impact.affectedProjects}
                          </div>
                          <div className="text-xs text-gray-600">Affected Projects</div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {suggestion.actions.map((action, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                            <span>{action.projectName}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">{action.currentHours}h</span>
                              <ArrowRight className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">
                                {action.type === 'reassign' 
                                  ? `${action.targetResourceName}` 
                                  : `${action.newHours}h`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={() => handleApplySuggestion(suggestion)}
                        disabled={applyChangesMutation.isPending}
                        className="w-full"
                      >
                        {applyChangesMutation.isPending ? 'Applying...' : 'Apply This Suggestion'}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No automatic suggestions available. Try the What-If simulation or manual adjustment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>What-If Simulation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Simulated Utilization</span>
                    <span className="text-lg font-bold">
                      {calculateSimulatedUtilization()}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(calculateSimulatedUtilization(), 100)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-4">
                  {allocations?.filter(a => a.status === 'active').map((allocation) => (
                    <div key={allocation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{allocation.project.name}</div>
                        <div className="text-sm text-gray-600">{allocation.role}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={simulationChanges.get(allocation.id) ?? parseFloat(allocation.allocatedHours)}
                          onChange={(e) => handleSimulationChange(allocation.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                          step="0.5"
                          min="0"
                        />
                        <span className="text-sm text-gray-600">hours</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setSimulationChanges(new Map())}
                    disabled={simulationChanges.size === 0}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    onClick={applySimulation}
                    disabled={simulationChanges.size === 0 || applyChangesMutation.isPending}
                  >
                    {applyChangesMutation.isPending ? 'Applying...' : 'Apply Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Adjustment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocations?.filter(a => a.status === 'active').map((allocation) => (
                    <div key={allocation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{allocation.project.name}</div>
                        <div className="text-sm text-gray-600">{allocation.role}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          defaultValue={allocation.allocatedHours}
                          className="w-20"
                          step="0.5"
                          min="0"
                        />
                        <span className="text-sm text-gray-600">hours</span>
                        <Select defaultValue={resourceId.toString()}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={resourceId.toString()}>{resourceName}</SelectItem>
                            {availableResources?.filter(r => r.id !== resourceId && r.isActive).map(resource => (
                              <SelectItem key={resource.id} value={resource.id.toString()}>
                                {resource.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-end">
                  <Button disabled={applyChangesMutation.isPending}>
                    {applyChangesMutation.isPending ? 'Applying...' : 'Apply Manual Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}