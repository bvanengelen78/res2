import { useMemo, useState, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  calculateResourceUtilization,
  getUtilizationStatus,
  UTILIZATION_STATUS_STYLES,
  type UtilizationStatus
} from "@/lib/utilization-thresholds";
import type { Resource } from "@shared/schema";

interface ResourceAvailabilityIndicatorProps {
  resource: Resource;
  weekKey: string;
  currentWeekAllocations: Record<string, number>; // All allocations for this resource across all projects for the week
  className?: string;
  showPercentageText?: boolean; // Hide on xs screens
  allResourceAllocations?: Record<string, number>; // Optional: all allocations across projects for better accuracy
  isCurrentWeek?: boolean; // Whether this is showing the current week (for styling)
  tooltipSide?: "top" | "bottom" | "left" | "right" | "auto"; // Smart positioning
  inModal?: boolean; // Whether this is displayed in a modal/popup
  onToggleExpand?: (resourceId: number, isExpanded: boolean) => void; // Callback for expand/collapse
  isExpanded?: boolean; // Whether the detail row is currently expanded
  expandable?: boolean; // Whether this indicator supports expansion (default: false for backward compatibility)
}

interface AvailabilityData {
  effectiveCapacity: number;
  totalAllocated: number;
  availableHours: number;
  utilizationPercentage: number;
  status: UtilizationStatus;
  statusColor: string;
  statusIcon: string;
}

// Default non-project hours (could be made configurable later)
const DEFAULT_NON_PROJECT_HOURS = 8; // Meetings, admin, etc.

// Smart tooltip positioning hook
function useSmartTooltipPosition(
  triggerRef: React.RefObject<HTMLElement>,
  preferredSide: "top" | "bottom" | "left" | "right" | "auto" = "auto"
) {
  const [position, setPosition] = useState<"top" | "bottom" | "left" | "right">("top");

  useEffect(() => {
    if (!triggerRef.current || preferredSide !== "auto") {
      setPosition(preferredSide === "auto" ? "top" : preferredSide);
      return;
    }

    const updatePosition = () => {
      const element = triggerRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Calculate available space in each direction
      const spaceTop = rect.top;
      const spaceBottom = viewport.height - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewport.width - rect.right;

      // Tooltip approximate dimensions (adjust based on content)
      const tooltipHeight = 120; // Estimated height
      const tooltipWidth = 280; // max-w-xs equivalent

      // Determine best position based on available space
      if (spaceBottom >= tooltipHeight) {
        setPosition("bottom");
      } else if (spaceTop >= tooltipHeight) {
        setPosition("top");
      } else if (spaceRight >= tooltipWidth) {
        setPosition("right");
      } else if (spaceLeft >= tooltipWidth) {
        setPosition("left");
      } else {
        // Fallback to position with most space
        const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
        if (maxSpace === spaceBottom) setPosition("bottom");
        else if (maxSpace === spaceTop) setPosition("top");
        else if (maxSpace === spaceRight) setPosition("right");
        else setPosition("left");
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [preferredSide]);

  return position;
}

export function ResourceAvailabilityIndicator({
  resource,
  weekKey,
  currentWeekAllocations,
  className = "",
  showPercentageText = true,
  allResourceAllocations,
  isCurrentWeek = false,
  tooltipSide = "auto",
  inModal = false,
  onToggleExpand,
  isExpanded = false,
  expandable = false,
}: ResourceAvailabilityIndicatorProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const smartPosition = useSmartTooltipPosition(triggerRef, tooltipSide);

  const handleClick = () => {
    if (expandable && onToggleExpand) {
      onToggleExpand(resource.id, !isExpanded);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (expandable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  };
  
  const availabilityData = useMemo((): AvailabilityData => {
    // Validate inputs
    if (!resource || !weekKey) {
      return {
        effectiveCapacity: 0,
        totalAllocated: 0,
        availableHours: 0,
        utilizationPercentage: 0,
        status: 'available',
        statusColor: 'text-green-600 bg-green-50 border-green-200',
        statusIcon: '🟢',
      };
    }

    const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');

    // Calculate effective capacity (capacity - non-project hours - time-off)
    // For now, we'll use a simplified calculation
    // TODO: Integrate with actual time-off data and configurable non-project hours
    const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);

    // Sum all allocations for this week across all projects
    // Use allResourceAllocations if provided (more accurate), otherwise fall back to current project only
    const totalAllocated = allResourceAllocations?.[weekKey] || currentWeekAllocations[weekKey] || 0;
    
    const availableHours = Math.max(0, effectiveCapacity - totalAllocated);
    const utilizationPercentage = effectiveCapacity > 0 ? (totalAllocated / effectiveCapacity) * 100 : 0;
    
    // Determine status based on unified thresholds
    const status = getUtilizationStatus(utilizationPercentage, true, totalAllocated > 0);
    const styles = UTILIZATION_STATUS_STYLES[status];
    const statusColor = `${styles.textColor} ${styles.bgColor} ${styles.borderColor}`;
    const statusIcon = styles.icon;
    
    return {
      effectiveCapacity,
      totalAllocated,
      availableHours,
      utilizationPercentage,
      status,
      statusColor,
      statusIcon,
    };
  }, [resource.weeklyCapacity, weekKey, currentWeekAllocations]);

  const tooltipText = `This resource is allocated for ${availabilityData.utilizationPercentage.toFixed(1)}% of their available weekly capacity (${availabilityData.totalAllocated.toFixed(1)}h / ${availabilityData.effectiveCapacity}h)${isCurrentWeek ? ' for the current week' : ''}.`;

  // For expandable indicators, we use a simpler design without tooltip
  if (expandable) {
    return (
      <div
        ref={triggerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${tooltipText} Click to ${isExpanded ? 'collapse' : 'expand'} details`}
        className={cn(
          "flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border transition-all duration-200",
          "hover:shadow-sm hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          availabilityData.statusColor,
          isExpanded && "ring-2 ring-blue-300",
          className
        )}
      >
        <span className="text-xs" role="img" aria-label={`Status: ${availabilityData.status}`}>
          {availabilityData.statusIcon}
        </span>
        {showPercentageText && (
          <span className="font-medium">
            {availabilityData.utilizationPercentage.toFixed(0)}% used
          </span>
        )}
        {!showPercentageText && (
          <span className="font-medium">
            {availabilityData.utilizationPercentage.toFixed(0)}%
          </span>
        )}
        {/* Expand/Collapse Caret */}
        <span
          className={cn(
            "text-xs transition-transform duration-200 text-gray-500",
            isExpanded && "rotate-90"
          )}
          aria-hidden="true"
        >
          ▶
        </span>
      </div>
    );
  }

  // Original tooltip-based design for non-expandable indicators
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div
          ref={triggerRef}
          className={cn(
            "flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border transition-all duration-200",
            "hover:shadow-sm hover:scale-105 cursor-help",
            availabilityData.statusColor,
            className
          )}
          aria-label={tooltipText}
        >
          <span className="text-xs" role="img" aria-label={`Status: ${availabilityData.status}`}>
            {availabilityData.statusIcon}
          </span>
          {showPercentageText && (
            <span className="font-medium">
              {availabilityData.utilizationPercentage.toFixed(0)}% used
            </span>
          )}
          {!showPercentageText && (
            <span className="font-medium">
              {availabilityData.utilizationPercentage.toFixed(0)}%
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side={smartPosition}
        className={cn(
          "max-w-xs p-3 bg-white border border-gray-200 shadow-lg rounded-lg",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "z-[9999]", // High z-index to appear above modals and sticky elements
          inModal && "z-[10001]" // Even higher for modals
        )}
        sideOffset={8}
        collisionPadding={16}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm" role="img">
              {availabilityData.statusIcon}
            </span>
            <p className="font-semibold text-gray-900 text-sm">Weekly Capacity Status</p>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{tooltipText}</p>

          <div className="border-t border-gray-100 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-700">
                    {availabilityData.availableHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium text-blue-700">
                    {availabilityData.totalAllocated.toFixed(1)}h
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium text-gray-700">
                    {availabilityData.effectiveCapacity}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base:</span>
                  <span className="font-medium text-gray-700">
                    {resource.weeklyCapacity}h
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                Effective capacity = Base capacity - Non-project hours ({DEFAULT_NON_PROJECT_HOURS}h)
              </p>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Progress bar variant (alternative display option)
export function ResourceAvailabilityBar({
  resource,
  weekKey,
  currentWeekAllocations,
  className = "",
  tooltipSide = "auto",
  inModal = false,
}: Omit<ResourceAvailabilityIndicatorProps, 'showPercentageText'>) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const smartPosition = useSmartTooltipPosition(triggerRef, tooltipSide);
  
  const availabilityData = useMemo((): AvailabilityData => {
    const weeklyCapacity = parseFloat(resource.weeklyCapacity || '40');
    const effectiveCapacity = Math.max(0, weeklyCapacity - DEFAULT_NON_PROJECT_HOURS);
    const totalAllocated = currentWeekAllocations[weekKey] || 0;
    const availableHours = Math.max(0, effectiveCapacity - totalAllocated);
    const utilizationPercentage = effectiveCapacity > 0 ? (totalAllocated / effectiveCapacity) * 100 : 0;
    
    const status = getUtilizationStatus(utilizationPercentage, true, totalAllocated > 0);
    const styles = UTILIZATION_STATUS_STYLES[status];

    // Map to background colors for this specific component
    let statusColor: string;
    switch (status) {
      case 'critical':
      case 'over-capacity':
        statusColor = 'bg-red-500';
        break;
      case 'near-capacity':
        statusColor = 'bg-amber-500';
        break;
      case 'under-utilized':
        statusColor = 'bg-blue-500';
        break;
      case 'unassigned':
        statusColor = 'bg-slate-400';
        break;
      default:
        statusColor = 'bg-green-500';
    }
    const statusIcon = styles.icon;
    
    return {
      effectiveCapacity,
      totalAllocated,
      availableHours,
      utilizationPercentage,
      status,
      statusColor,
      statusIcon,
    };
  }, [resource.weeklyCapacity, weekKey, currentWeekAllocations]);

  const tooltipText = `This resource is allocated for ${availabilityData.utilizationPercentage.toFixed(1)}% of their available weekly capacity.`;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div
          ref={triggerRef}
          className={cn("w-full cursor-help", className)}
          aria-label={tooltipText}
        >
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden hover:h-2.5 transition-all duration-200">
              <div
                className={cn("h-full transition-all duration-300", availabilityData.statusColor)}
                style={{ width: `${Math.min(100, availabilityData.utilizationPercentage)}%` }}
              />
            </div>
            <span className="text-xs font-medium min-w-[3rem] text-right">
              {availabilityData.utilizationPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side={smartPosition}
        className={cn(
          "max-w-xs p-3 bg-white border border-gray-200 shadow-lg rounded-lg",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "z-[9999]",
          inModal && "z-[10001]"
        )}
        sideOffset={8}
        collisionPadding={16}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm" role="img">
              {availabilityData.statusIcon}
            </span>
            <p className="font-semibold text-gray-900 text-sm">Weekly Capacity Status</p>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{tooltipText}</p>

          <div className="border-t border-gray-100 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-700">
                    {availabilityData.availableHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium text-blue-700">
                    {availabilityData.totalAllocated.toFixed(1)}h
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium text-gray-700">
                    {availabilityData.effectiveCapacity}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Base:</span>
                  <span className="font-medium text-gray-700">
                    {resource.weeklyCapacity}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
