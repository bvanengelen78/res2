import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { ProjectorIcon, Users, AlertTriangle, TrendingUp, Info, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UTILIZATION_THRESHOLDS, UTILIZATION_STATUS_STYLES, getUtilizationStatus } from "@/lib/utilization-thresholds";

interface KPITrendData {
  current_value: number;
  previous_value: number;
  period_label: string;
  trend_data: number[];
}

interface KPICardsProps {
  kpis: {
    activeProjects: number;
    availableResources: number;
    conflicts: number;
    utilization: number;
  };
  trendData?: {
    activeProjects?: KPITrendData;
    availableResources?: KPITrendData;
    conflicts?: KPITrendData;
    utilization?: KPITrendData;
  };
  isLoading?: boolean;
}

export function KPICards({ kpis, trendData, isLoading = false }: KPICardsProps) {
  // Helper function to get semantic colors based on unified thresholds
  const getKPIUtilizationStatus = (utilization: number) => {
    const status = getUtilizationStatus(utilization, true, utilization > 0);
    const styles = UTILIZATION_STATUS_STYLES[status];

    return {
      color: styles.color,
      status: status === 'critical' || status === 'over-capacity' ? "high" :
              status === 'near-capacity' ? "medium" : "good",
      trend: status === 'critical' || status === 'over-capacity' || status === 'near-capacity' ? "up" : "stable"
    };
  };

  const getConflictStatus = (conflicts: number) => {
    if (conflicts > 0) return { color: "bg-red-100 text-red-600 border-red-200", status: "critical", trend: "up" };
    return { color: "bg-green-100 text-green-600 border-green-200", status: "good", trend: "stable" };
  };

  // Helper function to calculate trend information
  const getTrendInfo = (trendData?: KPITrendData) => {
    if (!trendData) return { change: null, trend: 'stable' as const, changeText: '' };

    const change = trendData.current_value - trendData.previous_value;
    const changePercent = trendData.previous_value > 0
      ? Math.abs((change / trendData.previous_value) * 100)
      : 0;

    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    const changeText = change !== 0
      ? `${change > 0 ? '+' : ''}${change} (${changePercent.toFixed(1)}%) ${trendData.period_label}`
      : '';

    return { change, trend, changeText, changePercent };
  };

  const utilizationStatus = getKPIUtilizationStatus(kpis.utilization);
  const conflictStatus = getConflictStatus(kpis.conflicts);

  const cards = [
    {
      title: "Active Projects",
      value: kpis.activeProjects,
      icon: ProjectorIcon,
      color: "bg-blue-100 text-blue-600 border-blue-200",
      tooltip: "Number of projects currently in active status",
      trend: getTrendInfo(trendData?.activeProjects).trend,
      status: "info",
      trendInfo: getTrendInfo(trendData?.activeProjects),
      sparklineData: trendData?.activeProjects?.trend_data,
    },
    {
      title: "Available Resources",
      value: kpis.availableResources,
      icon: Users,
      color: "bg-green-100 text-green-600 border-green-200",
      tooltip: "Resources with utilization below 100% capacity",
      trend: getTrendInfo(trendData?.availableResources).trend,
      status: "good",
      trendInfo: getTrendInfo(trendData?.availableResources),
      sparklineData: trendData?.availableResources?.trend_data,
    },
    {
      title: "Capacity Conflicts",
      value: kpis.conflicts,
      icon: AlertTriangle,
      color: conflictStatus.color,
      tooltip: "Resources allocated over 100% capacity",
      trend: getTrendInfo(trendData?.conflicts).trend || conflictStatus.trend,
      status: conflictStatus.status,
      trendInfo: getTrendInfo(trendData?.conflicts),
      sparklineData: trendData?.conflicts?.trend_data,
    },
    {
      title: "Utilization Rate",
      value: `${kpis.utilization}%`,
      icon: TrendingUp,
      color: utilizationStatus.color,
      tooltip: "Average resource utilization across all active resources",
      trend: getTrendInfo(trendData?.utilization).trend || utilizationStatus.trend,
      status: utilizationStatus.status,
      trendInfo: getTrendInfo(trendData?.utilization),
      sparklineData: trendData?.utilization?.trend_data,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? ArrowUp : card.trend === 'down' ? ArrowDown : null;
        const trendColor = card.trend === 'up' ? 'text-green-600' :
                          card.trend === 'down' ? 'text-red-600' : 'text-gray-500';

        return (
          <Card
            key={card.title}
            className={cn(
              "group relative overflow-hidden transition-all duration-300 ease-out",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1",
              "border-0 bg-white/80 backdrop-blur-sm",
              "hover:bg-white/95"
            )}
          >
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    "p-3 rounded-xl border transition-all duration-300 group-hover:scale-110",
                    card.color
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{card.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                        {card.value}
                      </p>
                      {TrendIcon && (
                        <div className={cn(
                          "p-1 rounded-full",
                          card.status === 'critical' ? "bg-red-100" :
                          card.status === 'medium' ? "bg-amber-100" : "bg-green-100"
                        )}>
                          <TrendIcon className={cn(
                            "h-3 w-3",
                            card.status === 'critical' ? "text-red-600" :
                            card.status === 'medium' ? "text-amber-600" : "text-green-600"
                          )} />
                        </div>
                      )}
                    </div>

                    {/* Trend Information */}
                    {card.trendInfo.changeText && (
                      <div className={cn("flex items-center text-xs", trendColor)}>
                        {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
                        <span>{card.trendInfo.changeText}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sparkline */}
                <div className="flex flex-col items-end space-y-2">
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : card.sparklineData && card.sparklineData.length > 1 ? (
                    <Sparkline
                      data={card.sparklineData}
                      className="h-6 w-12"
                      strokeColor={card.trend === 'up' ? '#10b981' :
                                  card.trend === 'down' ? '#ef4444' : '#6b7280'}
                    />
                  ) : (
                    <div className="h-6 w-12" /> // Placeholder to maintain layout
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
