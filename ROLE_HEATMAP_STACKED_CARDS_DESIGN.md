# Role Heatmap Stacked Cards Design Specification

## Current Status: DEFERRED ⏸️
**Reason**: Analysis shows all 17 roles currently have only 1 resource each. Stacked card UI is not needed at this time.

## Future Implementation Trigger
Implement stacked cards when:
- Any role has 2+ resources
- Organization grows and role consolidation occurs
- User feedback requests individual resource visibility within roles

## Design Specification

### 1. Visual Design Approach

#### Option A: Layered Card Stack
```
┌─────────────────────────┐
│ Role Summary Card       │ ← Top card shows aggregated metrics
│ ┌─────────────────────┐ │
│ │ Individual Resource │ │ ← Stacked cards underneath
│ │ ┌─────────────────┐ │ │
│ │ │ Resource 2      │ │ │
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### Option B: Expandable Accordion
```
┌─────────────────────────┐
│ Role Summary [▼]        │ ← Click to expand
├─────────────────────────┤
│ ├ Resource 1 (32h/32h)  │ ← Individual resource rows
│ ├ Resource 2 (28h/32h)  │
│ └ Resource 3 (30h/32h)  │
└─────────────────────────┘
```

#### Option C: Carousel Navigation
```
┌─────────────────────────┐
│ [◀] Resource 1/3 [▶]    │ ← Navigation controls
│ John Doe - Product Owner│
│ 32h/32h (100%)         │
│ ████████████████████   │
└─────────────────────────┘
```

### 2. Technical Implementation

#### Component Structure
```typescript
interface RoleClusterCard {
  role: string;
  resources: Resource[];
  aggregateMetrics: {
    totalCapacity: number;
    totalAllocated: number;
    averageUtilization: number;
    status: 'healthy' | 'near-full' | 'overloaded' | 'gap';
  };
  displayMode: 'summary' | 'individual' | 'stacked';
}

interface StackedCardProps {
  cluster: RoleCluster;
  viewMode: 'summary' | 'expanded';
  onToggle: () => void;
  onResourceSelect: (resourceId: number) => void;
}
```

#### State Management
```typescript
const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
const [selectedResources, setSelectedResources] = useState<Map<string, number>>(new Map());
```

### 3. UX Interaction Patterns

#### Summary View (Default)
- Show aggregated role metrics
- Visual indicator when role has multiple resources (e.g., "3 resources" badge)
- Click/tap to expand individual resources

#### Expanded View
- Show individual resource cards within role group
- Maintain visual hierarchy (role header + resource cards)
- Easy collapse back to summary

#### Navigation
- Touch-friendly controls for mobile
- Keyboard navigation support
- Clear visual feedback for interactions

### 4. Responsive Design

#### Desktop (>1024px)
- Side-by-side resource cards within role group
- Hover states for individual resources
- Tooltip details on hover

#### Tablet (768px-1024px)
- Stacked resource cards with spacing
- Touch-friendly expand/collapse
- Swipe gestures for navigation

#### Mobile (<768px)
- Single column layout
- Full-width resource cards
- Bottom sheet or modal for details

### 5. Performance Considerations

#### Virtualization
- For roles with many resources (>10), implement virtual scrolling
- Lazy load individual resource details
- Efficient re-rendering with React.memo

#### Animation
- Smooth expand/collapse transitions
- Stagger animations for multiple cards
- Respect prefers-reduced-motion

### 6. Accessibility

#### ARIA Support
```typescript
<div 
  role="group" 
  aria-labelledby={`role-${role}`}
  aria-expanded={isExpanded}
>
  <button
    id={`role-${role}`}
    aria-controls={`resources-${role}`}
    onClick={handleToggle}
  >
    {role} ({resources.length} resources)
  </button>
  <div id={`resources-${role}`} aria-hidden={!isExpanded}>
    {/* Individual resource cards */}
  </div>
</div>
```

#### Keyboard Navigation
- Tab through role groups
- Enter/Space to expand/collapse
- Arrow keys to navigate between resources
- Escape to collapse expanded view

### 7. Implementation Priority

#### Phase 1: Foundation
1. Detect multi-resource roles
2. Add expand/collapse state management
3. Basic accordion-style expansion

#### Phase 2: Enhanced UX
1. Smooth animations
2. Individual resource cards
3. Navigation controls

#### Phase 3: Advanced Features
1. Drag-and-drop resource reordering
2. Resource comparison views
3. Bulk actions on resources

### 8. Alternative Enhancements (Current Priority)

Since stacked cards are deferred, focus on these improvements:

#### Enhanced Individual Cards
- Richer resource details in tooltips
- Click-to-expand for detailed metrics
- Better visual hierarchy

#### Improved Interactions
- Hover states with capacity breakdown
- Click for resource-specific actions
- Better mobile touch targets

#### Data Visualization
- Mini charts within cards
- Trend indicators
- Status icons and colors

## Implementation Notes

- Keep current single-card design as default
- Build stacking as progressive enhancement
- Ensure backward compatibility
- Test with mock multi-resource data
- Consider A/B testing different approaches

## Future Considerations

- Integration with resource management workflows
- Bulk editing capabilities
- Resource comparison features
- Advanced filtering and sorting within roles
