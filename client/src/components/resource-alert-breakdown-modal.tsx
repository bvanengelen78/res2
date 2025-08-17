import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BarChart3,
  Calculator,
  Target,
  Lightbulb,
  ChevronRight,
  Activity,
  Crown,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, getISOWeek, getYear } from "date-fns";
import { getAlertsPeriodInfo, getAlertsPeriodDescription } from "@/lib/alerts-period-utils";

interface ResourceAlertBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: number | null;
  resourceName?: string;
  currentPeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  periodFilter?: string;
}

interface PeriodBreakdown {
  resource: {
    id: number;
    name: string;
    department: string;
    role: string;
    totalCapacity: number;
    effectiveCapacity: number;
    nonProjectHours: number;
  };
  summary: {
    periodType: string;
    totalPeriods: number;
    problematicPeriods: number;
    overallUtilization: number;
    totalAllocatedHours: number;
    calculationFormula: string;
  };
  periods: Array<{
    period: string;
    startDate: string;
    endDate: string;
    allocatedHours: number;
    effectiveCapacity: number;
    utilization: number;
    status: string;
    projectBreakdown: Array<{
      projectId: number;
      projectName: string;
      allocatedHours: number;
      role: string;
      allocationId: number;
    }>;
    isProblematic: boolean;
  }>;
  contributingProjects: Array<{
    projectName: string;
    totalHours: number;
    allocations: any[];
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'overallocated':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'near-capacity':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'optimal':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'under-utilized':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'unassigned':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'critical':
    case 'overallocated':
      return <AlertCircle className="h-4 w-4" />;
    case 'near-capacity':
      return <AlertTriangle className="h-4 w-4" />;
    case 'optimal':
      return <Target className="h-4 w-4" />;
    case 'under-utilized':
      return <TrendingDown className="h-4 w-4" />;
    case 'unassigned':
      return <Clock className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-600 text-white border-red-600';
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'redistribute':
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    case 'timeline':
      return <Calendar className="h-5 w-5 text-yellow-500" />;
    case 'monitor':
      return <Activity className="h-5 w-5 text-yellow-500" />;
    case 'buffer':
      return <Target className="h-5 w-5 text-yellow-500" />;
    case 'prioritize':
      return <BarChart3 className="h-5 w-5 text-blue-500" />;
    case 'optimal':
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'opportunity':
      return <ChevronRight className="h-5 w-5 text-green-500" />;
    case 'assign':
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    case 'development':
      return <Lightbulb className="h-5 w-5 text-purple-500" />;
    default:
      return <Lightbulb className="h-5 w-5 text-gray-500" />;
  }
};

export function ResourceAlertBreakdownModal({
  open,
  onOpenChange,
  resourceId,
  resourceName,
  currentPeriod,
  periodFilter = 'thisMonth'
}: ResourceAlertBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Determine period type based on the period label
  const getPeriodType = (label: string) => {
    if (label.includes('Week')) return 'week';
    if (label.includes('Month')) return 'month';
    if (label.includes('Quarter')) return 'quarter';
    if (label.includes('Year')) return 'year';
    return 'week'; // default
  };

  const periodType = getPeriodType(currentPeriod.label);

  // Enhanced period description with current date awareness
  const enhancedPeriodDescription = useMemo(() => {
    const alertsPeriodInfo = getAlertsPeriodInfo(periodFilter, currentPeriod);
    return getAlertsPeriodDescription(alertsPeriodInfo);
  }, [currentPeriod, periodFilter]);

  // Enhanced period display with ISO week numbers
  const enhancePeriodDisplay = useMemo(() => {
    return (period: any) => {
      if (periodType === 'week' && period.startDate) {
        try {
          const startDate = parseISO(period.startDate);
          const weekNumber = getISOWeek(startDate);
          const year = getYear(startDate);
          return `Week ${weekNumber}, ${year}`;
        } catch (error) {
          console.warn('Failed to parse period date:', period.startDate);
          return period.period;
        }
      }
      return period.period;
    };
  }, [periodType]);

  // Find peak week for emphasis (excluding past weeks)
  const findPeakWeek = useMemo(() => {
    return (periods: any[]) => {
      if (!periods || periods.length === 0) return null;

      // BULLETPROOF: Filter out past weeks from peak calculation
      const now = new Date();
      const currentWeekNumber = getISOWeek(now);
      const currentYear = getYear(now);

      const currentAndFuturePeriods = periods.filter(period => {
        if (periodType === 'week' && period.startDate) {
          try {
            const startDate = parseISO(period.startDate);
            const weekNumber = getISOWeek(startDate);
            const year = getYear(startDate);

            // Only include current and future weeks
            if (year > currentYear) return true;
            if (year < currentYear) return false;
            return weekNumber >= currentWeekNumber;
          } catch (error) {
            console.warn('Failed to parse period date for filtering:', period.startDate);
            return true; // Include if we can't parse (fallback)
          }
        }
        return true; // Include non-week periods
      });

      if (currentAndFuturePeriods.length === 0) {
        console.warn('No current or future periods found for peak calculation');
        return null;
      }

      const peakWeek = currentAndFuturePeriods.reduce((peak, current) =>
        current.utilization > peak.utilization ? current : peak
      );

      console.log(`[PEAK_WEEK] Selected peak from ${currentAndFuturePeriods.length}/${periods.length} current/future periods:`,
        enhancePeriodDisplay(peakWeek), `(${peakWeek.utilization}%)`);

      return peakWeek;
    };
  }, [periodType, enhancePeriodDisplay]);

  // Fetch detailed breakdown data
  const { data: breakdown, isLoading, error } = useQuery<PeriodBreakdown>({
    queryKey: ["/api/dashboard/alerts/resource", resourceId, "breakdown", currentPeriod.startDate, currentPeriod.endDate, periodType],
    queryFn: async () => {
      if (!resourceId) throw new Error('No resource ID provided');
      
      const params = new URLSearchParams({
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        periodType
      });
      
      const response = await fetch(`/api/dashboard/alerts/resource/${resourceId}/breakdown?${params}`);
      if (!response.ok) throw new Error('Failed to fetch breakdown data');
      return response.json();
    },
    enabled: open && !!resourceId,
    staleTime: 0,
    refetchOnMount: true,
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Week-Based Alert Analysis
          </DialogTitle>
          <DialogDescription>
            Peak utilization analysis for {resourceName || `Resource ${resourceId}`} during {enhancedPeriodDescription} • Alert category determined by highest weekly utilization
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading detailed breakdown...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load breakdown data</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {breakdown && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="periods">Period Analysis</TabsTrigger>
              <TabsTrigger value="projects">Contributing Projects</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              <TabsContent value="overview" className="space-y-6">
                {/* Executive Summary - Peak Week Focus */}
                {breakdown.periods.length > 0 && (() => {
                  const peakWeek = findPeakWeek(breakdown.periods);
                  const enhancedPeakWeekName = peakWeek ? enhancePeriodDisplay(peakWeek) : '';

                  return (
                    <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                          <AlertTriangle className="h-5 w-5" />
                          Critical Alert: Peak Week Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-white/70 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{enhancedPeakWeekName}</h3>
                              <p className="text-sm text-gray-600">{breakdown.resource.name} • {breakdown.resource.department}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600">{peakWeek?.utilization || 0}%</div>
                              <div className="text-sm text-gray-600">Peak Utilization</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700">Allocated</div>
                              <div className="text-lg font-semibold">{peakWeek?.allocatedHours || 0}h</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Capacity</div>
                              <div className="text-lg font-semibold">{breakdown.resource.effectiveCapacity}h</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Overallocation</div>
                              <div className="text-lg font-semibold text-red-600">
                                +{Math.max(0, (peakWeek?.allocatedHours || 0) - breakdown.resource.effectiveCapacity)}h
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Management Insights */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-2">💡 Management Insights</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• This resource requires immediate attention during {enhancedPeakWeekName}</li>
                            <li>• Consider redistributing {Math.max(0, (peakWeek?.allocatedHours || 0) - breakdown.resource.effectiveCapacity)}h to other team members</li>
                            <li>• Peak utilization of {peakWeek?.utilization || 0}% exceeds sustainable capacity</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Resource Summary Card - Simplified */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Resource Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-600">Resource</div>
                          <div className="text-lg font-semibold">{breakdown.resource.name}</div>
                          <div className="text-sm text-gray-500">{breakdown.resource.department} • {breakdown.resource.role}</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-600">Weekly Capacity</div>
                          <div className="text-lg font-semibold">{breakdown.resource.effectiveCapacity}h effective</div>
                          <div className="text-sm text-gray-500">({breakdown.resource.totalCapacity}h total - {breakdown.resource.nonProjectHours}h non-project)</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Management Summary - Action Oriented */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Period Summary & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">{breakdown.summary.totalPeriods}</div>
                        <div className="text-sm text-gray-600">Total Weeks</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{breakdown.summary.problematicPeriods}</div>
                        <div className="text-sm text-gray-600">Problem Weeks</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{breakdown.summary.totalAllocatedHours}h</div>
                        <div className="text-sm text-gray-600">Total Allocated</div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">🎯 Recommended Actions</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        {breakdown.summary.problematicPeriods > 0 ? (
                          <>
                            <li>• Review project allocations for the {breakdown.summary.problematicPeriods} problematic week{breakdown.summary.problematicPeriods > 1 ? 's' : ''}</li>
                            <li>• Consider redistributing workload to other team members</li>
                            <li>• Evaluate project priorities and deadlines</li>
                          </>
                        ) : (
                          <li>• Resource allocation appears manageable for this period</li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="periods" className="space-y-6">
                {/* Management-Focused Week Analysis */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Weekly Breakdown</h3>
                      <p className="text-sm text-gray-600">Focus on peak week and problematic periods for management decisions</p>
                    </div>
                  </div>
                </div>

                {/* Management-Focused Weekly Summary */}
                <div className="space-y-4">
                  {/* Peak Week Highlight */}
                  {(() => {
                    const peakWeek = findPeakWeek(breakdown.periods);
                    if (!peakWeek) return null;
                    const enhancedPeakWeekName = enhancePeriodDisplay(peakWeek);

                    return (
                      <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Crown className="h-5 w-5 text-amber-600" />
                              <div>
                                <h3 className="text-lg font-semibold text-red-800">Peak Week: {enhancedPeakWeekName}</h3>
                                <p className="text-sm text-red-600">Highest utilization in the period</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600">{peakWeek.utilization}%</div>
                              <div className="text-sm text-gray-600">{peakWeek.allocatedHours}h allocated</div>
                            </div>
                          </div>

                          {/* Capacity Bar */}
                          <div className="relative">
                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                                style={{ width: `${Math.min(100, (peakWeek.allocatedHours / peakWeek.effectiveCapacity) * 100)}%` }}
                              />
                              {peakWeek.utilization > 100 && (
                                <div
                                  className="h-full bg-gradient-to-r from-red-700 to-red-800 absolute top-0"
                                  style={{
                                    left: '100%',
                                    width: `${Math.min(50, ((peakWeek.allocatedHours - peakWeek.effectiveCapacity) / peakWeek.effectiveCapacity) * 100)}%`
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>0h</span>
                              <span>{peakWeek.effectiveCapacity}h capacity</span>
                              <span>{peakWeek.allocatedHours}h allocated</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Other Problematic Weeks */}
                  {breakdown.periods.filter(period => {
                    const peakWeek = findPeakWeek(breakdown.periods);
                    return period.utilization >= 90 && period.period !== peakWeek?.period;
                  }).map((period, index) => {
                    const enhancedPeriodName = enhancePeriodDisplay(period);

                    return (
                      <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-yellow-800">{enhancedPeriodName}</h4>
                              <p className="text-sm text-yellow-600">Near capacity - monitor closely</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-yellow-700">{period.utilization}%</div>
                              <div className="text-sm text-gray-600">{period.allocatedHours}h</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Show All Weeks Toggle */}
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="p-4 text-center">
                      <Button
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-800"
                        onClick={() => {
                          // This would expand to show all weeks - for now just a placeholder
                          console.log('Show all weeks clicked');
                        }}
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        View All {breakdown.periods.length} Weeks
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <div className="space-y-3">
                  {breakdown.contributingProjects.map((project, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{project.projectName}</h4>
                          <Badge variant="outline">{project.totalHours}h total</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {project.allocations.length} allocation{project.allocations.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-1">
                          {project.allocations.map((allocation, aIndex) => (
                            <div key={aIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span>{allocation.role}</span>
                              <span>{allocation.allocatedHours}h</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {breakdown.recommendations.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Recommendations Available</h3>
                      <p className="text-sm text-gray-500">
                        Resource utilization appears to be within normal parameters.
                        Check back if allocation patterns change.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Summary Header */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Lightbulb className="h-6 w-6 text-blue-600" />
                          <div>
                            <h3 className="font-semibold text-blue-900">
                              {breakdown.recommendations.length} Recommendation{breakdown.recommendations.length !== 1 ? 's' : ''} Available
                            </h3>
                            <p className="text-sm text-blue-700">
                              Based on {breakdown.summary.overallUtilization}% utilization analysis
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recommendations List */}
                    <div className="space-y-3">
                      {breakdown.recommendations.map((rec, index) => (
                        <Card key={index} className={cn(
                          "transition-all duration-200 hover:shadow-md",
                          rec.priority === 'critical' ? "border-red-200 bg-red-50" :
                          rec.priority === 'high' ? "border-red-100 bg-red-25" :
                          rec.priority === 'medium' ? "border-yellow-100 bg-yellow-25" :
                          "border-blue-100 bg-blue-25"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {getRecommendationIcon(rec.type)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                                  <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{rec.description}</p>

                                {/* Action indicators for high priority items */}
                                {(rec.priority === 'critical' || rec.priority === 'high') && (
                                  <div className="mt-3 p-2 bg-white rounded border-l-4 border-red-400">
                                    <div className="flex items-center gap-2 text-xs text-red-700">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-medium">Action Required</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
