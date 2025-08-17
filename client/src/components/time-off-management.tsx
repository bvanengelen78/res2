import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CalendarDays, Plus, Edit, Trash2, Info, Clock, MapPin, Search, Filter, MoreHorizontal, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { format, differenceInDays, parseISO, isWeekend, isFuture, isPast, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { TimeOff, Resource } from '@shared/schema';

interface TimeOffManagementProps {
  resource: Resource;
  className?: string;
}

interface TimeOffFormData {
  type: 'vacation' | 'sick' | 'personal' | 'training' | 'other';
  startDate: string;
  endDate: string;
  description?: string;
  hoursPerDay?: number;
}

const TIME_OFF_TYPES = [
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-100 text-blue-800' },
  { value: 'sick', label: 'Sick Leave', color: 'bg-red-100 text-red-800' },
  { value: 'personal', label: 'Personal Time', color: 'bg-green-100 text-green-800' },
  { value: 'training', label: 'Training', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

export function TimeOffManagement({ resource, className = '' }: TimeOffManagementProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOff | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timeOffToDelete, setTimeOffToDelete] = useState<TimeOff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTimeOff, setSelectedTimeOff] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<TimeOffFormData>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    description: '',
    hoursPerDay: 8,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: timeOffEntries = [], isLoading } = useQuery<TimeOff[]>({
    queryKey: [`/api/resources/${resource.id}/time-off`],
    queryFn: () => apiRequest(`/api/resources/${resource.id}/time-off`),
    enabled: !!resource.id,
  });

  const createTimeOffMutation = useMutation({
    mutationFn: async (data: TimeOffFormData) => {
      const response = await apiRequest(`/api/resources/${resource.id}/time-off`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/time-off`] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources', resource.id] });
      toast({
        title: 'Success',
        description: 'Time off created successfully',
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create time off',
        variant: 'destructive',
      });
    },
  });

  const updateTimeOffMutation = useMutation({
    mutationFn: async (data: TimeOffFormData) => {
      const response = await apiRequest(`/api/time-off/${editingTimeOff?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/time-off`] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources', resource.id] });
      toast({
        title: 'Success',
        description: 'Time off updated successfully',
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update time off',
        variant: 'destructive',
      });
    },
  });

  const deleteTimeOffMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/time-off/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}/time-off`] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources', resource.id] });
      toast({
        title: 'Success',
        description: 'Time off deleted successfully',
      });
      // Close dialog and reset state after successful deletion
      setDeleteDialogOpen(false);
      setTimeOffToDelete(null);
    },
    onError: (error: any) => {
      console.error('Delete time off error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time off',
        variant: 'destructive',
      });
      // Keep dialog open on error so user can retry
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'vacation',
      startDate: '',
      endDate: '',
      description: '',
      hoursPerDay: 8,
    });
    setEditingTimeOff(null);
    setFormOpen(false);
  };

  // Enhanced filtering and search functionality
  const filteredTimeOff = useMemo(() => {
    let filtered = timeOffEntries;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(timeOff =>
        timeOff.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        timeOff.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        format(parseISO(timeOff.startDate), 'MMM d, yyyy').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(timeOff => timeOff.type === filterType);
    }

    return filtered;
  }, [timeOffEntries, searchQuery, filterType]);

  // Get status for time off entry
  const getTimeOffStatus = (timeOff: TimeOff) => {
    const startDate = parseISO(timeOff.startDate);
    const endDate = parseISO(timeOff.endDate);
    const today = new Date();

    if (isPast(endDate)) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle };
    } else if (isToday(startDate) || (startDate <= today && endDate >= today)) {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    } else if (isFuture(startDate)) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-700', icon: AlertCircle };
    }
    return { status: 'unknown', label: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: XCircle };
  };

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

  const handleEdit = (timeOff: TimeOff) => {
    setEditingTimeOff(timeOff);
    setFormData({
      type: timeOff.type as any,
      startDate: formatDateForInput(timeOff.startDate),
      endDate: formatDateForInput(timeOff.endDate),
      description: timeOff.description || '',
      hoursPerDay: (timeOff as any).hoursPerDay || 8, // hoursPerDay might not exist in schema
    });
    setFormOpen(true);
  };

  const handleDeleteClick = (timeOff: TimeOff) => {
    setTimeOffToDelete(timeOff);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (timeOffToDelete) {
      deleteTimeOffMutation.mutate(timeOffToDelete.id);
      // Don't close dialog immediately - let the mutation handle success/error
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTimeOffToDelete(null);
  };

  const handleBulkDelete = () => {
    if (selectedTimeOff.size > 0) {
      // Delete all selected time off entries
      Array.from(selectedTimeOff).forEach(id => {
        deleteTimeOffMutation.mutate(id);
      });
      setSelectedTimeOff(new Set());
    }
  };

  const toggleTimeOffSelection = (id: number) => {
    const newSelection = new Set(selectedTimeOff);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTimeOff(newSelection);
  };

  const selectAllTimeOff = (timeOffList: TimeOff[]) => {
    const allIds = timeOffList.map(t => t.id);
    setSelectedTimeOff(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedTimeOff(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data for API - exclude hoursPerDay as it's not in the backend schema
    const apiData = {
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      description: formData.description || '',
    };

    if (editingTimeOff) {
      updateTimeOffMutation.mutate(apiData);
    } else {
      createTimeOffMutation.mutate(apiData);
    }
  };

  const calculateWorkingDays = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const totalDays = differenceInDays(end, start) + 1;
    
    let workingDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      if (!isWeekend(currentDate)) {
        workingDays++;
      }
    }
    
    return { totalDays, workingDays };
  };

  const getTypeConfig = (type: string) => {
    return TIME_OFF_TYPES.find(t => t.value === type) || TIME_OFF_TYPES[0];
  };

  const calculateTotalHours = (timeOff: TimeOff) => {
    const { workingDays } = calculateWorkingDays(timeOff.startDate, timeOff.endDate);
    // Default to 8 hours per day since hoursPerDay is not stored in the backend
    return workingDays * 8;
  };

  const upcomingTimeOff = filteredTimeOff.filter(timeOff =>
    new Date(timeOff.startDate) > new Date()
  );

  const currentTimeOff = filteredTimeOff.filter(timeOff => {
    const now = new Date();
    return new Date(timeOff.startDate) <= now && new Date(timeOff.endDate) >= now;
  });

  const pastTimeOff = filteredTimeOff.filter(timeOff =>
    new Date(timeOff.endDate) < new Date()
  );

  const totalHoursThisYear = timeOffEntries
    .filter(timeOff => {
      const year = new Date().getFullYear();
      const startYear = parseISO(timeOff.startDate).getFullYear();
      return startYear === year;
    })
    .reduce((total, timeOff) => {
      const workingDays = calculateWorkingDays(timeOff.startDate, timeOff.endDate);
      return total + (workingDays * (timeOff.hoursPerDay || 8));
    }, 0);

  return (
    <div className={className}>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
        "border border-gray-200/80 bg-white/95 backdrop-blur-sm",
        "hover:bg-white hover:border-blue-300/50",
        "rounded-2xl"
      )}>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Time Off Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage vacation, sick leave, and other time off requests
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Off
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Schedule new time off request</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Enhanced Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search time off entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TIME_OFF_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTimeOff.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deleteTimeOffMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedTimeOff.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Time Off Alert */}
          {currentTimeOff.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Currently on Time Off</span>
              </div>
              {currentTimeOff.map(timeOff => (
                <div key={timeOff.id} className="text-sm text-orange-700">
                  {timeOff.description || getTypeConfig(timeOff.type).label} - 
                  {format(parseISO(timeOff.startDate), 'MMM d')} to {format(parseISO(timeOff.endDate), 'MMM d, yyyy')}
                </div>
              ))}
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{upcomingTimeOff.length}</div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{currentTimeOff.length}</div>
              <div className="text-sm text-gray-600">Current</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {timeOffEntries.reduce((total, timeOff) => total + calculateTotalHours(timeOff), 0)}h
              </div>
              <div className="text-sm text-gray-600">Total Hours This Year</div>
            </div>
          </div>

          {/* Time Off List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading time off entries...</p>
              </div>
            ) : timeOffEntries.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No time off scheduled</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Time Off" to schedule your first request</p>
              </div>
            ) : (
              <>
                {/* Upcoming Time Off */}
                {upcomingTimeOff.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Upcoming Time Off</h3>
                    <div className="space-y-2">
                      {upcomingTimeOff.map(timeOff => (
                        <TimeOffCard
                          key={timeOff.id}
                          timeOff={timeOff}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          isDeleting={deleteTimeOffMutation.isPending}
                          isSelected={selectedTimeOff.has(timeOff.id)}
                          onToggleSelect={() => toggleTimeOffSelection(timeOff.id)}
                          getTimeOffStatus={getTimeOffStatus}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Time Off */}
                {pastTimeOff.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Past Time Off</h3>
                    <div className="space-y-2">
                      {pastTimeOff.slice(0, 5).map(timeOff => (
                        <TimeOffCard
                          key={timeOff.id}
                          timeOff={timeOff}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          isDeleting={deleteTimeOffMutation.isPending}
                          isSelected={selectedTimeOff.has(timeOff.id)}
                          onToggleSelect={() => toggleTimeOffSelection(timeOff.id)}
                          getTimeOffStatus={getTimeOffStatus}
                          isPast={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Off Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTimeOff ? 'Edit Time Off' : 'Add Time Off'}
            </DialogTitle>
            <DialogDescription>
              {editingTimeOff
                ? 'Update the details of your time off request. All fields are required except description.'
                : 'Create a new time off request by filling out the form below. All fields are required except description.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OFF_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hoursPerDay">Hours per Day</Label>
                <Input
                  id="hoursPerDay"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.hoursPerDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, hoursPerDay: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Duration:</strong> {calculateWorkingDays(formData.startDate, formData.endDate).workingDays} working days 
                  ({calculateWorkingDays(formData.startDate, formData.endDate).totalDays} total days)
                </div>
                <div className="text-sm text-blue-800 mt-1">
                  <strong>Total Hours:</strong> {calculateWorkingDays(formData.startDate, formData.endDate).workingDays * (formData.hoursPerDay || 8)}h
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional details..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createTimeOffMutation.isPending || updateTimeOffMutation.isPending}
                className="flex-1"
              >
                {(createTimeOffMutation.isPending || updateTimeOffMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingTimeOff ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingTimeOff ? 'Update Time Off' : 'Add Time Off'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Off</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time off entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Time Off Entry Preview - Outside of AlertDialogDescription to avoid nesting issues */}
          {timeOffToDelete && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium text-gray-900">
                {TIME_OFF_TYPES.find(t => t.value === timeOffToDelete.type)?.label || timeOffToDelete.type}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {format(parseISO(timeOffToDelete.startDate), 'MMM d')} - {format(parseISO(timeOffToDelete.endDate), 'MMM d, yyyy')}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteTimeOffMutation.isPending}
            >
              {deleteTimeOffMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TimeOffCardProps {
  timeOff: TimeOff;
  onEdit: (timeOff: TimeOff) => void;
  onDelete: (timeOff: TimeOff) => void;
  isDeleting: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  getTimeOffStatus: (timeOff: TimeOff) => any;
  isPast?: boolean;
}

function TimeOffCard({
  timeOff,
  onEdit,
  onDelete,
  isDeleting,
  isSelected,
  onToggleSelect,
  getTimeOffStatus,
  isPast = false
}: TimeOffCardProps) {
  const typeConfig = TIME_OFF_TYPES.find(t => t.value === timeOff.type) || TIME_OFF_TYPES[0];
  const statusInfo = getTimeOffStatus(timeOff);
  const StatusIcon = statusInfo.icon;

  const calculateWorkingDays = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const totalDays = differenceInDays(end, start) + 1;

    let workingDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      if (!isWeekend(currentDate)) {
        workingDays++;
      }
    }

    return { totalDays, workingDays };
  };

  const { workingDays } = calculateWorkingDays(timeOff.startDate, timeOff.endDate);
  const totalHours = workingDays * (timeOff.hoursPerDay || 8);

  return (
    <div className={cn(
      "group relative overflow-hidden transition-all duration-300 ease-out p-4 rounded-xl",
      "hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]",
      "border-2 backdrop-blur-sm",
      isSelected
        ? "border-blue-500 bg-blue-50/95 hover:bg-blue-100/95"
        : isPast
          ? "border-gray-200/80 bg-gray-50/95 hover:bg-gray-100/95 hover:border-gray-300/50"
          : "border-gray-200/80 bg-white/95 hover:bg-white hover:border-blue-300/50"
    )}>
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        <div className="flex items-center pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Badge className={cn("whitespace-nowrap", typeConfig.color)}>
              {typeConfig.label}
            </Badge>
            <Badge className={cn("whitespace-nowrap", statusInfo.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {totalHours}h ({workingDays} working days)
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {format(parseISO(timeOff.startDate), 'MMM d')} - {format(parseISO(timeOff.endDate), 'MMM d, yyyy')}
            </span>
          </div>

          {timeOff.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{timeOff.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(timeOff)}
                  className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit time off</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(timeOff)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete time off</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}