import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, AlertTriangle, CheckCircle, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeEntryStats } from "@/hooks/useTimeEntryStats";

interface TimeLoggingKPICardsProps {
  className?: string;
}

export function TimeLoggingKPICards({ className }: TimeLoggingKPICardsProps) {
  const { stats, isLoading, error } = useTimeEntryStats();

  if (error) {
    return (
      <div className={cn("text-center text-red-600", className)}>
        Error loading time logging statistics
      </div>
    );
  }

  const getStatusColor = (value: number, type: 'submissions' | 'pending' | 'late' | 'onTime') => {
    switch (type) {
      case 'submissions':
        return value > 0 ? "bg-green-100 text-green-600 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200";
      case 'pending':
        return value > 0 ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-green-100 text-green-600 border-green-200";
      case 'late':
        return value > 0 ? "bg-red-100 text-red-600 border-red-200" : "bg-green-100 text-green-600 border-green-200";
      case 'onTime':
        return value >= 90 ? "bg-green-100 text-green-600 border-green-200" : 
               value >= 70 ? "bg-amber-100 text-amber-600 border-amber-200" : 
               "bg-red-100 text-red-600 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getTrendIcon = (delta: number) => {
    if (delta > 0) return ArrowUp;
    if (delta < 0) return ArrowDown;
    return null;
  };

  const cards = [
    {
      title: "Weekly Submissions",
      value: stats.weeklySubmissions,
      icon: CheckCircle,
      color: getStatusColor(stats.weeklySubmissions, 'submissions'),
      tooltip: "Number of time entries submitted this week",
      delta: stats.weeklySubmissionsDelta,
      trend: getTrendIcon(stats.weeklySubmissionsDelta),
    },
    {
      title: "Pending Entries",
      value: stats.pendingEntries,
      icon: Clock,
      color: getStatusColor(stats.pendingEntries, 'pending'),
      tooltip: "Number of resources with pending time entries",
      delta: stats.pendingEntriesDelta,
      trend: getTrendIcon(stats.pendingEntriesDelta),
    },
    {
      title: "Late Submissions",
      value: stats.lateSubmissions,
      icon: AlertTriangle,
      color: getStatusColor(stats.lateSubmissions, 'late'),
      tooltip: "Number of time entries submitted after Friday 4PM",
      delta: stats.lateSubmissionsDelta,
      trend: getTrendIcon(stats.lateSubmissionsDelta),
    },
    {
      title: "On-Time Rate",
      value: `${stats.onTimeRate}%`,
      icon: TrendingUp,
      color: getStatusColor(stats.onTimeRate, 'onTime'),
      tooltip: "Percentage of time entries submitted on time",
      delta: stats.onTimeRateDelta,
      trend: getTrendIcon(stats.onTimeRateDelta),
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Time Logging Overview</h3>
        <div className="text-sm text-gray-500">Current Week</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend;

          return (
            <TooltipProvider key={card.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={cn(
                      "group relative overflow-hidden transition-all duration-300 ease-out",
                      "hover:shadow-lg hover:-translate-y-1",
                      "border-0 bg-white/80 backdrop-blur-sm",
                      "hover:bg-white/95",
                      isLoading && "animate-pulse"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg border transition-colors duration-200",
                            card.color
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">{card.title}</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {isLoading ? "..." : card.value}
                            </p>
                          </div>
                        </div>
                        
                        {TrendIcon && !isLoading && (
                          <div className={cn(
                            "flex items-center space-x-1 text-xs",
                            card.delta > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            <TrendIcon className="w-3 h-3" />
                            <span>{Math.abs(card.delta).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{card.tooltip}</p>
                  {!isLoading && card.delta !== 0 && (
                    <p className="text-xs mt-1">
                      {card.delta > 0 ? "+" : ""}{card.delta.toFixed(1)}% from last week
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
