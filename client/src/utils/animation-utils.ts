/**
 * Animation utilities for performance-optimized dashboard animations
 */

import { getOptimizedAnimationConfig } from './animation-performance';

/**
 * Apply performance-optimized animation classes based on device capabilities
 */
export const applyOptimizedAnimations = () => {
  const config = getOptimizedAnimationConfig();
  const root = document.documentElement;

  // Set CSS custom properties for dynamic animation timing
  root.style.setProperty('--animation-duration', `${config.animationDuration}ms`);
  root.style.setProperty('--stagger-delay', `${config.staggerDelay}ms`);
  
  // Add performance tier class to body for CSS targeting
  document.body.classList.remove('perf-high-end', 'perf-mid-range', 'perf-low-end', 'perf-reduced-motion');
  document.body.classList.add(`perf-${config.performanceTier}`);

  console.log(`🎯 [ANIMATION_CONFIG] Applied ${config.performanceTier} performance tier`);
  
  return config;
};

/**
 * Debounced animation trigger to prevent excessive animation calls
 */
export const createDebouncedAnimationTrigger = (callback: () => void, delay: number = 100) => {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

/**
 * Check if animations should be enabled based on user preferences and device capabilities
 */
export const shouldEnableAnimations = (): boolean => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const config = getOptimizedAnimationConfig();
  
  return !prefersReducedMotion && config.performanceTier !== 'reduced-motion';
};

/**
 * Wait for animation completion using improved event detection
 */
export const waitForAnimationCompletion = (
  elements: NodeListOf<Element> | Element[],
  timeout: number = 1000
): Promise<void> => {
  return new Promise((resolve) => {
    if (!elements.length) {
      resolve();
      return;
    }

    let completedCount = 0;
    const totalElements = elements.length;
    let timeoutId: NodeJS.Timeout;
    let resolved = false;

    const completeAnimation = (reason: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      console.log(`✅ [ANIMATION] Completion detected: ${reason}`);
      resolve();
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      // Only count animations from the target elements
      if (Array.from(elements).includes(event.target as Element)) {
        completedCount++;
        console.log(`🎬 [ANIMATION] Element completed (${completedCount}/${totalElements})`);

        if (completedCount >= totalElements) {
          completeAnimation(`All ${totalElements} elements completed via events`);
        }
      }
    };

    // Check if elements already have animations running
    let elementsWithAnimations = 0;
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const animationName = computedStyle.animationName;

      if (animationName && animationName !== 'none') {
        elementsWithAnimations++;
        element.addEventListener('animationend', handleAnimationEnd, { once: true });
        element.addEventListener('animationcancel', handleAnimationEnd, { once: true });
      }
    });

    // If no elements have animations, resolve immediately
    if (elementsWithAnimations === 0) {
      completeAnimation('No animations detected on elements');
      return;
    }

    console.log(`🎬 [ANIMATION] Monitoring ${elementsWithAnimations} elements with active animations`);

    // Fallback timeout with more reasonable timing
    timeoutId = setTimeout(() => {
      completeAnimation(`Timeout after ${timeout}ms (${completedCount}/${elementsWithAnimations} completed)`);
    }, timeout);
  });
};

/**
 * Optimize element for animation performance
 */
export const optimizeElementForAnimation = (element: HTMLElement) => {
  const config = getOptimizedAnimationConfig();
  
  if (config.useGPUAcceleration) {
    element.style.willChange = 'transform, opacity';
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
  }
};

/**
 * Clean up animation optimizations
 */
export const cleanupAnimationOptimizations = (element: HTMLElement) => {
  element.style.willChange = 'auto';
  element.style.transform = '';
  element.style.backfaceVisibility = '';
  element.classList.add('animation-complete');
};

/**
 * Batch animation cleanup for multiple elements
 */
export const batchCleanupAnimations = (selector: string) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      cleanupAnimationOptimizations(el);
    }
  });
};

/**
 * Performance-aware stagger delay calculator
 */
export const calculateStaggerDelay = (index: number, maxElements: number = 5): number => {
  const config = getOptimizedAnimationConfig();

  if (!config.enableStagger) {
    return 0;
  }

  // Ensure total stagger time doesn't exceed reasonable limits
  const maxTotalStagger = 300; // 300ms max total stagger time
  const effectiveDelay = Math.min(config.staggerDelay, maxTotalStagger / maxElements);

  return index * effectiveDelay;
};

/**
 * Debug animation states for troubleshooting
 */
export const debugAnimationStates = (selector: string): void => {
  const elements = document.querySelectorAll(selector);
  console.group(`🔍 [ANIMATION_DEBUG] Analyzing ${elements.length} elements matching "${selector}"`);

  elements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element);
    const animationName = computedStyle.animationName;
    const animationDuration = computedStyle.animationDuration;
    const animationDelay = computedStyle.animationDelay;
    const animationPlayState = computedStyle.animationPlayState;
    const animationFillMode = computedStyle.animationFillMode;

    console.log(`Element ${index + 1}:`, {
      className: element.className,
      animationName,
      animationDuration,
      animationDelay,
      animationPlayState,
      animationFillMode,
      hasAnimation: animationName !== 'none'
    });
  });

  console.groupEnd();
};
