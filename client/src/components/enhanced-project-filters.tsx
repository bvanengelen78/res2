import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Filter,
  X,
  Save,
  Star,
  Trash2,
  RotateCcw,
  ChevronDown,
  Settings,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSavedProjectFilters, type ProjectFilter } from '@/hooks/use-saved-project-filters';
import { Resource } from '@shared/schema';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closure', label: 'Closure' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'change', label: 'Change' },
  { value: 'business', label: 'Business' },
];

const STREAM_OPTIONS = [
  { value: 'all', label: 'All Streams' },
  { value: 'staff', label: 'Staff' },
  { value: 'region', label: 'Region' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface EnhancedProjectFiltersProps {
  resources?: Resource[];
  ogsmCharters?: string[];
  isSticky?: boolean;
  className?: string;
  currentFilter?: Partial<ProjectFilter>;
  updateFilter?: (updates: Partial<ProjectFilter>) => void;
}

export function EnhancedProjectFilters({
  resources = [],
  ogsmCharters = [],
  isSticky = false,
  className,
  currentFilter: propCurrentFilter,
  updateFilter: propUpdateFilter
}: EnhancedProjectFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Use hook only if props are not provided (for backward compatibility)
  const hookData = useSavedProjectFilters();

  // Use props if provided, otherwise fall back to hook
  const currentFilter = propCurrentFilter || hookData.currentFilter;
  const updateFilter = propUpdateFilter || hookData.updateFilter;

  // For other functionality, always use the hook
  const {
    savedFilters,
    effectiveFilter,
    saveFilter,
    loadFilter,
    deleteFilter,
    clearAllFilters,
    refreshSavedFilters,
  } = hookData;

  // Create local hasActiveFilters that checks the correct filter state
  const hasActiveFilters = () => {
    return (
      (currentFilter.searchTerm && currentFilter.searchTerm.trim() !== '') ||
      currentFilter.statusFilter !== 'all' ||
      currentFilter.typeFilter !== 'all' ||
      currentFilter.streamFilter !== 'all' ||
      currentFilter.priorityFilter !== 'all' ||
      currentFilter.directorFilter !== 'all' ||
      currentFilter.changeLeadFilter !== 'all' ||
      currentFilter.businessLeadFilter !== 'all' ||
      currentFilter.ogsmCharterFilter !== 'all'
    );
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      if (propCurrentFilter && propUpdateFilter) {
        // If we're using props, save the prop state directly to localStorage
        const newFilter: ProjectFilter = {
          id: Date.now().toString(),
          name: filterName.trim(),
          searchTerm: currentFilter.searchTerm || '',
          statusFilter: currentFilter.statusFilter || 'all',
          typeFilter: currentFilter.typeFilter || 'all',
          streamFilter: currentFilter.streamFilter || 'all',
          priorityFilter: currentFilter.priorityFilter || 'all',
          directorFilter: currentFilter.directorFilter || 'all',
          changeLeadFilter: currentFilter.changeLeadFilter || 'all',
          businessLeadFilter: currentFilter.businessLeadFilter || 'all',
          ogsmCharterFilter: currentFilter.ogsmCharterFilter || 'all',
          createdAt: new Date().toISOString(),
        };

        // Save to localStorage directly and update the hook's savedFilters state
        try {
          const existingFilters = JSON.parse(localStorage.getItem('resourceflow-saved-project-filters') || '[]');
          const updatedFilters = [...existingFilters, newFilter];
          localStorage.setItem('resourceflow-saved-project-filters', JSON.stringify(updatedFilters));

          // Refresh the hook's savedFilters state to show the new filter immediately
          refreshSavedFilters();
        } catch (error) {
          console.error('Failed to save filter:', error);
        }
      } else {
        // Use the hook's saveFilter function directly
        saveFilter(filterName.trim());
      }

      setFilterName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoadFilter = (filter: ProjectFilter) => {
    if (propCurrentFilter && propUpdateFilter) {
      // If we're using props, update the prop state directly
      propUpdateFilter({
        searchTerm: filter.searchTerm,
        statusFilter: filter.statusFilter,
        typeFilter: filter.typeFilter,
        streamFilter: filter.streamFilter,
        priorityFilter: filter.priorityFilter,
        directorFilter: filter.directorFilter,
        changeLeadFilter: filter.changeLeadFilter,
        businessLeadFilter: filter.businessLeadFilter,
        ogsmCharterFilter: filter.ogsmCharterFilter,
      });
    } else {
      // Use the hook's loadFilter function
      loadFilter(filter);
    }
  };

  const handleClearAllFilters = () => {
    if (propCurrentFilter && propUpdateFilter) {
      // If we're using props, clear the prop state directly
      propUpdateFilter({
        searchTerm: '',
        statusFilter: 'all',
        typeFilter: 'all',
        streamFilter: 'all',
        priorityFilter: 'all',
        directorFilter: 'all',
        changeLeadFilter: 'all',
        businessLeadFilter: 'all',
        ogsmCharterFilter: 'all',
      });
    } else {
      // Use the hook's clearAllFilters function
      clearAllFilters();
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (currentFilter.searchTerm && currentFilter.searchTerm.trim() !== '') count++;
    if (currentFilter.statusFilter !== 'all') count++;
    if (currentFilter.typeFilter !== 'all') count++;
    if (currentFilter.streamFilter !== 'all') count++;
    if (currentFilter.priorityFilter !== 'all') count++;
    if (currentFilter.directorFilter !== 'all') count++;
    if (currentFilter.changeLeadFilter !== 'all') count++;
    if (currentFilter.businessLeadFilter !== 'all') count++;
    if (currentFilter.ogsmCharterFilter !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <TooltipProvider>
      <div className={cn(
        "bg-white/95 backdrop-blur-sm border-b border-gray-200/80 transition-all duration-200",
        isSticky && "sticky top-16 z-30 shadow-sm",
        className
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Main Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Quick Filters */}
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input
                  placeholder="Search projects by name, description, or details..."
                  value={currentFilter.searchTerm || ''}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  className="pl-10 pr-4 bg-white/90 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors"
                />
                {currentFilter.searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter({ searchTerm: '' })}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Quick Filter Dropdowns */}
              <div className="flex gap-2">
                <Select value={currentFilter.statusFilter || 'all'} onValueChange={(value) => updateFilter({ statusFilter: value })}>
                  <SelectTrigger className="w-32 bg-white/90 border-gray-200 hover:border-blue-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={currentFilter.typeFilter || 'all'} onValueChange={(value) => updateFilter({ typeFilter: value })}>
                  <SelectTrigger className="w-32 bg-white/90 border-gray-200 hover:border-blue-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Active Filter Indicator */}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                </Badge>
              )}

              {/* Advanced Filters Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={cn(
                      "transition-colors",
                      showAdvanced && "bg-blue-50 border-blue-200 text-blue-700"
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Advanced</span>
                    <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showAdvanced && "rotate-180")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showAdvanced ? 'Hide' : 'Show'} advanced filters
                </TooltipContent>
              </Tooltip>

              {/* Clear Filters */}
              {hasActiveFilters() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleClearAllFilters}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all filters</TooltipContent>
                </Tooltip>
              )}

              {/* Save Filter */}
              {hasActiveFilters() && (
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Save</span>
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Save current filter set</TooltipContent>
                  </Tooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="filter-name">Filter Name</Label>
                        <Input
                          id="filter-name"
                          placeholder="e.g. Active Change Projects"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Filter
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Saved Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Saved</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {savedFilters.length > 0 ? (
                    <>
                      {savedFilters.map((filter) => (
                        <DropdownMenuItem
                          key={filter.id}
                          className="flex items-center justify-between"
                        >
                          <button
                            onClick={() => handleLoadFilter(filter)}
                            className="flex-1 text-left"
                          >
                            {filter.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFilter(filter.id);
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <DropdownMenuItem disabled>
                      No saved filters
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvanced && (
            <Card className="mt-4 border-blue-200 bg-blue-50/50" id="advanced-filters-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0" role="region" aria-label="Advanced filter options">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Priority</Label>
                    <Select
                      value={currentFilter.priorityFilter || 'all'}
                      onValueChange={(value) => updateFilter({ priorityFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stream Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Stream</Label>
                    <Select
                      value={currentFilter.streamFilter || 'all'}
                      onValueChange={(value) => updateFilter({ streamFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STREAM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Director Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Director</Label>
                    <Select
                      value={currentFilter.directorFilter || 'all'}
                      onValueChange={(value) => updateFilter({ directorFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Directors</SelectItem>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id.toString()}>
                            {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Change Lead Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Change Lead</Label>
                    <Select
                      value={currentFilter.changeLeadFilter || 'all'}
                      onValueChange={(value) => updateFilter({ changeLeadFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Change Leads</SelectItem>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id.toString()}>
                            {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Business Lead Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Business Lead</Label>
                    <Select
                      value={currentFilter.businessLeadFilter || 'all'}
                      onValueChange={(value) => updateFilter({ businessLeadFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Business Leads</SelectItem>
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id.toString()}>
                            {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* OGSM Charter Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">OGSM Charter</Label>
                    <Select
                      value={currentFilter.ogsmCharterFilter || 'all'}
                      onValueChange={(value) => updateFilter({ ogsmCharterFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Charters</SelectItem>
                        {ogsmCharters.map((charter) => (
                          <SelectItem key={charter} value={charter}>
                            {charter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


      </div>
    </TooltipProvider>
  );
}
