import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Timer,
  ClipboardList,
  BarChart3,
  Workflow,
  Settings,
  type LucideIcon
} from "lucide-react";

/**
 * Centralized icon registry for navigation items
 * 
 * This registry provides a single source of truth for all navigation icons,
 * ensuring consistency and avoiding duplicate imports across components.
 * Each icon is semantically chosen to clearly represent its navigation function.
 * 
 * Icon Specifications:
 * - Size: 20px (h-5 w-5)
 * - Stroke width: 2
 * - All icons from lucide-react for consistency
 * 
 * Semantic Icon Mapping:
 * - Dashboard → LayoutDashboard (grid layout representing dashboard view)
 * - Projects → KanbanSquare (kanban board representing project management)
 * - Resources → Users (people representing human resources)
 * - Time Logging → Timer (stopwatch representing time tracking)
 * - Submission Overview → ClipboardList (checklist representing submissions)
 * - Reports → BarChart3 (bar chart representing data reports)
 * - Change Lead Reports → Workflow (process flow representing change management)
 * - Settings → Settings (gear representing configuration)
 */
export const NAVIGATION_ICONS = {
  DASHBOARD: LayoutDashboard,
  PROJECTS: KanbanSquare,
  RESOURCES: Users,
  TIME_LOGGING: Timer,
  SUBMISSION_OVERVIEW: ClipboardList,
  REPORTS: BarChart3,
  CHANGE_LEAD_REPORTS: Workflow,
  SETTINGS: Settings,
} as const;

/**
 * Type for navigation icon keys
 */
export type NavigationIconKey = keyof typeof NAVIGATION_ICONS;

/**
 * Type for navigation icon components
 */
export type NavigationIcon = LucideIcon;

/**
 * Helper function to get an icon by key
 * @param key - The navigation icon key
 * @returns The corresponding Lucide icon component
 */
export function getNavigationIcon(key: NavigationIconKey): NavigationIcon {
  return NAVIGATION_ICONS[key];
}

/**
 * Validates that all navigation icons are unique
 * @returns Array of duplicate icon components (empty if all unique)
 */
export function validateUniqueIcons(): LucideIcon[] {
  const icons = Object.values(NAVIGATION_ICONS);
  const duplicates: LucideIcon[] = [];
  const seen = new Set();
  
  for (const icon of icons) {
    if (seen.has(icon)) {
      duplicates.push(icon);
    } else {
      seen.add(icon);
    }
  }
  
  return duplicates;
}
