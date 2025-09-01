# Project Detail Page Implementation Guide

## Table of Contents
1. [Project Detail Page Architecture](#project-detail-page-architecture)
2. [Full-Screen Allocation Mode](#full-screen-allocation-mode)
3. [Allocation Grid System](#allocation-grid-system)
4. [Resource Relationship Management](#resource-relationship-management)
5. [Design Language & Styling](#design-language--styling)
6. [Calculation Rules & Business Logic](#calculation-rules--business-logic)
7. [State Management](#state-management)
8. [Data Models](#data-models)
9. [Component Hierarchy](#component-hierarchy)
10. [Interaction Patterns](#interaction-patterns)
11. [Developer Implementation Guide](#developer-implementation-guide)

---

## Project Detail Page Architecture

### Core UI/UX Design Patterns

The Project Detail page follows a **dual-mode layout system**:

1. **Standard Mode**: Grid-based layout with sidebar (xl:grid-cols-4)
2. **Full-Screen Mode**: Single-column layout optimized for allocation management

#### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header Navigation (Back, Title, Actions)               │
├─────────────────────────────────────────────────────────┤
│ Sticky Navigation Bar (appears on scroll)              │
├─────────────────────────────────────────────────────────┤
│ Standard Mode:          │ Full-Screen Mode:             │
│ ┌─────────────┬───────┐ │ ┌───────────────────────────┐ │
│ │ Main Content│Sidebar│ │ │ Allocation Grid           │ │
│ │ (3/4 width) │(1/4)  │ │ │ (Full Width)              │ │
│ │             │       │ │ │                           │ │
│ │ - Overview  │- KPIs │ │ │ - Resource Allocations    │ │
│ │ - Alloc.Grid│- Team │ │ │ - Timeline View           │ │
│ │ - Timeline  │- Stats│ │ │ - Enhanced Controls       │ │
│ └─────────────┴───────┘ │ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Component Structure
```typescript
interface ProjectDetailPageProps {
  projectId: number;
}

interface ProjectDetailState {
  fullscreenMode: boolean;
  editFormOpen: boolean;
  isScrolled: boolean;
  selectedMember: Resource | null;
  profileModalOpen: boolean;
}
```

### Responsive Breakpoints
- **Mobile**: `< 768px` - Single column, simplified controls
- **Tablet**: `768px - 1279px` - Stacked layout, reduced grid columns
- **Desktop**: `≥ 1280px` - Full grid layout with sidebar
- **Full-Screen**: Any size - Allocation grid takes full viewport

---

## Full-Screen Allocation Mode

### Technical Specifications

#### State Management
```typescript
const [fullscreenMode, setFullscreenMode] = useState(false);

// Toggle function with URL state sync
const toggleFullscreen = () => {
  setFullscreenMode(prev => !prev);

  // Optional: Sync with URL parameters
  const url = new URL(window.location.href);
  if (!fullscreenMode) {
    url.searchParams.set('fullscreen', 'true');
  } else {
    url.searchParams.delete('fullscreen');
  }
  window.history.replaceState({}, '', url.toString());
};
```

#### UI Transitions
```css
/* Container transitions */
.fullscreen-container {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Layout classes */
.standard-layout {
  @apply p-4 md:p-6 max-w-7xl mx-auto;
}

.fullscreen-layout {
  @apply p-4 md:p-6;
  /* Remove max-width constraint */
}

/* Component height adjustments */
.allocation-table-standard {
  @apply max-h-[600px];
}

.allocation-table-fullscreen {
  @apply h-[calc(100vh-12rem)] max-h-[calc(100vh-20rem)];
}
```

#### Responsive Behavior
- **Mobile**: Full-screen mode uses full viewport minus navigation
- **Desktop**: Full-screen mode removes sidebar and max-width constraints
- **Keyboard Shortcut**: F11 key toggles full-screen mode
- **Escape Key**: Exits full-screen mode

#### Implementation Pattern
```typescript
// Conditional rendering based on fullscreen state
{fullscreenMode ? (
  <div className="space-y-6">
    <Tabs defaultValue="allocations" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
        <TabsTrigger value="timeline">Timeline View</TabsTrigger>
      </TabsList>

      <TabsContent value="allocations">
        <AllocationTable fullscreen={true} />
      </TabsContent>
    </Tabs>
  </div>
) : (
  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
    <div className="xl:col-span-3 space-y-6">
      <AllocationTable fullscreen={false} />
    </div>
    <div className="space-y-6">
      {/* Sidebar content */}
    </div>
  </div>
)}
```

---

## Allocation Grid System

### Grid Layout and Column Structure

#### Base Grid Configuration
```typescript
interface WeekColumn {
  weekKey: string;        // Format: "YYYY-MM-DD" (Monday of week)
  weekNumber: number;     // ISO week number
  startDate: Date;        // Monday date
  endDate: Date;          // Sunday date
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
}

interface GridConfiguration {
  WEEKS_TO_SHOW: number;  // 16 for standard, 20 for fullscreen
  weekOffset: number;     // Current viewing window offset
  scrollPosition: number; // Horizontal scroll position
}
```

#### Column Structure
```
┌─────────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Resource    │ W1  │ W2  │ W3  │ W4  │ W5  │ ... │ Σ   │
│ Name/Role   │     │     │     │     │     │     │Total│
├─────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ John Doe    │ 20h │ 25h │ 30h │ 15h │ 20h │ ... │110h │
│ Developer   │     │     │     │     │     │     │     │
├─────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ Jane Smith  │ 15h │ 20h │ 25h │ 30h │ 25h │ ... │115h │
│ Designer    │     │     │     │     │     │     │     │
└─────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

### Weekly Allocation Input Cells

#### Cell Component Structure
```typescript
interface AllocationCellProps {
  resourceId: number;
  projectId: number;
  weekKey: string;
  currentValue: number;
  maxCapacity: number;
  isReadOnly: boolean;
  onValueChange: (value: number) => void;
  onValidationError: (error: ValidationError) => void;
}

interface ValidationError {
  type: 'capacity' | 'format' | 'range';
  message: string;
  severity: 'warning' | 'error';
}
```

#### Input Validation Rules
```typescript
const validateAllocationInput = (
  value: string,
  weeklyCapacity: number,
  currentWeekTotal: number,
  resourceName?: string
): ValidationError | null => {
  // Format validation
  if (!/^\d*\.?\d*$/.test(value)) {
    return {
      type: 'format',
      message: 'Please enter a valid number',
      severity: 'error'
    };
  }

  const numValue = parseFloat(value);

  // Range validation
  if (numValue < 0) {
    return {
      type: 'range',
      message: 'Hours cannot be negative',
      severity: 'error'
    };
  }

  if (numValue > 168) { // Max hours per week
    return {
      type: 'range',
      message: 'Cannot exceed 168 hours per week',
      severity: 'error'
    };
  }

  // Capacity validation
  if (currentWeekTotal !== undefined) {
    const projectedTotal = currentWeekTotal + numValue;
    if (projectedTotal > weeklyCapacity) {
      const overAmount = projectedTotal - weeklyCapacity;
      return {
        type: 'capacity',
        message: `Exceeds weekly capacity by ${overAmount.toFixed(1)}h`,
        severity: 'warning'
      };
    }
  }

  return null;
};
```

### Real-Time Calculation Logic

#### Core Calculation Formulas
```typescript
class AllocationCalculator {
  /**
   * Calculate total weekly allocation for a resource
   */
  static calculateWeeklyTotal(
    allocations: ResourceAllocation[],
    resourceId: number,
    weekKey: string
  ): number {
    return allocations
      .filter(a => a.resourceId === resourceId)
      .reduce((total, allocation) => {
        const weeklyHours = allocation.weeklyAllocations?.[weekKey] || 0;
        return total + weeklyHours;
      }, 0);
  }

  /**
   * Calculate effective capacity (total capacity minus non-project hours)
   */
  static calculateEffectiveCapacity(
    weeklyCapacity: number,
    nonProjectHours: number = 8
  ): number {
    return Math.max(0, weeklyCapacity - nonProjectHours);
  }

  /**
   * Calculate utilization percentage
   */
  static calculateUtilization(
    allocatedHours: number,
    effectiveCapacity: number
  ): number {
    return effectiveCapacity > 0 ? (allocatedHours / effectiveCapacity) * 100 : 0;
  }

  /**
   * Distribute total hours evenly across date range
   */
  static distributeHours(
    totalHours: number,
    startDate: Date,
    endDate: Date
  ): Record<string, number> {
    const weeks = this.getWeeksBetween(startDate, endDate);
    const hoursPerWeek = totalHours / weeks.length;

    return weeks.reduce((acc, weekKey) => {
      acc[weekKey] = hoursPerWeek;
      return acc;
    }, {} as Record<string, number>);
  }

  private static getWeeksBetween(start: Date, end: Date): string[] {
    const weeks: string[] = [];
    const current = new Date(start);

    // Ensure we start on a Monday
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    current.setDate(current.getDate() - daysToMonday);

    while (current <= end) {
      weeks.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }
}
```

### Conflict Detection and Resolution

#### Conflict Detection Algorithm
```typescript
interface CapacityConflict {
  resourceId: number;
  weekKey: string;
  allocatedHours: number;
  capacity: number;
  overallocation: number;
  conflictingProjects: Array<{
    projectId: number;
    projectName: string;
    allocatedHours: number;
  }>;
  severity: 'warning' | 'error' | 'critical';
}

class ConflictDetector {
  static detectCapacityConflicts(
    resourceId: number,
    weekKey: string,
    proposedHours: number,
    existingAllocations: ResourceAllocation[],
    weeklyCapacity: number
  ): CapacityConflict | null {
    const resourceAllocations = existingAllocations.filter(a => a.resourceId === resourceId);

    const currentTotal = resourceAllocations.reduce((sum, allocation) => {
      return sum + (allocation.weeklyAllocations?.[weekKey] || 0);
    }, 0);

    const projectedTotal = currentTotal + proposedHours;
    const effectiveCapacity = AllocationCalculator.calculateEffectiveCapacity(weeklyCapacity);

    if (projectedTotal <= effectiveCapacity) {
      return null; // No conflict
    }

    const overallocation = projectedTotal - effectiveCapacity;
    const conflictingProjects = resourceAllocations
      .filter(a => (a.weeklyAllocations?.[weekKey] || 0) > 0)
      .map(a => ({
        projectId: a.projectId,
        projectName: a.project?.name || 'Unknown Project',
        allocatedHours: a.weeklyAllocations?.[weekKey] || 0
      }));

    return {
      resourceId,
      weekKey,
      allocatedHours: projectedTotal,
      capacity: effectiveCapacity,
      overallocation,
      conflictingProjects,
      severity: overallocation > effectiveCapacity * 0.5 ? 'critical' :
                overallocation > effectiveCapacity * 0.2 ? 'error' : 'warning'
    };
  }

  static suggestResolution(conflict: CapacityConflict): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];

    // Suggest reducing hours proportionally
    const totalConflictHours = conflict.conflictingProjects.reduce(
      (sum, p) => sum + p.allocatedHours, 0
    );

    if (totalConflictHours > 0) {
      const reductionFactor = conflict.capacity / conflict.allocatedHours;

      suggestions.push({
        type: 'proportional_reduction',
        description: 'Reduce all project allocations proportionally',
        adjustments: conflict.conflictingProjects.map(project => ({
          projectId: project.projectId,
          currentHours: project.allocatedHours,
          suggestedHours: Math.floor(project.allocatedHours * reductionFactor * 10) / 10
        }))
      });
    }

    // Suggest moving hours to adjacent weeks
    suggestions.push({
      type: 'redistribute_weeks',
      description: 'Move some hours to adjacent weeks',
      redistributionOptions: [
        { direction: 'previous', maxHours: conflict.overallocation / 2 },
        { direction: 'next', maxHours: conflict.overallocation / 2 }
      ]
    });

    return suggestions;
  }
}
```

### Data Persistence Strategies

#### Optimistic Updates Pattern
```typescript
interface OptimisticUpdateState {
  pendingChanges: Map<string, AllocationChange>;
  isUpdating: boolean;
  lastSyncTime: Date;
}

interface AllocationChange {
  allocationId: number;
  weekKey: string;
  oldValue: number;
  newValue: number;
  timestamp: Date;
}

class AllocationPersistence {
  private optimisticState: OptimisticUpdateState = {
    pendingChanges: new Map(),
    isUpdating: false,
    lastSyncTime: new Date()
  };

  async updateAllocation(
    allocationId: number,
    weekKey: string,
    hours: number,
    queryClient: QueryClient
  ): Promise<void> {
    const changeKey = `${allocationId}-${weekKey}`;

    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: ["/api/projects", "allocations"]
    });

    // Snapshot previous value
    const previousData = queryClient.getQueryData(["/api/projects", "allocations"]);

    // Store optimistic change
    this.optimisticState.pendingChanges.set(changeKey, {
      allocationId,
      weekKey,
      oldValue: this.getCurrentValue(previousData, allocationId, weekKey),
      newValue: hours,
      timestamp: new Date()
    });

    // Apply optimistic update
    queryClient.setQueryData(["/api/projects", "allocations"], (old: any) => {
      return this.applyOptimisticUpdate(old, allocationId, weekKey, hours);
    });

    try {
      // Persist to server
      await this.persistToServer(allocationId, weekKey, hours);

      // Remove from pending changes on success
      this.optimisticState.pendingChanges.delete(changeKey);

    } catch (error) {
      // Rollback on error
      this.rollbackOptimisticUpdate(queryClient, changeKey, previousData);
      throw error;
    } finally {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", "allocations"]
      });
    }
  }

  private applyOptimisticUpdate(
    data: any,
    allocationId: number,
    weekKey: string,
    hours: number
  ): any {
    if (!data) return data;

    return data.map((allocation: any) =>
      allocation.id === allocationId
        ? {
            ...allocation,
            weeklyAllocations: {
              ...allocation.weeklyAllocations,
              [weekKey]: hours
            }
          }
        : allocation
    );
  }

  private async persistToServer(
    allocationId: number,
    weekKey: string,
    hours: number
  ): Promise<void> {
    const response = await fetch(`/api/allocations/${allocationId}/weekly`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey, hours })
    });

    if (!response.ok) {
      throw new Error(`Failed to update allocation: ${response.statusText}`);
    }
  }
}
```

---

## Resource Relationship Management

### Entity Relationships
```typescript
interface ProjectResourceRelationship {
  // Primary relationship
  allocation: ResourceAllocation;

  // Related entities
  project: Project;
  resource: Resource;

  // Relationship metadata
  role: string;           // Resource's role in this project
  startDate: Date;        // When resource joins project
  endDate: Date;          // When resource leaves project
  status: 'active' | 'planned' | 'completed';

  // Allocation data
  totalAllocatedHours: number;
  weeklyAllocations: Record<string, number>;

  // Calculated fields
  utilization: number;    // Percentage of resource capacity
  conflicts: CapacityConflict[];
}
```

### Data Flow Between Entities
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Project   │────│ ResourceAlloc   │────│  Resource   │
│             │    │                 │    │             │
│ - id        │    │ - projectId     │    │ - id        │
│ - name      │    │ - resourceId    │    │ - name      │
│ - startDate │    │ - allocatedHours│    │ - capacity  │
│ - endDate   │    │ - weeklyAllocs  │    │ - department│
│ - status    │    │ - role          │    │ - skills    │
└─────────────┘    │ - status        │    └─────────────┘
                   └─────────────────┘
                           │
                   ┌─────────────────┐
                   │  TimeEntries    │
                   │                 │
                   │ - allocationId  │
                   │ - hours         │
                   │ - date          │
                   │ - description   │
                   └─────────────────┘
```

### Allocation Lifecycle Management
```typescript
class AllocationLifecycle {
  static async createAllocation(
    projectId: number,
    resourceId: number,
    role: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResourceAllocation> {
    // Validate resource availability
    const conflicts = await this.checkResourceAvailability(
      resourceId, startDate, endDate
    );

    if (conflicts.length > 0) {
      throw new AllocationConflictError(conflicts);
    }

    // Create allocation with default weekly distribution
    const totalWeeks = this.getWeeksBetween(startDate, endDate).length;
    const defaultWeeklyHours = 0; // Start with 0, user will set specific hours

    const allocation = await this.persistAllocation({
      projectId,
      resourceId,
      allocatedHours: defaultWeeklyHours * totalWeeks,
      startDate,
      endDate,
      role,
      status: 'active',
      weeklyAllocations: {}
    });

    return allocation;
  }

  static async updateWeeklyAllocation(
    allocationId: number,
    weekKey: string,
    hours: number
  ): Promise<void> {
    // Validate the update
    const allocation = await this.getAllocation(allocationId);
    const conflicts = await this.validateWeeklyUpdate(
      allocation.resourceId, weekKey, hours
    );

    if (conflicts.length > 0) {
      // Allow update but warn user
      console.warn('Capacity conflicts detected:', conflicts);
    }

    // Update weekly allocation
    const updatedWeeklyAllocations = {
      ...allocation.weeklyAllocations,
      [weekKey]: hours
    };

    // Recalculate total allocated hours
    const totalAllocatedHours = Object.values(updatedWeeklyAllocations)
      .reduce((sum, weekHours) => sum + (weekHours || 0), 0);

    await this.persistWeeklyUpdate(allocationId, {
      weeklyAllocations: updatedWeeklyAllocations,
      allocatedHours: totalAllocatedHours
    });
  }
}
```

---

## Design Language & Styling

### Color Scheme and Theme System

#### Primary Color Palette
```css
:root {
  /* Blue Theme Variables */
  --primary: hsl(221, 83%, 53%);           /* #3b82f6 - Primary blue */
  --primary-foreground: hsl(210, 40%, 98%); /* White text on blue */
  --secondary: hsl(210, 40%, 96%);         /* Light blue/gray */
  --accent: hsl(210, 40%, 96%);            /* Accent color */

  /* Semantic Colors */
  --success: hsl(142, 76%, 36%);           /* Green for success states */
  --warning: hsl(38, 92%, 50%);            /* Orange for warnings */
  --destructive: hsl(0, 84%, 60%);         /* Red for errors */

  /* Neutral Palette */
  --background: hsl(0, 0%, 100%);          /* Pure white */
  --foreground: hsl(240, 10%, 3.9%);       /* Near black text */
  --muted: hsl(0, 0%, 96.1%);              /* Light gray backgrounds */
  --border: hsl(240, 5.9%, 90%);           /* Border color */

  /* Radius */
  --radius: 0.625rem;                      /* 10px border radius */
}
```

#### Utilization Status Colors
```typescript
const getUtilizationColor = (percentage: number): string => {
  if (percentage <= 70) return 'text-green-600 bg-green-50 border-green-200';
  if (percentage <= 90) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (percentage <= 100) return 'text-orange-600 bg-orange-50 border-orange-200';
  if (percentage <= 120) return 'text-red-600 bg-red-50 border-red-200';
  return 'text-purple-600 bg-purple-50 border-purple-200'; // Critical overallocation
};

const getRoleBadgeStyle = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'director':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'change lead':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'business lead':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};
```

### Typography System
```css
/* Font Family */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  @apply antialiased;
}

/* Typography Scale */
.text-scale {
  /* Headers */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}

/* Component Typography */
.page-title {
  @apply text-2xl font-bold text-gray-900;
}

.section-title {
  @apply text-xl font-semibold text-gray-800;
}

.card-title {
  @apply text-lg font-medium text-gray-900;
}

.body-text {
  @apply text-sm text-gray-600;
}

.caption-text {
  @apply text-xs text-gray-500;
}
```

### Spacing and Layout System
```css
/* Spacing Scale (Tailwind-based) */
.spacing-scale {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}

/* Component Spacing Patterns */
.card-padding {
  @apply p-6;           /* 24px all sides */
}

.section-spacing {
  @apply space-y-6;     /* 24px vertical spacing */
}

.grid-gap {
  @apply gap-6;         /* 24px grid gap */
}

/* Container Constraints */
.page-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.content-container {
  @apply max-w-5xl mx-auto;
}
```

### Component Design System

#### Card Components
```css
/* Base Card Styles */
.card-base {
  @apply bg-white rounded-xl shadow-sm border border-gray-200/50;
  @apply transition-all duration-300 ease-out;
}

.card-hover {
  @apply hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1;
}

.card-interactive {
  @apply cursor-pointer;
  @apply hover:bg-white hover:border-blue-300/50;
}

/* Gradient Card Variant */
.card-gradient {
  @apply bg-gradient-to-br from-white to-blue-50/30;
  @apply border-0 shadow-sm;
}

/* Enhanced Card with Backdrop */
.card-enhanced {
  @apply bg-white/95 backdrop-blur-sm;
  @apply border-blue-200/50 shadow-lg shadow-gray-200/50;
}
```

#### Button System
```css
/* Button Variants */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white;
  @apply px-4 py-2 rounded-md font-medium;
  @apply transition-colors duration-200;
}

.btn-secondary {
  @apply bg-gray-100 hover:bg-gray-200 text-gray-900;
  @apply px-4 py-2 rounded-md font-medium;
  @apply transition-colors duration-200;
}

.btn-outline {
  @apply border border-gray-300 hover:bg-gray-50 text-gray-700;
  @apply px-4 py-2 rounded-md font-medium;
  @apply transition-colors duration-200;
}

.btn-ghost {
  @apply hover:bg-gray-100 text-gray-700;
  @apply px-3 py-2 rounded-md font-medium;
  @apply transition-colors duration-200;
}

/* Button Sizes */
.btn-sm {
  @apply h-9 px-3 text-sm;
}

.btn-md {
  @apply h-10 px-4 text-sm;
}

.btn-lg {
  @apply h-11 px-8 text-base;
}
```

#### Input and Form Components
```css
/* Input Styles */
.input-base {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  @apply transition-colors duration-200;
}

.input-error {
  @apply border-red-300 focus:ring-red-500;
}

.input-success {
  @apply border-green-300 focus:ring-green-500;
}

/* Allocation Input Cell Specific */
.allocation-input {
  @apply w-16 h-8 text-center text-sm;
  @apply border-gray-200 focus:border-blue-500;
  @apply rounded-md transition-all duration-200;
}

.allocation-input-warning {
  @apply border-yellow-300 bg-yellow-50;
}

.allocation-input-error {
  @apply border-red-300 bg-red-50;
}
```

### Animation and Transition System
```css
/* Base Transitions */
.transition-base {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-slow {
  transition-duration: 300ms;
}

.transition-fast {
  transition-duration: 150ms;
}

/* Entrance Animations */
@keyframes slide-in-from-bottom {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-entrance {
  animation: slide-in-from-bottom 0.4s ease-out forwards;
  opacity: 0;
}

/* Staggered Animation Delays */
.stagger-delay-0 { animation-delay: 0ms; }
.stagger-delay-1 { animation-delay: 100ms; }
.stagger-delay-2 { animation-delay: 200ms; }
.stagger-delay-3 { animation-delay: 300ms; }

/* Hover Effects */
.hover-lift {
  @apply hover:-translate-y-1 hover:shadow-lg;
}

.hover-scale {
  @apply hover:scale-[1.02];
}

/* Loading States */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.loading-pulse {
  animation: pulse-subtle 2s ease-in-out infinite;
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  .animate-entrance,
  .transition-base,
  .hover-lift,
  .hover-scale {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Calculation Rules & Business Logic

### Mathematical Formulas

#### Core Allocation Calculations
```typescript
interface CapacityCalculation {
  totalCapacity: number;      // Total weekly hours (e.g., 40)
  nonProjectHours: number;    // Admin/meeting time (e.g., 8)
  effectiveCapacity: number;  // Available for project work (32)
  allocatedHours: number;     // Currently allocated hours
  utilization: number;        // Percentage (allocatedHours / effectiveCapacity * 100)
  availableHours: number;     // Remaining capacity
}

class CapacityCalculator {
  static readonly DEFAULT_WEEKLY_CAPACITY = 40;
  static readonly DEFAULT_NON_PROJECT_HOURS = 8;
  static readonly UTILIZATION_THRESHOLDS = {
    OPTIMAL: 70,      // Green zone
    WARNING: 90,      // Yellow zone
    CRITICAL: 100,    // Orange zone
    OVERALLOCATED: 120 // Red zone
  };

  /**
   * Calculate effective capacity for project work
   * Formula: Total Capacity - Non-Project Hours
   */
  static calculateEffectiveCapacity(
    totalCapacity: number,
    nonProjectHours: number = this.DEFAULT_NON_PROJECT_HOURS
  ): number {
    return Math.max(0, totalCapacity - nonProjectHours);
  }

  /**
   * Calculate utilization percentage
   * Formula: (Allocated Hours / Effective Capacity) × 100
   */
  static calculateUtilization(
    allocatedHours: number,
    effectiveCapacity: number
  ): number {
    if (effectiveCapacity <= 0) return 0;
    return Math.round((allocatedHours / effectiveCapacity) * 100 * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate period-based utilization for multiple weeks
   * Formula: Sum(Weekly Allocated) / Sum(Weekly Effective Capacity) × 100
   */
  static calculatePeriodUtilization(
    weeklyAllocations: Record<string, number>,
    weeklyCapacity: number,
    weekKeys: string[]
  ): number {
    const totalAllocated = weekKeys.reduce((sum, weekKey) => {
      return sum + (weeklyAllocations[weekKey] || 0);
    }, 0);

    const totalEffectiveCapacity = weekKeys.length *
      this.calculateEffectiveCapacity(weeklyCapacity);

    return this.calculateUtilization(totalAllocated, totalEffectiveCapacity);
  }

  /**
   * Calculate optimal allocation distribution
   * Formula: Target Hours / Number of Weeks (with capacity constraints)
   */
  static calculateOptimalDistribution(
    targetTotalHours: number,
    weekKeys: string[],
    weeklyCapacity: number,
    existingAllocations: Record<string, number> = {}
  ): Record<string, number> {
    const effectiveCapacity = this.calculateEffectiveCapacity(weeklyCapacity);
    const weeksCount = weekKeys.length;

    if (weeksCount === 0) return {};

    // Calculate base allocation per week
    const baseAllocationPerWeek = targetTotalHours / weeksCount;

    // Distribute with capacity constraints
    const distribution: Record<string, number> = {};
    let remainingHours = targetTotalHours;

    for (const weekKey of weekKeys) {
      const existingHours = existingAllocations[weekKey] || 0;
      const availableCapacity = Math.max(0, effectiveCapacity - existingHours);

      // Allocate minimum of: base allocation, remaining hours, available capacity
      const allocation = Math.min(
        baseAllocationPerWeek,
        remainingHours,
        availableCapacity
      );

      distribution[weekKey] = Math.round(allocation * 10) / 10; // Round to 1 decimal
      remainingHours -= allocation;
    }

    return distribution;
  }
}
```

#### Conflict Detection Algorithms
```typescript
interface ConflictAnalysis {
  hasConflicts: boolean;
  conflictType: 'capacity' | 'scheduling' | 'skill' | 'priority';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedWeeks: string[];
  conflictingAllocations: AllocationConflict[];
  resolutionSuggestions: ResolutionSuggestion[];
}

class ConflictAnalyzer {
  /**
   * Analyze capacity conflicts for a resource across multiple weeks
   */
  static analyzeCapacityConflicts(
    resourceId: number,
    allocations: ResourceAllocation[],
    weeklyCapacity: number,
    weekKeys: string[]
  ): ConflictAnalysis {
    const resourceAllocations = allocations.filter(a => a.resourceId === resourceId);
    const effectiveCapacity = CapacityCalculator.calculateEffectiveCapacity(weeklyCapacity);

    const conflictingWeeks: string[] = [];
    const conflictingAllocations: AllocationConflict[] = [];

    for (const weekKey of weekKeys) {
      const weekTotal = resourceAllocations.reduce((sum, allocation) => {
        return sum + (allocation.weeklyAllocations?.[weekKey] || 0);
      }, 0);

      if (weekTotal > effectiveCapacity) {
        conflictingWeeks.push(weekKey);

        // Identify specific allocations contributing to conflict
        const weekAllocations = resourceAllocations
          .filter(a => (a.weeklyAllocations?.[weekKey] || 0) > 0)
          .map(a => ({
            allocationId: a.id,
            projectId: a.projectId,
            projectName: a.project?.name || 'Unknown',
            allocatedHours: a.weeklyAllocations?.[weekKey] || 0,
            priority: a.project?.priority || 'medium'
          }));

        conflictingAllocations.push({
          weekKey,
          totalAllocated: weekTotal,
          capacity: effectiveCapacity,
          overallocation: weekTotal - effectiveCapacity,
          allocations: weekAllocations
        });
      }
    }

    const severity = this.calculateConflictSeverity(conflictingAllocations, effectiveCapacity);
    const resolutionSuggestions = this.generateResolutionSuggestions(conflictingAllocations);

    return {
      hasConflicts: conflictingWeeks.length > 0,
      conflictType: 'capacity',
      severity,
      affectedWeeks: conflictingWeeks,
      conflictingAllocations,
      resolutionSuggestions
    };
  }

  private static calculateConflictSeverity(
    conflicts: AllocationConflict[],
    capacity: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (conflicts.length === 0) return 'low';

    const maxOverallocation = Math.max(...conflicts.map(c => c.overallocation));
    const overallocationPercentage = (maxOverallocation / capacity) * 100;

    if (overallocationPercentage > 50) return 'critical';
    if (overallocationPercentage > 25) return 'high';
    if (overallocationPercentage > 10) return 'medium';
    return 'low';
  }

  private static generateResolutionSuggestions(
    conflicts: AllocationConflict[]
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];

    for (const conflict of conflicts) {
      // Suggest proportional reduction
      suggestions.push({
        type: 'proportional_reduction',
        weekKey: conflict.weekKey,
        description: `Reduce all allocations proportionally for week ${conflict.weekKey}`,
        adjustments: conflict.allocations.map(alloc => ({
          allocationId: alloc.allocationId,
          currentHours: alloc.allocatedHours,
          suggestedHours: Math.round(
            (alloc.allocatedHours * conflict.capacity / conflict.totalAllocated) * 10
          ) / 10
        }))
      });

      // Suggest priority-based reduction
      const lowPriorityAllocations = conflict.allocations
        .filter(a => a.priority === 'low')
        .sort((a, b) => b.allocatedHours - a.allocatedHours);

      if (lowPriorityAllocations.length > 0) {
        suggestions.push({
          type: 'priority_based_reduction',
          weekKey: conflict.weekKey,
          description: `Reduce low-priority project allocations first`,
          adjustments: lowPriorityAllocations.map(alloc => ({
            allocationId: alloc.allocationId,
            currentHours: alloc.allocatedHours,
            suggestedHours: Math.max(0, alloc.allocatedHours - conflict.overallocation)
          }))
        });
      }
    }

    return suggestions;
  }
}
```

### Validation Rules

#### Input Validation
```typescript
interface ValidationRule {
  field: string;
  rule: (value: any, context?: any) => ValidationResult;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}

class AllocationValidator {
  static readonly VALIDATION_RULES: ValidationRule[] = [
    {
      field: 'hours',
      rule: (value: string) => {
        const num = parseFloat(value);
        return {
          isValid: !isNaN(num) && num >= 0 && num <= 168,
          message: num < 0 ? 'Hours cannot be negative' :
                   num > 168 ? 'Cannot exceed 168 hours per week' : undefined
        };
      },
      message: 'Invalid hour value',
      severity: 'error'
    },
    {
      field: 'capacity',
      rule: (value: number, context: { weeklyCapacity: number; currentTotal: number }) => {
        const projectedTotal = context.currentTotal + value;
        const effectiveCapacity = CapacityCalculator.calculateEffectiveCapacity(context.weeklyCapacity);

        if (projectedTotal <= effectiveCapacity) {
          return { isValid: true };
        }

        const overallocation = projectedTotal - effectiveCapacity;
        return {
          isValid: false,
          message: `Exceeds capacity by ${overallocation.toFixed(1)}h`,
          severity: overallocation > effectiveCapacity * 0.2 ? 'error' : 'warning'
        };
      },
      message: 'Capacity exceeded',
      severity: 'warning'
    }
  ];

  static validateAllocationInput(
    value: string,
    context: {
      weeklyCapacity: number;
      currentWeekTotal: number;
      resourceName?: string;
    }
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const rule of this.VALIDATION_RULES) {
      const result = rule.rule(value, context);
      if (!result.isValid) {
        results.push({
          ...result,
          severity: result.severity || rule.severity
        });
      }
    }

    return results;
  }

  static validateBulkAllocation(
    allocations: Array<{ resourceId: number; weekKey: string; hours: number }>,
    resources: Resource[]
  ): Map<string, ValidationResult[]> {
    const validationResults = new Map<string, ValidationResult[]>();

    // Group allocations by resource and week
    const allocationsByResourceWeek = new Map<string, number>();

    for (const allocation of allocations) {
      const key = `${allocation.resourceId}-${allocation.weekKey}`;
      const currentTotal = allocationsByResourceWeek.get(key) || 0;
      allocationsByResourceWeek.set(key, currentTotal + allocation.hours);
    }

    // Validate each resource-week combination
    for (const [key, totalHours] of allocationsByResourceWeek) {
      const [resourceIdStr, weekKey] = key.split('-');
      const resourceId = parseInt(resourceIdStr);
      const resource = resources.find(r => r.id === resourceId);

      if (!resource) continue;

      const results = this.validateAllocationInput(totalHours.toString(), {
        weeklyCapacity: parseFloat(resource.weeklyCapacity),
        currentWeekTotal: 0, // Assuming we're validating the total
        resourceName: resource.name
      });

      if (results.length > 0) {
        validationResults.set(key, results);
      }
    }

    return validationResults;
  }
}
```

---

## State Management

### UI State Architecture

#### Component State Structure
```typescript
interface ProjectDetailState {
  // View state
  fullscreenMode: boolean;
  isScrolled: boolean;
  activeTab: 'allocations' | 'timeline';

  // Modal states
  editFormOpen: boolean;
  profileModalOpen: boolean;
  addResourceDialogOpen: boolean;

  // Selection state
  selectedMember: Resource | null;
  selectedWeeks: string[];

  // Grid state
  weekOffset: number;
  scrollPosition: number;

  // Editing state
  isEditingSession: boolean;
  lockedRowOrder: AllocationWithResource[];
  pendingChanges: Map<string, AllocationChange>;
}

interface AllocationGridState {
  // Data state
  allocations: AllocationWithResource[];
  resources: Resource[];
  weekColumns: WeekColumn[];

  // UI state
  isLoading: boolean;
  error: Error | null;
  lastSyncTime: Date;

  // Interaction state
  focusedCell: { resourceId: number; weekKey: string } | null;
  selectedCells: Array<{ resourceId: number; weekKey: string }>;
  dragSelection: DragSelection | null;
}
```

#### State Management Patterns

**1. Local Component State (useState)**
```typescript
// Simple UI state that doesn't need to be shared
const [fullscreenMode, setFullscreenMode] = useState(false);
const [isScrolled, setIsScrolled] = useState(false);
const [activeTab, setActiveTab] = useState<'allocations' | 'timeline'>('allocations');

// Modal visibility state
const [editFormOpen, setEditFormOpen] = useState(false);
const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
```

**2. Derived State (useMemo)**
```typescript
// Computed values based on props/state
const weekColumns = useMemo(() => {
  return generateWeekColumns(weekOffset, WEEKS_TO_SHOW);
}, [weekOffset, WEEKS_TO_SHOW]);

const filteredAllocations = useMemo(() => {
  return allocations.filter(allocation =>
    allocation.status === 'active' &&
    !allocation.resource.isDeleted
  );
}, [allocations]);

const utilizationSummary = useMemo(() => {
  return calculateUtilizationSummary(filteredAllocations, weekColumns);
}, [filteredAllocations, weekColumns]);
```

**3. Effect State (useEffect)**
```typescript
// Scroll detection for sticky navigation
useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 100);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// Keyboard shortcuts
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'F11') {
      event.preventDefault();
      setFullscreenMode(prev => !prev);
    }
    if (event.key === 'Escape' && fullscreenMode) {
      setFullscreenMode(false);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [fullscreenMode]);
```

### Data Synchronization

#### Optimistic Updates with Rollback
```typescript
interface OptimisticUpdateManager {
  pendingUpdates: Map<string, PendingUpdate>;
  rollbackStack: Array<RollbackAction>;
  syncQueue: Array<SyncAction>;
}

class OptimisticStateManager {
  private state: OptimisticUpdateManager = {
    pendingUpdates: new Map(),
    rollbackStack: [],
    syncQueue: []
  };

  async updateAllocation(
    allocationId: number,
    weekKey: string,
    newValue: number,
    oldValue: number
  ): Promise<void> {
    const updateKey = `${allocationId}-${weekKey}`;

    // Store rollback information
    this.state.rollbackStack.push({
      type: 'allocation_update',
      allocationId,
      weekKey,
      oldValue,
      timestamp: new Date()
    });

    // Apply optimistic update
    this.applyOptimisticUpdate(allocationId, weekKey, newValue);

    // Queue for server sync
    this.state.syncQueue.push({
      type: 'update_allocation',
      allocationId,
      weekKey,
      value: newValue,
      retryCount: 0
    });

    try {
      await this.syncToServer();
      this.clearPendingUpdate(updateKey);
    } catch (error) {
      await this.rollbackUpdate(updateKey);
      throw error;
    }
  }

  private async syncToServer(): Promise<void> {
    const batchSize = 10;
    const batch = this.state.syncQueue.splice(0, batchSize);

    if (batch.length === 0) return;

    try {
      await this.sendBatchUpdate(batch);
    } catch (error) {
      // Re-queue failed updates with retry logic
      batch.forEach(action => {
        if (action.retryCount < 3) {
          action.retryCount++;
          this.state.syncQueue.unshift(action);
        }
      });
      throw error;
    }
  }

  private async rollbackUpdate(updateKey: string): Promise<void> {
    const rollbackAction = this.state.rollbackStack
      .reverse()
      .find(action =>
        action.type === 'allocation_update' &&
        `${action.allocationId}-${action.weekKey}` === updateKey
      );

    if (rollbackAction) {
      this.applyOptimisticUpdate(
        rollbackAction.allocationId,
        rollbackAction.weekKey,
        rollbackAction.oldValue
      );
    }
  }
}
```

#### Real-time Synchronization
```typescript
interface RealTimeSyncManager {
  websocketConnection: WebSocket | null;
  subscriptions: Map<string, SubscriptionCallback>;
  reconnectAttempts: number;
  lastHeartbeat: Date;
}

class RealTimeSync {
  private manager: RealTimeSyncManager = {
    websocketConnection: null,
    subscriptions: new Map(),
    reconnectAttempts: 0,
    lastHeartbeat: new Date()
  };

  connect(projectId: number): void {
    const wsUrl = `${process.env.WS_URL}/projects/${projectId}/allocations`;
    this.manager.websocketConnection = new WebSocket(wsUrl);

    this.manager.websocketConnection.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleRealtimeUpdate(message);
    };

    this.manager.websocketConnection.onclose = () => {
      this.handleDisconnection();
    };

    this.manager.websocketConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(
    eventType: string,
    callback: (data: any) => void
  ): () => void {
    const subscriptionId = `${eventType}-${Date.now()}`;
    this.manager.subscriptions.set(subscriptionId, callback);

    return () => {
      this.manager.subscriptions.delete(subscriptionId);
    };
  }

  private handleRealtimeUpdate(message: any): void {
    switch (message.type) {
      case 'allocation_updated':
        this.notifySubscribers('allocation_updated', message.data);
        break;
      case 'resource_added':
        this.notifySubscribers('resource_added', message.data);
        break;
      case 'conflict_detected':
        this.notifySubscribers('conflict_detected', message.data);
        break;
    }
  }

  private notifySubscribers(eventType: string, data: any): void {
    for (const [subscriptionId, callback] of this.manager.subscriptions) {
      if (subscriptionId.startsWith(eventType)) {
        callback(data);
      }
    }
  }
}
```

---

## Data Models

### Core Entity Definitions

#### Project Entity
```typescript
interface Project {
  id: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'business' | 'technical' | 'compliance' | 'research';

  // Leadership assignments
  directorId?: number;
  changeLeadId?: number;
  businessLeadId?: number;

  // Organizational context
  department?: string;
  stream?: string;
  ogsmCharter?: string;

  // Calculated fields (populated by joins)
  totalAllocatedHours?: number;
  resourceCount?: number;
  utilizationPercentage?: number;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

interface ProjectWithAllocations extends Project {
  allocations: ResourceAllocation[];
  resources: Resource[];
  metrics: ProjectMetrics;
}

interface ProjectMetrics {
  totalAllocatedHours: number;
  activeResourceCount: number;
  averageUtilization: number;
  peakUtilization: number;
  conflictCount: number;
  completionPercentage: number;
}
```

#### Resource Entity
```typescript
interface Resource {
  id: number;
  name: string;
  email: string;
  role: string;              // Job title
  department: string;
  jobRole?: string;          // Functional role (for grouping)

  // Capacity information
  weeklyCapacity: string;    // Stored as decimal string (e.g., "40.00")
  nonProjectHours?: number;  // Admin/meeting time (default: 8)

  // Skills and capabilities
  skills?: string[];
  roles?: string[];          // Multiple role assignments

  // Status
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;

  // Profile
  profileImage?: string;

  // Timestamps
  createdAt: Date;
}

interface ResourceWithAllocations extends Resource {
  allocations: ResourceAllocation[];
  totalAllocatedHours: number;
  effectiveCapacity: number;
  utilization: number;
  conflicts: CapacityConflict[];
}
```

#### Resource Allocation Entity
```typescript
interface ResourceAllocation {
  id: number;
  projectId: number;
  resourceId: number;

  // Allocation details
  allocatedHours: string;    // Total hours as decimal string
  startDate: Date;
  endDate: Date;
  role?: string;             // Role in this specific project
  status: 'active' | 'planned' | 'completed' | 'cancelled';

  // Weekly breakdown
  weeklyAllocations: Record<string, number>; // { "2024-01-01": 20, "2024-01-08": 25 }

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

interface AllocationWithResource extends ResourceAllocation {
  resource: Resource;
}

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
}

interface AllocationWithBoth extends ResourceAllocation {
  resource: Resource;
  project: Project;
}
```

### Database Schema (Generic/Prisma-Compatible)

#### Prisma Schema Definition
```prisma
model Project {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  status      String   @default("draft")
  priority    String   @default("medium")
  type        String   @default("business")

  // Leadership
  directorId     Int?    @map("director_id")
  changeLeadId   Int?    @map("change_lead_id")
  businessLeadId Int?    @map("business_lead_id")

  // Organization
  department   String?
  stream       String?
  ogsmCharter  String? @map("ogsm_charter")

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  allocations ResourceAllocation[]
  director    Resource? @relation("ProjectDirector", fields: [directorId], references: [id])
  changeLead  Resource? @relation("ProjectChangeLead", fields: [changeLeadId], references: [id])
  businessLead Resource? @relation("ProjectBusinessLead", fields: [businessLeadId], references: [id])

  @@map("projects")
}

model Resource {
  id             Int      @id @default(autoincrement())
  name           String
  email          String   @unique
  role           String
  department     String   @default("IT Architecture & Delivery")
  jobRole        String?  @map("job_role")
  weeklyCapacity Decimal  @default(40.00) @map("weekly_capacity") @db.Decimal(5, 2)

  // Status
  isActive   Boolean   @default(true) @map("is_active")
  isDeleted  Boolean   @default(false) @map("is_deleted")
  deletedAt  DateTime? @map("deleted_at")

  // Profile
  profileImage String? @map("profile_image")
  skills       Json?   // String array
  roles        Json?   @default("[]") // String array

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  allocations        ResourceAllocation[]
  directedProjects   Project[] @relation("ProjectDirector")
  changeLeadProjects Project[] @relation("ProjectChangeLead")
  businessLeadProjects Project[] @relation("ProjectBusinessLead")

  @@map("resources")
}

model ResourceAllocation {
  id              Int      @id @default(autoincrement())
  projectId       Int      @map("project_id")
  resourceId      Int      @map("resource_id")
  allocatedHours  Decimal  @map("allocated_hours") @db.Decimal(5, 2)
  startDate       DateTime @map("start_date")
  endDate         DateTime @map("end_date")
  role            String?
  status          String   @default("active")
  weeklyAllocations Json   @default("{}") @map("weekly_allocations") // Record<string, number>

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  project  Project  @relation(fields: [projectId], references: [id])
  resource Resource @relation(fields: [resourceId], references: [id])

  @@map("resource_allocations")
}
```

#### Database Indexes and Constraints
```sql
-- Performance indexes
CREATE INDEX idx_resource_allocations_project_id ON resource_allocations(project_id);
CREATE INDEX idx_resource_allocations_resource_id ON resource_allocations(resource_id);
CREATE INDEX idx_resource_allocations_dates ON resource_allocations(start_date, end_date);
CREATE INDEX idx_resource_allocations_status ON resource_allocations(status);

-- Composite indexes for common queries
CREATE INDEX idx_allocations_project_resource ON resource_allocations(project_id, resource_id);
CREATE INDEX idx_allocations_resource_dates ON resource_allocations(resource_id, start_date, end_date);

-- Unique constraints
ALTER TABLE resource_allocations
ADD CONSTRAINT unique_active_allocation
UNIQUE (project_id, resource_id, status)
WHERE status = 'active';

-- Check constraints
ALTER TABLE resource_allocations
ADD CONSTRAINT check_positive_hours
CHECK (allocated_hours >= 0);

ALTER TABLE resource_allocations
ADD CONSTRAINT check_valid_dates
CHECK (end_date >= start_date);

ALTER TABLE resources
ADD CONSTRAINT check_positive_capacity
CHECK (weekly_capacity > 0);
```

---

## Component Hierarchy

### Complete Component Tree

```
ProjectDetailPage
├── TooltipProvider
├── main (conditional className based on fullscreenMode)
│   ├── Header Section
│   │   ├── Navigation
│   │   │   ├── Link (Back to Projects)
│   │   │   │   └── Button (ghost, ArrowLeft icon)
│   │   │   └── div (Title section)
│   │   │       ├── h1 (Project name)
│   │   │       └── p (Subtitle)
│   │   └── Actions
│   │       ├── Tooltip (Fullscreen toggle)
│   │       │   ├── TooltipTrigger
│   │       │   │   └── Button (Maximize2/Minimize2 icon)
│   │       │   └── TooltipContent
│   │       ├── Button (Edit project)
│   │       └── Button (Delete project)
│   │
│   ├── StickyNavigationBar (conditional on scroll)
│   │   └── div (Same structure as Header but compact)
│   │
│   └── Content Area (conditional layout)
│       ├── FullscreenMode
│       │   └── div (space-y-6)
│       │       └── Tabs
│       │           ├── TabsList
│       │           │   ├── TabsTrigger (allocations)
│       │           │   └── TabsTrigger (timeline)
│       │           ├── TabsContent (allocations)
│       │           │   └── ProjectResourceAllocationTable (fullscreen=true)
│       │           └── TabsContent (timeline)
│       │               └── ProjectTimeline (fullscreen=true)
│       │
│       └── StandardMode
│           └── div (grid xl:grid-cols-4)
│               ├── MainContent (xl:col-span-3)
│               │   ├── ProjectOverviewCard
│               │   │   ├── CardHeader
│               │   │   │   ├── CardTitle (with Building icon)
│               │   │   │   └── p (Description)
│               │   │   └── CardContent
│               │   │       └── div (Project description prose)
│               │   │
│               │   └── Tabs (Resource allocation)
│               │       ├── TabsList
│               │       ├── TabsContent (allocations)
│               │       │   └── ProjectResourceAllocationTable (fullscreen=false)
│               │       └── TabsContent (timeline)
│               │           └── ProjectTimeline (fullscreen=false)
│               │
│               └── Sidebar (space-y-6)
│                   ├── ProjectMetricsCard
│                   ├── ProjectTeamCard
│                   └── ProjectStatusCard
│
├── ProjectForm (Modal)
│   └── Dialog
│       ├── DialogContent
│       │   ├── DialogHeader
│       │   └── form
│       │       ├── BasicInformationSection
│       │       ├── ProjectTypeSection
│       │       ├── LeadershipSection
│       │       └── DialogFooter
│       └── DialogTrigger
│
└── ProfileModal (Resource details)
    └── Dialog (Similar structure to ProjectForm)
```

### ProjectResourceAllocationTable Component Tree

```
ProjectResourceAllocationTable
├── TooltipProvider
├── Card (conditional height based on fullscreen)
│   ├── CardHeader
│   │   ├── div (Header content)
│   │   │   ├── div (Title section)
│   │   │   │   ├── CardTitle (with Users icon and Badge)
│   │   │   │   └── p (Description)
│   │   │   └── div (Controls section)
│   │   │       ├── WeekNavigationControls
│   │   │       │   ├── Button (Previous weeks)
│   │   │       │   ├── span (Current range display)
│   │   │       │   └── Button (Next weeks)
│   │   │       ├── Button (Add Resource)
│   │   │       └── ExplicitSaveControls
│   │   │           ├── Button (Save changes)
│   │   │           ├── Button (Discard changes)
│   │   │           └── Badge (Unsaved changes indicator)
│   │   └── div (Week headers)
│   │       ├── div (Resource column header)
│   │       ├── div (Week columns - generated dynamically)
│   │       │   └── div (Week header with date and week number)
│   │       └── div (Total column header)
│   │
│   └── CardContent
│       ├── EmptyState (when no allocations)
│       │   ├── Users icon
│       │   ├── h3 (No Resources Assigned)
│       │   ├── p (Description)
│       │   └── Button (Add First Resource)
│       │
│       └── AllocationGrid (when allocations exist)
│           └── div (Scrollable container)
│               └── div (Grid rows - generated dynamically)
│                   ├── ResourceRow (for each allocation)
│                   │   ├── ResourceInfoCell
│                   │   │   ├── Avatar (Resource profile image)
│                   │   │   ├── div (Name and role)
│                   │   │   └── Button (Remove resource)
│                   │   ├── AllocationCells (for each week)
│                   │   │   └── AllocationInputCell
│                   │   │       ├── Input (Hours input)
│                   │   │       ├── ValidationIndicator
│                   │   │       └── ConflictWarning
│                   │   └── TotalCell
│                   │       └── span (Total hours)
│                   │
│                   └── SummaryRow (Totals by week)
│                       ├── div (Summary label)
│                       ├── div (Week totals)
│                       └── div (Grand total)
│
├── AddResourceDialog
│   └── Dialog
│       ├── DialogContent
│       │   ├── DialogHeader
│       │   ├── form
│       │   │   ├── ResourceSelector
│       │   │   │   └── Combobox (Searchable resource list)
│       │   │   ├── RoleInput
│       │   │   │   └── Input (Role in project)
│       │   │   └── DialogFooter
│       │   │       ├── Button (Cancel)
│       │   │       └── Button (Add Resource)
│       │   └── DialogTrigger
│       └── DialogOverlay
│
└── NavigationGuard (Unsaved changes warning)
    └── AlertDialog (Conditional on navigation attempt)
        ├── AlertDialogContent
        │   ├── AlertDialogHeader
        │   ├── AlertDialogDescription
        │   └── AlertDialogFooter
        │       ├── Button (Discard changes)
        │       ├── Button (Save and continue)
        │       └── Button (Cancel)
        └── AlertDialogTrigger
```

### Prop Interfaces

#### ProjectDetailPage Props
```typescript
interface ProjectDetailPageProps {
  // No props - uses URL parameters via useRoute
}

interface ProjectDetailState {
  fullscreenMode: boolean;
  editFormOpen: boolean;
  profileModalOpen: boolean;
  selectedMember: Resource | null;
  isScrolled: boolean;
}
```

#### ProjectResourceAllocationTable Props
```typescript
interface ProjectResourceAllocationTableProps {
  projectId: number;
  fullscreen?: boolean;
}

interface AllocationTableState {
  weekOffset: number;
  addResourceDialogOpen: boolean;
  isEditingSession: boolean;
  lockedRowOrder: AllocationWithResource[];
  isTableScrolled: boolean;
}
```

#### AllocationInputCell Props
```typescript
interface AllocationInputCellProps {
  allocationId: number;
  resourceId: number;
  weekKey: string;
  currentValue: number;
  isReadOnly?: boolean;
  maxCapacity?: number;
  onValueChange: (value: number) => void;
  onValidationError?: (error: ValidationError) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface AllocationInputCellState {
  inputValue: string;
  isFocused: boolean;
  validationErrors: ValidationError[];
  isUpdating: boolean;
}
```

#### WeekColumn Props
```typescript
interface WeekColumnProps {
  weekKey: string;
  weekNumber: number;
  startDate: Date;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  totalAllocated: number;
  capacity: number;
  conflicts: CapacityConflict[];
}
```

---

## Interaction Patterns

### User Interaction Flows

#### 1. Allocation Editing Flow
```
User clicks allocation cell
    ↓
Cell enters edit mode (input field appears)
    ↓
User types new value
    ↓
Real-time validation occurs
    ↓
If valid: Optimistic update applied
If invalid: Error message shown
    ↓
User presses Enter or clicks away
    ↓
Value is persisted to server
    ↓
If success: Update confirmed
If error: Rollback to previous value
    ↓
Cell exits edit mode
```

#### 2. Full-Screen Mode Toggle Flow
```
User clicks fullscreen button (or presses F11)
    ↓
State change: fullscreenMode = !fullscreenMode
    ↓
Layout transitions:
- Container max-width removed/restored
- Grid layout changes
- Table height adjusts
- Sidebar hidden/shown
    ↓
URL parameter updated (optional)
    ↓
Focus management (maintain current cell focus)
```

#### 3. Resource Addition Flow
```
User clicks "Add Resource" button
    ↓
Add Resource dialog opens
    ↓
User searches/selects resource from dropdown
    ↓
User enters role for this project
    ↓
User clicks "Add Resource"
    ↓
Validation:
- Resource not already assigned
- Valid role provided
    ↓
If valid:
- Create allocation record
- Refresh allocation grid
- Show success message
If invalid:
- Show error message
- Keep dialog open
```

### Keyboard Shortcuts

#### Global Shortcuts
```typescript
const keyboardShortcuts = {
  'F11': 'Toggle fullscreen mode',
  'Escape': 'Exit fullscreen mode / Close modals',
  'Ctrl+S': 'Save all changes',
  'Ctrl+Z': 'Undo last change',
  'Ctrl+Shift+Z': 'Redo last change',
  'Ctrl+F': 'Focus search/filter',
  '?': 'Show keyboard shortcuts help'
};

// Implementation
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Prevent shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'F11':
        event.preventDefault();
        toggleFullscreen();
        break;

      case 'Escape':
        if (fullscreenMode) {
          setFullscreenMode(false);
        } else if (editFormOpen) {
          setEditFormOpen(false);
        }
        break;

      case 's':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          saveAllChanges();
        }
        break;

      case 'z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            redoLastChange();
          } else {
            undoLastChange();
          }
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [fullscreenMode, editFormOpen]);
```

#### Grid Navigation Shortcuts
```typescript
const gridNavigationShortcuts = {
  'Tab': 'Move to next cell',
  'Shift+Tab': 'Move to previous cell',
  'Enter': 'Edit current cell / Confirm edit',
  'Escape': 'Cancel edit',
  'Arrow Keys': 'Navigate between cells',
  'Home': 'Go to first cell in row',
  'End': 'Go to last cell in row',
  'Ctrl+Home': 'Go to first cell in grid',
  'Ctrl+End': 'Go to last cell in grid'
};

// Grid navigation implementation
const useGridNavigation = (
  gridRef: RefObject<HTMLDivElement>,
  allocations: AllocationWithResource[],
  weekColumns: WeekColumn[]
) => {
  const [focusedCell, setFocusedCell] = useState<{
    resourceIndex: number;
    weekIndex: number;
  } | null>(null);

  const handleGridKeyDown = useCallback((event: KeyboardEvent) => {
    if (!focusedCell) return;

    const { resourceIndex, weekIndex } = focusedCell;
    let newResourceIndex = resourceIndex;
    let newWeekIndex = weekIndex;

    switch (event.key) {
      case 'ArrowUp':
        newResourceIndex = Math.max(0, resourceIndex - 1);
        break;

      case 'ArrowDown':
        newResourceIndex = Math.min(allocations.length - 1, resourceIndex + 1);
        break;

      case 'ArrowLeft':
        newWeekIndex = Math.max(0, weekIndex - 1);
        break;

      case 'ArrowRight':
        newWeekIndex = Math.min(weekColumns.length - 1, weekIndex + 1);
        break;

      case 'Home':
        if (event.ctrlKey) {
          newResourceIndex = 0;
          newWeekIndex = 0;
        } else {
          newWeekIndex = 0;
        }
        break;

      case 'End':
        if (event.ctrlKey) {
          newResourceIndex = allocations.length - 1;
          newWeekIndex = weekColumns.length - 1;
        } else {
          newWeekIndex = weekColumns.length - 1;
        }
        break;

      case 'Enter':
        // Enter edit mode for current cell
        enterEditMode(resourceIndex, weekIndex);
        return;

      default:
        return;
    }

    event.preventDefault();
    setFocusedCell({ resourceIndex: newResourceIndex, weekIndex: newWeekIndex });
    focusCell(newResourceIndex, newWeekIndex);
  }, [focusedCell, allocations.length, weekColumns.length]);

  return { focusedCell, setFocusedCell, handleGridKeyDown };
};
```

### Accessibility Considerations

#### ARIA Labels and Roles
```typescript
// Grid accessibility
<div
  role="grid"
  aria-label="Resource allocation table"
  aria-rowcount={allocations.length + 1} // +1 for header
  aria-colcount={weekColumns.length + 2} // +2 for resource and total columns
>
  {/* Header row */}
  <div role="row" aria-rowindex={1}>
    <div role="columnheader" aria-colindex={1}>
      Resource
    </div>
    {weekColumns.map((week, index) => (
      <div
        key={week.weekKey}
        role="columnheader"
        aria-colindex={index + 2}
        aria-label={`Week of ${format(week.startDate, 'MMM d, yyyy')}`}
      >
        {week.weekNumber}
      </div>
    ))}
    <div role="columnheader" aria-colindex={weekColumns.length + 2}>
      Total
    </div>
  </div>

  {/* Data rows */}
  {allocations.map((allocation, rowIndex) => (
    <div
      key={allocation.id}
      role="row"
      aria-rowindex={rowIndex + 2}
      aria-label={`Allocation for ${allocation.resource.name}`}
    >
      <div role="gridcell" aria-colindex={1}>
        {allocation.resource.name}
      </div>

      {weekColumns.map((week, colIndex) => (
        <div
          key={week.weekKey}
          role="gridcell"
          aria-colindex={colIndex + 2}
          aria-label={`${allocation.resource.name} allocation for week ${week.weekNumber}: ${allocation.weeklyAllocations[week.weekKey] || 0} hours`}
        >
          <AllocationInputCell
            allocationId={allocation.id}
            resourceId={allocation.resourceId}
            weekKey={week.weekKey}
            currentValue={allocation.weeklyAllocations[week.weekKey] || 0}
            aria-label={`Edit allocation for ${allocation.resource.name}, week ${week.weekNumber}`}
          />
        </div>
      ))}
    </div>
  ))}
</div>
```

#### Screen Reader Announcements
```typescript
const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Usage examples
const handleAllocationUpdate = (resourceName: string, weekNumber: number, hours: number) => {
  announceToScreenReader(
    `Updated allocation for ${resourceName}, week ${weekNumber} to ${hours} hours`,
    'polite'
  );
};

const handleValidationError = (error: string) => {
  announceToScreenReader(
    `Validation error: ${error}`,
    'assertive'
  );
};
```

#### Focus Management
```typescript
const useFocusManagement = () => {
  const [focusHistory, setFocusHistory] = useState<HTMLElement[]>([]);

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      setFocusHistory(prev => [...prev, activeElement]);
    }
  }, []);

  const restoreFocus = useCallback(() => {
    const lastFocused = focusHistory[focusHistory.length - 1];
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
      setFocusHistory(prev => prev.slice(0, -1));
    }
  }, [focusHistory]);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return { saveFocus, restoreFocus, trapFocus };
};
```

---

## Developer Implementation Guide

### Step-by-Step Implementation

#### Phase 1: Project Setup and Basic Structure

**Step 1: Initialize Project Structure**
```bash
# Create project structure
mkdir project-detail-implementation
cd project-detail-implementation

# Initialize package.json
npm init -y

# Install core dependencies
npm install react react-dom typescript
npm install @types/react @types/react-dom @types/node
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install date-fns
npm install lucide-react

# Install form handling
npm install react-hook-form @hookform/resolvers zod

# Install UI components (choose one)
# Option A: shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label tabs tooltip dialog

# Option B: Radix UI (manual setup)
npm install @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-tooltip
```

**Step 2: Setup Tailwind Configuration**
```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        // ... other color definitions
      },
      animation: {
        "slide-in-from-bottom": "slide-in-from-bottom 0.4s ease-out forwards",
      },
      keyframes: {
        "slide-in-from-bottom": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px) scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Step 3: Create Base CSS with Design System**
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(240, 10%, 3.9%);
  --primary: hsl(221, 83%, 53%);
  --primary-foreground: hsl(210, 40%, 98%);
  --radius: 0.625rem;
  /* ... other CSS variables */
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
}

@layer components {
  .card-base {
    @apply bg-white rounded-xl shadow-sm border border-gray-200/50;
    @apply transition-all duration-300 ease-out;
  }

  .allocation-input {
    @apply w-16 h-8 text-center text-sm;
    @apply border-gray-200 focus:border-blue-500;
    @apply rounded-md transition-all duration-200;
  }
}
```

#### Phase 2: Data Layer Implementation

**Step 4: Define Data Models**
```typescript
// src/types/project.ts
export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'business' | 'technical' | 'compliance' | 'research';

  // Leadership
  directorId?: number;
  changeLeadId?: number;
  businessLeadId?: number;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

export interface Resource {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  weeklyCapacity: string; // Decimal string
  isActive: boolean;
  isDeleted: boolean;
  profileImage?: string;
  createdAt: Date;
}

export interface ResourceAllocation {
  id: number;
  projectId: number;
  resourceId: number;
  allocatedHours: string;
  startDate: Date;
  endDate: Date;
  role?: string;
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  weeklyAllocations: Record<string, number>;
  createdAt: Date;
  updatedAt?: Date;
}

// Composite types
export interface AllocationWithResource extends ResourceAllocation {
  resource: Resource;
}

export interface ProjectWithAllocations extends Project {
  allocations: ResourceAllocation[];
  resources: Resource[];
}
```

**Step 5: Create Data Access Layer**
```typescript
// src/lib/api.ts
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Project-specific API functions
export const projectApi = {
  getProject: (id: number): Promise<ProjectWithAllocations> =>
    apiRequest(`/projects/${id}?includeAllocations=true`),

  updateProject: (id: number, data: Partial<Project>): Promise<Project> =>
    apiRequest(`/projects/${id}`, { method: 'PUT', body: data }),

  deleteProject: (id: number): Promise<void> =>
    apiRequest(`/projects/${id}`, { method: 'DELETE' }),
};

export const allocationApi = {
  getProjectAllocations: (projectId: number): Promise<AllocationWithResource[]> =>
    apiRequest(`/projects/${projectId}/allocations`),

  updateWeeklyAllocation: (
    allocationId: number,
    weekKey: string,
    hours: number
  ): Promise<ResourceAllocation> =>
    apiRequest(`/allocations/${allocationId}/weekly`, {
      method: 'PATCH',
      body: { weekKey, hours }
    }),

  createAllocation: (data: Omit<ResourceAllocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResourceAllocation> =>
    apiRequest('/allocations', { method: 'POST', body: data }),
};
```

#### Phase 3: Core Components Implementation

**Step 6: Create Utility Functions**
```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfWeek, addWeeks } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export function getWeekKey(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function generateWeekColumns(offset: number, count: number): WeekColumn[] {
  const startDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), offset);
  const columns: WeekColumn[] = [];

  for (let i = 0; i < count; i++) {
    const weekStart = addWeeks(startDate, i);
    columns.push({
      weekKey: getWeekKey(weekStart),
      weekNumber: getWeek(weekStart),
      startDate: weekStart,
      endDate: addDays(weekStart, 6),
      isCurrentWeek: isSameWeek(weekStart, new Date(), { weekStartsOn: 1 }),
      isPastWeek: isBefore(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })),
      isFutureWeek: isAfter(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))
    });
  }

  return columns;
}

// Calculation utilities
export class AllocationCalculator {
  static readonly DEFAULT_NON_PROJECT_HOURS = 8;

  static calculateEffectiveCapacity(
    totalCapacity: number,
    nonProjectHours: number = this.DEFAULT_NON_PROJECT_HOURS
  ): number {
    return Math.max(0, totalCapacity - nonProjectHours);
  }

  static calculateUtilization(
    allocatedHours: number,
    effectiveCapacity: number
  ): number {
    if (effectiveCapacity <= 0) return 0;
    return Math.round((allocatedHours / effectiveCapacity) * 100 * 10) / 10;
  }

  static calculateWeeklyTotal(
    allocations: ResourceAllocation[],
    resourceId: number,
    weekKey: string
  ): number {
    return allocations
      .filter(a => a.resourceId === resourceId)
      .reduce((total, allocation) => {
        return total + (allocation.weeklyAllocations[weekKey] || 0);
      }, 0);
  }
}
```

**Step 7: Create Base Components**
```typescript
// src/components/ui/allocation-input-cell.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface AllocationInputCellProps {
  allocationId: number;
  resourceId: number;
  weekKey: string;
  currentValue: number;
  maxCapacity?: number;
  isReadOnly?: boolean;
  onValueChange: (value: number) => void;
  onValidationError?: (error: ValidationError) => void;
  className?: string;
}

interface ValidationError {
  type: 'capacity' | 'format' | 'range';
  message: string;
  severity: 'warning' | 'error';
}

export function AllocationInputCell({
  allocationId,
  resourceId,
  weekKey,
  currentValue,
  maxCapacity,
  isReadOnly = false,
  onValueChange,
  onValidationError,
  className
}: AllocationInputCellProps) {
  const [inputValue, setInputValue] = useState(currentValue.toString());
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentValue.toString());
    }
  }, [currentValue, isFocused]);

  const validateInput = useCallback((value: string): ValidationError | null => {
    // Format validation
    if (!/^\d*\.?\d*$/.test(value)) {
      return {
        type: 'format',
        message: 'Please enter a valid number',
        severity: 'error'
      };
    }

    const numValue = parseFloat(value);

    // Range validation
    if (numValue < 0) {
      return {
        type: 'range',
        message: 'Hours cannot be negative',
        severity: 'error'
      };
    }

    if (numValue > 168) {
      return {
        type: 'range',
        message: 'Cannot exceed 168 hours per week',
        severity: 'error'
      };
    }

    // Capacity validation
    if (maxCapacity && numValue > maxCapacity) {
      return {
        type: 'capacity',
        message: `Exceeds capacity (${maxCapacity}h)`,
        severity: 'warning'
      };
    }

    return null;
  }, [maxCapacity]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const error = validateInput(value);
    setValidationError(error);

    if (error) {
      onValidationError?.(error);
    }
  }, [validateInput, onValidationError]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    const error = validateInput(inputValue);
    if (!error && inputValue !== currentValue.toString()) {
      const numValue = parseFloat(inputValue) || 0;
      onValueChange(numValue);
    } else if (error?.severity === 'error') {
      // Reset to previous value on error
      setInputValue(currentValue.toString());
      setValidationError(null);
    }
  }, [inputValue, currentValue, validateInput, onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputValue(currentValue.toString());
      setValidationError(null);
      e.currentTarget.blur();
    }
  }, [currentValue]);

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        readOnly={isReadOnly}
        className={cn(
          "allocation-input",
          validationError?.severity === 'error' && "border-red-300 bg-red-50",
          validationError?.severity === 'warning' && "border-yellow-300 bg-yellow-50",
          className
        )}
        aria-label={`Allocation for week ${weekKey}`}
      />

      {validationError && (
        <div
          className={cn(
            "absolute top-full left-0 z-10 mt-1 px-2 py-1 text-xs rounded shadow-lg",
            validationError.severity === 'error'
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-yellow-100 text-yellow-700 border border-yellow-200"
          )}
        >
          {validationError.message}
        </div>
      )}
    </div>
  );
}
```

#### Phase 4: Main Components Implementation

**Step 8: Create Project Detail Page**
```typescript
// src/components/project-detail-page.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // or your routing library
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Building, Edit, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { ProjectResourceAllocationTable } from './project-resource-allocation-table';
import { ProjectTimeline } from './project-timeline';
import { projectApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ProjectWithAllocations } from '@/types/project';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0');

  // State management
  const [project, setProject] = useState<ProjectWithAllocations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        const projectData = await projectApi.getProject(projectId);
        setProject(projectData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Scroll detection for sticky navigation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        setFullscreenMode(prev => !prev);
      } else if (event.key === 'Escape' && fullscreenMode) {
        setFullscreenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenMode]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (error || !project) {
    return <div className="text-red-600">Error loading project: {error?.message}</div>;
  }

  return (
    <TooltipProvider>
      <main className={fullscreenMode ? "p-4 md:p-6" : "p-4 md:p-6 max-w-7xl mx-auto"}>
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">Project Details & Resource Allocation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenMode(!fullscreenMode)}
                >
                  {fullscreenMode ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {fullscreenMode ? "Exit fullscreen mode" : "Enter fullscreen mode"}
              </TooltipContent>
            </Tooltip>

            <Button variant="outline" onClick={() => setEditFormOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Sticky Navigation Bar */}
        <div className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "translate-y-0 opacity-100 shadow-lg bg-white/95 backdrop-blur-sm border-b border-gray-200"
            : "-translate-y-full opacity-0"
        )}>
          <div className={cn(
            fullscreenMode ? "px-4 md:px-6" : "px-4 md:px-6 max-w-7xl mx-auto",
            "py-3"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h2>
                  <p className="text-xs text-gray-500">Project Details</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenMode(!fullscreenMode)}
                >
                  {fullscreenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditFormOpen(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {fullscreenMode ? (
          // Fullscreen mode: Resource allocation takes full width
          <div className="space-y-6">
            <Tabs defaultValue="allocations" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
                <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              </TabsList>

              <TabsContent value="allocations" className="space-y-4">
                <ProjectResourceAllocationTable projectId={projectId} fullscreen={true} />
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <ProjectTimeline projectId={projectId} fullscreen={true} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Normal mode: Grid layout with sidebar
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="xl:col-span-3 space-y-6">
              {/* Project Overview */}
              <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building className="h-6 w-6 text-blue-600" />
                    Project Overview
                  </CardTitle>
                  <p className="text-gray-600 text-sm">Comprehensive project description and objectives</p>
                </CardHeader>
                <CardContent>
                  {project.description ? (
                    <div className="prose prose-gray max-w-none">
                      <div className="bg-white/60 rounded-lg p-6 border border-blue-100">
                        <p className="text-gray-700 leading-relaxed">{project.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No project description available.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setEditFormOpen(true)}>
                        Add Description
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resource Allocation Management */}
              <Tabs defaultValue="allocations" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                </TabsList>

                <TabsContent value="allocations" className="space-y-4">
                  <ProjectResourceAllocationTable projectId={projectId} fullscreen={false} />
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <ProjectTimeline projectId={projectId} fullscreen={false} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project metrics, team info, etc. */}
              <Card className="card-base">
                <CardHeader>
                  <CardTitle>Project Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Resources</span>
                      <span className="font-medium">{project.resources?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Hours</span>
                      <span className="font-medium">{project.totalAllocatedHours || 0}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}
```

### Testing Strategies

#### Unit Testing
```typescript
// src/components/__tests__/allocation-input-cell.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllocationInputCell } from '../ui/allocation-input-cell';

describe('AllocationInputCell', () => {
  const defaultProps = {
    allocationId: 1,
    resourceId: 1,
    weekKey: '2024-01-01',
    currentValue: 20,
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with current value', () => {
    render(<AllocationInputCell {...defaultProps} />);

    const input = screen.getByDisplayValue('20');
    expect(input).toBeInTheDocument();
  });

  it('should validate input format', async () => {
    const onValidationError = jest.fn();
    render(
      <AllocationInputCell
        {...defaultProps}
        onValidationError={onValidationError}
      />
    );

    const input = screen.getByDisplayValue('20');
    fireEvent.change(input, { target: { value: 'invalid' } });

    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalledWith({
        type: 'format',
        message: 'Please enter a valid number',
        severity: 'error'
      });
    });
  });

  it('should call onValueChange when valid value is entered', async () => {
    const onValueChange = jest.fn();
    render(
      <AllocationInputCell
        {...defaultProps}
        onValueChange={onValueChange}
      />
    );

    const input = screen.getByDisplayValue('20');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(25);
    });
  });

  it('should handle capacity validation', async () => {
    const onValidationError = jest.fn();
    render(
      <AllocationInputCell
        {...defaultProps}
        maxCapacity={30}
        onValidationError={onValidationError}
      />
    );

    const input = screen.getByDisplayValue('20');
    fireEvent.change(input, { target: { value: '35' } });

    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalledWith({
        type: 'capacity',
        message: 'Exceeds capacity (30h)',
        severity: 'warning'
      });
    });
  });
});
```

#### Integration Testing
```typescript
// src/components/__tests__/project-detail-page.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectDetailPage } from '../project-detail-page';
import { projectApi, allocationApi } from '@/lib/api';

// Mock API calls
jest.mock('@/lib/api');
const mockProjectApi = projectApi as jest.Mocked<typeof projectApi>;
const mockAllocationApi = allocationApi as jest.Mocked<typeof allocationApi>;

describe('ProjectDetailPage Integration', () => {
  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'Test Description',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    status: 'active' as const,
    priority: 'medium' as const,
    type: 'business' as const,
    allocations: [],
    resources: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockProjectApi.getProject.mockResolvedValue(mockProject);
    mockAllocationApi.getProjectAllocations.mockResolvedValue([]);
  });

  it('should load and display project data', async () => {
    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('should toggle fullscreen mode', async () => {
    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
    fireEvent.click(fullscreenButton);

    // Check that layout has changed
    const mainElement = screen.getByRole('main');
    expect(mainElement).not.toHaveClass('max-w-7xl');
  });

  it('should handle allocation updates', async () => {
    const mockAllocation = {
      id: 1,
      projectId: 1,
      resourceId: 1,
      allocatedHours: '20',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'active' as const,
      weeklyAllocations: { '2024-01-01': 20 },
      createdAt: new Date(),
      resource: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Developer',
        department: 'Engineering',
        weeklyCapacity: '40',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      }
    };

    mockAllocationApi.getProjectAllocations.mockResolvedValue([mockAllocation]);
    mockAllocationApi.updateWeeklyAllocation.mockResolvedValue({
      ...mockAllocation,
      weeklyAllocations: { '2024-01-01': 25 }
    });

    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('20');
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockAllocationApi.updateWeeklyAllocation).toHaveBeenCalledWith(
        1, '2024-01-01', 25
      );
    });
  });
});
```

### Alternative Implementation Suggestions

#### For Different React Boilerplates

**Next.js Implementation**
```typescript
// pages/projects/[id].tsx
import { GetServerSideProps } from 'next';
import { ProjectDetailPage } from '@/components/project-detail-page';
import { projectApi } from '@/lib/api';

export default function ProjectDetailPageRoute({ project }: { project: ProjectWithAllocations }) {
  return <ProjectDetailPage initialProject={project} />;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const projectId = parseInt(params?.id as string);

  try {
    const project = await projectApi.getProject(projectId);
    return { props: { project } };
  } catch (error) {
    return { notFound: true };
  }
};
```

**Vite + React Router Implementation**
```typescript
// src/routes/project-detail.tsx
import { useParams } from 'react-router-dom';
import { ProjectDetailPage } from '@/components/project-detail-page';

export function ProjectDetailRoute() {
  return <ProjectDetailPage />;
}

// src/main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/projects/:id',
    element: <ProjectDetailRoute />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

**Create React App Implementation**
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectDetailPage } from './components/project-detail-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

This comprehensive implementation guide provides all the necessary details for recreating the Project Detail page functionality with identical user experience and technical capabilities. The modular approach allows for easy adaptation to different React setups and database systems.