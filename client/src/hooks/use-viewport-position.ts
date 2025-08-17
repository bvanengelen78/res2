import { useEffect, useState, useCallback } from 'react';

interface ViewportPosition {
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
}

interface UseViewportPositionProps {
  elementRef?: React.RefObject<HTMLElement>;
  preferredSide?: 'top' | 'right' | 'bottom' | 'left';
  preferredAlign?: 'start' | 'center' | 'end';
  offset?: number;
  padding?: number;
}

export function useViewportPosition({
  elementRef,
  preferredSide = 'bottom',
  preferredAlign = 'center',
  offset = 8,
  padding = 16
}: UseViewportPositionProps = {}): ViewportPosition {
  const [position, setPosition] = useState<ViewportPosition>({
    side: preferredSide,
    align: preferredAlign
  });

  const calculatePosition = useCallback(() => {
    if (!elementRef?.current) {
      return { side: preferredSide, align: preferredAlign };
    }

    const element = elementRef.current;
    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Tooltip dimensions (estimated)
    const tooltipWidth = 320; // max-w-xs = ~20rem = ~320px
    const tooltipHeight = 200; // estimated height

    let side = preferredSide;
    let align = preferredAlign;

    // Check if preferred side fits
    switch (preferredSide) {
      case 'bottom':
        if (rect.bottom + offset + tooltipHeight > viewport.height - padding) {
          side = 'top';
        }
        break;
      case 'top':
        if (rect.top - offset - tooltipHeight < padding) {
          side = 'bottom';
        }
        break;
      case 'right':
        if (rect.right + offset + tooltipWidth > viewport.width - padding) {
          side = 'left';
        }
        break;
      case 'left':
        if (rect.left - offset - tooltipWidth < padding) {
          side = 'right';
        }
        break;
    }

    // Check alignment for horizontal sides (top/bottom)
    if (side === 'top' || side === 'bottom') {
      const centerX = rect.left + rect.width / 2;
      const tooltipHalfWidth = tooltipWidth / 2;

      if (centerX - tooltipHalfWidth < padding) {
        align = 'start';
      } else if (centerX + tooltipHalfWidth > viewport.width - padding) {
        align = 'end';
      } else {
        align = 'center';
      }
    }

    // Check alignment for vertical sides (left/right)
    if (side === 'left' || side === 'right') {
      const centerY = rect.top + rect.height / 2;
      const tooltipHalfHeight = tooltipHeight / 2;

      if (centerY - tooltipHalfHeight < padding) {
        align = 'start';
      } else if (centerY + tooltipHalfHeight > viewport.height - padding) {
        align = 'end';
      } else {
        align = 'center';
      }
    }

    return { side, align };
  }, [elementRef, preferredSide, preferredAlign, offset, padding]);

  useEffect(() => {
    const updatePosition = () => {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    };

    // Update on mount
    updatePosition();

    // Update on resize or scroll
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [calculatePosition]);

  return position;
}

// Simplified version for static positioning based on index
export function getStaticTooltipPosition(
  index: number, 
  totalItems: number,
  containerWidth?: number
): ViewportPosition {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isNearEnd = index >= totalItems - 2;
  const isNearStart = index <= 1;
  
  // For mobile or narrow containers, prefer top/bottom
  if (containerWidth && containerWidth < 600) {
    return {
      side: index < totalItems / 2 ? 'bottom' : 'top',
      align: 'center'
    };
  }
  
  // For desktop, use left/right for edge items
  if (isNearEnd) {
    return { side: 'left', align: 'end' };
  } else if (isNearStart) {
    return { side: 'right', align: 'start' };
  } else {
    return { side: 'bottom', align: 'center' };
  }
}
