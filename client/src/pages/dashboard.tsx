import { useQuery } from "@tanstack/react-query";
import KpiCard from "@/components/ui/kpi-card";
import { EnhancedCapacityAlerts } from "@/components/enhanced-capacity-alerts";
import { HoursAllocationVsActual } from "@/components/hours-allocation-vs-actual";
import { QuickActions } from "@/components/quick-actions";
import { ResourceForm } from "@/components/resource-form";
import { ProjectForm } from "@/components/project-form";
import { RoleSkillHeatmap } from "@/components/role-skill-heatmap";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { ChangeAllocationReportModal } from "@/components/change-allocation-report-modal";
import { GamifiedKpiTiles } from "@/components/gamified-kpi-tiles";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getPeriodInfo, getPeriodLabel, getPeriodComparisonText, type PeriodFilter } from "@/lib/period-utils";
import { useState, useEffect, useCallback } from "react";
import { Sparkles, BarChart3, AlertTriangle, Users, Clock, TrendingUp, Zap, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import "@/styles/dashboard-blue-theme.css";
import "@/styles/dashboard-transitions.css";
import { animationMonitor, detectDeviceCapabilities, getOptimizedAnimationConfig } from "@/utils/animation-performance";
import {
  applyOptimizedAnimations,
  waitForAnimationCompletion,
  batchCleanupAnimations,
  shouldEnableAnimations
} from '@/utils/animation-utils';


// Interface for KPI trend data
interface KPITrendData {
  current_value: number;
  previous_value: number;
  period_label: string;
  trend_data: number[];
}

// Helper function to calculate percentage change from trend data
const calculateDeltaPercent = (trendData?: KPITrendData): number => {
  if (!trendData) return 0;

  // Handle edge case where previous value is 0
  if (trendData.previous_value === 0) {
    // If current value is also 0, no change
    if (trendData.current_value === 0) return 0;
    // If previous was 0 but current is not, show as 100% increase
    return 100;
  }

  const change = trendData.current_value - trendData.previous_value;
  const percentChange = (change / trendData.previous_value) * 100;

  // Round to 1 decimal place for cleaner display
  return Math.round(percentChange * 10) / 10;
};

// Helper function to generate fallback trend data when real data is unavailable
// NOTE: This generates synthetic data for visualization purposes only
const generateFallbackTrendData = (currentValue: number, metricType: string): number[] => {
  // Handle zero or very small values - show flat line
  if (currentValue <= 0) {
    return Array.from({ length: 20 }, () => 0);
  }

  // Generate realistic trend patterns based on metric type
  const dataPoints = 20;
  const data: number[] = [];

  // Different patterns for different metrics
  switch (metricType) {
    case 'Active Projects':
      // Projects tend to have step-like changes
      for (let i = 0; i < dataPoints; i++) {
        const baseValue = Math.max(1, currentValue - 2);
        const stepChange = i > 15 ? 2 : i > 10 ? 1 : 0;
        const noise = Math.floor((Math.random() - 0.5) * 2);
        data.push(Math.max(0, baseValue + stepChange + noise));
      }
      break;

    case 'Available Resources':
      // Resources tend to fluctuate around a baseline
      for (let i = 0; i < dataPoints; i++) {
        const baseValue = currentValue;
        const seasonalVariation = Math.sin(i / 3) * (currentValue * 0.1);
        const noise = (Math.random() - 0.5) * (currentValue * 0.15);
        data.push(Math.max(0, Math.round(baseValue + seasonalVariation + noise)));
      }
      break;

    case 'Capacity Conflicts':
      // Conflicts tend to spike and then resolve
      for (let i = 0; i < dataPoints; i++) {
        const spike = i > 12 && i < 17 ? currentValue : Math.max(0, currentValue - 1);
        const noise = Math.floor(Math.random() * 2);
        data.push(Math.max(0, spike + noise));
      }
      break;

    case 'Utilization Rate':
      // Utilization tends to have gradual changes
      for (let i = 0; i < dataPoints; i++) {
        const progress = i / (dataPoints - 1);
        const trend = (currentValue * 0.85) + (progress * (currentValue * 0.3));
        const noise = (Math.random() - 0.5) * 3;
        data.push(Math.max(0, Math.min(100, Math.round(trend + noise))));
      }
      break;

    default:
      // Generic gradual increase pattern
      for (let i = 0; i < dataPoints; i++) {
        const progress = i / (dataPoints - 1);
        const trend = (currentValue * 0.8) + (progress * (currentValue * 0.4));
        const noise = (Math.random() - 0.5) * (currentValue * 0.1);
        data.push(Math.max(0, Math.round(trend + noise)));
      }
  }

  return data;
};

// Helper function to transform KPI data for the new KpiCard component
const transformKPIData = (
  kpis: any,
  trendData?: {
    activeProjects?: KPITrendData;
    availableResources?: KPITrendData;
    conflicts?: KPITrendData;
    utilization?: KPITrendData;
  },
  periodFilter?: PeriodFilter
) => {
  if (!kpis) return [];

  // Only include KPIs that have real data (no fallbacks to zeros)
  const kpiConfigs = [
    {
      title: "Active Projects",
      value: kpis.activeProjects,
      deltaPercent: calculateDeltaPercent(trendData?.activeProjects),
      data: trendData?.activeProjects?.trend_data || generateFallbackTrendData(kpis.activeProjects || 0, "Active Projects"),
      hasRealData: typeof kpis.activeProjects === 'number'
    },
    {
      title: "Available Resources",
      value: kpis.availableResources,
      deltaPercent: calculateDeltaPercent(trendData?.availableResources),
      data: trendData?.availableResources?.trend_data || generateFallbackTrendData(kpis.availableResources || 0, "Available Resources"),
      hasRealData: typeof kpis.availableResources === 'number'
    },
    {
      title: "Capacity Conflicts",
      value: kpis.conflicts,
      deltaPercent: calculateDeltaPercent(trendData?.conflicts),
      data: trendData?.conflicts?.trend_data || generateFallbackTrendData(kpis.conflicts || 0, "Capacity Conflicts"),
      hasRealData: typeof kpis.conflicts === 'number'
    },
    {
      title: "Utilization Rate",
      value: kpis.utilization,
      deltaPercent: calculateDeltaPercent(trendData?.utilization),
      data: trendData?.utilization?.trend_data || generateFallbackTrendData(kpis.utilization || 0, "Utilization Rate"),
      hasRealData: typeof kpis.utilization === 'number'
    }
  ];

  // Get period comparison text
  const comparisonText = periodFilter ? getPeriodComparisonText(periodFilter) : 'from last month';

  // Only return KPIs with real data
  return kpiConfigs.filter(kpi => kpi.hasRealData).map(kpi => ({
    title: kpi.title,
    value: kpi.value,
    deltaPercent: kpi.deltaPercent,
    data: kpi.data,
    comparisonText
  }));
};

export default function Dashboard() {
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [changeAllocationModalOpen, setChangeAllocationModalOpen] = useState(false);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("currentWeek");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStartTime, setTransitionStartTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animationConfig, setAnimationConfig] = useState(() => applyOptimizedAnimations());
  const { user } = useAuth();

  // Use shared period utility function

  const currentPeriod = getPeriodInfo(periodFilter);

  // Debug logging for period changes
  console.log('🔄 [PERIOD_FILTER] Current period:', {
    filter: periodFilter,
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
    label: currentPeriod.label
  });

  // Enhanced period transition management with performance optimization
  useEffect(() => {
    console.log('📅 [PERIOD_CHANGE] Period filter changed to:', periodFilter);
    console.log('📊 [PERIOD_CHANGE] New period info:', currentPeriod);

    // Start transition state immediately for responsive feel
    setIsTransitioning(true);
    setTransitionStartTime(Date.now());

    // Optimized transition duration based on data freshness
    const minTransitionDuration = 250; // Reduced for snappier feel
    const maxTransitionDuration = 500; // Cap for perceived performance

    // Check if queries are likely to be fast (cached data)
    const isLikelyCached = transitionStartTime && (Date.now() - transitionStartTime) < 100;
    const transitionDuration = isLikelyCached ? minTransitionDuration : maxTransitionDuration;

    const transitionTimer = setTimeout(() => {
      setIsTransitioning(false);
      setTransitionStartTime(null);
      console.log('✅ [PERIOD_TRANSITION] Completed in', Date.now() - (transitionStartTime || Date.now()), 'ms');
    }, transitionDuration);

    return () => clearTimeout(transitionTimer);
  }, [periodFilter, currentPeriod.startDate, currentPeriod.endDate]);

  // Enhanced period filter change handler with debouncing
  const handlePeriodChange = useCallback((newPeriod: PeriodFilter) => {
    // Prevent rapid successive changes
    if (isTransitioning) {
      console.log('⏳ [PERIOD_TRANSITION] Debouncing rapid change, ignoring:', newPeriod);
      return;
    }

    console.log('🔄 [PERIOD_TRANSITION] Starting transition from', periodFilter, 'to', newPeriod);

    // Immediate visual feedback for responsive feel
    setIsTransitioning(true);
    setTransitionStartTime(Date.now());

    // Update period filter
    setPeriodFilter(newPeriod);
  }, [isTransitioning, periodFilter]);

  // Use shared period label utility function

  // Get user's first name for personalization
  const getUserFirstName = () => {
    if (user?.resource?.name) {
      return user.resource.name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  };

  // Get current time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };





  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/dashboard", "kpis", "includeTrends=true", currentPeriod.startDate, currentPeriod.endDate], // Include period in query key
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'kpis');
      params.append('includeTrends', 'true'); // Request trend data
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      const response = await fetch(`/api/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/dashboard", "alerts", currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'alerts');
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      const response = await fetch(`/api/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery<any[]>({
    queryKey: ["/api/resources"],
    queryFn: async () => {
      const response = await fetch('/api/resources');
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });



  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["/api/dashboard", "timeline", currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'timeline');
      params.append('startDate', currentPeriod.startDate);
      params.append('endDate', currentPeriod.endDate);

      const response = await fetch(`/api/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch timeline data');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
  });

  // Highly optimized animation management with proper completion detection
  useEffect(() => {
    if (isInitialLoad && !kpisLoading && !alertsLoading && !resourcesLoading && !timelineLoading) {
      if (!shouldEnableAnimations()) {
        // Skip animations entirely for reduced motion or low-end devices
        setIsInitialLoad(false);
        batchCleanupAnimations('.dashboard-entrance, .kpi-card-entrance, .alert-card-entrance, .analytics-entrance');
        return;
      }

      // Start performance monitoring
      const animationId = animationMonitor.startAnimation('dashboard-entrance', 5);
      console.log(`🎬 [ANIMATION] Starting dashboard entrance animations (${animationConfig.performanceTier} tier)`);

      // Minimal delay for DOM readiness
      const timer = setTimeout(async () => {
        setIsInitialLoad(false);

        // Calculate optimal timeout based on actual animation configuration
        const maxAnimationDelay = animationConfig.enableStagger ?
          (4 * animationConfig.staggerDelay) : 0;
        const totalAnimationTime = maxAnimationDelay + animationConfig.animationDuration;
        const timeoutCap = Math.min(totalAnimationTime + 100, 500); // Cap at 500ms

        try {
          // Wait for animations to complete using proper event listeners
          const elements = document.querySelectorAll('.dashboard-entrance, .kpi-card-entrance, .alert-card-entrance, .analytics-entrance');
          console.log(`🎬 [ANIMATION] Found ${elements.length} elements to monitor`);

          // Log which elements have animations
          elements.forEach((el, index) => {
            const computedStyle = window.getComputedStyle(el);
            const animationName = computedStyle.animationName;
            console.log(`🎬 [ANIMATION] Element ${index + 1}: ${el.className} - Animation: ${animationName}`);
          });

          await waitForAnimationCompletion(Array.from(elements), timeoutCap);

          // Clean up animation properties
          batchCleanupAnimations('.dashboard-entrance, .kpi-card-entrance, .alert-card-entrance, .analytics-entrance');
          animationMonitor.endAnimation(animationId);

          console.log(`✅ [ANIMATION] Dashboard entrance completed efficiently`);
        } catch (error) {
          console.warn('⚠️ [ANIMATION] Animation completion detection failed, using fallback', error);
          batchCleanupAnimations('.dashboard-entrance, .kpi-card-entrance, .alert-card-entrance, .analytics-entrance');
          animationMonitor.endAnimation(animationId);
        }
      }, animationConfig.performanceTier === 'low-end' ? 0 : 16); // Single frame delay for high-end

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, kpisLoading, alertsLoading, resourcesLoading, timelineLoading, animationConfig]);

  // Performance monitoring for period transitions
  useEffect(() => {
    if (isTransitioning && transitionStartTime) {
      const monitoringTimer = setTimeout(() => {
        const elapsed = Date.now() - transitionStartTime;
        if (elapsed > 1000) {
          console.warn(`⚠️ [PERFORMANCE] Period transition taking longer than expected: ${elapsed}ms`);
        }
      }, 1000);

      return () => clearTimeout(monitoringTimer);
    }
  }, [isTransitioning, transitionStartTime]);

  // Detect user's motion preferences and device capabilities
  useEffect(() => {
    // Detect device capabilities on mount
    detectDeviceCapabilities();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      console.log(`🎭 [ACCESSIBILITY] Reduced motion preference: ${e.matches ? 'enabled' : 'disabled'}`);

      // Update animation config when preferences change
      setAnimationConfig(getOptimizedAnimationConfig());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (kpisLoading || alertsLoading || resourcesLoading || timelineLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="relative dashboard-blue-theme">
      {/* Enhanced Header with Gradient Background */}
      <div className={`relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white overflow-hidden ${
        isInitialLoad ? 'dashboard-entrance dashboard-entrance-header gpu-accelerated' : ''
      }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-800/30"></div>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-blue-200" />
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {getGreeting()}, {getUserFirstName()}! 👋
                </h1>
              </div>
              <p className="text-blue-100 text-base sm:text-lg">
                Here's your team at a glance
              </p>
            </div>

            {/* Enhanced Period Filter with Visual Feedback */}
            <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
              <div className={`flex items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-2 border shadow-lg flex-1 lg:flex-none transition-all duration-300 ${
                isTransitioning
                  ? 'bg-white/25 border-white/50 ring-2 ring-white/30 shadow-xl'
                  : 'bg-white/15 border-white/30 hover:bg-white/20'
              }`}>
                <Filter className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${
                  isTransitioning ? 'text-white animate-pulse' : 'text-white/90'
                }`} />
                <span className="text-xs sm:text-sm font-medium text-white/90 hidden sm:inline">Period:</span>
                <Select value={periodFilter} onValueChange={handlePeriodChange}>
                  <SelectTrigger className={`w-full sm:w-44 border-white/30 text-white font-semibold shadow-md text-sm transition-all duration-300 ${
                    isTransitioning
                      ? 'bg-white/30 ring-2 ring-white/40 border-white/50 period-filter-active'
                      : 'bg-white/20 hover:bg-white/30 border-white/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <SelectValue />
                      {isTransitioning && (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currentWeek">Current Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>

                {/* Transition Progress Indicator */}
                {isTransitioning && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Top Section: KPI Cards - Always Visible */}
        <section className={`transition-all duration-500 ease-in-out ${
          isInitialLoad ? 'dashboard-entrance dashboard-entrance-kpis gpu-accelerated' : ''
        }`}>
          {kpisLoading || !kpis || isTransitioning ? (
            // Enhanced loading state with skeleton cards - shows during initial load AND period transitions
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 h-[200px] sm:h-[220px] relative overflow-hidden ${
                    isInitialLoad
                      ? `kpi-card-entrance gpu-accelerated stagger-delay-${Math.min(index, 4)}`
                      : isTransitioning
                        ? 'period-transition-active'
                        : 'animate-pulse'
                  }`}
                >
                  <div className="space-y-3 sm:space-y-4">
                    <div className="h-3 skeleton-enhanced w-1/2"></div>
                    <div className="h-6 sm:h-8 skeleton-enhanced w-3/4"></div>
                    <div className="h-3 skeleton-enhanced w-1/3"></div>
                    <div className="h-12 sm:h-16 skeleton-enhanced"></div>
                  </div>
                  {/* Period transition indicator */}
                  {isTransitioning && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  {/* Loading shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                </div>
              ))}
            </div>
          ) : (
            // KPI Cards Grid with enhanced transition animation
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {transformKPIData(kpis, kpis.trendData, periodFilter).map((kpiData, index) => (
                <div
                  key={`${kpiData.title}-${periodFilter}`} // Key includes period for proper re-animation
                  className={`${
                    isInitialLoad
                      ? `kpi-card-entrance gpu-accelerated stagger-delay-${Math.min(index, 4)}`
                      : isTransitioning
                        ? 'period-transition-active'
                        : 'loading-to-content'
                  }`}
                >
                  <KpiCard
                    title={kpiData.title}
                    value={kpiData.value}
                    deltaPercent={kpiData.deltaPercent}
                    data={kpiData.data}
                    comparisonText={kpiData.comparisonText}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gamified KPI Tiles Section */}
        <section className={`${
          isInitialLoad
            ? 'dashboard-entrance dashboard-entrance-gamified gpu-accelerated'
            : isTransitioning
              ? 'period-transition-active'
              : ''
        }`}>
          <GamifiedKpiTiles
            currentPeriod={{
              startDate: currentPeriod.startDate,
              endDate: currentPeriod.endDate,
              label: getPeriodLabel(periodFilter)
            }}
            isInitialLoad={isInitialLoad}
            isTransitioning={isTransitioning}
            className="animate-in fade-in-50 duration-500"
          />
        </section>

        {/* Critical Alerts Section - Always Expanded */}
        <section className={`${
          isInitialLoad
            ? 'dashboard-entrance dashboard-entrance-alerts gpu-accelerated'
            : isTransitioning
              ? 'period-transition-active'
              : ''
        }`}>
          <EnhancedCapacityAlerts
            alerts={alerts}
            isLoading={alertsLoading || isTransitioning}
            kpis={kpis}
            resources={resources}
            currentPeriod={{
              startDate: currentPeriod.startDate,
              endDate: currentPeriod.endDate,
              label: getPeriodLabel(periodFilter)
            }}
            periodFilter={periodFilter}
            isTransitioning={isTransitioning}
          />
        </section>

        {/* Analytics Section - Two Column Layout */}
        <section className={`${
          isInitialLoad
            ? 'dashboard-entrance dashboard-entrance-analytics gpu-accelerated'
            : isTransitioning
              ? 'period-transition-active opacity-80'
              : 'opacity-100'
        } transition-all duration-500`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* Role & Skill Analysis - Always Expanded */}
            <div className={`${
              isInitialLoad
                ? 'analytics-entrance micro-stagger-1 gpu-accelerated'
                : isTransitioning
                  ? 'period-transition-active'
                  : ''
            } transition-all duration-500`}>
              <RoleSkillHeatmap
                resources={resources || []}
                alerts={alerts}
                currentPeriod={{
                  startDate: currentPeriod.startDate,
                  endDate: currentPeriod.endDate,
                  label: getPeriodLabel(periodFilter)
                }}
                isTransitioning={isTransitioning}
              />
            </div>

            {/* Hours Allocation Analysis - Always Expanded */}
            <div className={`${
              isInitialLoad
                ? 'analytics-entrance micro-stagger-2 gpu-accelerated'
                : isTransitioning
                  ? 'period-transition-active'
                  : ''
            } transition-all duration-500`}>
              <HoursAllocationVsActual
                periodFilter={periodFilter}
                isTransitioning={isTransitioning}
              />
            </div>
          </div>
        </section>

        {/* Quick Actions Section */}
        <section className={`${
          isInitialLoad
            ? 'dashboard-entrance dashboard-entrance-actions gpu-accelerated'
            : isTransitioning
              ? 'opacity-50 pointer-events-none'
              : 'opacity-100'
        } transition-all duration-500`}>
          <QuickActions
            onCreateProject={() => setProjectFormOpen(true)}
            onAddResource={() => setResourceFormOpen(true)}
            onGenerateReport={() => setChangeAllocationModalOpen(true)}
          />
        </section>

        {/* Global Transition Overlay */}
        {isTransitioning && (
          <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="bg-gradient-to-r from-blue-500/20 via-blue-600/30 to-blue-500/20 h-1 animate-pulse">
              <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
            </div>
          </div>
        )}
      </div>

      <ResourceForm
        open={resourceFormOpen}
        onOpenChange={setResourceFormOpen}
      />

      <ProjectForm
        open={projectFormOpen}
        onOpenChange={setProjectFormOpen}
      />

      <ChangeAllocationReportModal
        open={changeAllocationModalOpen}
        onOpenChange={setChangeAllocationModalOpen}
      />

    </main>
  );
}
