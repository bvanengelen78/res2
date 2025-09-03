import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { OgsmCharter, Department, NotificationSettings } from "@shared/schema";
import { useJobRoles, useCreateJobRole, useUpdateJobRole, useDeleteJobRole } from "@/hooks/useJobRoles";
import { useDepartments } from "@/hooks/useDepartments";
import { Switch } from "@/components/ui/switch";
import { SettingsGuard } from "@/components/auth/RBACGuard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleManagementGuard } from "@/components/auth/RBACGuard";
import { PERMISSIONS } from "@shared/schema";
import "@/styles/dashboard-blue-theme.css";

const ogsmCharterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const jobRoleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  department_id: z.number().optional(),
});

type OgsmCharterForm = z.infer<typeof ogsmCharterSchema>;
type DepartmentForm = z.infer<typeof departmentSchema>;
type JobRoleForm = z.infer<typeof jobRoleSchema>;

interface EditModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  item: T | null;
  onSave: (data: any) => void;
  title: string;
  schema: z.ZodSchema<any>;
  fields: { name: string; label: string; type: 'input' | 'textarea'; description?: string }[];
  isLoading?: boolean;
}

function EditModal<T extends { id?: number; name: string; description?: string }>({
  isOpen,
  onClose,
  item,
  onSave,
  title,
  schema,
  fields,
  isLoading = false
}: EditModalProps<T>) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: item || { name: "", description: "" },
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description || "",
      });
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [item, form]);

  const handleSubmit = (data: any) => {
    onSave(data);
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${title}` : `Add New ${title}`}</DialogTitle>
          <DialogDescription>
            {item ? `Update the ${title.toLowerCase()} information.` : `Create a new ${title.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {fields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      {field.type === 'textarea' ? (
                        <Textarea {...formField} placeholder={`Enter ${field.label.toLowerCase()}`} />
                      ) : (
                        <Input {...formField} placeholder={`Enter ${field.label.toLowerCase()}`} />
                      )}
                    </FormControl>
                    {field.description && (
                      <FormDescription>{field.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : (item ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function OgsmChartersSection() {
  const [editingCharter, setEditingCharter] = useState<OgsmCharter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: charters = [], isLoading, error } = useQuery<OgsmCharter[]>({
    queryKey: ["/api/settings/ogsm-charters"],
    queryFn: async () => {
      const response = await apiRequest("/api/settings/ogsm-charters");
      // Extract data array from API response wrapper {success: true, data: Array, timestamp: '...'}
      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }
      // Fallback for unexpected response format
      console.warn('[SETTINGS] Unexpected OGSM charters response format:', response);
      return [];
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createMutation = useMutation({
    mutationFn: async (data: OgsmCharterForm) => {
      return await apiRequest("/api/settings/ogsm-charters", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ogsm-charters"] });
      // Also invalidate project-related queries to refresh dropdowns
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ogsm-charters"] });
      toast({ title: "Success", description: "OGSM Charter created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create OGSM Charter.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OgsmCharterForm }) => {
      return await apiRequest(`/api/settings/ogsm-charters/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ogsm-charters"] });
      // Also invalidate project-related queries to refresh dropdowns
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ogsm-charters"] });
      toast({ title: "Success", description: "OGSM Charter updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update OGSM Charter.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/settings/ogsm-charters/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ogsm-charters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ogsm-charters"] });
      toast({ title: "Success", description: "OGSM Charter deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete OGSM Charter.", variant: "destructive" });
    },
  });

  const handleSave = (data: OgsmCharterForm) => {
    if (editingCharter) {
      updateMutation.mutate({ id: editingCharter.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (charter: OgsmCharter) => {
    setEditingCharter(charter);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCharter(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">OGSM Charters</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">OGSM Charters</h3>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to load OGSM charters. Please check your permissions or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">OGSM Charters</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Used in Project Management for strategic alignment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Charter
        </Button>
      </div>

      <div className="grid gap-4">
        {charters.map((charter) => (
          <Card key={charter.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{charter.name}</h4>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                {charter.description && (
                  <p className="text-sm text-gray-600">{charter.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(charter)} className="border-gray-300 hover:bg-blue-50 hover:border-blue-300">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(charter.id)}
                  disabled={deleteMutation.isPending}
                  className="border-gray-300 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingCharter}
        onSave={handleSave}
        title="OGSM Charter"
        schema={ogsmCharterSchema}
        fields={[
          { name: "name", label: "Name", type: "input" },
          { name: "description", label: "Description", type: "textarea", description: "Optional description for this charter" },
        ]}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function DepartmentsSection() {
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading, error } = useQuery<Department[]>({
    queryKey: ["/api/settings/departments"],
    queryFn: async () => {
      const response = await apiRequest("/api/settings/departments");
      // Extract data array from API response wrapper {success: true, data: Array, timestamp: '...'}
      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }
      // Fallback for unexpected response format
      console.warn('[SETTINGS] Unexpected departments response format:', response);
      return [];
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentForm) => {
      return await apiRequest("/api/settings/departments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/departments"] });
      // Also invalidate resource-related queries to refresh dropdowns
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Success", description: "Department created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create department.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DepartmentForm }) => {
      return await apiRequest(`/api/settings/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/departments"] });
      // Also invalidate resource-related queries to refresh dropdowns
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Success", description: "Department updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update department.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/settings/departments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Success", description: "Department deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete department.", variant: "destructive" });
    },
  });

  const handleSave = (data: DepartmentForm) => {
    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Departments</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Departments</h3>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to load departments. Please check your permissions or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Departments</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Used in Resource Management for team organization</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-4">
        {departments.map((department) => (
          <Card key={department.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{department.name}</h4>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                {department.description && (
                  <p className="text-sm text-gray-600">{department.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(department)} className="border-gray-300 hover:bg-blue-50 hover:border-blue-300">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(department.id)}
                  disabled={deleteMutation.isPending}
                  className="border-gray-300 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingDepartment}
        onSave={handleSave}
        title="Department"
        schema={departmentSchema}
        fields={[
          { name: "name", label: "Name", type: "input" },
          { name: "description", label: "Description", type: "textarea", description: "Optional description for this department" },
        ]}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function JobRolesSection() {
  const [editingJobRole, setEditingJobRole] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch job roles and departments
  const { data: jobRoles = [], isLoading, error } = useJobRoles();
  const { data: departments = [] } = useDepartments();
  const createMutation = useCreateJobRole();
  const updateMutation = useUpdateJobRole();
  const deleteMutation = useDeleteJobRole();

  const handleSave = (data: JobRoleForm) => {
    const jobRoleData = {
      ...data,
      is_active: true,
    };

    if (editingJobRole) {
      updateMutation.mutate({ id: editingJobRole.id, ...jobRoleData });
    } else {
      createMutation.mutate(jobRoleData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (jobRole: any) => {
    setEditingJobRole(jobRole);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingJobRole(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Job Roles</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Job Roles</h3>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to load job roles. Please check your permissions or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Job Roles</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage job roles for team members. These are used when creating user accounts.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Job Role
        </Button>
      </div>

      <div className="grid gap-4">
        {jobRoles.map((jobRole) => (
          <Card key={jobRole.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{jobRole.name}</h4>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                  {jobRole.department_id && (
                    <Badge variant="outline" className="text-xs">
                      {departments.find(d => d.id === jobRole.department_id)?.name || 'Unknown Dept'}
                    </Badge>
                  )}
                </div>
                {jobRole.description && (
                  <p className="text-sm text-gray-600">{jobRole.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(jobRole)} className="border-gray-300 hover:bg-blue-50 hover:border-blue-300">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(jobRole.id)}
                  disabled={deleteMutation.isPending}
                  className="border-gray-300 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <JobRoleEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobRole={editingJobRole}
        onSave={handleSave}
        departments={departments}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

interface JobRoleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobRole: any | null;
  onSave: (data: JobRoleForm) => void;
  departments: any[];
  isLoading?: boolean;
}

function JobRoleEditModal({ isOpen, onClose, jobRole, onSave, departments, isLoading }: JobRoleEditModalProps) {
  const form = useForm<JobRoleForm>({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      department_id: undefined,
    },
  });

  useEffect(() => {
    if (jobRole) {
      form.reset({
        name: jobRole.name || "",
        description: jobRole.description || "",
        department_id: jobRole.department_id || undefined,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        department_id: undefined,
      });
    }
  }, [jobRole, form]);

  const handleSubmit = (data: JobRoleForm) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{jobRole ? "Edit Job Role" : "Add Job Role"}</DialogTitle>
          <DialogDescription>
            {jobRole ? "Update the job role details." : "Create a new job role for team members."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job role name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description for this job role" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional description for this job role
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optionally associate this job role with a department
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : jobRole ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NotificationSettingsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading, error } = useQuery<NotificationSettings[]>({
    queryKey: ["/api/settings/notifications"],
    queryFn: async () => {
      const response = await apiRequest("/api/settings/notifications");
      // Extract data array from API response wrapper {success: true, data: Array, timestamp: '...'}
      if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
      }
      // Fallback for unexpected response format
      console.warn('[SETTINGS] Unexpected notifications response format:', response);
      return [];
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NotificationSettings> }) => {
      return await apiRequest(`/api/settings/notifications/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/settings/notifications"] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<NotificationSettings[]>(["/api/settings/notifications"]);

      // Optimistically update to the new value
      if (previousSettings) {
        const updatedSettings = previousSettings.map(setting =>
          setting.id === id ? { ...setting, ...data } : setting
        );
        queryClient.setQueryData(["/api/settings/notifications"], updatedSettings);
      }

      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onSuccess: () => {
      // Invalidate and refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/settings/notifications"] });
      toast({ title: "Success", description: "Notification settings updated successfully." });
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSettings) {
        queryClient.setQueryData(["/api/settings/notifications"], context.previousSettings);
      }
      toast({ title: "Error", description: "Failed to update notification settings.", variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: ["/api/settings/notifications"] });
    },
  });

  const weekdayOptions = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ];

  const timeOptions = [
    { value: "08:00", label: "8:00 AM" },
    { value: "09:00", label: "9:00 AM" },
    { value: "10:00", label: "10:00 AM" },
    { value: "11:00", label: "11:00 AM" },
    { value: "12:00", label: "12:00 PM" },
    { value: "13:00", label: "1:00 PM" },
    { value: "14:00", label: "2:00 PM" },
    { value: "15:00", label: "3:00 PM" },
    { value: "16:00", label: "4:00 PM" },
    { value: "17:00", label: "5:00 PM" },
    { value: "18:00", label: "6:00 PM" },
  ];

  const handleToggleEnabled = (setting: NotificationSettings) => {
    updateMutation.mutate({ 
      id: setting.id, 
      data: { isEnabled: !setting.isEnabled } 
    });
  };

  const handleReminderDayChange = (setting: NotificationSettings, value: string) => {
    updateMutation.mutate({ 
      id: setting.id, 
      data: { reminderDay: parseInt(value) } 
    });
  };

  const handleReminderTimeChange = (setting: NotificationSettings, value: string) => {
    updateMutation.mutate({ 
      id: setting.id, 
      data: { reminderTime: value } 
    });
  };

  const handleSubjectChange = (setting: NotificationSettings, subject: string) => {
    updateMutation.mutate({ 
      id: setting.id, 
      data: { emailSubject: subject } 
    });
  };

  const handleTemplateChange = (setting: NotificationSettings, template: string) => {
    updateMutation.mutate({ 
      id: setting.id, 
      data: { emailTemplate: template } 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">
          Failed to load notification settings. Please check your permissions or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {settings.map((setting) => (
        <Card key={setting.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-gray-900">Weekly Time Logging Reminder</h4>
                <p className="text-sm text-gray-600">
                  Automatically send email reminders to users who haven't submitted their time logs
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor={`enabled-${setting.id}`} className="text-sm font-medium">
                  Enabled
                </label>
                <Switch
                  id={`enabled-${setting.id}`}
                  checked={setting.isEnabled}
                  onCheckedChange={() => handleToggleEnabled(setting)}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            {setting.isEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Day</label>
                  <Select
                    value={setting.reminderDay.toString()}
                    onValueChange={(value) => handleReminderDayChange(setting, value)}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Day of the week to send reminders
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Time</label>
                  <Select
                    value={setting.reminderTime}
                    onValueChange={(value) => handleReminderTimeChange(setting, value)}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Time of day to send reminders
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Email Subject</label>
                  <Input
                    value={setting.emailSubject}
                    onChange={(e) => handleSubjectChange(setting, e.target.value)}
                    placeholder="Enter email subject"
                    disabled={updateMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Subject line for reminder emails
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Email Template</label>
                  <Textarea
                    value={setting.emailTemplate}
                    onChange={(e) => handleTemplateChange(setting, e.target.value)}
                    placeholder="Enter email template"
                    rows={4}
                    disabled={updateMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email template with placeholders: [Name], [WeekNumber], [Link]
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {settings.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p>No notification settings configured.</p>
            <p className="text-sm">Contact your system administrator to set up email notifications.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <SettingsGuard>
      <main className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        {/* Header Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
              <p className="text-blue-100 text-base sm:text-lg">Manage core configuration lists and system settings for ResourceFlow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <Tabs defaultValue="ogsm-charters" className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-2 w-full max-w-5xl">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-gray-50 rounded-lg gap-1">
            <TabsTrigger value="ogsm-charters" className="text-xs sm:text-sm font-medium px-2 py-2">
              <span className="hidden sm:inline">OGSM Charters</span>
              <span className="sm:hidden">OGSM</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="text-xs sm:text-sm font-medium px-2 py-2">
              <span className="hidden sm:inline">Departments</span>
              <span className="sm:hidden">Depts</span>
            </TabsTrigger>
            <TabsTrigger value="job-roles" className="text-xs sm:text-sm font-medium px-2 py-2">
              <span className="hidden sm:inline">Job Roles</span>
              <span className="sm:hidden">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm font-medium px-2 py-2">
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notify</span>
            </TabsTrigger>
            <RoleManagementGuard>
              <TabsTrigger value="roles" className="text-xs sm:text-sm font-medium px-2 py-2">
                <span className="hidden sm:inline">Role Management</span>
                <span className="sm:hidden">Roles</span>
              </TabsTrigger>
            </RoleManagementGuard>
            <TabsTrigger value="integrations" className="text-xs sm:text-sm font-medium px-2 py-2">
              <span className="hidden sm:inline">Integrations</span>
              <span className="sm:hidden">Integr</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ogsm-charters" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">OGSM Charter Management</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Configure the strategic alignment charters used in project classification.
                These charters help organize projects by their strategic objectives.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <OgsmChartersSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Department Management</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Manage organizational departments for resource categorization.
                These departments are used when creating and organizing team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <DepartmentsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="job-roles" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Job Role Management</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Manage job roles for team members. These roles are used when creating user accounts
                and can be associated with departments for better organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <JobRolesSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Notification Settings</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Configure automated email notifications for time logging reminders and system alerts.
                These settings control when and how users receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <NotificationSettingsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Role Management</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Manage user roles and permissions for secure access control.
                Control who can access different parts of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <RoleManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="bg-white rounded-xl shadow-sm border-0 w-full max-w-5xl">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">System Integrations</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Configure external system integrations for enhanced functionality.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="space-y-2">
                  <div className="font-medium text-blue-900">Jira Integration</div>
                  <div className="text-sm text-blue-700">
                    Configure Jira integration to retrieve time registered on epics automatically.
                    This feature will sync time tracking data from your Jira workspace to provide
                    comprehensive project reporting.
                  </div>
                  <Badge variant="outline" className="mt-2 border-blue-300 text-blue-700">
                    Coming Soon
                  </Badge>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </main>
    </SettingsGuard>
  );
}