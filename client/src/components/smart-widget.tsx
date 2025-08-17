import React, { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardErrorBoundary, WidgetErrorFallback } from './dashboard-error-boundary';

interface SmartWidgetProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  headerActions?: ReactNode;
  condensedView?: ReactNode;
  expandedView?: ReactNode;
  skeletonRows?: number;
  error?: Error | null;
  onRetry?: () => void;
}

export function SmartWidget({
  title,
  description,
  icon,
  children,
  className,
  isLoading = false,
  isExpandable = false,
  defaultExpanded = false,
  isCollapsible = true,
  defaultCollapsed = false,
  headerActions,
  condensedView,
  expandedView,
  skeletonRows = 3,
  error = null,
  onRetry,
}: SmartWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleExpanded = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const toggleCollapsed = () => {
    if (isCollapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: skeletonRows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (error) {
      return (
        <WidgetErrorFallback
          error={error}
          onRetry={onRetry}
          title={`${title} Error`}
        />
      );
    }

    if (isLoading) {
      return renderSkeleton();
    }

    if (isCollapsed) {
      return null;
    }

    // If we have condensed and expanded views, use them
    if (condensedView && expandedView) {
      return isExpanded ? expandedView : condensedView;
    }

    // Otherwise, use children
    return children;
  };

  return (
    <DashboardErrorBoundary>
      <Card
        className={cn(
          'smart-widget transition-all duration-300 ease-out',
          'hover:shadow-lg',
          isExpanded && 'widget-expanded',
          className
        )}
      >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-foreground">
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            
            {isExpandable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}

            {isCollapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapsed}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          {renderContent()}
        </CardContent>
      )}
      </Card>
    </DashboardErrorBoundary>
  );
}

// Smart Widget Grid Component
interface SmartWidgetGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function SmartWidgetGrid({
  children,
  className,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 }
}: SmartWidgetGridProps) {
  const gridClasses = cn(
    'grid gap-6',
    `grid-cols-${columns.sm || 1}`,
    `md:grid-cols-${columns.md || 2}`,
    `lg:grid-cols-${columns.lg || 3}`,
    `xl:grid-cols-${columns.xl || 4}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// KPI Smart Widget Component
interface KPISmartWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical' | 'info';
  description?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

export function KPISmartWidget({
  title,
  value,
  icon,
  trend,
  trendValue,
  status = 'info',
  description,
  isLoading = false,
  onClick,
}: KPISmartWidgetProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-success text-success-foreground border-success';
      case 'warning': return 'bg-warning text-warning-foreground border-warning';
      case 'critical': return 'bg-destructive text-destructive-foreground border-destructive';
      default: return 'bg-primary text-primary-foreground border-primary';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  if (isLoading) {
    return (
      <Card className="kpi-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'kpi-card cursor-pointer',
        onClick && 'hover:shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend && trendValue && (
                <span className="text-sm text-muted-foreground">
                  {getTrendIcon()} {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl border transition-all duration-300',
            getStatusColor(status)
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
