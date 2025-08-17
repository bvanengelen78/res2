import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Eye, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { ResourceAllocation, Project, Resource } from "@shared/schema";
import { Link } from "wouter";

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
  weeklyAllocations?: Record<string, number>;
}

interface ProjectSummary {
  project: Project;
  allocation: AllocationWithProject;
  totalHours: number;
  averageWeeklyHours: number;
  weeksWithData: number;
  utilizationPercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface ResourceAllocationSummaryProps {
  allocations: AllocationWithProject[];
  resource: Resource;
  onViewDetails: (projectId?: number) => void;
}

export function ResourceAllocationSummary({ 
  allocations, 
  resource, 
  onViewDetails 
}: ResourceAllocationSummaryProps) {
  
  // Calculate project summaries
  const projectSummaries = useMemo(() => {
    const summaries: ProjectSummary[] = [];
    
    allocations.forEach(allocation => {
      const weeklyData = allocation.weeklyAllocations || {};
      const weeklyHours = Object.values(weeklyData);
      
      const totalHours = weeklyHours.reduce((sum, hours) => sum + hours, 0);
      const weeksWithData = weeklyHours.filter(hours => hours > 0).length;
      const averageWeeklyHours = weeksWithData > 0 ? totalHours / weeksWithData : 0;
      
      // Calculate utilization as percentage of resource capacity
      const resourceCapacity = parseFloat(resource.weeklyCapacity);
      const utilizationPercent = resourceCapacity > 0 ? (averageWeeklyHours / resourceCapacity) * 100 : 0;
      
      // Simple trend calculation (compare first half vs second half of weeks)
      const firstHalf = weeklyHours.slice(0, Math.floor(weeklyHours.length / 2));
      const secondHalf = weeklyHours.slice(Math.floor(weeklyHours.length / 2));
      const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, h) => sum + h, 0) / firstHalf.length : 0;
      const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, h) => sum + h, 0) / secondHalf.length : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up';
      else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down';
      
      summaries.push({
        project: allocation.project,
        allocation,
        totalHours,
        averageWeeklyHours,
        weeksWithData,
        utilizationPercent,
        trend
      });
    });
    
    return summaries.sort((a, b) => b.totalHours - a.totalHours); // Sort by total hours desc
  }, [allocations, resource.weeklyCapacity]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalAllocatedHours = projectSummaries.reduce((sum, p) => sum + p.totalHours, 0);
    const averageUtilization = projectSummaries.length > 0 
      ? projectSummaries.reduce((sum, p) => sum + p.utilizationPercent, 0) / projectSummaries.length 
      : 0;
    
    return {
      totalProjects: projectSummaries.length,
      totalAllocatedHours,
      averageUtilization
    };
  }, [projectSummaries]);

  if (projectSummaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No active project allocations</p>
            <p className="text-sm">Allocation summaries will appear when projects are assigned</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Allocations
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Overview of resource allocation across {overallStats.totalProjects} active project{overallStats.totalProjects !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails()}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Weekly Details
          </Button>
        </div>
        
        {/* Overall Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-blue-900">{overallStats.totalAllocatedHours}h</div>
            <div className="text-xs text-blue-600">Total Allocated</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-blue-900">{Math.round(overallStats.averageUtilization)}%</div>
            <div className="text-xs text-blue-600">Avg Utilization</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-blue-900">{overallStats.totalProjects}</div>
            <div className="text-xs text-blue-600">Active Projects</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectSummaries.map((summary) => (
            <ProjectSummaryCard 
              key={summary.project.id}
              summary={summary}
              onViewDetails={() => onViewDetails(summary.project.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectSummaryCardProps {
  summary: ProjectSummary;
  onViewDetails: () => void;
}

// Simple sparkline component
function Sparkline({ data, className = "" }: { data: number[], className?: string }) {
  if (data.length < 2) return null;

  const width = 60;
  const height = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

function ProjectSummaryCard({ summary, onViewDetails }: ProjectSummaryCardProps) {
  const { project, allocation, totalHours, averageWeeklyHours, utilizationPercent, trend } = summary;

  // Generate sparkline data from weekly allocations
  const sparklineData = useMemo(() => {
    const weeklyData = allocation.weeklyAllocations || {};
    const values = Object.values(weeklyData);
    // Take every 4th week to reduce noise and show general trend
    return values.filter((_, index) => index % 4 === 0).slice(0, 12);
  }, [allocation.weeklyAllocations]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent > 100) return 'text-red-600';
    if (percent > 80) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300">
      <CardContent className="p-4">
        {/* Project Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${getStatusColor(allocation.status)}`}>
                {allocation.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                {allocation.status}
              </Badge>
              <Link href={`/projects/${project.id}`}>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Trend Indicator with Sparkline */}
          <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center text-xs ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
            </div>
            {sparklineData.length > 1 && (
              <Sparkline
                data={sparklineData}
                className={`${
                  trend === 'up' ? 'text-green-500' :
                  trend === 'down' ? 'text-red-500' :
                  'text-gray-400'
                }`}
              />
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Hours</span>
            <span className="font-semibold">{totalHours}h</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg Weekly</span>
            <span className="font-semibold">{Math.round(averageWeeklyHours * 10) / 10}h</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Utilization</span>
            <span className={`font-semibold ${getUtilizationColor(utilizationPercent)}`}>
              {Math.round(utilizationPercent)}%
            </span>
          </div>
          
          {/* Utilization Progress Bar */}
          <div className="space-y-1">
            <Progress 
              value={Math.min(utilizationPercent, 100)} 
              className="h-2"
            />
            {utilizationPercent > 100 && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                Over-allocated
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onViewDetails}
          className="w-full mt-4 text-xs"
        >
          <Clock className="h-3 w-3 mr-1" />
          Weekly Breakdown
        </Button>
      </CardContent>
    </Card>
  );
}
