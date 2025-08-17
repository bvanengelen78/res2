import React from 'react';
import { PanelsTopLeft } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { brand, getBrandClasses } from '@/config/brand';
import './logo-animations.css';

interface LogoProps {
  /** Additional CSS classes to apply to the logo container */
  className?: string;
  /** Whether to show only the icon (useful for mobile/collapsed states) */
  iconOnly?: boolean;
  /** Size variant for the logo */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the logo should be clickable (default: true) */
  clickable?: boolean;
  /** Custom onClick handler (overrides default navigation) */
  onClick?: () => void;
  /** Use sidebar-specific styling for better readability on dark backgrounds */
  variant?: 'default' | 'sidebar';
}

/**
 * Resourcio Logo Component
 *
 * A reusable logo component that displays the brand icon and wordmark with sophisticated
 * SaaS-style visual effects. Supports responsive design, accessibility, and consistent brand styling.
 *
 * Features:
 * - Responsive: Shows icon + text on desktop, icon only on mobile (unless iconOnly is specified)
 * - Accessible: Proper ARIA labels and keyboard navigation with reduced motion support
 * - Consistent: Uses centralized brand configuration
 * - Flexible: Multiple size variants and customization options
 * - Professional: Static at rest, enhanced hover effects (aura, sheen sweep, gradient shift)
 * - SaaS-appropriate: Stable and professional appearance with subtle interactive enhancements
 */
export const Logo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  clickable = true,
  onClick,
  variant = 'default',
}) => {
  const brandClasses = getBrandClasses();
  
  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'h-6 w-6',
      iconContainer: 'p-1.5',
      text: 'text-lg',
      gap: 'gap-2',
    },
    md: {
      icon: 'h-8 w-8',
      iconContainer: 'p-2',
      text: 'text-xl',
      gap: 'gap-3',
    },
    lg: {
      icon: 'h-10 w-10',
      iconContainer: 'p-2.5',
      text: 'text-2xl',
      gap: 'gap-4',
    },
  };

  const config = sizeConfig[size];

  // Logo content
  const logoContent = (
    <div
      className={cn(
        'logo-container flex items-center transition-all duration-300',
        config.gap,
        variant === 'sidebar' && 'logo-sidebar',
        className
      )}
      role="img"
      aria-label={brand.ariaLabel}
    >
      {/* Icon Container with Enhanced Visual Effects */}
      <div
        className={cn(
          'logo-icon-container logo-aura logo-sheen rounded-lg flex items-center justify-center relative',
          brandClasses.iconGradient,
          brandClasses.iconShadow,
          config.iconContainer
        )}
      >
        <PanelsTopLeft
          className={cn(
            'text-white drop-shadow-sm relative z-10',
            config.icon
          )}
          aria-hidden="true"
        />
      </div>

      {/* Enhanced Brand Name (Wordmark) */}
      {!iconOnly && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-bold tracking-tight leading-none transition-all duration-300',
              variant === 'sidebar'
                ? brand.sidebarText
                : 'logo-text-enhanced',
              config.text,
              'hidden sm:block' // Hide on mobile by default
            )}
          >
            {brand.name}
          </span>
        </div>
      )}
    </div>
  );

  // Handle click behavior
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // If not clickable, return static content
  if (!clickable) {
    return logoContent;
  }

  // If custom onClick is provided, use button
  if (onClick) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg',
          'transition-all duration-300 hover:opacity-95'
        )}
        aria-label={`${brand.name} - Go to homepage`}
      >
        {logoContent}
      </button>
    );
  }

  // Default: Link to home page
  return (
    <Link href={brand.homeHref}>
      <a
        className={cn(
          'group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg',
          'transition-all duration-300 hover:opacity-95'
        )}
        aria-label={`${brand.name} - Go to homepage`}
      >
        {logoContent}
      </a>
    </Link>
  );
};

export default Logo;
