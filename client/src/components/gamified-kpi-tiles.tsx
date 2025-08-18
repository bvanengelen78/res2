import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Target,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  Eye,
  Award,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Gamepad2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// Types for gamified metrics
interface GamifiedMetrics {
  capacityHero: {
    conflictsCount: number;
    badgeLevel: 'gold' | 'silver' | 'bronze' | 'none';
    periodLabel: string;
  };
  forecastAccuracy: {
    percentage: number;
    trend: number[];
    color: 'green' | 'yellow' | 'red';
  };
  resourceHealth: {
    score: number;
    status: 'good' | 'watch' | 'critical';
  };
  projectLeaderboard: Array<{
    name: string;
    variance: number;
    isAtRisk: boolean;
  }>;
  firefighterAlerts: {
    resolved: number;
    delta: number;
    trend: 'up' | 'down' | 'neutral';
  };
  continuousImprovement: {
    delta: number;
    trend: 'up' | 'down';
  };
  crystalBall: {
    daysUntilConflict: number;
    confidence: number;
  };
}

interface GamifiedKpiTilesProps {
  currentPeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  isInitialLoad?: boolean;
  isTransitioning?: boolean;
  className?: string;
}

// Skeleton component for loading states
const TileSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("bg-white rounded-xl shadow-sm p-6 h-[200px] animate-pulse", className)}>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-16 bg-gray-200 rounded"></div>
    </div>
  </Card>
);

// Confetti animation component for celebrations
const ConfettiAnimation = ({ isVisible }: { isVisible: boolean }) => {
  const confettiParticles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.05,
    angle: (i * 30) + Math.random() * 15,
    distance: 60 + Math.random() * 40,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
    size: Math.random() * 4 + 2,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
              animate={{
                scale: [0, 1, 0.8, 0],
                opacity: [0, 1, 0.8, 0],
                x: [0, Math.cos(particle.angle * Math.PI / 180) * particle.distance],
                y: [0, Math.sin(particle.angle * Math.PI / 180) * particle.distance],
                rotate: [0, 360],
                transition: { duration: 0.8, delay: particle.delay, ease: "easeOut" }
              }}
              className="absolute top-1/2 left-1/2 rounded-full"
              style={{
                backgroundColor: particle.color,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                marginTop: `-${particle.size / 2}px`,
                marginLeft: `-${particle.size / 2}px`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

// Animated counter hook
const useAnimatedCounter = (endValue: number, duration: number = 1000, decimals: number = 0) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = endValue * easeOutQuart;
      
      setCount(currentCount);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return decimals > 0 ? count.toFixed(decimals) : Math.round(count);
};

// Individual Tile Components

// 1. Capacity Hero Badge
interface CapacityHeroBadgeProps {
  data: GamifiedMetrics['capacityHero'];
  showCelebration: boolean;
  isInitialLoad: boolean;
  index: number;
}

const CapacityHeroBadge = ({ data, showCelebration, isInitialLoad, index }: CapacityHeroBadgeProps) => {
  const getBadgeConfig = (level: string) => {
    switch (level) {
      case 'gold':
        return {
          color: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
          icon: Trophy,
          text: 'Gold Hero',
          textColor: 'text-yellow-800'
        };
      case 'silver':
        return {
          color: 'bg-gradient-to-br from-gray-300 to-gray-500',
          icon: Award,
          text: 'Silver Hero',
          textColor: 'text-gray-700'
        };
      case 'bronze':
        return {
          color: 'bg-gradient-to-br from-orange-400 to-orange-600',
          icon: Award,
          text: 'Bronze Hero',
          textColor: 'text-orange-800'
        };
      default:
        return {
          color: 'bg-gradient-to-br from-gray-200 to-gray-400',
          icon: Shield,
          text: 'Working On It',
          textColor: 'text-gray-600'
        };
    }
  };

  const badgeConfig = getBadgeConfig(data.badgeLevel);
  const Icon = badgeConfig.icon;
  const animatedCount = useAnimatedCounter(data.conflictsCount, 800);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Capacity Hero</h3>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", badgeConfig.color)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Badge Level */}
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className={cn("text-lg font-bold mb-2", badgeConfig.textColor)}>
                {badgeConfig.text}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {animatedCount} conflicts
              </div>
              <div className="text-xs text-gray-500">
                {data.periodLabel}
              </div>
            </div>

            {/* Celebration Animation */}
            <ConfettiAnimation isVisible={showCelebration && data.badgeLevel === 'gold'} />
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Achieve zero capacity conflicts to earn the Gold Hero badge!</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 2. Forecast Accuracy
interface ForecastAccuracyTileProps {
  data: GamifiedMetrics['forecastAccuracy'];
  isInitialLoad: boolean;
  index: number;
}

const ForecastAccuracyTile = ({ data, isInitialLoad, index }: ForecastAccuracyTileProps) => {
  const animatedPercentage = useAnimatedCounter(data.percentage, 1000, 1);

  const getColorConfig = (color: string) => {
    switch (color) {
      case 'green':
        return { bg: 'bg-green-100', text: 'text-green-700', stroke: '#10b981' };
      case 'yellow':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', stroke: '#f59e0b' };
      case 'red':
        return { bg: 'bg-red-100', text: 'text-red-700', stroke: '#ef4444' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', stroke: '#6b7280' };
    }
  };

  const colorConfig = getColorConfig(data.color);
  const chartData = (data.trend || []).map((value, index) => ({ value, index }));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Forecast Accuracy</h3>
              <div className={cn("px-2 py-1 rounded-full text-xs font-medium", colorConfig.bg, colorConfig.text)}>
                {data.color.toUpperCase()}
              </div>
            </div>

            {/* Percentage */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {animatedPercentage}%
              </div>

              {/* Mini Sparkline */}
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colorConfig.stroke} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={colorConfig.stroke} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={colorConfig.stroke}
                      strokeWidth={2}
                      fill="url(#forecastGradient)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Last 8 weeks trend
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Planning accuracy: 1 - |planned - actual| / planned hours</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 3. Resource Health Meter
interface ResourceHealthMeterProps {
  data: GamifiedMetrics['resourceHealth'];
  isInitialLoad: boolean;
  index: number;
}

const ResourceHealthMeter = ({ data, isInitialLoad, index }: ResourceHealthMeterProps) => {
  const animatedScore = useAnimatedCounter(data.score, 1200);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'good':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          stroke: '#10b981',
          label: 'Good Health'
        };
      case 'watch':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          stroke: '#f59e0b',
          label: 'Watch'
        };
      case 'critical':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          stroke: '#ef4444',
          label: 'Critical'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          stroke: '#6b7280',
          label: 'Unknown'
        };
    }
  };

  const statusConfig = getStatusConfig(data.status);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (data.score / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Resource Health</h3>
              <div className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </div>
            </div>

            {/* Circular Progress */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={statusConfig.stroke}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{animatedScore}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Composite health score from utilization and conflicts</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 4. Project Leaderboard
interface ProjectLeaderboardProps {
  data: GamifiedMetrics['projectLeaderboard'];
  isInitialLoad: boolean;
  index: number;
}

const ProjectLeaderboard = ({ data, isInitialLoad, index }: ProjectLeaderboardProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Project Leaderboard</h3>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>

            {/* Top Projects */}
            <div className="flex-1 space-y-1 overflow-hidden">
              {(data || []).slice(0, 5).map((project, idx) => (
                <div key={project.name} className="flex items-center justify-between text-sm min-h-[24px] py-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-400 w-4 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium text-gray-900 leading-tight">
                      {project.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={cn(
                      "text-xs font-medium leading-tight",
                      project.variance < 5 ? "text-green-600" :
                      project.variance < 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {project.variance.toFixed(1)}%
                    </span>
                    {project.isAtRisk && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5 leading-tight">
                        At Risk
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {(!data || data.length === 0) && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No projects to rank
                </div>
              )}
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Top 5 projects ranked by lowest variance between planned vs actual hours</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 5. Firefighter Alerts
interface FirefighterAlertsProps {
  data: GamifiedMetrics['firefighterAlerts'];
  isInitialLoad: boolean;
  index: number;
}

const FirefighterAlerts = ({ data, isInitialLoad, index }: FirefighterAlertsProps) => {
  const animatedResolved = useAnimatedCounter(data.resolved, 800);
  const TrendIcon = data.trend === 'up' ? ArrowUp : data.trend === 'down' ? ArrowDown : null;
  const trendColor = data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Firefighter Alerts</h3>
              <Zap className="w-4 h-4 text-orange-500" />
            </div>

            {/* Resolved Count */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {animatedResolved}
              </div>

              {/* Delta */}
              <div className="flex items-center space-x-1">
                {TrendIcon && <TrendIcon className={cn("w-4 h-4", trendColor)} />}
                <span className={cn("text-sm font-medium", trendColor)}>
                  {data.delta > 0 ? '+' : ''}{data.delta} this period
                </span>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Critical alerts resolved
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Count of critical capacity alerts resolved this period</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 6. Continuous Improvement
interface ContinuousImprovementProps {
  data: GamifiedMetrics['continuousImprovement'];
  isInitialLoad: boolean;
  index: number;
}

const ContinuousImprovement = ({ data, isInitialLoad, index }: ContinuousImprovementProps) => {
  const TrendIcon = data.trend === 'up' ? TrendingUp : ArrowDown;
  const isImproving = data.trend === 'up';
  const trendColor = isImproving ? 'text-green-600' : 'text-red-600';
  const bgColor = isImproving ? 'bg-green-100' : 'bg-red-100';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Continuous Improvement</h3>
              <div className={cn("p-2 rounded-full", bgColor)}>
                <TrendIcon className={cn("w-4 h-4", trendColor)} />
              </div>
            </div>

            {/* Improvement Metric */}
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className={cn("text-2xl font-bold mb-2", trendColor)}>
                {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mb-1">
                {isImproving ? 'Improvement' : 'Regression'}
              </div>
              <div className="text-xs text-gray-500">
                vs last month
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Planning accuracy improvement trend vs previous month</p>
      </TooltipContent>
    </Tooltip>
  );
};

// 7. Crystal Ball Prediction
interface CrystalBallPredictionProps {
  data: GamifiedMetrics['crystalBall'];
  isInitialLoad: boolean;
  index: number;
}

const CrystalBallPrediction = ({ data, isInitialLoad, index }: CrystalBallPredictionProps) => {
  const animatedDays = useAnimatedCounter(data.daysUntilConflict, 1000);

  const getUrgencyConfig = (days: number) => {
    if (days <= 7) {
      return { color: 'text-red-600', bg: 'bg-red-100', urgency: 'Critical' };
    } else if (days <= 14) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', urgency: 'Warning' };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100', urgency: 'Good' };
    }
  };

  const urgencyConfig = getUrgencyConfig(data.daysUntilConflict);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "bg-white rounded-xl shadow-sm p-6 h-[200px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
          isInitialLoad && `gamified-tile-entrance stagger-delay-${index}`
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Crystal Ball</h3>
              <div className={cn("p-2 rounded-full", urgencyConfig.bg)}>
                <Eye className={cn("w-4 h-4", urgencyConfig.color)} />
              </div>
            </div>

            {/* Prediction */}
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {animatedDays} days
              </div>
              <div className="text-sm text-gray-600 mb-2">
                until next conflict
              </div>

              {/* Confidence & Urgency */}
              <div className="space-y-1">
                <div className={cn("text-xs font-medium px-2 py-1 rounded-full", urgencyConfig.bg, urgencyConfig.color)}>
                  {urgencyConfig.urgency}
                </div>
                <div className="text-xs text-gray-500">
                  {data.confidence}% confidence
                </div>
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Predictive analytics based on current allocation trends</p>
      </TooltipContent>
    </Tooltip>
  );
};

export function GamifiedKpiTiles({ 
  currentPeriod, 
  isInitialLoad = false, 
  isTransitioning = false,
  className 
}: GamifiedKpiTilesProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch gamified metrics data
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard", "gamified-metrics", currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'gamified-metrics');
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      const response = await fetch(`/api/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch gamified metrics');
      return response.json() as GamifiedMetrics;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Trigger celebration for gold badge
  useEffect(() => {
    if (metrics?.capacityHero.badgeLevel === 'gold' && !showCelebration) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [metrics?.capacityHero.badgeLevel]);

  if (isLoading || isTransitioning) {
    return (
      <div className={className}>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Gamified Insights
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {currentPeriod.label} - Interactive performance metrics and achievements
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 7 }).map((_, index) => (
                <TileSkeleton
                  key={index}
                  className={isInitialLoad ? `gamified-tile-entrance stagger-delay-${index}` : ''}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={className}>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Gamified Insights
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {currentPeriod.label} - Error loading performance metrics
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center justify-center h-32 text-gray-500">
              <AlertTriangle className="h-6 w-6 mr-2" />
              Unable to load gamified metrics
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={className}>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Gamified Insights
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {currentPeriod.label} - Interactive performance metrics and achievements
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            {/* Content with transition effects */}
            <div className={cn(
              "transition-all duration-300",
              isTransitioning ? "opacity-80" : "opacity-100"
            )}>
              {/* Tiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Capacity Hero Badge */}
          <CapacityHeroBadge
            data={metrics.capacityHero}
            showCelebration={showCelebration}
            isInitialLoad={isInitialLoad}
            index={0}
          />

          {/* Forecast Accuracy */}
          <ForecastAccuracyTile
            data={metrics.forecastAccuracy}
            isInitialLoad={isInitialLoad}
            index={1}
          />

          {/* Resource Health Meter */}
          <ResourceHealthMeter
            data={metrics.resourceHealth}
            isInitialLoad={isInitialLoad}
            index={2}
          />

          {/* Project Leaderboard */}
          <ProjectLeaderboard
            data={metrics.projectLeaderboard}
            isInitialLoad={isInitialLoad}
            index={3}
          />

          {/* Firefighter Alerts */}
          <FirefighterAlerts
            data={metrics.firefighterAlerts}
            isInitialLoad={isInitialLoad}
            index={4}
          />

          {/* Continuous Improvement */}
          <ContinuousImprovement
            data={metrics.continuousImprovement}
            isInitialLoad={isInitialLoad}
            index={5}
          />

          {/* Crystal Ball */}
          <CrystalBallPrediction
            data={metrics.crystalBall}
            isInitialLoad={isInitialLoad}
            index={6}
          />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </TooltipProvider>
  );
}
