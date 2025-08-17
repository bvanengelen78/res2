import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Plus, Edit, Trash2, Info, ChevronDown, ChevronUp, Target, HelpCircle, BookOpen, BarChart3, Zap, Minus, Equal, Puzzle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, cacheInvalidation } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { Resource, NonProjectActivity } from '@shared/schema';



interface CapacityManagementProps {
  resource: Resource;
  totalAllocatedHours: number;
  className?: string;
}

const DEFAULT_NON_PROJECT_TYPES = [
  { type: 'Meetings', color: 'bg-blue-100 text-blue-800' },
  { type: 'Administration', color: 'bg-gray-100 text-gray-800' },
  { type: 'Training', color: 'bg-green-100 text-green-800' },
  { type: 'Support', color: 'bg-purple-100 text-purple-800' },
  { type: 'Other', color: 'bg-orange-100 text-orange-800' },
];

export function CapacityManagement({ resource, totalAllocatedHours, className = '' }: CapacityManagementProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch non-project activities for this specific resource
  const { data: nonProjectActivities = [], isLoading } = useQuery<NonProjectActivity[]>({
    queryKey: [`/api/resources/${resource.id}/non-project-activities`],
    queryFn: async () => {
      const response = await apiRequest(`/api/resources/${resource.id}/non-project-activities`);
      return response;
    },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<NonProjectActivity | null>(null);
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'Meetings' as const,
    hoursPerWeek: '',
    description: '',
  });

  // Mutations for CRUD operations
  const createActivityMutation = useMutation({
    mutationFn: async (data: { activityType: string; hoursPerWeek: string; description: string }) => {
      const response = await apiRequest(`/api/resources/${resource.id}/non-project-activities`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/non-project-activities`] });
      // Invalidate dashboard data since capacity changes affect alerts
      await cacheInvalidation.invalidateDashboard();
      toast({
        title: 'Success',
        description: 'Non-project activity added successfully',
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add non-project activity',
        variant: 'destructive',
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (data: { id: number; activityType: string; hoursPerWeek: string; description: string }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest(`/api/non-project-activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return response;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/non-project-activities`] });
      // Invalidate dashboard data since capacity changes affect alerts
      await cacheInvalidation.invalidateDashboard();
      toast({
        title: 'Success',
        description: 'Non-project activity updated successfully',
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update non-project activity',
        variant: 'destructive',
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/non-project-activities/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/non-project-activities`] });
      // Invalidate dashboard data since capacity changes affect alerts
      await cacheInvalidation.invalidateDashboard();
      toast({
        title: 'Success',
        description: 'Non-project activity deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete non-project activity',
        variant: 'destructive',
      });
    },
  });

  const weeklyCapacity = parseFloat(resource.weeklyCapacity);
  const totalNonProjectHours = nonProjectActivities.reduce((sum: number, activity) => sum + parseFloat(activity.hoursPerWeek), 0);
  const effectiveCapacity = weeklyCapacity - totalNonProjectHours;

  const handleAddActivity = () => {
    createActivityMutation.mutate(formData);
  };

  const handleEditActivity = (activity: NonProjectActivity) => {
    setEditingActivity(activity);
    setFormData({
      activityType: activity.activityType as any,
      hoursPerWeek: activity.hoursPerWeek,
      description: activity.description || '',
    });
    setFormOpen(true);
  };

  const handleUpdateActivity = () => {
    if (!editingActivity) return;

    updateActivityMutation.mutate({
      id: editingActivity.id,
      ...formData
    });
  };

  const handleDeleteActivity = (id: number) => {
    deleteActivityMutation.mutate(id);
  };

  const handleOpenAddDialog = () => {
    // Reset form data for new activity
    setEditingActivity(null);
    setFormData({
      activityType: 'Meetings',
      hoursPerWeek: '',
      description: '',
    });
    setFormOpen(true);
  };

  const resetForm = () => {
    setFormData({
      activityType: 'Meetings',
      hoursPerWeek: '',
      description: '',
    });
    setEditingActivity(null);
    setFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity) {
      handleUpdateActivity();
    } else {
      handleAddActivity();
    }
  };

  return (
    <div className={className}>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
        "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
        "hover:bg-white hover:border-blue-300/50",
        "rounded-2xl"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-semibold text-gray-900">Effective Capacity</CardTitle>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Available project hours after non-project activities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenAddDialog}
                variant="outline"
                size="sm"
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Activity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Capacity Grid - Condensed and Modern */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Total Capacity */}
            <div className={cn(
              "group relative overflow-hidden transition-all duration-300 ease-out",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
              "bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200/80 backdrop-blur-sm",
              "hover:bg-gradient-to-br hover:from-slate-100 hover:to-gray-100 hover:border-slate-300/80",
              "rounded-xl p-4"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-100 rounded-lg">
                    <Clock className="h-4 w-4 text-slate-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Total Capacity</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Standard weekly working hours</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-2xl font-bold text-slate-800">{weeklyCapacity}h</div>
              <div className="text-xs text-slate-500 mt-1">per week</div>
            </div>

            {/* Non-Project Time */}
            <div className={cn(
              "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
              "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 backdrop-blur-sm",
              "hover:bg-gradient-to-br hover:from-amber-100 hover:to-orange-100 hover:border-amber-300/80",
              "rounded-xl p-4",
              "focus-within:ring-2 focus-within:ring-amber-300 focus-within:ring-offset-2",
              "active:bg-gradient-to-br active:from-amber-200 active:to-orange-200 active:scale-[0.99]",
              "touch-manipulation" // Better touch handling on mobile
            )}
            onClick={() => setActivitiesExpanded(!activitiesExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActivitiesExpanded(!activitiesExpanded);
              }
            }}
            aria-expanded={activitiesExpanded}
            aria-label={`${activitiesExpanded ? 'Collapse' : 'Expand'} non-project activities details`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                    <Minus className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-amber-700">Non-Project</span>
                  {/* Expandable hint */}
                  <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-all duration-200",
                    "text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full",
                    "hidden sm:block animate-in fade-in-50"
                  )}>
                    {activitiesExpanded ? 'Click to collapse' : 'Click to expand'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Plus icon for collapsed state */}
                  {!activitiesExpanded && (
                    <div className="p-1 bg-amber-100 rounded-md group-hover:bg-amber-200 transition-colors">
                      <Plus className="h-3 w-3 text-amber-600" />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivitiesExpanded(!activitiesExpanded);
                    }}
                    className="p-1.5 rounded-md hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                    aria-label={activitiesExpanded ? "Collapse activities" : "Expand activities"}
                  >
                    {activitiesExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-800">{totalNonProjectHours}h</div>
              <div className="text-xs text-amber-600 mt-1">
                {nonProjectActivities.length} {nonProjectActivities.length === 1 ? 'activity' : 'activities'}
                {!activitiesExpanded && (
                  <span className="ml-1 opacity-70">• Click to view details</span>
                )}
              </div>
            </div>

            {/* Effective Capacity - Hero Card */}
            <div className={cn(
              "group relative overflow-hidden transition-all duration-300 ease-out",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
              "bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200/80 backdrop-blur-sm",
              "hover:bg-gradient-to-br hover:from-emerald-100 hover:to-green-100 hover:border-emerald-300/80",
              "rounded-xl p-4"
            )}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/30 rounded-full -mr-8 -mt-8"></div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Zap className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-emerald-700">Effective Capacity</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-1 bg-emerald-100/50 rounded-md cursor-help hover:bg-emerald-100 transition-colors">
                        <Equal className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium">Formula:</div>
                        <div className="flex items-center gap-1">
                          <span>{weeklyCapacity}h</span>
                          <Minus className="h-3 w-3" />
                          <span>{totalNonProjectHours}h</span>
                          <Equal className="h-3 w-3" />
                          <span className="font-medium text-emerald-600">{effectiveCapacity}h</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-3xl font-bold text-emerald-800 relative z-10">{effectiveCapacity}h</div>
              <div className="text-xs text-emerald-600 font-medium mt-1 relative z-10">available for projects</div>
            </div>
          </div>

          {/* Expandable Non-Project Activities */}
          {activitiesExpanded && (
            <div className={cn(
              "group relative overflow-hidden transition-all duration-300 ease-out",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
              "bg-gradient-to-br from-slate-50/50 to-gray-50/30 border border-slate-200/80 backdrop-blur-sm",
              "hover:bg-gradient-to-br hover:from-slate-100/50 hover:to-gray-100/30 hover:border-slate-300/80",
              "rounded-xl p-5 animate-in slide-in-from-top-2 duration-200"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Activity Breakdown</h3>
                    <p className="text-sm text-gray-500">Detailed view of non-project time allocation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-slate-100 text-slate-700">
                    {totalNonProjectHours}h total
                  </Badge>
                  <button
                    onClick={() => setActivitiesExpanded(false)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronUp className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Activities List */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                    <Clock className="h-6 w-6 text-gray-400 animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500">Loading activities...</p>
                </div>
              ) : nonProjectActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-white/50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                    <Puzzle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">No activities configured</p>
                  <p className="text-xs text-gray-400 mt-1">Add meetings, admin time, or other activities to get started</p>
                  <Button
                    onClick={handleOpenAddDialog}
                    variant="outline"
                    size="sm"
                    className="mt-3 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add First Activity
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {nonProjectActivities.map(activity => {
                    // Determine icon and color based on activity type
                    let ActivityIcon = Puzzle;
                    let colorClass = 'bg-gray-100 text-gray-600';

                    if (activity.activityType === 'Meetings') {
                      ActivityIcon = Clock;
                      colorClass = 'bg-blue-100 text-blue-600';
                    } else if (activity.activityType === 'Administration') {
                      ActivityIcon = Settings;
                      colorClass = 'bg-purple-100 text-purple-600';
                    } else if (activity.activityType === 'Training') {
                      ActivityIcon = BookOpen;
                      colorClass = 'bg-green-100 text-green-600';
                    } else if (activity.activityType === 'Support') {
                      ActivityIcon = HelpCircle;
                      colorClass = 'bg-orange-100 text-orange-600';
                    }

                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "group relative overflow-hidden transition-all duration-300 ease-out",
                          "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
                          "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
                          "hover:bg-white hover:border-blue-300/50",
                          "rounded-lg p-4"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-lg ${colorClass}`}>
                            <ActivityIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900 truncate">{activity.activityType}</h4>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{activity.hoursPerWeek}h</div>
                                  <div className="text-xs text-gray-500">per week</div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                          onClick={() => handleEditActivity(activity)}
                                        >
                                          <Edit className="h-4 w-4 text-gray-500" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit activity</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                          onClick={() => handleDeleteActivity(activity.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete activity</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{activity.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Puzzle className="h-5 w-5 text-purple-600" />
              </div>
              {editingActivity ? 'Edit Activity' : 'Add Non-Project Activity'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activityType" className="text-sm font-medium text-gray-700">Activity Type</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, activityType: value as any }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_NON_PROJECT_TYPES.map(type => (
                    <SelectItem key={type.type} value={type.type}>{type.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="text-sm font-medium text-gray-700">Hours per Week</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="40"
                step="0.5"
                placeholder="e.g., 6"
                value={formData.hoursPerWeek || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hoursPerWeek: e.target.value }))}
                className="p-3 rounded-lg border-gray-200 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description (Optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Brief description of the activity"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="p-3 rounded-lg border-gray-200 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 rounded-lg">
                {editingActivity ? 'Update Activity' : 'Add Activity'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="rounded-lg border-gray-200 hover:bg-gray-50">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
