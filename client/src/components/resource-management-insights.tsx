import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResourceAllocation, Project, Resource } from "@shared/schema";
import { Link } from "wouter";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ExternalLink, BarChart3, Calendar, Users } from "lucide-react";

interface ResourceManagementInsightsProps {
  resourceId: number;
  resource: Resource;
}

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
  weeklyAllocations?: Record<string, number>;
}

interface ManagementMetrics {
  averageWeeklyAllocation: number;
  overbookedWeeks: number;
  underutilizedWeeks: number;
  maxWeeklyAllocation: number;
  activeProjects: number;
  totalWeeks: number;
  capacityUtilization: number;
  weeklyTrend: number[];
}

export function ResourceManagementInsights({ resourceId, resource }: ResourceManagementInsightsProps) {
  // Fetch allocations for this resource
  const { data: allocations = [], isLoading } = useQuery<AllocationWithProject[]>({
    queryKey: ["/api/resources", resourceId, "allocations"],
  });

  // Filter to active allocations only
  const activeAllocations = useMemo(() => {
    return allocations.filter(allocation => allocation.status === 'active');
  }, [allocations]);

  // Calculate management metrics
  const metrics = useMemo((): ManagementMetrics => {
    if (activeAllocations.length === 0) {
      return {
        averageWeeklyAllocation: 0,
        overbookedWeeks: 0,
        underutilizedWeeks: 0,
        maxWeeklyAllocation: 0,
        activeProjects: 0,
        totalWeeks: 0,
        capacityUtilization: 0,
        weeklyTrend: [],
      };
    }

    const capacity = parseFloat(resource.weeklyCapacity);
    const currentYear = new Date().getFullYear();
    
    // Collect all weekly totals
    const weeklyTotals: Record<string, number> = {};
    const weeklyTrendData: number[] = [];
    
    activeAllocations.forEach(allocation => {
      const weeklyAllocations = allocation.weeklyAllocations || {};
      Object.entries(weeklyAllocations).forEach(([weekKey, hours]) => {
        if (weekKey.startsWith(currentYear.toString())) {
          weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + hours;
        }
      });
    });

    const weeklyValues = Object.values(weeklyTotals);
    const totalWeeks = weeklyValues.length;
    
    // Calculate metrics
    const averageWeeklyAllocation = totalWeeks > 0 ? weeklyValues.reduce((sum, val) => sum + val, 0) / totalWeeks : 0;
    const maxWeeklyAllocation = totalWeeks > 0 ? Math.max(...weeklyValues) : 0;
    const overbookedWeeks = weeklyValues.filter(val => val > capacity).length;
    const underutilizedWeeks = weeklyValues.filter(val => val < capacity * 0.5).length;
    const capacityUtilization = capacity > 0 ? (averageWeeklyAllocation / capacity) * 100 : 0;

    // Generate trend data for last 12 weeks
    const sortedWeeks = Object.keys(weeklyTotals).sort();
    const last12Weeks = sortedWeeks.slice(-12);
    const trendData = last12Weeks.map(week => weeklyTotals[week] || 0);

    return {
      averageWeeklyAllocation,
      overbookedWeeks,
      underutilizedWeeks,
      maxWeeklyAllocation,
      activeProjects: activeAllocations.length,
      totalWeeks,
      capacityUtilization,
      weeklyTrend: trendData,
    };
  }, [activeAllocations, resource.weeklyCapacity]);

  // Simple sparkline component
  const Sparkline = ({ data, className = "" }: { data: number[]; className?: string }) => {
    if (data.length === 0) return <div className="h-8 w-16 bg-gray-100 rounded"></div>;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className={`flex items-end h-8 w-16 gap-0.5 ${className}`}>
        {data.map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className="bg-blue-500 rounded-sm flex-1 min-h-[2px]"
              style={{ height: `${Math.max(height, 6)}%` }}
              title={`Week ${index + 1}: ${value.toFixed(1)}h`}
            />
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (activeAllocations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>No active allocations</p>
        <p className="text-sm">Management insights will appear when allocations are added</p>
      </div>
    );
  }

  const getStatusColor = (value: number, threshold: number, isInverse = false) => {
    if (isInverse) {
      return value <= threshold ? 'text-green-600' : 'text-red-600';
    }
    return value >= threshold ? 'text-red-600' : value >= threshold * 0.8 ? 'text-amber-600' : 'text-green-600';
  };

  const getStatusIcon = (value: number, threshold: number, isInverse = false) => {
    if (isInverse) {
      return value <= threshold ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return value >= threshold ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Average Weekly Allocation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">🧠 Average Weekly Allocation</p>
                <p className="text-2xl font-bold">{metrics.averageWeeklyAllocation.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">
                  {metrics.capacityUtilization.toFixed(1)}% of capacity
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Overbooked Weeks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">🚨 Overbooked Weeks</p>
                <p className="text-2xl font-bold">{metrics.overbookedWeeks}</p>
                <p className="text-xs text-gray-500">
                  out of {metrics.totalWeeks} weeks
                </p>
              </div>
              {getStatusIcon(metrics.overbookedWeeks, 1, true)}
            </div>
          </CardContent>
        </Card>

        {/* Underutilized Weeks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">🔍 Underutilized Weeks</p>
                <p className="text-2xl font-bold">{metrics.underutilizedWeeks}</p>
                <p className="text-xs text-gray-500">
                  &lt;50% capacity used
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Max Weekly Allocation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">📈 Max Weekly Allocation</p>
                <p className="text-2xl font-bold">{metrics.maxWeeklyAllocation.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">
                  Peak week allocation
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">📅 Active Projects</p>
                <p className="text-2xl font-bold">{metrics.activeProjects}</p>
                <p className="text-xs text-gray-500">
                  Current assignments
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Capacity Trend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">📊 Capacity Trend</p>
                <p className="text-xs text-gray-500 mb-2">Last 12 weeks</p>
                <Sparkline data={metrics.weeklyTrend} />
              </div>
              <Calendar className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
