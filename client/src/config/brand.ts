/**
 * Centralized brand configuration for easy rebranding
 * 
 * To rebrand the application (e.g., to "Ordino"), simply update the values in this file.
 * All components will automatically use the new branding across the application.
 */
export const brand = {
  // Primary brand identity
  name: "Resourcio",
  shortName: "R",
  tagline: "Resource management and planning platform",
  
  // Navigation
  homeHref: "/",
  
  // Visual identity
  gradient: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-600",
  gradientText: "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-600 bg-clip-text text-transparent",

  // Sidebar-specific styling for better readability
  sidebarText: "text-white font-bold drop-shadow-sm",

  // Icon styling
  iconGradient: "bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600",
  iconShadow: "shadow-lg shadow-indigo-500/25",

  // Enhanced visual effects
  iconAura: "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-sky-400/20 before:via-indigo-500/20 before:to-violet-600/20 before:blur-md before:-z-10",
  enhancedGradientText: "bg-gradient-to-r from-sky-400 via-indigo-500 via-purple-500 to-violet-600 bg-clip-text text-transparent",
  
  // Hover effects
  hoverGradient: "hover:bg-gradient-to-r hover:from-sky-500 hover:via-indigo-600 hover:to-violet-700",
  
  // Meta information
  description: "Comprehensive resource planning and time tracking application for organizational efficiency",
  themeColor: "#6366f1", // Indigo-500 for PWA theme
  
  // Accessibility
  ariaLabel: "Resourcio - Resource management platform",
} as const;

// Type for brand configuration (useful for TypeScript consumers)
export type BrandConfig = typeof brand;

// Helper function to get brand gradient classes
export const getBrandGradient = (variant: 'background' | 'text' | 'icon' | 'hover' = 'background') => {
  switch (variant) {
    case 'text':
      return brand.gradientText;
    case 'icon':
      return brand.iconGradient;
    case 'hover':
      return brand.hoverGradient;
    default:
      return brand.gradient;
  }
};

// Helper function for consistent brand styling
export const getBrandClasses = () => ({
  gradient: brand.gradient,
  gradientText: brand.gradientText,
  iconGradient: brand.iconGradient,
  iconShadow: brand.iconShadow,
  hoverGradient: brand.hoverGradient,
  sidebarText: brand.sidebarText,
  iconAura: brand.iconAura,
  enhancedGradientText: brand.enhancedGradientText,
});
