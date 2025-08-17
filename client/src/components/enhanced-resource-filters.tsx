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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { useSavedFilters, type ResourceFilter } from '@/hooks/use-saved-filters';
import { Department } from '@shared/schema';

const ROLE_OPTIONS = [
  "Change Lead",
  "Manager Change",
  "Business Controller",
  // Include additional roles that might be in the system
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'Designer',
  'QA Engineer',
  'Business Analyst',
  'Project Manager',
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'near-capacity', label: 'Near Capacity' },
  { value: 'overallocated', label: 'Overallocated' },
  { value: 'unassigned', label: 'Unassigned' },
];

const CAPACITY_OPTIONS = [
  { value: 'all', label: 'All Capacity' },
  { value: 'under-50', label: 'Under 50%' },
  { value: '50-80', label: '50-80%' },
  { value: '80-100', label: '80-100%' },
  { value: 'over-100', label: 'Over 100%' },
];

interface EnhancedResourceFiltersProps {
  departments: Department[];
  roles?: string[];
  skills?: string[];
  isSticky?: boolean;
  className?: string;
  currentFilter?: Partial<ResourceFilter>;
  updateFilter?: (updates: Partial<ResourceFilter>) => void;
}

export function EnhancedResourceFilters({
  departments,
  roles = ROLE_OPTIONS,
  skills = [],
  isSticky = false,
  className,
  currentFilter: propCurrentFilter,
  updateFilter: propUpdateFilter
}: EnhancedResourceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [skillsOpen, setSkillsOpen] = useState(false);

  // Use hook only if props are not provided (for backward compatibility)
  const hookData = useSavedFilters();

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
      currentFilter.departmentFilter !== 'all' ||
      currentFilter.roleFilter !== 'all' ||
      currentFilter.statusFilter !== 'all' ||
      currentFilter.capacityFilter !== 'all' ||
      (currentFilter.skillFilter && currentFilter.skillFilter.trim() !== '')
    );
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      if (propCurrentFilter && propUpdateFilter) {
        // If we're using props, save the prop state directly to localStorage
        const newFilter: ResourceFilter = {
          id: Date.now().toString(),
          name: filterName.trim(),
          searchTerm: currentFilter.searchTerm || '',
          departmentFilter: currentFilter.departmentFilter || 'all',
          roleFilter: currentFilter.roleFilter || 'all',
          statusFilter: currentFilter.statusFilter || 'all',
          capacityFilter: currentFilter.capacityFilter || 'all',
          skillFilter: currentFilter.skillFilter || '',
          createdAt: new Date().toISOString(),
        };

        // Save to localStorage directly and update the hook's savedFilters state
        try {
          const existingFilters = JSON.parse(localStorage.getItem('resourceflow-saved-filters') || '[]');
          const updatedFilters = [...existingFilters, newFilter];
          localStorage.setItem('resourceflow-saved-filters', JSON.stringify(updatedFilters));

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

  const handleLoadFilter = (filter: ResourceFilter) => {
    if (propCurrentFilter && propUpdateFilter) {
      // If we're using props, update the prop state directly
      propUpdateFilter({
        searchTerm: filter.searchTerm,
        departmentFilter: filter.departmentFilter,
        roleFilter: filter.roleFilter,
        statusFilter: filter.statusFilter,
        capacityFilter: filter.capacityFilter,
        skillFilter: filter.skillFilter,
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
        departmentFilter: 'all',
        roleFilter: 'all',
        statusFilter: 'all',
        capacityFilter: 'all',
        skillFilter: '',
      });
    } else {
      // Use the hook's clearAllFilters function
      clearAllFilters();
    }
  };

  const activeFilterCount = () => {
    let count = 0;
    // Use currentFilter.searchTerm (immediate) to match actual filtering behavior
    if (currentFilter.searchTerm && currentFilter.searchTerm.trim()) count++;
    if (currentFilter.departmentFilter !== 'all') count++;
    if (currentFilter.roleFilter !== 'all') count++;
    if (currentFilter.statusFilter !== 'all') count++;
    if (currentFilter.capacityFilter !== 'all') count++;
    if (currentFilter.skillFilter !== 'all') count++;
    return count;
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "border-b border-blue-200/50 bg-white/80 backdrop-blur-sm transition-all duration-200",
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
                  placeholder="Search resources by name, email, role, or department..."
                  value={currentFilter.searchTerm || ''}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  className="pl-10 pr-10"
                  aria-label="Search resources"
                  role="searchbox"
                />
                {currentFilter.searchTerm && (
                  <button
                    onClick={() => updateFilter({ searchTerm: '' })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Department Filter */}
              <Select
                value={currentFilter.departmentFilter || 'all'}
                onValueChange={(value) => updateFilter({ departmentFilter: value })}
              >
                <SelectTrigger className="w-full sm:w-48" aria-label="Filter by department">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Quick Role Filter */}
              <Select
                value={currentFilter.roleFilter || 'all'}
                onValueChange={(value) => updateFilter({ roleFilter: value })}
              >
                <SelectTrigger className="w-full sm:w-48" aria-label="Filter by role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Active Filter Count */}
              {hasActiveFilters() && (
                <Badge variant="secondary" className="hidden sm:flex">
                  {activeFilterCount()} active
                </Badge>
              )}

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
                          placeholder="e.g. Available Developers"
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

              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  "flex items-center gap-2",
                  showAdvanced && "bg-blue-50 border-blue-200 text-blue-700"
                )}
                aria-expanded={showAdvanced}
                aria-controls="advanced-filters-panel"
                aria-label={showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Advanced</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvanced && "rotate-180"
                )} aria-hidden="true" />
              </Button>

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
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Status</Label>
                    <Select 
                      value={currentFilter.statusFilter || 'all'} 
                      onValueChange={(value) => updateFilter({ statusFilter: value })}
                    >
                      <SelectTrigger>
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
                  </div>

                  {/* Capacity Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Capacity Usage</Label>
                    <Select 
                      value={currentFilter.capacityFilter || 'all'} 
                      onValueChange={(value) => updateFilter({ capacityFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPACITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skill Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Skills</Label>
                    <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={skillsOpen}
                          className="w-full justify-between"
                        >
                          {currentFilter.skillFilter || "Search skills..."}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search skills..."
                            value={currentFilter.skillFilter || ''}
                            onValueChange={(value) => updateFilter({ skillFilter: value })}
                          />
                          <CommandList>
                            <CommandEmpty>No skills found.</CommandEmpty>
                            <CommandGroup>
                              {skills.length > 0 && skills.map((skill) => (
                                <CommandItem
                                  key={skill}
                                  value={skill}
                                  onSelect={(value) => {
                                    updateFilter({ skillFilter: value === currentFilter.skillFilter ? '' : value });
                                    setSkillsOpen(false);
                                  }}
                                >
                                  {skill}
                                </CommandItem>
                              ))}
                              {skills.length === 0 && (
                                <CommandItem
                                  value={currentFilter.skillFilter || ''}
                                  onSelect={() => setSkillsOpen(false)}
                                >
                                  {currentFilter.skillFilter || 'Type to search...'}
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {currentFilter.skillFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateFilter({ skillFilter: '' })}
                        className="h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Save Filter Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Set</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="filter-name">Filter Name</Label>
                <Input
                  id="filter-name"
                  placeholder="e.g. All IT Architects"
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
      </div>
    </TooltipProvider>
  );
}
