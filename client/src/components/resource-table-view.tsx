import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye,
  Edit,
  Mail,
  Building,
  Clock,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import {
  calculateResourceUtilization,
  formatStatusText,
  UTILIZATION_STATUS_STYLES,
  type UtilizationStatus
} from '@/lib/utilization-thresholds';
import type { Resource } from '@shared/schema';

interface ResourceTableViewProps {
  resources: Resource[];
  onEdit: (resource: Resource) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
  allocations?: Record<string, any[]>; // Resource ID to allocations mapping
}

type SortField = 'name' | 'role' | 'department' | 'status' | 'capacity' | 'projects';
type SortDirection = 'asc' | 'desc';

// Department color mapping
const DEPARTMENT_COLORS = {
  'IT Architecture & Delivery': 'ring-blue-500',
  'Business Operations': 'ring-green-500',
  'Finance': 'ring-yellow-500',
  'Human Resources': 'ring-indigo-500',
  // Legacy department names for backward compatibility
  'Engineering': 'ring-blue-500',
  'Design': 'ring-purple-500',
  'Product': 'ring-green-500',
  'Marketing': 'ring-pink-500',
  'Sales': 'ring-orange-500',
  'Operations': 'ring-gray-500',
  'HR': 'ring-indigo-500',
  'default': 'ring-gray-400'
};

// Status calculation helper using unified threshold logic
function calculateResourceStatus(resource: Resource, allocations: any[] = []) {
  const totalAllocated = allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocatedHours) || 0), 0);
  const utilization = calculateResourceUtilization(
    resource.weeklyCapacity || '40',
    totalAllocated,
    resource.isActive
  );

  // Map status to priority for sorting
  const priorityMap: Record<UtilizationStatus, number> = {
    'inactive': 0,
    'unassigned': 1,
    'under-utilized': 2,
    'optimal': 3,
    'near-capacity': 4,
    'over-capacity': 5,
    'critical': 6
  };

  return {
    status: utilization.status,
    color: utilization.styles.color,
    icon: utilization.styles.icon,
    priority: priorityMap[utilization.status],
    utilizationPercentage: utilization.utilizationPercentage
  };
}

// Get initials for avatar fallback
function getInitials(name: string | undefined | null) {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function ResourceTableView({
  resources,
  onEdit,
  onSelectionChange,
  className,
  allocations = {}
}: ResourceTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Enhanced resources with calculated status and project count
  const enhancedResources = useMemo(() => {
    return resources.map(resource => {
      const resourceAllocations = allocations[resource.id] || [];
      const status = calculateResourceStatus(resource, resourceAllocations);
      const projectCount = resourceAllocations.length;
      
      // Parse skills
      const skills = (() => {
        if (!resource.skills) return [];

        if (typeof resource.skills === 'string') {
          return resource.skills.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(resource.skills)) {
          return resource.skills.map(skill => String(skill).trim()).filter(Boolean);
        } else {
          // Handle other data types by converting to string
          return String(resource.skills).split(',').map(s => s.trim()).filter(Boolean);
        }
      })();

      return {
        ...resource,
        status,
        projectCount,
        skills,
        utilizationPercentage: resourceAllocations.reduce((sum, alloc) => sum + (alloc.hoursPerWeek || 0), 0) / parseFloat(resource.weeklyCapacity || '40') * 100
      };
    });
  }, [resources, allocations]);

  // Sorted resources
  const sortedResources = useMemo(() => {
    return [...enhancedResources].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'department':
          aValue = (a.department || '').toLowerCase();
          bValue = (b.department || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status.priority;
          bValue = b.status.priority;
          break;
        case 'capacity':
          aValue = a.utilizationPercentage;
          bValue = b.utilizationPercentage;
          break;
        case 'projects':
          aValue = a.projectCount;
          bValue = b.projectCount;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [enhancedResources, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? resources.map(r => r.id.toString()) : [];
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectResource = (resourceId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedIds, resourceId]
      : selectedIds.filter(id => id !== resourceId);
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </Button>
  );

  const departmentColor = (department: string) => 
    DEPARTMENT_COLORS[department as keyof typeof DEPARTMENT_COLORS] || DEPARTMENT_COLORS.default;

  return (
    <TooltipProvider>
      <div className={cn("rounded-lg border border-gray-200 bg-white", className)}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-200">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === resources.length && resources.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all resources"
                />
              </TableHead>
              <TableHead className="min-w-[250px]">
                <SortButton field="name">Resource</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="role">Role</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="department">Department</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="capacity">Capacity</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="projects">Projects</SortButton>
              </TableHead>
              <TableHead className="text-center">Skills</TableHead>
              <TableHead className="text-center w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResources.map((resource) => (
              <TableRow
                key={resource.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(resource.id.toString())}
                    onCheckedChange={(checked) => 
                      handleSelectResource(resource.id.toString(), checked as boolean)
                    }
                    aria-label={`Select ${resource.name}`}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className={cn("h-8 w-8 ring-1 ring-offset-1", departmentColor(resource.department || ''))}>
                      <AvatarImage src={resource.profileImage} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                        {getInitials(resource.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {resource.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{resource.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="text-xs whitespace-nowrap max-w-full truncate">
                    {resource.role}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Building className="h-3 w-3 text-gray-400" />
                    <span className="truncate">{resource.department}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge className={cn("text-xs", resource.status.color)}>
                    <span className="mr-1">{resource.status.icon}</span>
                    {formatStatusText(resource.status.status)}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="text-xs text-gray-500">
                    {resource.weeklyCapacity}h/week
                  </div>
                </TableCell>

                <TableCell>
                  {resource.projectCount > 0 ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Briefcase className="h-3 w-3 text-gray-400" />
                      <span>{resource.projectCount}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {resource.skills.slice(0, 2).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {resource.skills.length > 2 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs cursor-help">
                            +{resource.skills.length - 2}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            {resource.skills.slice(2).map((skill, index) => (
                              <div key={index}>{skill}</div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/resources/${resource.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(resource)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {sortedResources.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No resources found matching your criteria</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
