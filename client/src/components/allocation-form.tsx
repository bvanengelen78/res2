import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, cacheInvalidation } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertResourceAllocationSchema, ResourceAllocation, Project } from "@shared/schema";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface AllocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: number;
  allocation?: ResourceAllocation & { project: Project } | null;
  projects: Project[];
}

const formSchema = insertResourceAllocationSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type FormData = z.infer<typeof formSchema>;

export function AllocationForm({ 
  open, 
  onOpenChange, 
  resourceId, 
  allocation, 
  projects 
}: AllocationFormProps) {
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: allocation?.projectId || 0,
      resourceId: resourceId,
      allocatedHours: allocation?.allocatedHours || "0",
      startDate: allocation?.startDate || "",
      endDate: allocation?.endDate || "",
      role: allocation?.role || "",
      status: allocation?.status || "active",
    },
  });

  useEffect(() => {
    if (allocation) {
      form.reset({
        projectId: allocation.projectId,
        resourceId: resourceId,
        allocatedHours: allocation.allocatedHours,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        role: allocation.role || "",
        status: allocation.status,
      });
    } else {
      form.reset({
        projectId: 0,
        resourceId: resourceId,
        allocatedHours: "0",
        startDate: "",
        endDate: "",
        role: "",
        status: "active",
      });
    }
  }, [allocation, resourceId, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const method = allocation ? "PUT" : "POST";
      const url = allocation
        ? `/api/allocations/${allocation.id}`
        : "/api/allocations";

      return apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: async () => {
      // Invalidate all allocation-related data including dashboard
      const projectId = form.getValues('projectId');
      await cacheInvalidation.invalidateAllocationRelatedData(resourceId, projectId);
      onOpenChange(false);
      form.reset();
      toast({
        title: "Success",
        description: `Allocation ${allocation ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${allocation ? "update" : "create"} allocation`,
        variant: "destructive",
      });
    },
  });

  const checkCapacity = async (hours: string) => {
    if (!hours || parseFloat(hours) <= 0) {
      setCapacityWarning(null);
      return;
    }

    try {
      const resource = await apiRequest(`/api/resources/${resourceId}`);
      const allocations = await apiRequest(`/api/resources/${resourceId}/allocations`);
      
      const currentAllocatedHours = allocations
        .filter((a: any) => a.status === "active" && a.id !== allocation?.id)
        .reduce((sum: number, a: any) => sum + parseFloat(a.allocatedHours), 0);
      
      const totalHours = currentAllocatedHours + parseFloat(hours);
      const capacity = parseFloat(resource.weeklyCapacity);
      const utilization = (totalHours / capacity) * 100;
      
      if (utilization > 100) {
        setCapacityWarning(`Warning: This allocation would result in ${utilization.toFixed(1)}% utilization (${totalHours}h / ${capacity}h). Resource is over-allocated.`);
      } else if (utilization > 80) {
        setCapacityWarning(`Notice: This allocation would result in ${utilization.toFixed(1)}% utilization (${totalHours}h / ${capacity}h). Near capacity.`);
      } else {
        setCapacityWarning(null);
      }
    } catch (error) {
      console.error("Error checking capacity:", error);
    }
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleHoursChange = (value: string) => {
    form.setValue("allocatedHours", value);
    checkCapacity(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {allocation ? "Edit Allocation" : "Add New Allocation"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allocatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours per Week</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="168"
                      placeholder="e.g., 40"
                      {...field}
                      onChange={(e) => handleHoursChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Frontend Developer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {capacityWarning && (
              <Alert className={capacityWarning.includes("Warning") ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className={capacityWarning.includes("Warning") ? "text-red-800" : "text-yellow-800"}>
                  {capacityWarning}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : allocation ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}