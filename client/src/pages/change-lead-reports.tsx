import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Download, TrendingUp, TrendingDown, AlertCircle, Info, Star, StarOff, Edit3, Save, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/dashboard-blue-theme.css";

interface EffortSummaryData {
  projectId: number;
  projectName: string;
  projectDescription: string;
  projectStatus: string;
  projectPriority: string;
  projectStartDate: string;
  projectEndDate: string;
  estimatedHours: number;
  resourceId: number;
  resourceName: string;
  resourceEmail: string;
  allocatedHours: number;
  allocationStatus: string;
  allocationRole: string;
  actualHours: number;
  deviation: number;
  note?: string;
}

// Helper component for project tooltip
function ProjectTooltip({ item }: { item: EffortSummaryData }) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'closure': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className="font-medium">{item.projectName}</span>
            <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-3" side="right">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-sm">{item.projectName}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.projectDescription}</p>
            </div>

            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5", getStatusColor(item.projectStatus))}>
                  {item.projectStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Priority:</span>
                <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5", getPriorityColor(item.projectPriority))}>
                  {item.projectPriority}
                </Badge>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-mono">{formatDate(item.projectStartDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-mono">{formatDate(item.projectEndDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ChangeLeadReports() {
  const { user } = useAuth();
  const [selectedChangeLead, setSelectedChangeLead] = useState<number | null>(null);
  // Default to current month
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  // Fetch resources to get change leads
  const { data: resources = [] } = useQuery({
    queryKey: ["/api/resources"],
  });

  // Fetch all projects to identify actual change leads
  const { data: allProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get change leads (resources who are actually assigned as change leads on projects)
  const changeLeads = useMemo(() => {
    const changeLeadIds = new Set(
      allProjects
        .filter(project => project.changeLeadId)
        .map(project => project.changeLeadId)
    );

    return resources.filter(resource =>
      changeLeadIds.has(resource.id) && resource.isActive && !resource.isDeleted
    );
  }, [resources, allProjects]);

  // Fetch change lead projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/change-lead", selectedChangeLead, "projects"],
    enabled: !!selectedChangeLead,
  });

  // Fetch user's project favorites
  const { data: favoriteProjectIds = [] } = useQuery<number[]>({
    queryKey: ["/api/user/project-favorites"],
    enabled: !!user,
  });

  // Mutations for managing favorites
  const addFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/user/project-favorites/${projectId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to add favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/project-favorites"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/user/project-favorites/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/project-favorites"] });
    },
  });

  // Fetch effort summary data
  const { data: effortSummary = [], isLoading } = useQuery<EffortSummaryData[]>({
    queryKey: [
      "/api/change-lead",
      selectedChangeLead,
      "effort-summary",
      startDate?.toISOString().split('T')[0],
      endDate?.toISOString().split('T')[0],
    ],
    queryFn: async () => {
      if (!selectedChangeLead) return [];

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

      const response = await fetch(`/api/change-lead/${selectedChangeLead}/effort-summary?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch effort summary: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedChangeLead,
  });

  // Mutations for managing notes
  const saveNoteMutation = useMutation({
    mutationFn: async ({ projectId, resourceId, changeLeadId, note }: {
      projectId: number;
      resourceId: number;
      changeLeadId: number;
      note: string;
    }) => {
      const response = await fetch('/api/effort-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, resourceId, changeLeadId, note }),
      });
      if (!response.ok) throw new Error('Failed to save note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/change-lead", selectedChangeLead, "effort-summary"]
      });
    },
  });

  // Helper functions for favorites
  const toggleFavorite = (projectId: number) => {
    if (favoriteProjectIds.includes(projectId)) {
      removeFavoriteMutation.mutate(projectId);
    } else {
      addFavoriteMutation.mutate(projectId);
    }
  };

  // Organize projects into favorites and non-favorites
  const organizedProjects = useMemo(() => {
    const favorites = projects.filter(project => favoriteProjectIds.includes(project.id));
    const nonFavorites = projects.filter(project => !favoriteProjectIds.includes(project.id));

    return {
      favorites: favorites.sort((a, b) => a.name.localeCompare(b.name)),
      nonFavorites: nonFavorites.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [projects, favoriteProjectIds]);

  // Helper functions for notes
  const getNoteKey = (projectId: number, resourceId: number) => `${projectId}-${resourceId}`;

  const startEditingNote = (projectId: number, resourceId: number, currentNote: string = '') => {
    const key = getNoteKey(projectId, resourceId);
    setEditingNote(key);
    setNoteValues(prev => ({ ...prev, [key]: currentNote }));
  };

  const cancelEditingNote = () => {
    setEditingNote(null);
    setNoteValues({});
  };

  const saveNote = async (projectId: number, resourceId: number) => {
    if (!selectedChangeLead) return;

    const key = getNoteKey(projectId, resourceId);
    const note = noteValues[key] || '';

    try {
      await saveNoteMutation.mutateAsync({
        projectId,
        resourceId,
        changeLeadId: selectedChangeLead,
        note,
      });
      setEditingNote(null);
      setNoteValues({});
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedChangeLead) return;

    try {
      const response = await fetch(`/api/change-lead/${selectedChangeLead}/export-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate?.toISOString().split('T')[0],
          endDate: endDate?.toISOString().split('T')[0],
          projectId: selectedProject === "all" ? null : selectedProject,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `change-lead-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Filter data by project if selected
  const filteredData = selectedProject === "all" 
    ? effortSummary 
    : effortSummary.filter(item => item.projectId.toString() === selectedProject);

  // Calculate summary statistics (ensure we're working with numbers)
  const totalEstimated = filteredData.reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);
  const totalAllocated = filteredData.reduce((sum, item) => sum + Number(item.allocatedHours || 0), 0);
  const totalActual = filteredData.reduce((sum, item) => sum + Number(item.actualHours || 0), 0);
  const totalDeviation = filteredData.reduce((sum, item) => sum + Number(item.deviation || 0), 0);

  const getDeviationColor = (deviation: number) => {
    if (deviation > 0) return "text-red-600";
    if (deviation < 0) return "text-green-600";
    return "text-gray-600";
  };

  // Helper function for variance highlighting
  const getVarianceLevel = (allocatedHours: number, actualHours: number) => {
    if (allocatedHours === 0) return 'none';

    const variance = Math.abs(actualHours - allocatedHours);
    const percentageVariance = (variance / allocatedHours) * 100;

    if (percentageVariance > 20) {
      return actualHours > allocatedHours ? 'high-over' : 'high-under';
    }
    if (percentageVariance > 10) {
      return actualHours > allocatedHours ? 'medium-over' : 'medium-under';
    }
    return 'low';
  };

  const getRowHighlightClass = (allocatedHours: number, actualHours: number) => {
    const level = getVarianceLevel(allocatedHours, actualHours);

    switch (level) {
      case 'high-over':
        return 'bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100';
      case 'high-under':
        return 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100';
      case 'medium-over':
        return 'bg-orange-50 border-l-4 border-l-orange-400 hover:bg-orange-100';
      case 'medium-under':
        return 'bg-cyan-50 border-l-4 border-l-cyan-400 hover:bg-cyan-100';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const getVarianceIcon = (allocatedHours: number, actualHours: number) => {
    const level = getVarianceLevel(allocatedHours, actualHours);

    switch (level) {
      case 'high-over':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high-under':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'medium-over':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium-under':
        return <TrendingDown className="h-4 w-4 text-cyan-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <main className="relative dashboard-blue-theme min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 sm:gap-4 mb-2">
                <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    Change Lead Reports
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                    Track effort allocation and variance for your managed changes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Filters */}
        <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Change Lead Selection */}
            <div className="space-y-2">
              <Label htmlFor="changeLead">Change Lead</Label>
              <Select value={selectedChangeLead?.toString() || ""} onValueChange={(value) => setSelectedChangeLead(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Change Lead" />
                </SelectTrigger>
                <SelectContent>
                  {changeLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All Projects</SelectItem>

                  {/* Favorites Section */}
                  {organizedProjects.favorites.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        ⭐ Favorites
                      </div>
                      {organizedProjects.favorites.map((project) => (
                        <SelectItem key={`fav-${project.id}`} value={project.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{project.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(project.id);
                              }}
                            >
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </Button>
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                    </>
                  )}

                  {/* All Projects Section */}
                  {organizedProjects.nonFavorites.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        📁 All Projects
                      </div>
                      {organizedProjects.nonFavorites.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{project.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(project.id);
                              }}
                            >
                              <StarOff className="h-3 w-3 text-muted-foreground hover:text-yellow-400" />
                            </Button>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleExportExcel}
              disabled={!selectedChangeLead || filteredData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedChangeLead && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Planned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAllocated.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Allocated hours across projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActual.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                {startDate && endDate
                  ? `Hours logged in selected period`
                  : `Total hours logged to date`
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Variance</CardTitle>
              {totalDeviation > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getDeviationColor(totalDeviation))}>
                {totalDeviation > 0 ? '+' : ''}{totalDeviation.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {totalDeviation > 0 ? 'Over allocation' : totalDeviation < 0 ? 'Under allocation' : 'On target'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      {selectedChangeLead && (
        <Card>
          <CardHeader>
            <CardTitle>Effort Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Loading effort data...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No effort data found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  No effort data found for the selected Change Lead during this period.
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Check if resources are assigned to projects</p>
                  <p>• Verify time entries have been logged</p>
                  <p>• Try adjusting the date range</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Project</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Resource</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Role</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Planned</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Actual</th>
                      <th className="border border-gray-200 px-4 py-2 text-right">Variance</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr
                        key={index}
                        className={cn(
                          "transition-colors duration-200",
                          getRowHighlightClass(Number(item.allocatedHours || 0), Number(item.actualHours || 0))
                        )}
                      >
                        <td className="border border-gray-200 px-4 py-2">
                          <ProjectTooltip item={item} />
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div className="font-medium">{item.resourceName}</div>
                            <div className="text-sm text-muted-foreground">{item.resourceEmail}</div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">{item.allocationRole}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <Badge className={getStatusColor(item.allocationStatus)}>{item.allocationStatus}</Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{Number(item.allocatedHours || 0).toFixed(1)}h</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{Number(item.actualHours || 0).toFixed(1)}h</td>
                        <td className={cn("border border-gray-200 px-4 py-2 text-right font-medium", getDeviationColor(Number(item.deviation || 0)))}>
                          <div className="flex items-center justify-end gap-2">
                            {getVarianceIcon(Number(item.allocatedHours || 0), Number(item.actualHours || 0))}
                            <span>
                              {Number(item.deviation || 0) > 0 ? '+' : ''}{Number(item.deviation || 0).toFixed(1)}h
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {editingNote === getNoteKey(item.projectId, item.resourceId) ? (
                            <div className="flex items-center gap-2">
                              <Textarea
                                value={noteValues[getNoteKey(item.projectId, item.resourceId)] || ''}
                                onChange={(e) => setNoteValues(prev => ({
                                  ...prev,
                                  [getNoteKey(item.projectId, item.resourceId)]: e.target.value
                                }))}
                                placeholder="Add a note..."
                                className="min-h-[60px] text-sm"
                                rows={2}
                              />
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => saveNote(item.projectId, item.resourceId)}
                                  disabled={saveNoteMutation.isPending}
                                >
                                  <Save className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={cancelEditingNote}
                                >
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between group">
                              <span className="text-sm text-muted-foreground flex-1">
                                {item.note || 'No notes'}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditingNote(item.projectId, item.resourceId, item.note)}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </main>
  );
}