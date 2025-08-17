import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableWidgetProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  description?: string;
  children: React.ReactNode;
  summaryContent?: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  priority?: "high" | "medium" | "low";
  size?: "sm" | "md" | "lg";
}

export function ExpandableWidget({
  title,
  icon,
  badge,
  badgeVariant = "outline",
  description,
  children,
  summaryContent,
  defaultExpanded = false,
  className,
  headerClassName,
  contentClassName,
  isLoading = false,
  onExpandChange,
  priority = "medium",
  size = "md"
}: ExpandableWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [children, isExpanded]);

  const handleToggle = () => {
    setIsAnimating(true);
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 300);
  };

  const getPriorityStyles = () => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50/30 hover:border-red-300";
      case "medium":
        return "border-blue-200 bg-blue-50/30 hover:border-blue-300";
      case "low":
        return "border-gray-200 bg-gray-50/30 hover:border-gray-300";
      default:
        return "border-gray-200 hover:border-gray-300";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "text-sm";
      case "lg":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  const getBadgeColor = () => {
    if (badgeVariant !== "outline") return badgeVariant;
    
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 ease-in-out shadow-sm hover:shadow-md",
        "rounded-xl border-2",
        getPriorityStyles(),
        isExpanded && "shadow-lg",
        className
      )}
    >
      <CardHeader 
        className={cn(
          "pb-3 cursor-pointer select-none",
          headerClassName
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-3 font-semibold",
            getSizeStyles()
          )}>
            {icon && (
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                priority === "high" ? "bg-red-100" :
                priority === "medium" ? "bg-blue-100" :
                "bg-gray-100"
              )}>
                {React.cloneElement(icon as React.ReactElement, {
                  className: cn(
                    "h-5 w-5",
                    priority === "high" ? "text-red-600" :
                    priority === "medium" ? "text-blue-600" :
                    "text-gray-600"
                  )
                })}
              </div>
            )}
            <span className="flex-1">{title}</span>
            {badge && (
              <Badge 
                variant={badgeVariant}
                className={cn(
                  "ml-2 font-medium",
                  badgeVariant === "outline" && getBadgeColor()
                )}
              >
                {badge}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {description && (
          <p className="text-sm text-gray-600 mt-2 ml-14">
            {description}
          </p>
        )}
      </CardHeader>

      {/* Summary Content (always visible when collapsed) */}
      {!isExpanded && summaryContent && (
        <CardContent className={cn("pt-0 pb-4", contentClassName)}>
          <div className="ml-14">
            {summaryContent}
          </div>
        </CardContent>
      )}

      {/* Expandable Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isAnimating && "transition-all duration-300"
        )}
        style={{
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0
        }}
      >
        <CardContent 
          ref={contentRef}
          className={cn("pt-0 pb-6", contentClassName)}
        >
          <div className="ml-14">
            {children}
          </div>
        </CardContent>
      </div>

      {/* Loading State Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// Skeleton component for loading states
export function ExpandableWidgetSkeleton({ 
  className,
  showSummary = true 
}: { 
  className?: string;
  showSummary?: boolean;
}) {
  return (
    <Card className={cn("rounded-xl border-2 border-gray-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-48 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      
      {showSummary && (
        <CardContent className="pt-0 pb-4">
          <div className="ml-14 space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
