import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface UtilizationData {
  utilizationPercent: number;
  totalAllocatedHours: number;
  effectiveCapacity: number;
  baseCapacity: number;
  nonProjectHours: number;
  currentProjectHours: number;
  otherProjectsHours: number;
  resourceName?: string;
  weekLabel?: string;
}

interface UtilizationBarProps {
  data: UtilizationData;
  className?: string;
  showTooltip?: boolean;
  uniqueId?: string; // For managing pinned state across multiple bars
}

/**
 * Real-time utilization bar component for allocation tables
 * Shows visual progress bar with color coding based on capacity usage
 */
export function UtilizationBar({
  data,
  className = "",
  showTooltip = true,
  uniqueId = 'default'
}: UtilizationBarProps) {
  const [pinnedTooltip, setPinnedTooltip] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Generate unique identifier for this bar instance
  const barId = `utilization-bar-${uniqueId}-${data.resourceName || 'unnamed'}`;
  const isTooltipOpen = hoveredBar === barId || pinnedTooltip === barId;

  // Click outside handler to close pinned tooltips
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if clicking outside the tooltip and trigger elements
      const target = event.target as Element;
      if (pinnedTooltip && !target.closest('[data-radix-tooltip-content]') && !target.closest('[data-radix-tooltip-trigger]')) {
        setPinnedTooltip(null);
        setHoveredBar(null);
      }
    };

    if (pinnedTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pinnedTooltip]);

  // Keyboard support for closing pinned tooltips
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pinnedTooltip && event.key === 'Escape') {
        setPinnedTooltip(null);
        setHoveredBar(null);
      }
    };

    if (pinnedTooltip) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [pinnedTooltip]);
  const {
    utilizationPercent,
    totalAllocatedHours,
    effectiveCapacity,
    baseCapacity,
    nonProjectHours,
    currentProjectHours,
    otherProjectsHours,
    resourceName,
    weekLabel
  } = data;

  // Show empty state bar if no hours allocated
  const isEmpty = totalAllocatedHours === 0;

  // Determine color and pattern based on utilization percentage
  const getBarStyle = (percent: number, empty: boolean): { color: string; pattern?: string } => {
    if (empty) return {
      color: 'bg-gray-100',
      pattern: 'bg-gray-100'
    };
    if (percent > 100) return {
      color: 'bg-red-500',
      pattern: 'bg-gradient-to-r from-red-500 via-red-400 to-red-500'
    };
    if (percent > 80) return {
      color: 'bg-amber-500',
      pattern: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500'
    };
    return {
      color: 'bg-green-500',
      pattern: 'bg-gradient-to-r from-green-500 via-green-400 to-green-500'
    };
  };

  // Calculate bar width (cap at 100% visual width even if overallocated, 0% for empty)
  const barWidth = isEmpty ? 0 : Math.min(utilizationPercent, 100);
  const barStyle = getBarStyle(utilizationPercent, isEmpty);

  // Create accessibility label
  const ariaLabel = isEmpty
    ? `No hours allocated. ${effectiveCapacity} effective hours available.`
    : `${utilizationPercent.toFixed(1)}% capacity utilized. ${totalAllocatedHours} of ${effectiveCapacity} effective hours allocated.`;

  // Format enhanced tooltip content with ResourceFlow design patterns
  const tooltipContent = (
    <>
      {/* Header Section - Compact with pinned indicator */}
      <div className={cn(
        "px-3 py-2 border-b border-gray-200 transition-colors duration-200",
        pinnedTooltip === barId
          ? "bg-gradient-to-r from-purple-50 to-purple-100"
          : "bg-gradient-to-r from-gray-50 to-gray-100"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-bold text-base text-gray-900 leading-none">
              {utilizationPercent.toFixed(1)}% Utilized
            </div>
            {weekLabel && (
              <div className="text-xs font-medium text-gray-600 leading-none">
                {weekLabel}
              </div>
            )}
            {/* Pinned status indicator */}
            {pinnedTooltip === barId && (
              <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                <Pin className="h-3 w-3" />
                <span>Pinned</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Pin/Unpin button with enhanced visual feedback */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (pinnedTooltip === barId) {
                  setPinnedTooltip(null);
                  setHoveredBar(null);
                } else {
                  // Close any previously pinned tooltip and pin this one
                  setPinnedTooltip(barId);
                  setHoveredBar(barId);
                }
              }}
              className={cn(
                "p-1 rounded-md transition-all duration-200 flex-shrink-0 relative",
                "focus:outline-none focus:ring-2 focus:ring-purple-300",
                pinnedTooltip === barId
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
              title={pinnedTooltip === barId ? "Unpin tooltip (click outside to close)" : "Pin tooltip to keep it open"}
              aria-label={pinnedTooltip === barId ? "Unpin tooltip" : "Pin tooltip"}
            >
              <Pin className={cn(
                "h-3 w-3 transition-transform duration-200",
                pinnedTooltip === barId && "rotate-12"
              )} />
              {/* Pinned indicator */}
              {pinnedTooltip === barId && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Close button (only show when pinned) with enhanced styling */}
            {pinnedTooltip === barId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedTooltip(null);
                  setHoveredBar(null);
                }}
                className={cn(
                  "p-1 rounded-md transition-all duration-200 flex-shrink-0",
                  "text-gray-400 hover:text-red-600 hover:bg-red-50",
                  "focus:outline-none focus:ring-2 focus:ring-red-300"
                )}
                title="Close pinned tooltip"
                aria-label="Close tooltip"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section - Compact */}
      <div className="p-3">
        {/* Capacity Details - Tighter spacing */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Allocated:</span>
            <span className="font-semibold text-xs text-gray-900">
              {totalAllocatedHours.toFixed(1)}h
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Effective Capacity:</span>
            <span className="font-semibold text-xs text-gray-900">{effectiveCapacity.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Available:</span>
            <span className={cn(
              "font-semibold text-xs",
              effectiveCapacity - totalAllocatedHours < 0 ? "text-red-600" : "text-green-600"
            )}>
              {Math.max(0, effectiveCapacity - totalAllocatedHours).toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="space-y-1.5 mb-3 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">This project:</span>
            <span className="font-semibold text-xs text-gray-900">{currentProjectHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Other projects:</span>
            <span className="font-semibold text-xs text-gray-900">{otherProjectsHours.toFixed(1)}h</span>
          </div>
        </div>

        {/* Capacity Breakdown */}
        <div className="space-y-1.5 mb-3 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Base capacity:</span>
            <span className="text-xs text-gray-700">{baseCapacity}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 font-medium">Non-project time:</span>
            <span className="text-xs text-gray-700">{nonProjectHours}h</span>
          </div>
        </div>

        {/* Status Messages */}
        {utilizationPercent > 100 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <span>🔴</span>
              <span>Overallocated by {(totalAllocatedHours - effectiveCapacity).toFixed(1)}h</span>
            </div>
          </div>
        )}

        {utilizationPercent > 80 && utilizationPercent <= 100 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <span>🟡</span>
              <span>Near capacity ({(effectiveCapacity - totalAllocatedHours).toFixed(1)}h remaining)</span>
            </div>
          </div>
        )}

        {/* No Allocations Message */}
        {totalAllocatedHours === 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>💡</span>
              <span>No allocations scheduled</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const barElement = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "relative w-full h-1 rounded-sm overflow-hidden",
        isEmpty
          ? "bg-gray-100 cursor-default" // Light gray background for empty state, no cursor change
          : "bg-gray-200 cursor-pointer hover:h-1.5 hover:shadow-md", // Normal interactive state
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        pinnedTooltip === barId && "ring-2 ring-purple-400 ring-offset-1",
        className
      )}
      aria-label={`${ariaLabel} ${pinnedTooltip === barId ? 'Tooltip pinned. ' : ''}${isEmpty ? '' : `Click to ${pinnedTooltip === barId ? 'unpin' : 'pin'} tooltip.`}`}
      aria-valuenow={Math.round(utilizationPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      onMouseEnter={() => {
        if (!isEmpty && pinnedTooltip !== barId) {
          setHoveredBar(barId);
        }
      }}
      onMouseLeave={() => {
        if (!isEmpty && pinnedTooltip !== barId) {
          setHoveredBar(null);
        }
      }}
      onClick={(e) => {
        if (isEmpty) return; // Disable interaction for empty state
        e.stopPropagation();
        // Toggle pin on click - ensure only one tooltip is pinned at a time
        if (pinnedTooltip === barId) {
          setPinnedTooltip(null);
          setHoveredBar(null);
        } else {
          // Close any previously pinned tooltip
          setPinnedTooltip(barId);
          setHoveredBar(barId);
        }
      }}
      onKeyDown={(e) => {
        if (isEmpty) return; // Disable interaction for empty state
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          // Same logic as click
          if (pinnedTooltip === barId) {
            setPinnedTooltip(null);
            setHoveredBar(null);
          } else {
            setPinnedTooltip(barId);
            setHoveredBar(barId);
          }
        }
      }}
    >
      {/* Only show inner bar if not empty */}
      {!isEmpty && (
        <div
          className={cn(
            "h-full transition-all duration-200 ease-out rounded-sm",
            barStyle.pattern || barStyle.color
          )}
          style={{ width: `${barWidth}%` }}
        />
      )}

      {/* Overflow indicator for >100% utilization with pattern for accessibility */}
      {!isEmpty && utilizationPercent > 100 && (
        <div className="absolute inset-0 bg-red-500 opacity-20 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
        </div>
      )}
    </div>
  );

  // Don't show tooltip for empty states or if showTooltip is false
  if (!showTooltip || isEmpty) {
    return barElement;
  }

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <Tooltip
        open={isTooltipOpen}
        onOpenChange={(open) => {
          if (!open && pinnedTooltip === barId) {
            // Don't close if it's pinned
            return;
          }
          if (open) {
            setHoveredBar(barId);
          } else {
            setHoveredBar(null);
          }
        }}
      >
        <TooltipTrigger asChild>
          {barElement}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="center"
          usePortal={true}
          className={cn(
            "p-0 border-0 shadow-xl bg-white rounded-lg overflow-hidden",
            // Use maximum z-index to ensure visibility above all elements
            "z-[99999] !important",
            // Responsive width: compact for content, mobile-aware
            "w-72 max-w-[calc(100vw-2rem)]",
            // Enhanced shadow for pinned tooltips
            pinnedTooltip === barId && "shadow-2xl ring-2 ring-purple-200"
          )}
          sideOffset={8}
          collisionPadding={16}
          avoidCollisions={true}
          sticky="always"
          hideWhenDetached={false}
          onPointerEnter={() => {
            // Keep tooltip open when hovering over it
            setHoveredBar(barId);
          }}
          onPointerLeave={() => {
            // Only close if not pinned
            if (pinnedTooltip !== barId) {
              setHoveredBar(null);
            }
          }}
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to calculate utilization data for the UtilizationBar component
 */
export function useUtilizationData(
  resource: { id: number; name: string; weeklyCapacity: string },
  weekKey: string,
  currentProjectHours: number,
  totalAllocatedHours: number,
  weekLabel?: string
): UtilizationData {
  const baseCapacity = parseFloat(resource.weeklyCapacity || '40');
  const nonProjectHours = 8; // Default non-project hours
  const effectiveCapacity = Math.max(0, baseCapacity - nonProjectHours);
  const otherProjectsHours = Math.max(0, totalAllocatedHours - currentProjectHours);
  const utilizationPercent = effectiveCapacity > 0 ? (totalAllocatedHours / effectiveCapacity) * 100 : 0;

  return {
    utilizationPercent,
    totalAllocatedHours,
    effectiveCapacity,
    baseCapacity,
    nonProjectHours,
    currentProjectHours,
    otherProjectsHours,
    resourceName: resource.name,
    weekLabel
  };
}
