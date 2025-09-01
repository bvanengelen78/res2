# ResourceFlow Design System Documentation

## Table of Contents
1. [Color System & Theme](#color-system--theme)
2. [Typography System](#typography-system)
3. [Spacing & Layout System](#spacing--layout-system)
4. [Component Design Patterns](#component-design-patterns)
5. [Animation & Transitions](#animation--transitions)
6. [Responsive Design Specifications](#responsive-design-specifications)
7. [Accessibility Standards](#accessibility-standards)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Color System & Theme

### Primary Color Palette

#### Core Theme Variables (HSL Format)
```css
:root {
  /* Base Colors */
  --background: hsl(0, 0%, 100%);           /* Pure white */
  --foreground: hsl(240, 10%, 3.9%);       /* Near black text */
  --muted: hsl(0, 0%, 96.1%);              /* Light gray backgrounds */
  --muted-foreground: hsl(0, 0%, 45.1%);   /* Muted text */
  
  /* Primary Blue Theme */
  --primary: hsl(221, 83%, 53%);            /* #3b82f6 - Primary blue */
  --primary-foreground: hsl(210, 40%, 98%); /* White text on blue */
  --secondary: hsl(210, 40%, 96%);          /* Light blue/gray */
  --secondary-foreground: hsl(222, 84%, 4.9%);
  
  /* Interactive Elements */
  --border: hsl(240, 5.9%, 90%);           /* Border color */
  --input: hsl(240, 5.9%, 90%);            /* Input border */
  --ring: hsl(221, 83%, 53%);              /* Focus ring */
  --radius: 0.5rem;                        /* 8px border radius */
}
```

#### Blue Dashboard Theme (OKLCH Format)
```css
.dashboard-blue-theme {
  --radius: 0.625rem;                      /* 10px border radius */
  --background: oklch(1 0 0);              /* Pure white */
  --foreground: oklch(0.13 0.028 261.692); /* Dark blue-gray */
  --primary: oklch(0.21 0.034 264.665);    /* Deep blue */
  --primary-foreground: oklch(0.985 0.002 247.839); /* Near white */
  
  /* Chart Colors */
  --chart-1: oklch(0.646 0.222 41.116);    /* Orange */
  --chart-2: oklch(0.6 0.118 184.704);     /* Teal */
  --chart-3: oklch(0.398 0.07 227.392);    /* Blue */
  --chart-4: oklch(0.828 0.189 84.429);    /* Yellow */
  --chart-5: oklch(0.769 0.188 70.08);     /* Green */
}
```

### Semantic Color System

#### Status Colors
```css
:root {
  /* Success States */
  --success: hsl(142, 76%, 36%);           /* #16a34a - Green */
  --success-foreground: hsl(355, 7%, 97%);
  
  /* Warning States */
  --warning: hsl(38, 92%, 50%);            /* #f59e0b - Orange */
  --warning-foreground: hsl(48, 96%, 89%);
  
  /* Error/Destructive States */
  --destructive: hsl(0, 84%, 60%);         /* #ef4444 - Red */
  --destructive-foreground: hsl(210, 40%, 98%);
  
  /* Info States */
  --info: hsl(221, 83%, 53%);              /* Primary blue */
  --info-foreground: hsl(210, 40%, 98%);
}
```

#### Utilization Status Colors
```typescript
const UTILIZATION_STATUS_STYLES = {
  'under-utilized': {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  'optimal': {
    color: 'bg-green-100 text-green-700 border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200'
  },
  'near-capacity': {
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200'
  },
  'over-allocated': {
    color: 'bg-red-100 text-red-700 border-red-200',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200'
  },
  'critical': {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200'
  }
};
```

### Brand Gradient System

#### Primary Brand Gradients
```typescript
export const brand = {
  // Core gradients
  gradient: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-600",
  gradientText: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-600 bg-clip-text text-transparent",
  
  // Enhanced variants
  enhancedGradientText: "bg-gradient-to-r from-sky-400 via-indigo-500 via-purple-500 to-violet-600 bg-clip-text text-transparent",
  hoverGradient: "hover:bg-gradient-to-r hover:from-sky-500 hover:via-indigo-600 hover:to-violet-700",
  
  // Icon styling
  iconGradient: "bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600",
  iconShadow: "shadow-lg shadow-indigo-500/25",
  
  // Theme color for PWA
  themeColor: "#6366f1" // Indigo-500
};
```

### Role-Based Color Coding
```typescript
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

---

## Typography System

### Font Family Specification
```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  @apply antialiased;
}
```

### Type Scale (Tailwind CSS)
```css
/* Typography Scale */
.text-xs    { font-size: 0.75rem;   line-height: 1rem; }    /* 12px */
.text-sm    { font-size: 0.875rem;  line-height: 1.25rem; } /* 14px */
.text-base  { font-size: 1rem;      line-height: 1.5rem; }  /* 16px */
.text-lg    { font-size: 1.125rem;  line-height: 1.75rem; } /* 18px */
.text-xl    { font-size: 1.25rem;   line-height: 1.75rem; } /* 20px */
.text-2xl   { font-size: 1.5rem;    line-height: 2rem; }    /* 24px */
.text-3xl   { font-size: 1.875rem;  line-height: 2.25rem; } /* 30px */
```

### Font Weights
```css
.font-normal    { font-weight: 400; }
.font-medium    { font-weight: 500; }
.font-semibold  { font-weight: 600; }
.font-bold      { font-weight: 700; }
```

### Component-Specific Typography
```css
/* Page Titles */
.page-title {
  @apply text-2xl font-bold text-gray-900;
}

/* Section Headers */
.section-title {
  @apply text-xl font-semibold text-gray-800;
}

/* Card Titles */
.card-title {
  @apply text-lg font-medium text-gray-900;
}

/* Body Text */
.body-text {
  @apply text-sm text-gray-600;
}

/* Caption Text */
.caption-text {
  @apply text-xs text-gray-500;
}

/* Sidebar Text */
.sidebar-text {
  @apply text-white font-bold drop-shadow-sm;
}
```

### Line Height Standards
- **Tight**: `leading-tight` (1.25)
- **Normal**: `leading-normal` (1.5)
- **Relaxed**: `leading-relaxed` (1.625)
- **Loose**: `leading-loose` (2)

---

## Spacing & Layout System

### Spacing Scale (Tailwind-based)
```css
/* Base spacing units */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Component Spacing Patterns
```css
/* Standard card padding */
.card-padding {
  @apply p-6;           /* 24px all sides */
}

/* Section vertical spacing */
.section-spacing {
  @apply space-y-6;     /* 24px vertical spacing */
}

/* Grid gaps */
.grid-gap {
  @apply gap-6;         /* 24px grid gap */
}

/* Page margins */
.page-margins {
  @apply px-4 sm:px-6 lg:px-8;
}
```

### Container Constraints
```css
/* Page containers */
.page-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.content-container {
  @apply max-w-5xl mx-auto;
}

/* Fullscreen mode */
.fullscreen-container {
  @apply p-4 md:p-6;
  /* Remove max-width constraint */
}

.standard-container {
  @apply p-4 md:p-6 max-w-7xl mx-auto;
}
```

### Grid Systems
```css
/* Responsive grid patterns */
.dashboard-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

.kpi-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-4;
}

.project-grid {
  @apply grid gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
}
```

---

## Component Design Patterns

### Card Components

#### Base Card Styles
```css
.card-base {
  @apply bg-white rounded-xl shadow-sm border border-gray-200/50;
  @apply transition-all duration-300 ease-out;
}

.card-hover {
  @apply hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1;
}

.card-interactive {
  @apply cursor-pointer;
  @apply hover:bg-white hover:border-blue-300/50;
}
```

#### Card Variants
```css
/* Gradient Card */
.card-gradient {
  @apply bg-gradient-to-br from-white to-blue-50/30;
  @apply border-0 shadow-sm;
}

/* Enhanced Card with Backdrop */
.card-enhanced {
  @apply bg-white/95 backdrop-blur-sm;
  @apply border-blue-200/50 shadow-lg shadow-gray-200/50;
}

/* Glass Card Effect */
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-card-blue {
  background: rgba(239, 246, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
}
```

### Button System

#### Button Variants (Class Variance Authority)
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    }
  }
);
```

### Input and Form Components

#### Input Styling
```css
.input-base {
  @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base;
  @apply ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium;
  @apply placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2;
  @apply focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
}

/* Allocation-specific input */
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

### Badge Components
```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    }
  }
);
```

### Modal and Dialog Styling
```css
/* Dialog Overlay */
.dialog-overlay {
  @apply fixed inset-0 z-50 bg-black/80;
  @apply data-[state=open]:animate-in data-[state=closed]:animate-out;
  @apply data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0;
}

/* Dialog Content */
.dialog-content {
  @apply fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg;
  @apply translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6;
  @apply shadow-lg duration-200 sm:rounded-lg;
  @apply data-[state=open]:animate-in data-[state=closed]:animate-out;
  @apply data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0;
  @apply data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}
```

---

## Animation & Transitions

### Standard Transition Timing
```css
/* Base transition classes */
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

/* Performance-optimized transitions */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform, opacity;
  backface-visibility: hidden;
}
```

### Entrance Animations

#### Dashboard Entrance Animation
```css
@keyframes dashboard-entrance {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dashboard-entrance {
  animation: dashboard-entrance var(--animation-duration) ease-out forwards;
  opacity: 0;
  transform: translateY(8px) scale(0.99);
}
```

#### KPI Card Entrance
```css
@keyframes kpi-card-entrance {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.kpi-card-entrance {
  animation: kpi-card-entrance var(--animation-duration) ease-out forwards;
}
```

#### Staggered Animation System
```css
/* CSS Custom Properties for Dynamic Timing */
:root {
  --animation-duration: 400ms;
  --stagger-delay: 100ms;
}

/* Stagger delays */
.stagger-delay-0 { animation-delay: 0ms; }
.stagger-delay-1 { animation-delay: 100ms; }
.stagger-delay-2 { animation-delay: 200ms; }
.stagger-delay-3 { animation-delay: 300ms; }
.stagger-delay-4 { animation-delay: 400ms; }

/* Dynamic stagger timing */
.dashboard-entrance-header {
  animation-delay: 0ms;
}

.dashboard-entrance-kpis {
  animation-delay: var(--stagger-delay);
}

.dashboard-entrance-alerts {
  animation-delay: calc(var(--stagger-delay) * 3);
}
```

### Hover Effects and Micro-interactions

#### Card Hover Effects
```css
.card-hover-lift {
  @apply hover:-translate-y-1 hover:shadow-lg;
  @apply transition-all duration-300 ease-out;
}

.card-hover-scale {
  @apply hover:scale-[1.02];
  @apply transition-transform duration-200 ease-out;
}

.card-hover-glow {
  @apply hover:shadow-xl hover:shadow-blue-500/10;
  @apply transition-shadow duration-300 ease-out;
}
```

#### Button Hover Effects
```css
.button-hover-lift {
  @apply hover:-translate-y-0.5;
  @apply transition-transform duration-150 ease-out;
}

.button-hover-scale {
  @apply hover:scale-105 active:scale-95;
  @apply transition-transform duration-150 ease-out;
}
```

### Loading States and Skeleton Patterns

#### Shimmer Animation
```css
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: shimmer 2s infinite;
}
```

#### Enhanced Pulse Animation
```css
@keyframes enhanced-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-enhanced-pulse {
  animation: enhanced-pulse 2s ease-in-out infinite;
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  .animate-shimmer,
  .animate-enhanced-pulse,
  .dashboard-entrance,
  .kpi-card-entrance,
  .card-hover-lift,
  .card-hover-scale,
  .button-hover-lift,
  .button-hover-scale {
    animation: none !important;
    transition: none !important;
  }

  /* Maintain functionality without animation */
  .dashboard-entrance {
    opacity: 1;
    transform: none;
  }
}
```

---

## Responsive Design Specifications

### Breakpoint System (Tailwind CSS)
```css
/* Mobile First Breakpoints */
/* sm: 640px and up */
@media (min-width: 640px) { /* Small tablets */ }

/* md: 768px and up */
@media (min-width: 768px) { /* Tablets */ }

/* lg: 1024px and up */
@media (min-width: 1024px) { /* Small desktops */ }

/* xl: 1280px and up */
@media (min-width: 1280px) { /* Large desktops */ }

/* 2xl: 1536px and up */
@media (min-width: 1536px) { /* Extra large screens */ }
```

### Component Responsive Behavior

#### Grid Responsive Patterns
```css
/* Dashboard Grid */
.dashboard-grid {
  @apply grid gap-4 sm:gap-6;
  @apply grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

/* KPI Cards Grid */
.kpi-grid {
  @apply grid gap-4 sm:gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-4;
}

/* Project Cards Grid */
.project-grid {
  @apply grid gap-4 sm:gap-6;
  @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
}
```

#### Typography Responsive Scaling
```css
/* Responsive text sizing */
.responsive-title {
  @apply text-xl sm:text-2xl lg:text-3xl;
}

.responsive-subtitle {
  @apply text-lg sm:text-xl lg:text-2xl;
}

.responsive-body {
  @apply text-sm sm:text-base;
}
```

### Touch-Friendly Interaction Patterns

#### Minimum Touch Target Sizes
```css
/* Minimum 44px touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Button touch targets */
.button-touch {
  @apply h-10 sm:h-9; /* Larger on mobile */
  @apply px-4 sm:px-3;
}

/* Input touch targets */
.input-touch {
  @apply h-12 sm:h-10; /* Larger on mobile */
}
```

#### Mobile-Specific Interactions
```css
/* Mobile-friendly hover states */
@media (hover: hover) {
  .hover-desktop:hover {
    @apply shadow-lg transform -translate-y-1;
  }
}

/* Touch-friendly spacing */
.mobile-spacing {
  @apply space-y-4 sm:space-y-6;
}

.mobile-padding {
  @apply p-4 sm:p-6;
}
```

---

## Accessibility Standards

### ARIA Label Patterns

#### Grid and Table Accessibility
```typescript
// Resource allocation grid
<div
  role="grid"
  aria-label="Resource allocation table"
  aria-rowcount={allocations.length + 1}
  aria-colcount={weekColumns.length + 2}
>
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
        Week {week.weekNumber}
      </div>
    ))}
  </div>
</div>
```

#### Interactive Element Labels
```typescript
// Button accessibility
<Button
  aria-label="Toggle fullscreen mode"
  aria-pressed={fullscreenMode}
>
  {fullscreenMode ? <Minimize2 /> : <Maximize2 />}
</Button>

// Input accessibility
<Input
  aria-label={`Edit allocation for ${resourceName}, week ${weekNumber}`}
  aria-describedby={`${resourceId}-${weekKey}-error`}
  aria-invalid={hasError}
/>
```

### Focus Management Specifications

#### Focus Visible Styling
```css
/* Focus ring styling */
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2;
  @apply focus-visible:ring-ring focus-visible:ring-offset-2;
}

/* Custom focus styles */
.focus-blue {
  @apply focus-visible:ring-blue-500;
}

.focus-destructive {
  @apply focus-visible:ring-destructive;
}
```

### Color Contrast Requirements

#### WCAG AA Compliance
```css
/* Ensure minimum 4.5:1 contrast ratio for normal text */
.text-contrast-normal {
  color: hsl(240, 10%, 3.9%); /* #0f172a on white background */
}

/* Ensure minimum 3:1 contrast ratio for large text */
.text-contrast-large {
  color: hsl(240, 5%, 26%); /* #475569 on white background */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .text-muted {
    @apply text-foreground;
  }

  .border-subtle {
    @apply border-foreground;
  }
}
```

### Screen Reader Considerations

#### Screen Reader Only Content
```css
/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Implementation Guidelines

### Tailwind CSS Class Patterns

#### Utility Class Composition
```typescript
import { cn } from "@/lib/utils";

// Utility function for class merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage example
const cardClasses = cn(
  "bg-white rounded-xl shadow-sm border border-gray-200/50",
  "transition-all duration-300 ease-out",
  "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1",
  isActive && "border-blue-300/50 bg-blue-50/30",
  className
);
```

#### Component Composition Patterns
```typescript
// Card component with variants
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'enhanced' | 'glass';
  hover?: boolean;
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "rounded-xl border bg-card text-card-foreground shadow-sm",
          "transition-all duration-300 ease-out",

          // Variant styles
          variant === 'gradient' && "bg-gradient-to-br from-white to-blue-50/30 border-0",
          variant === 'enhanced' && "bg-white/95 backdrop-blur-sm border-blue-200/50 shadow-lg",
          variant === 'glass' && "bg-white/80 backdrop-blur-sm border-white/20",

          // Interactive styles
          hover && "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1",
          interactive && "cursor-pointer hover:border-blue-300/50",

          className
        )}
        {...props}
      />
    );
  }
);
```

### CSS Custom Properties Usage

#### Dynamic Theming
```css
/* Theme switching with CSS custom properties */
[data-theme="blue"] {
  --primary: oklch(0.21 0.034 264.665);
  --primary-foreground: oklch(0.985 0.002 247.839);
  --radius: 0.625rem;
}

[data-theme="clean"] {
  --primary: oklch(0.623 0.214 259.815);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.65rem;
}
```

#### Animation Timing Control
```css
/* Dynamic animation timing */
:root {
  --animation-duration: 400ms;
  --stagger-delay: 100ms;
  --easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Performance mode */
[data-performance="reduced"] {
  --animation-duration: 200ms;
  --stagger-delay: 50ms;
}

/* Usage in components */
.dashboard-entrance {
  animation: dashboard-entrance var(--animation-duration) var(--easing) forwards;
  animation-delay: var(--stagger-delay);
}
```

### Performance Optimization Techniques

#### GPU Acceleration
```css
/* Optimize animations for GPU */
.gpu-optimized {
  transform: translateZ(0);
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* Reset will-change after animations */
.animation-complete {
  will-change: auto;
}
```

#### Efficient Transitions
```css
/* Use transform and opacity for smooth animations */
.efficient-hover {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

.efficient-hover:hover {
  transform: translateY(-2px) scale(1.02);
  opacity: 0.95;
}

/* Avoid animating layout properties */
.avoid-layout-thrash {
  /* ❌ Avoid */
  /* transition: width 200ms, height 200ms, padding 200ms; */

  /* ✅ Prefer */
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}
```

### Do's and Don'ts for Design Consistency

#### ✅ Do's
- **Use the established spacing scale** (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- **Apply consistent border radius** (0.5rem for most components, 0.625rem for dashboard theme)
- **Follow the blue gradient theme** for primary branding elements
- **Use semantic color mappings** for status indicators
- **Implement proper focus management** for accessibility
- **Apply entrance animations** with staggered timing for visual hierarchy
- **Use the Inter font family** for all text content
- **Maintain consistent card padding** (p-6 for standard cards)

#### ❌ Don'ts
- **Don't use arbitrary spacing values** outside the established scale
- **Don't mix different border radius values** within the same component group
- **Don't use colors outside the defined palette** without updating the design system
- **Don't animate layout properties** (width, height, padding) for performance
- **Don't forget reduced motion preferences** in animation implementations
- **Don't use different font families** without updating the typography system
- **Don't create custom focus styles** that don't meet accessibility standards
- **Don't ignore responsive breakpoints** when designing new components

### Component Testing Patterns
```typescript
// Visual regression testing setup
describe('Card Component Visual Tests', () => {
  it('should render default card correctly', () => {
    render(<Card>Default card content</Card>);
    expect(screen.getByRole('generic')).toHaveClass(
      'rounded-xl',
      'border',
      'bg-card',
      'text-card-foreground',
      'shadow-sm'
    );
  });

  it('should apply hover effects when hover prop is true', () => {
    render(<Card hover>Hoverable card</Card>);
    const card = screen.getByRole('generic');
    expect(card).toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');
  });
});
```

---

## Design System Maintenance

### Version Control for Design Changes
```typescript
// Design system versioning
export const DESIGN_SYSTEM_VERSION = "2.1.0";

export const designSystemChangelog = {
  "2.1.0": {
    date: "2024-01-15",
    changes: [
      "Added OKLCH color space support",
      "Enhanced accessibility focus indicators",
      "Improved mobile touch targets"
    ]
  },
  "2.0.0": {
    date: "2024-01-01",
    changes: [
      "Major blue theme redesign",
      "New animation system",
      "Responsive grid updates"
    ]
  }
};
```

### Design Token Management
```typescript
// Centralized design tokens
export const designTokens = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    success: "hsl(142, 76%, 36%)",
    warning: "hsl(38, 92%, 50%)",
    error: "hsl(0, 84%, 60%)"
  },
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem"   // 48px
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem"
    }
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.625rem",
    xl: "0.75rem",
    "2xl": "1rem"
  }
};
```

This comprehensive design system documentation provides all the necessary specifications for recreating the exact visual design language and user experience of the ResourceFlow application. The documentation includes precise color values, typography specifications, spacing systems, component patterns, animation details, responsive design guidelines, accessibility standards, and implementation best practices that ensure pixel-perfect recreation and consistent design application.
