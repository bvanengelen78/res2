/**
 * Animation Performance Monitoring Utilities
 * Professional-grade performance monitoring for dashboard animations
 */

export interface AnimationMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  animationType: string;
  elementCount: number;
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    pixelRatio: number;
    reducedMotion: boolean;
  };
}

class AnimationPerformanceMonitor {
  private metrics: AnimationMetrics[] = [];
  private activeAnimations = new Map<string, AnimationMetrics>();

  /**
   * Start monitoring an animation
   */
  startAnimation(animationType: string, elementCount: number = 1): string {
    const id = `${animationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: AnimationMetrics = {
      startTime: performance.now(),
      animationType,
      elementCount,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }
    };

    this.activeAnimations.set(id, metric);
    console.log(`🎬 [ANIMATION_START] ${animationType} (${elementCount} elements)`);
    
    return id;
  }

  /**
   * End monitoring an animation
   */
  endAnimation(id: string): AnimationMetrics | null {
    const metric = this.activeAnimations.get(id);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.activeAnimations.delete(id);
    this.metrics.push(metric);

    // Performance analysis
    this.analyzePerformance(metric);
    
    return metric;
  }

  /**
   * Analyze animation performance with improved thresholds for multi-element animations
   */
  private analyzePerformance(metric: AnimationMetrics) {
    const { duration, animationType, elementCount, deviceInfo } = metric;

    if (!duration) return;

    console.log(`✅ [ANIMATION_END] ${animationType} completed in ${duration.toFixed(2)}ms`);

    // Calculate performance thresholds based on element count and animation type
    const baseThresholds = {
      excellent: 16,  // 60fps baseline
      good: 33,      // 30fps baseline
      acceptable: 50, // 20fps baseline
      poor: 100      // 10fps baseline
    };

    // Adjust thresholds for multi-element animations
    const elementMultiplier = Math.max(1, Math.log2(elementCount)); // Logarithmic scaling
    const typeMultiplier = animationType.includes('entrance') ? 1.5 : 1; // Entrance animations are more complex

    const thresholds = {
      excellent: baseThresholds.excellent * elementMultiplier * typeMultiplier,
      good: baseThresholds.good * elementMultiplier * typeMultiplier,
      acceptable: baseThresholds.acceptable * elementMultiplier * typeMultiplier * 2, // More lenient for acceptable
      poor: baseThresholds.poor * elementMultiplier * typeMultiplier * 3 // Much more lenient for poor
    };

    let performanceLevel: string;
    let recommendation: string = '';

    if (duration <= thresholds.excellent) {
      performanceLevel = 'excellent';
    } else if (duration <= thresholds.good) {
      performanceLevel = 'good';
    } else if (duration <= thresholds.acceptable) {
      performanceLevel = 'acceptable';
      recommendation = 'Consider optimizing for better performance';
    } else {
      performanceLevel = 'poor';
      recommendation = 'Animation performance needs optimization';
    }

    // Improved device detection
    const capabilities = this.getDeviceCapabilities(deviceInfo);

    if (!capabilities.isHighEnd && duration > thresholds.good) {
      recommendation += ` (${capabilities.tier} device detected)`;
    }

    console.log(`📊 [PERFORMANCE] ${animationType}: ${performanceLevel} (${duration.toFixed(2)}ms for ${elementCount} elements)`);
    console.log(`🎯 [THRESHOLDS] excellent: ${thresholds.excellent.toFixed(0)}ms, good: ${thresholds.good.toFixed(0)}ms, acceptable: ${thresholds.acceptable.toFixed(0)}ms`);

    if (recommendation) {
      console.warn(`⚠️ [RECOMMENDATION] ${recommendation}`);
    }

    // Only log device info for genuinely poor performance
    if (duration > thresholds.poor) {
      console.log(`🔍 [DEVICE_INFO]`, deviceInfo);
      console.log(`🔍 [CAPABILITIES]`, capabilities);
    }
  }

  /**
   * Get device capabilities with improved detection
   */
  private getDeviceCapabilities(deviceInfo: AnimationMetrics['deviceInfo']) {
    const screenWidth = parseInt(deviceInfo.screenSize.split('x')[0]);
    const pixelRatio = deviceInfo.pixelRatio;

    // More sophisticated device classification
    const isHighEnd = pixelRatio >= 1.5 && screenWidth >= 1024 && !deviceInfo.reducedMotion;
    const isMidRange = (pixelRatio >= 1.25 || screenWidth >= 768) && !deviceInfo.reducedMotion;

    let tier: string;
    if (isHighEnd) {
      tier = 'high-end';
    } else if (isMidRange) {
      tier = 'mid-range';
    } else {
      tier = 'low-end';
    }

    return {
      isHighEnd,
      isMidRange,
      tier,
      screenWidth,
      pixelRatio,
      reducedMotion: deviceInfo.reducedMotion
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalAnimations: number;
    averageDuration: number;
    slowestAnimation: AnimationMetrics | null;
    fastestAnimation: AnimationMetrics | null;
    deviceInfo: AnimationMetrics['deviceInfo'] | null;
  } {
    if (this.metrics.length === 0) {
      return {
        totalAnimations: 0,
        averageDuration: 0,
        slowestAnimation: null,
        fastestAnimation: null,
        deviceInfo: null
      };
    }

    const durations = this.metrics.map(m => m.duration || 0);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const slowestAnimation = this.metrics.reduce((prev, current) => 
      (prev.duration || 0) > (current.duration || 0) ? prev : current
    );
    
    const fastestAnimation = this.metrics.reduce((prev, current) => 
      (prev.duration || 0) < (current.duration || 0) ? prev : current
    );

    return {
      totalAnimations: this.metrics.length,
      averageDuration,
      slowestAnimation,
      fastestAnimation,
      deviceInfo: this.metrics[0]?.deviceInfo || null
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.activeAnimations.clear();
  }

  /**
   * Cleanup method for component unmounting
   * Safely clears all active animations and metrics
   */
  cleanup() {
    // End any active animations gracefully
    for (const [id, metric] of this.activeAnimations.entries()) {
      console.log(`🧹 [CLEANUP] Ending active animation: ${metric.animationType}`);
      this.endAnimation(id);
    }

    // Clear all metrics
    this.clearMetrics();

    console.log('🧹 [CLEANUP] Animation monitor cleaned up successfully');
  }
}

// Global instance
export const animationMonitor = new AnimationPerformanceMonitor();

/**
 * Utility to detect device capabilities with improved detection logic
 */
export const detectDeviceCapabilities = () => {
  // More sophisticated device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Android(?=.*Mobile)/i.test(navigator.userAgent) && window.innerWidth >= 768;

  // Improved high-end device detection with more realistic thresholds
  const hasHighDPI = window.devicePixelRatio >= 1.25; // Lowered from 1.5 for better desktop detection
  const hasLargeScreen = window.innerWidth >= 1024; // Good threshold for desktop
  const hasModernBrowser = 'requestAnimationFrame' in window && 'performance' in window;

  // Performance-based detection
  const memoryInfo = (navigator as any).deviceMemory;
  const hasAdequateMemory = !memoryInfo || memoryInfo >= 2; // Lowered to 2GB for better compatibility

  // CPU core detection (if available)
  const cpuCores = navigator.hardwareConcurrency || 4;
  const hasMultipleCores = cpuCores >= 2; // Lowered to 2 cores for better compatibility

  // More inclusive high-end detection
  const isHighEnd = !isMobile && hasLargeScreen && hasModernBrowser &&
                   (hasHighDPI || hasAdequateMemory || hasMultipleCores);

  const isMidRange = (hasLargeScreen || hasHighDPI) && hasModernBrowser && !isMobile;

  const capabilities = {
    isHighEnd,
    isMidRange,
    isMobile,
    isTablet,
    supportsWillChange: 'willChange' in document.documentElement.style,
    supportsTransform3d: (() => {
      const el = document.createElement('div');
      el.style.transform = 'translate3d(0,0,0)';
      return el.style.transform !== '';
    })(),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    },
    performanceMetrics: {
      memory: memoryInfo,
      cores: cpuCores,
      hasHighDPI,
      hasLargeScreen,
      tier: isHighEnd ? 'high-end' : isMidRange ? 'mid-range' : 'low-end'
    }
  };

  console.log('🔍 [DEVICE_CAPABILITIES]', capabilities);
  return capabilities;
};

/**
 * Utility to optimize animations based on device capabilities with performance tiers
 */
export const getOptimizedAnimationConfig = () => {
  const capabilities = detectDeviceCapabilities();

  // Performance tier-based configuration
  if (capabilities.prefersReducedMotion) {
    return {
      enableStagger: false,
      staggerDelay: 0,
      animationDuration: 0,
      enableComplexAnimations: false,
      useGPUAcceleration: false,
      enableShimmer: false,
      maxConcurrentAnimations: 0,
      performanceTier: 'reduced-motion'
    };
  }

  if (capabilities.isHighEnd) {
    return {
      enableStagger: true,
      staggerDelay: 80, // Reduced from 100ms for faster completion
      animationDuration: 300, // Reduced from 350ms
      enableComplexAnimations: true,
      useGPUAcceleration: capabilities.supportsTransform3d,
      enableShimmer: true,
      maxConcurrentAnimations: 5,
      performanceTier: 'high-end'
    };
  }

  if (capabilities.isMidRange) {
    return {
      enableStagger: true,
      staggerDelay: 60, // Faster stagger for mid-range
      animationDuration: 250,
      enableComplexAnimations: false,
      useGPUAcceleration: capabilities.supportsTransform3d,
      enableShimmer: false,
      maxConcurrentAnimations: 3,
      performanceTier: 'mid-range'
    };
  }

  // Low-end/mobile configuration
  return {
    enableStagger: false, // Disable stagger for immediate display
    staggerDelay: 0,
    animationDuration: 200, // Very fast animations
    enableComplexAnimations: false,
    useGPUAcceleration: false, // Avoid GPU acceleration on low-end devices
    enableShimmer: false,
    maxConcurrentAnimations: 1,
    performanceTier: 'low-end'
  };
};

/**
 * Performance testing utility for development
 */
export const runAnimationPerformanceTest = () => {
  console.log('🧪 [PERFORMANCE_TEST] Starting animation performance test...');
  
  const testId = animationMonitor.startAnimation('performance-test', 10);
  
  // Simulate animation work
  setTimeout(() => {
    animationMonitor.endAnimation(testId);
    
    const summary = animationMonitor.getPerformanceSummary();
    console.log('📊 [TEST_RESULTS]', summary);
  }, 500);
};
