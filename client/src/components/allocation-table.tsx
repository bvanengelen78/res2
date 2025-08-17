import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllocationForm } from "@/components/allocation-form";
import { ResourceAllocationOverview } from "@/components/resource-allocation-overview";
import { ResourceManagementInsights } from "@/components/resource-management-insights";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ResourceAllocation, Project, Resource } from "@shared/schema";
import { Link } from "wouter";
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, Clock, ExternalLink, Calendar, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllocationTableProps {
  resourceId: number;
  resourceCapacity: number;
  resource: Resource;
}

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
}

export function AllocationTable({ resourceId, resourceCapacity, resource }: AllocationTableProps) {
  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AllocationWithProject | null>(null);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allocations, isLoading } = useQuery<AllocationWithProject[]>({
    queryKey: ["/api/resources", resourceId, "allocations"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/allocations/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources", resourceId, "allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      toast({
        title: "Success",
        description: "Allocation deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete allocation",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/allocations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources", resourceId, "allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      setInlineEditId(null);
      setEditValues({});
      toast({
        title: "Success",
        description: "Allocation updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update allocation",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />;
      case "planned":
        return <Clock className="h-3 w-3" />;
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const calculateTotalHours = () => {
    if (!allocations) return 0;
    return allocations
      .filter(a => a.status === "active")
      .reduce((sum, allocation) => sum + parseFloat(allocation.allocatedHours), 0);
  };

  const getCapacityStatus = () => {
    const totalHours = calculateTotalHours();
    const utilizationPercentage = (totalHours / resourceCapacity) * 100;
    
    if (utilizationPercentage > 100) {
      return { status: "overallocated", color: "text-red-600", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> };
    } else if (utilizationPercentage > 80) {
      return { status: "near-capacity", color: "text-yellow-600", icon: <AlertTriangle className="h-4 w-4 text-yellow-600" /> };
    } else {
      return { status: "available", color: "text-green-600", icon: <CheckCircle className="h-4 w-4 text-green-600" /> };
    }
  };

  const handleInlineEdit = (allocation: AllocationWithProject) => {
    setInlineEditId(allocation.id);
    setEditValues({
      allocatedHours: allocation.allocatedHours,
      role: allocation.role || "",
      status: allocation.status,
    });
  };

  const handleInlineUpdate = (allocationId: number) => {
    updateMutation.mutate({
      id: allocationId,
      data: {
        allocatedHours: parseFloat(editValues.allocatedHours),
        role: editValues.role,
        status: editValues.status,
      },
    });
  };

  const handleCancelEdit = () => {
    setInlineEditId(null);
    setEditValues({});
  };

  const handleAddAllocation = () => {
    setEditingAllocation(null);
    setAllocationFormOpen(true);
  };

  const handleEditAllocation = (allocation: AllocationWithProject) => {
    setEditingAllocation(allocation);
    setAllocationFormOpen(true);
  };

  const capacityStatus = getCapacityStatus();
  const totalHours = calculateTotalHours();
  const utilizationPercentage = (totalHours / resourceCapacity) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading allocations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      fullscreenMode
        ? "fixed inset-4 z-50 overflow-auto"
        : cn(
            "group relative overflow-hidden transition-all duration-300 ease-out",
            "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
            "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
            "hover:bg-white hover:border-blue-300/50",
            "rounded-2xl"
          )
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Allocations
          {fullscreenMode && (
            <Badge variant="outline" className="ml-2">
              Fullscreen Mode
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          {fullscreenMode
            ? "Enhanced view for managing resource allocations and weekly breakdowns"
            : "Project assignments and weekly capacity. Click the link icon to view detailed weekly allocations."
          }
        </p>
      </CardHeader>
      <CardContent>
        {!allocations || allocations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No allocations yet</p>
            <p className="text-sm">Click "Add Allocation" to get started</p>
          </div>
        ) : (
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Weekly Breakdown
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Management Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                {fullscreenMode
                  ? "Enhanced week-by-week allocation breakdown with expanded view for detailed management"
                  : "Project allocation overview with drill-down capabilities for detailed weekly management"
                }
              </div>
              <ResourceAllocationOverview
                resourceId={resourceId}
                resource={resource}
                viewMode={fullscreenMode ? "detailed" : "summary"}
              />
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <ResourceManagementInsights
                resourceId={resourceId}
                resource={resource}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AllocationForm
        open={allocationFormOpen}
        onOpenChange={setAllocationFormOpen}
        resourceId={resourceId}
        allocation={editingAllocation}
        projects={projects || []}
      />
    </Card>
  );
}