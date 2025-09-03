import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
  type LucideIcon
} from "lucide-react";
import { NAVIGATION_ICONS } from "@/components/navigation/navigation-icons";
import { CalendarDiamondIcon } from "@/components/icons/calendar-diamond-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Authentication removed - public access to all navigation items
import { MENU_ITEMS, PERMISSIONS } from "@shared/schema";
import { useState } from "react";
import { Logo } from "@/components/branding/Logo";

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  menuItem?: string;
  permission?: string;
};

// Main navigation items with proper RBAC permissions
const mainNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: NAVIGATION_ICONS.DASHBOARD, permission: PERMISSIONS.DASHBOARD },
  { name: "Projects", href: "/projects", icon: NAVIGATION_ICONS.PROJECTS, permission: PERMISSIONS.PROJECT_MANAGEMENT },
  { name: "Resources", href: "/resources", icon: NAVIGATION_ICONS.RESOURCES, permission: PERMISSIONS.RESOURCE_MANAGEMENT },
  { name: "Time Logging", href: "/mobile-time-logging", icon: NAVIGATION_ICONS.TIME_LOGGING, permission: PERMISSIONS.TIME_LOGGING },
  { name: "Submission Overview", href: "/submission-overview", icon: NAVIGATION_ICONS.SUBMISSION_OVERVIEW, permission: PERMISSIONS.SUBMISSION_OVERVIEW },
  { name: "Reports", href: "/reports", icon: NAVIGATION_ICONS.REPORTS, permission: PERMISSIONS.REPORTS },
  { name: "Change Lead Reports", href: "/change-lead-reports", icon: NAVIGATION_ICONS.CHANGE_LEAD_REPORTS, permission: PERMISSIONS.CHANGE_LEAD_REPORTS },
];

// Bottom navigation items (admin/settings)
const bottomNavigation: NavigationItem[] = [
  { name: "User Management", href: "/user-management", icon: Users, permission: PERMISSIONS.USER_MANAGEMENT },
  { name: "Settings", href: "/settings", icon: NAVIGATION_ICONS.SETTINGS, permission: PERMISSIONS.SETTINGS },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderNavigationItems = (items: NavigationItem[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = location === item.href;

      // Public access - no permission checks required
      return (
        <div key={item.name}>
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "group flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      {...(isActive && { "aria-current": "page" })}
                    >
                      <Icon className="h-5 w-5 stroke-2" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-blue-900 text-blue-100 border-blue-700/50 shadow-lg shadow-blue-500/20">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Link href={item.href}>
              <div
                className={cn(
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out mb-1 relative overflow-hidden backdrop-blur-sm",
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02] border border-blue-400/30"
                    : "text-blue-200 hover:bg-blue-700/60 hover:text-white hover:shadow-md hover:shadow-blue-500/10 hover:transform hover:scale-[1.01] border border-transparent hover:border-blue-600/30"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 stroke-2 transition-all duration-200 mr-3",
                  isActive ? "drop-shadow-sm text-white" : "text-blue-300"
                )} />
                <span className={cn(
                  "truncate font-medium transition-all duration-200",
                  isActive ? "text-white" : "text-blue-100"
                )}>{item.name}</span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-blue-300/10 rounded-xl pointer-events-none" />
                )}

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-400/10 group-hover:to-blue-500/5 rounded-xl transition-all duration-300 pointer-events-none" />
              </div>
            </Link>
          )}
        </div>
      );
    });
  };

  const SidebarContent = () => (
    <div className={cn(
      "flex flex-col h-full bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 transition-all duration-300 ease-in-out shadow-xl border-r border-blue-700/30",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700/30 bg-blue-800/50 backdrop-blur-sm">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed && "justify-center w-full"
        )}>
          <Logo
            size="md"
            iconOnly={isCollapsed}
            variant="sidebar"
            className="transition-all duration-300"
          />
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "h-8 w-8 text-blue-300 hover:text-white hover:bg-blue-700/50 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md",
            isCollapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-b border-blue-700/30 bg-blue-800/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="w-full h-8 text-blue-300 hover:text-white hover:bg-blue-700/50 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col bg-gradient-to-b from-transparent via-blue-900/20 to-transparent">
        <nav className="space-y-1 flex-1 px-2">
          {renderNavigationItems(mainNavigation)}
        </nav>

        {/* Spacer to push bottom navigation down */}
        <div className="flex-1 min-h-4"></div>

        {/* Separator */}
        {!isCollapsed && (
          <div className="my-4 mx-4 border-t border-blue-700/40 transition-opacity duration-300 shadow-sm"></div>
        )}
        {isCollapsed && (
          <div className="my-3 mx-2 border-t border-blue-700/40 transition-opacity duration-300 shadow-sm"></div>
        )}

        {/* Bottom Navigation - Admin/Settings */}
        <nav className="space-y-1 pb-2">
          <div className={cn(
            "transition-all duration-300",
            !isCollapsed && "px-2"
          )}>
            {renderNavigationItems(bottomNavigation)}
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn(
        "hidden md:flex md:flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 border-blue-700/30">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
