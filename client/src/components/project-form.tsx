import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type InsertProject, type Resource, type Project, type OgsmCharter } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";



interface ResourceSelectorProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder: string;
  label: string;
  required?: boolean;
}

function ResourceSelector({ value, onChange, placeholder, label, required = false }: ResourceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const selectedResource = resources.find(r => r.id === value);

  const filteredResources = resources.filter(resource => 
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedResource ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedResource.name}</span>
                <span className="text-muted-foreground">({selectedResource.role})</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search resources..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No resource found.</CommandEmpty>
              <CommandGroup>
                {filteredResources.map((resource) => (
                  <CommandItem
                    key={resource.id}
                    value={resource.name}
                    onSelect={() => {
                      onChange(resource.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{resource.name}</span>
                      <span className="text-sm text-muted-foreground">{resource.email}</span>
                      <Badge variant="outline" className="text-xs w-fit mt-1">{resource.role}</Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  mode?: 'create' | 'edit';
}

export function ProjectForm({ open, onOpenChange, project, mode = 'create' }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch OGSM Charters
  const { data: ogsmCharters = [], isLoading: isLoadingCharters, error: chartersError } = useQuery<OgsmCharter[]>({
    queryKey: ["/api/ogsm-charters"],
    // Remove enabled condition to always fetch
  });



  // Helper function to format date for HTML date input
  const formatDateForInput = (date: string | Date | null | undefined): string => {
    if (!date) return "";

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "";

      // Format as YYYY-MM-DD for HTML date input
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error formatting date for input:', error);
      return "";
    }
  };

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      startDate: formatDateForInput(project?.startDate),
      endDate: formatDateForInput(project?.endDate),
      status: project?.status || "draft",
      priority: project?.priority || "medium",
      type: project?.type || "business",
      stream: project?.stream || undefined,
      ogsmCharter: project?.ogsmCharter || undefined,
      directorId: project?.directorId || undefined,
      changeLeadId: project?.changeLeadId || undefined,
      businessLeadId: project?.businessLeadId || undefined,
    },
  });

  const projectType = useWatch({ control: form.control, name: "type" });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name || "",
        description: project.description || "",
        startDate: formatDateForInput(project.startDate),
        endDate: formatDateForInput(project.endDate),
        status: project.status || "draft",
        priority: project.priority || "medium",
        type: project.type || "business",
        stream: project.stream || undefined,
        ogsmCharter: project.ogsmCharter || undefined,
        directorId: project.directorId || undefined,
        changeLeadId: project.changeLeadId || undefined,
        businessLeadId: project.businessLeadId || undefined,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "draft",
        priority: "medium",
        type: "business",
        stream: undefined,
        ogsmCharter: undefined,
        directorId: undefined,
        changeLeadId: undefined,
        businessLeadId: undefined,
      });
    }
  }, [project, form]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      return await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      return await apiRequest(`/api/projects/${project?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProject) => {
    if (mode === 'edit') {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const isLoading = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update project details and metadata. Changes will be saved immediately.' 
              : 'Define a new project with comprehensive metadata for better governance and reporting.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Core project details and timeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter project name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register("startDate")}
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...form.register("endDate")}
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Classification Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Project Classification</CardTitle>
              <CardDescription>Define the project type and organizational details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Project Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) => form.setValue("type", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change">Change</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closure">Closure</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.status && (
                    <p className="text-sm text-red-600">{form.formState.errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.watch("priority")}
                    onValueChange={(value) => form.setValue("priority", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.priority && (
                    <p className="text-sm text-red-600">{form.formState.errors.priority.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stream">Stream</Label>
                  <Select
                    value={form.watch("stream") || ""}
                    onValueChange={(value) => form.setValue("stream", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Governance & Leadership Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Governance & Leadership</CardTitle>
              <CardDescription>Assign key stakeholders and leadership roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResourceSelector
                value={form.watch("directorId")}
                onChange={(value) => form.setValue("directorId", value)}
                placeholder="Select director"
                label="Director"
                required
              />

              {projectType === "change" && (
                <ResourceSelector
                  value={form.watch("changeLeadId")}
                  onChange={(value) => form.setValue("changeLeadId", value)}
                  placeholder="Select change lead"
                  label="Change Lead"
                  required
                />
              )}

              <ResourceSelector
                value={form.watch("businessLeadId")}
                onChange={(value) => form.setValue("businessLeadId", value)}
                placeholder="Select business lead"
                label="Business Lead"
              />
            </CardContent>
          </Card>

          {/* Strategic Alignment Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Strategic Alignment</CardTitle>
              <CardDescription>Define the project's strategic charter and objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ogsmCharter">OGSM Charter</Label>
                <Select
                  value={form.watch("ogsmCharter") || ""}
                  onValueChange={(value) => form.setValue("ogsmCharter", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OGSM charter" />
                  </SelectTrigger>
                  <SelectContent>
                    {ogsmCharters.map((charter) => (
                      <SelectItem key={charter.id} value={charter.name}>
                        {charter.name}
                      </SelectItem>
                    ))}
                    {ogsmCharters.length === 0 && (
                      <SelectItem value="empty" disabled>No charters available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (mode === 'edit' ? "Saving..." : "Creating...") 
                : (mode === 'edit' ? "Save Changes" : "Create Project")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
