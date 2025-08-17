import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertResourceSchema, type InsertResource, type Resource, type Department } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { X } from "lucide-react";



const ROLE_OPTIONS = [
  "Change Lead",
  "Manager Change",
  "Business Controller"
];

interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource | null;
  mode?: 'create' | 'edit';
}

export function ResourceForm({ open, onOpenChange, resource, mode = 'create' }: ResourceFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [skillInput, setSkillInput] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Fetch Departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  const form = useForm<InsertResource>({
    resolver: zodResolver(insertResourceSchema),
    defaultValues: {
      name: resource?.name || "",
      email: resource?.email || "",
      role: resource?.role || "",
      department: resource?.department || "IT Architecture & Delivery",
      roles: resource?.roles || [],
      skills: resource?.skills || [],
      weeklyCapacity: resource?.weeklyCapacity || "40.00",
      isActive: resource?.isActive ?? true,
    },
  });

  // Reset form when resource changes
  useEffect(() => {
    if (resource) {
      form.reset({
        name: resource.name || "",
        email: resource.email || "",
        role: resource.role || "",
        department: resource.department || "IT Architecture & Delivery",
        roles: resource.roles || [],
        skills: resource.skills || [],
        weeklyCapacity: resource.weeklyCapacity || "40.00",
        isActive: resource.isActive ?? true,
      });
      setSelectedRoles(resource.roles || []);
    } else {
      form.reset({
        name: "",
        email: "",
        role: "",
        department: "IT Architecture & Delivery",
        roles: [],
        skills: [],
        weeklyCapacity: "40.00",
        isActive: true,
      });
      setSelectedRoles([]);
    }
  }, [resource, form]);

  const createResourceMutation = useMutation({
    mutationFn: async (data: InsertResource) => {
      return await apiRequest("/api/resources", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Success",
        description: "Resource created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Resource creation error:', error);

      let errorMessage = "Failed to create resource";

      // Try to extract more specific error message
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = error.response.data.errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          errorMessage = validationErrors.map(err => `${err.path?.join('.') || 'Field'}: ${err.message}`).join(', ');
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: async (data: InsertResource) => {
      return await apiRequest(`/api/resources/${resource?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Success",
        description: "Resource updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Resource update error:', error);

      let errorMessage = "Failed to update resource";

      // Try to extract more specific error message
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors) {
        // Handle validation errors
        const validationErrors = error.response.data.errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          errorMessage = validationErrors.map(err => `${err.path?.join('.') || 'Field'}: ${err.message}`).join(', ');
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertResource) => {
    // Update the roles array from selectedRoles
    const updatedData = {
      ...data,
      roles: selectedRoles,
    };
    
    if (mode === 'edit') {
      updateResourceMutation.mutate(updatedData);
    } else {
      createResourceMutation.mutate(updatedData);
    }
  };

  const isLoading = createResourceMutation.isPending || updateResourceMutation.isPending;

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSkillAdd = () => {
    if (skillInput.trim()) {
      const currentSkills = form.watch("skills") || [];
      form.setValue("skills", [...currentSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    const currentSkills = form.watch("skills") || [];
    form.setValue("skills", currentSkills.filter(skill => skill !== skillToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Resource' : 'Add New Resource'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update resource information and assignments' : 'Create a new resource with role assignments and skills'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  {...form.register("name", { required: "Name is required" })}
                  placeholder="Enter full name"
                  className={form.formState.errors.name ? "border-red-500" : ""}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email", { required: "Email is required" })}
                  placeholder="Enter email address"
                  className={form.formState.errors.email ? "border-red-500" : ""}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Job Role <span className="text-red-500">*</span></Label>
                <Input
                  id="role"
                  {...form.register("role", { required: "Job role is required" })}
                  placeholder="Enter job role (e.g., Senior Developer, Business Analyst)"
                  className={form.formState.errors.role ? "border-red-500" : ""}
                />
                {form.formState.errors.role && (
                  <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={form.watch("department")} 
                  onValueChange={(value) => form.setValue("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                    {departments.length === 0 && (
                      <SelectItem value="empty" disabled>No departments available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.department && (
                  <p className="text-sm text-red-600">{form.formState.errors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyCapacity">Weekly Capacity (hours)</Label>
                <Input
                  id="weeklyCapacity"
                  type="number"
                  {...form.register("weeklyCapacity", {
                    setValueAs: (value) => value === "" ? "" : String(value)
                  })}
                  placeholder="40"
                  min="1"
                  max="60"
                  step="0.25"
                />
                {form.formState.errors.weeklyCapacity && (
                  <p className="text-sm text-red-600">{form.formState.errors.weeklyCapacity.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked as boolean)}
                />
                <Label htmlFor="isActive">Active resource</Label>
              </div>
            </CardContent>
          </Card>

          {/* Role Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Assignments</CardTitle>
              <CardDescription>
                Select special roles and responsibilities for this resource
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ROLE_OPTIONS.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={role} className="text-sm">
                    {role}
                  </Label>
                </div>
              ))}
              
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedRoles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
                />
                <Button type="button" onClick={handleSkillAdd} size="sm">
                  Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {form.watch("skills")?.map((skill, index) => (
                  <Badge key={index} variant="outline" className="pr-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleSkillRemove(skill)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (mode === 'edit' ? "Updating..." : "Creating...") : (mode === 'edit' ? "Update Resource" : "Add Resource")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
