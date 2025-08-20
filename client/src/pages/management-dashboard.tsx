import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';
import { GreetingHeader } from '@/components/greeting-header';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
  BarChart3,
  Clock,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Enhanced KPI Card with sparklines and navigation
interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  sparklineData?: number[];
  viewMoreLink?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  description,
  sparklineData,
  viewMoreLink
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-500 dark:text-green-400';
      case 'down': return 'text-red-500 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const handleViewMore = () => {
    if (viewMoreLink) {
      const element = document.getElementById(viewMoreLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Card className="kpi-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {sparklineData && (
            <Sparkline
              data={sparklineData}
              className="h-6 w-12"
              strokeColor="var(--primary)"
            />
          )}
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center justify-between mt-1">
          {change && (
            <div className={`flex items-center text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1">{change}</span>
            </div>
          )}
          {viewMoreLink && (
            <button
              onClick={handleViewMore}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              View more
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

// KPI Response interface
interface KPIResponse {
  current_value: number;
  previous_value: number;
  trend_data: number[];
  period_label: string;
}

const mockUtilizationTrend = [
  { month: 'Jan', utilization: 82 },
  { month: 'Feb', utilization: 85 },
  { month: 'Mar', utilization: 88 },
  { month: 'Apr', utilization: 87 },
  { month: 'May', utilization: 89 },
  { month: 'Jun', utilization: 87 }
];

const mockCapacityData = [
  { week: 'W1', demand: 120, capacity: 100 },
  { week: 'W2', demand: 110, capacity: 105 },
  { week: 'W3', demand: 130, capacity: 100 },
  { week: 'W4', demand: 125, capacity: 110 },
  { week: 'W5', demand: 115, capacity: 100 },
  { week: 'W6', demand: 140, capacity: 105 }
];

const mockOvertimeCost = [
  { month: 'Jan', cost: 15000 },
  { month: 'Feb', cost: 18000 },
  { month: 'Mar', cost: 22000 },
  { month: 'Apr', cost: 19000 },
  { month: 'May', cost: 25000 },
  { month: 'Jun', cost: 21000 }
];

const mockSkillsGap = [
  { skill: 'React', available: 8, required: 12 },
  { skill: 'Node.js', available: 6, required: 8 },
  { skill: 'Python', available: 4, required: 6 },
  { skill: 'DevOps', available: 3, required: 7 },
  { skill: 'UI/UX', available: 5, required: 5 }
];

const mockAtRiskProjects = [
  { name: 'Project Alpha', risk: 'High', utilization: 105, deadline: '2024-02-15' },
  { name: 'Project Beta', risk: 'Medium', utilization: 98, deadline: '2024-03-01' },
  { name: 'Project Gamma', risk: 'High', utilization: 110, deadline: '2024-02-28' },
  { name: 'Project Delta', risk: 'Low', utilization: 85, deadline: '2024-03-15' }
];

export default function ManagementDashboard() {
  const [timeRange, setTimeRange] = useState('6months');

  // Real API queries for KPI data
  const { data: activeProjectsData, isLoading: activeProjectsLoading } = useQuery({
    queryKey: ['active-projects-trend'],
    queryFn: async () => {
      return await apiRequest('/api/management-dashboard/active-projects-trend') as KPIResponse;
    }
  });

  const { data: underUtilisedData, isLoading: underUtilisedLoading } = useQuery({
    queryKey: ['under-utilised-resources'],
    queryFn: async () => {
      return await apiRequest('/api/management-dashboard/under-utilised-resources') as KPIResponse;
    }
  });

  const { data: overUtilisedData, isLoading: overUtilisedLoading } = useQuery({
    queryKey: ['over-utilised-resources'],
    queryFn: async () => {
      return await apiRequest('/api/management-dashboard/over-utilised-resources') as KPIResponse;
    }
  });

  const { data: utilisationRateData, isLoading: utilisationRateLoading } = useQuery({
    queryKey: ['utilisation-rate-trend'],
    queryFn: async () => {
      return await apiRequest('/api/management-dashboard/utilisation-rate-trend') as KPIResponse;
    }
  });

  // Mock data for deep-dive widgets (keep existing for now)
  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['utilization-trend'],
    queryFn: () => Promise.resolve(mockUtilizationTrend)
  });

  const { data: capacityData, isLoading: capacityLoading } = useQuery({
    queryKey: ['capacity-data'],
    queryFn: () => Promise.resolve(mockCapacityData)
  });

  const { data: overtimeData, isLoading: overtimeLoading } = useQuery({
    queryKey: ['overtime-cost'],
    queryFn: () => Promise.resolve(mockOvertimeCost)
  });

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills-gap'],
    queryFn: () => Promise.resolve(mockSkillsGap)
  });

  const { data: atRiskData, isLoading: atRiskLoading } = useQuery({
    queryKey: ['at-risk-projects'],
    queryFn: () => Promise.resolve(mockAtRiskProjects)
  });

  const isLoading = activeProjectsLoading || underUtilisedLoading || overUtilisedLoading ||
                   utilisationRateLoading || utilizationLoading || capacityLoading ||
                   overtimeLoading || skillsLoading || atRiskLoading;

  if (isLoading) {
    return (
      <div className="dashboard-blue-theme min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-80" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-blue-theme min-h-screen bg-background" data-testid="management-dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Personalized Greeting Header */}
        <GreetingHeader />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Management Dashboard</h1>
            <p className="text-muted-foreground">Resource planning and utilization overview</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '6months' ? 'default' : 'outline'}
              onClick={() => setTimeRange('6months')}
              size="sm"
            >
              6 Months
            </Button>
            <Button
              variant={timeRange === 'ytd' ? 'default' : 'outline'}
              onClick={() => setTimeRange('ytd')}
              size="sm"
            >
              YTD
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Projects"
            value={activeProjectsData?.current_value || 0}
            change={`${((activeProjectsData?.current_value || 0) - (activeProjectsData?.previous_value || 0) > 0 ? '+' : '')}${((activeProjectsData?.current_value || 0) - (activeProjectsData?.previous_value || 0))} ${activeProjectsData?.period_label || ''}`}
            trend={((activeProjectsData?.current_value || 0) - (activeProjectsData?.previous_value || 0)) > 0 ? 'up' : 'down'}
            icon={<Briefcase className="h-4 w-4" />}
            sparklineData={activeProjectsData?.trend_data}
            viewMoreLink="capacity-demand"
          />
          <KPICard
            title="Under-utilised (<80%)"
            value={underUtilisedData?.current_value || 0}
            change={`${((underUtilisedData?.current_value || 0) - (underUtilisedData?.previous_value || 0) > 0 ? '+' : '')}${((underUtilisedData?.current_value || 0) - (underUtilisedData?.previous_value || 0))} ${underUtilisedData?.period_label || ''}`}
            trend={((underUtilisedData?.current_value || 0) - (underUtilisedData?.previous_value || 0)) < 0 ? 'up' : 'down'}
            icon={<Users className="h-4 w-4" />}
            description="Resources below capacity"
            sparklineData={underUtilisedData?.trend_data}
            viewMoreLink="utilization-trend"
          />
          <KPICard
            title="Over-utilised (>100%)"
            value={overUtilisedData?.current_value || 0}
            change={`${((overUtilisedData?.current_value || 0) - (overUtilisedData?.previous_value || 0) > 0 ? '+' : '')}${((overUtilisedData?.current_value || 0) - (overUtilisedData?.previous_value || 0))} ${overUtilisedData?.period_label || ''}`}
            trend={((overUtilisedData?.current_value || 0) - (overUtilisedData?.previous_value || 0)) < 0 ? 'up' : 'down'}
            icon={<TrendingUp className="h-4 w-4" />}
            description="Resources over capacity"
            sparklineData={overUtilisedData?.trend_data}
            viewMoreLink="overtime-cost"
          />
          <KPICard
            title="Avg Utilisation Rate"
            value={`${utilisationRateData?.current_value || 0}%`}
            change={`${((utilisationRateData?.current_value || 0) - (utilisationRateData?.previous_value || 0) > 0 ? '+' : '')}${((utilisationRateData?.current_value || 0) - (utilisationRateData?.previous_value || 0)).toFixed(1)}% ${utilisationRateData?.period_label || ''}`}
            trend={((utilisationRateData?.current_value || 0) - (utilisationRateData?.previous_value || 0)) > 0 ? 'up' : 'down'}
            icon={<Activity className="h-4 w-4" />}
            sparklineData={utilisationRateData?.trend_data}
            viewMoreLink="utilization-trend"
          />
        </div>

        {/* Deep-dive Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capacity vs Demand Chart */}
          <Card className="widget-card" id="capacity-demand">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Capacity vs Demand (6 weeks)
              </CardTitle>
              <CardDescription>
                Resource capacity compared to project demand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Bar dataKey="capacity" fill="var(--chart-1)" name="Capacity" />
                  <Bar dataKey="demand" fill="var(--chart-2)" name="Demand" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Utilization Trend */}
          <Card className="widget-card" id="utilization-trend">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Utilization Trend (YTD)
              </CardTitle>
              <CardDescription>
                Monthly utilization rate trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="utilization"
                    stroke="var(--chart-3)"
                    fill="var(--chart-3)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Second Row of Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overtime Cost */}
          <Card className="widget-card" id="overtime-cost">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Overtime Cost (YTD)
              </CardTitle>
              <CardDescription>
                Monthly overtime expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={overtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)'
                    }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Overtime Cost']}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--chart-4)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Skills Gap Snapshot */}
          <Card className="widget-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skills Gap Snapshot
              </CardTitle>
              <CardDescription>
                Available vs required skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={skillsData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" />
                  <YAxis dataKey="skill" type="category" stroke="var(--muted-foreground)" width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Bar dataKey="available" fill="var(--chart-1)" name="Available" />
                  <Bar dataKey="required" fill="var(--chart-5)" name="Required" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* At-Risk Projects */}
          <Card className="widget-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                At-Risk Projects
              </CardTitle>
              <CardDescription>
                Projects requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskData?.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={project.risk === 'High' ? 'destructive' : project.risk === 'Medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {project.risk}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {project.utilization}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
