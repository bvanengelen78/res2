import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <main className={cn("relative", className)}>
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 bg-white/20 rounded" />
                <Skeleton className="h-8 w-64 bg-white/20 rounded" />
              </div>
              <Skeleton className="h-5 w-48 bg-white/10 rounded" />
              
              {/* Filter Controls Skeleton */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 bg-white/20 rounded" />
                  <Skeleton className="h-9 w-40 bg-white/10 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 bg-white/20 rounded" />
                  <Skeleton className="h-9 w-40 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Enhanced Capacity Alerts Skeleton */}
        <ExpandableWidgetSkeleton showSummary={true} />

        {/* Actionable Insights Panel Skeleton */}
        <ExpandableWidgetSkeleton showSummary={true} />

        {/* Smart Notifications Panel Skeleton */}
        <ExpandableWidgetSkeleton showSummary={false} />

        {/* Time Logging Reminder Skeleton */}
        <ExpandableWidgetSkeleton showSummary={true} />

        {/* Role & Skill Heatmap Skeleton */}
        <ExpandableWidgetSkeleton showSummary={false} />

        {/* Hours Allocation vs. Actual Skeleton */}
        <ExpandableWidgetSkeleton showSummary={true} />

        {/* Quick Actions Skeleton */}
        <QuickActionsSkeleton />
      </div>
    </main>
  );
}

// KPI Card Skeleton
export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-xl border-2 border-gray-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-3/4 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Expandable Widget Skeleton
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
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
      
      {showSummary && (
        <CardContent className="pt-0 pb-4">
          <div className="ml-14 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Quick Actions Skeleton
export function QuickActionsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-xl border-2 border-gray-200", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Shimmer effect for enhanced loading animation
export function ShimmerSkeleton({ 
  className,
  height = "h-4",
  width = "w-full"
}: { 
  className?: string;
  height?: string;
  width?: string;
}) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded bg-gray-200",
      height,
      width,
      className
    )}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// Grid skeleton for data tables/lists
export function GridSkeleton({ 
  rows = 5,
  columns = 4,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, colIndex) => (
            <ShimmerSkeleton 
              key={colIndex} 
              height={rowIndex === 0 ? "h-5" : "h-4"}
              className={rowIndex === 0 ? "bg-gray-300" : "bg-gray-200"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Chart skeleton for data visualizations
export function ChartSkeleton({ 
  type = "bar",
  className 
}: { 
  type?: "bar" | "line" | "pie" | "area";
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Chart Title */}
      <div className="flex items-center justify-between">
        <ShimmerSkeleton height="h-5" width="w-32" />
        <ShimmerSkeleton height="h-4" width="w-20" />
      </div>
      
      {/* Chart Area */}
      <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        
        {/* Chart Elements based on type */}
        {type === "bar" && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="bg-gray-300 rounded-t"
                style={{ 
                  height: `${Math.random() * 60 + 20}%`,
                  width: "12%"
                }}
              />
            ))}
          </div>
        )}
        
        {type === "line" && (
          <div className="absolute inset-4">
            <svg className="w-full h-full">
              <path
                d="M 0 80 Q 50 60 100 70 T 200 50 T 300 60"
                stroke="rgb(156, 163, 175)"
                strokeWidth="2"
                fill="none"
                className="opacity-60"
              />
            </svg>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <ShimmerSkeleton height="h-3" width="w-3" className="rounded-full" />
            <ShimmerSkeleton height="h-3" width="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
