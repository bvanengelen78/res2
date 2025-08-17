import React from 'react';
import * as SelectPrimitive from "@radix-ui/react-select";
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Users, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOption = 
  | 'name-asc' 
  | 'name-desc'
  | 'role-asc'
  | 'role-desc'
  | 'department-asc'
  | 'department-desc'
  | 'total-hours-desc'
  | 'total-hours-asc'
  | 'utilization-desc'
  | 'utilization-asc'
  | 'underallocated-first'
  | 'overallocated-first';

export interface SortOptionConfig {
  value: SortOption;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'basic' | 'allocation' | 'utilization';
}

export const SORT_OPTIONS: SortOptionConfig[] = [
  // Basic Sorting
  {
    value: 'name-asc',
    label: 'Name (A → Z)',
    description: 'Alphabetical order by resource name',
    icon: ArrowUp,
    category: 'basic'
  },
  {
    value: 'name-desc',
    label: 'Name (Z → A)',
    description: 'Reverse alphabetical order by resource name',
    icon: ArrowDown,
    category: 'basic'
  },
  {
    value: 'role-asc',
    label: 'Role (A → Z)',
    description: 'Alphabetical order by role title',
    icon: Users,
    category: 'basic'
  },
  {
    value: 'role-desc',
    label: 'Role (Z → A)',
    description: 'Reverse alphabetical order by role title',
    icon: Users,
    category: 'basic'
  },
  {
    value: 'department-asc',
    label: 'Department (A → Z)',
    description: 'Alphabetical order by department',
    icon: Users,
    category: 'basic'
  },
  {
    value: 'department-desc',
    label: 'Department (Z → A)',
    description: 'Reverse alphabetical order by department',
    icon: Users,
    category: 'basic'
  },
  
  // Allocation-based Sorting
  {
    value: 'total-hours-desc',
    label: 'Total Hours (High → Low)',
    description: 'Most allocated hours across visible weeks first',
    icon: TrendingDown,
    category: 'allocation'
  },
  {
    value: 'total-hours-asc',
    label: 'Total Hours (Low → High)',
    description: 'Least allocated hours across visible weeks first',
    icon: TrendingUp,
    category: 'allocation'
  },
  
  // Utilization-based Sorting
  {
    value: 'utilization-desc',
    label: 'Utilization % (High → Low)',
    description: 'Highest average weekly utilization first',
    icon: TrendingDown,
    category: 'utilization'
  },
  {
    value: 'utilization-asc',
    label: 'Utilization % (Low → High)',
    description: 'Lowest average weekly utilization first',
    icon: TrendingUp,
    category: 'utilization'
  },
  {
    value: 'underallocated-first',
    label: 'Underallocated First',
    description: 'Resources with <40% utilization first',
    icon: CheckCircle,
    category: 'utilization'
  },
  {
    value: 'overallocated-first',
    label: 'Overallocated First',
    description: 'Resources with >100% utilization first',
    icon: AlertTriangle,
    category: 'utilization'
  }
];

interface SmartSortingDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
  disabled?: boolean;
  fullscreen?: boolean;
}

export function SmartSortingDropdown({
  value,
  onChange,
  className,
  disabled = false,
  fullscreen = false
}: SmartSortingDropdownProps) {
  const selectedOption = SORT_OPTIONS.find(option => option.value === value);
  const SelectedIcon = selectedOption?.icon || ArrowUpDown;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
        <SelectPrimitive.Trigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex h-9 w-full items-center justify-start px-4 py-2 text-sm font-normal",
              fullscreen ? "w-64" : "w-56"
            )}
          >
            <div className="flex items-center gap-3 w-full overflow-hidden">
              <SelectedIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 text-left truncate min-w-0">
                <SelectPrimitive.Value placeholder="Sort by..." />
              </div>
            </div>
          </Button>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "relative z-50 max-h-[400px] min-w-[8rem] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 p-2",
              fullscreen ? "w-[360px]" : "w-[340px]"
            )}
            position="popper"
          >
            <SelectPrimitive.Viewport className="p-1">
          {/* Basic Sorting Group */}
          <div className="px-2 py-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-2">
              Basic Sorting
            </div>
            {SORT_OPTIONS.filter(option => option.category === 'basic').map((option) => {
              const Icon = option.icon;
              return (
                <SelectPrimitive.Item key={option.value} value={option.value} className="relative flex w-full cursor-default select-none items-center rounded-sm py-3 px-4 text-sm outline-none focus:bg-blue-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-blue-50">
                  <SelectPrimitive.ItemText>
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-semibold text-sm leading-tight text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600 leading-relaxed">{option.description}</div>
                      </div>
                    </div>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </div>

          {/* Allocation-based Sorting Group */}
          <div className="px-2 py-2 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-2">
              Allocation-based
            </div>
            {SORT_OPTIONS.filter(option => option.category === 'allocation').map((option) => {
              const Icon = option.icon;
              return (
                <SelectPrimitive.Item key={option.value} value={option.value} className="relative flex w-full cursor-default select-none items-center rounded-sm py-3 px-4 text-sm outline-none focus:bg-blue-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-blue-50">
                  <SelectPrimitive.ItemText>
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-semibold text-sm leading-tight text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600 leading-relaxed">{option.description}</div>
                      </div>
                    </div>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </div>

          {/* Utilization-based Sorting Group */}
          <div className="px-2 py-2 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-2">
              Utilization-based
            </div>
            {SORT_OPTIONS.filter(option => option.category === 'utilization').map((option) => {
              const Icon = option.icon;
              return (
                <SelectPrimitive.Item key={option.value} value={option.value} className="relative flex w-full cursor-default select-none items-center rounded-sm py-3 px-4 text-sm outline-none focus:bg-blue-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-blue-50">
                  <SelectPrimitive.ItemText>
                    <div className="flex items-start gap-3 w-full">
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 mt-0.5",
                        option.value === 'overallocated-first' ? "text-red-500" :
                        option.value === 'underallocated-first' ? "text-green-500" :
                        "text-blue-600"
                      )} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-semibold text-sm leading-tight text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600 leading-relaxed">{option.description}</div>
                      </div>
                    </div>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </div>
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

// Helper function to get sort option display info
export function getSortOptionInfo(value: SortOption): SortOptionConfig | undefined {
  return SORT_OPTIONS.find(option => option.value === value);
}

// Helper function to get sort direction from option
export function getSortDirection(value: SortOption): 'asc' | 'desc' {
  return value.includes('-desc') ? 'desc' : 'asc';
}

// Helper function to get sort field from option
export function getSortField(value: SortOption): string {
  if (value.startsWith('name-')) return 'name';
  if (value.startsWith('role-')) return 'role';
  if (value.startsWith('department-')) return 'department';
  if (value.startsWith('total-hours-')) return 'totalHours';
  if (value.startsWith('utilization-')) return 'utilization';
  if (value === 'underallocated-first') return 'underallocated';
  if (value === 'overallocated-first') return 'overallocated';
  return 'name';
}
