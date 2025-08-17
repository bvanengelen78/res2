import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Briefcase, Plus, Eye } from 'lucide-react';

interface ProjectAllocationBlockProps {
  projectData: any;
  weekColumns: any[];
  weeklyAggregations: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ProjectAllocationBlock({
  projectData,
  weekColumns,
  weeklyAggregations,
  isCollapsed,
  onToggleCollapse
}: ProjectAllocationBlockProps) {
  console.log(`🧩 ProjectAllocationBlock RENDER - ${projectData.project.name} - isCollapsed:`, isCollapsed);
  
  return (
    <div className={cn(
      "group relative overflow-hidden transition-all duration-300 ease-out",
      "bg-white border border-slate-200/80 rounded-xl",
      "hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300/50",
      "focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2",
      // Subtle pulse for collapsed state to indicate interactivity
      isCollapsed && "animate-pulse-subtle"
    )}>
      {/* Header - Always visible */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer transition-all duration-200",
          "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30",
          "group-hover:bg-slate-50/50",
          "active:bg-blue-100/50 active:scale-[0.99]",
          "touch-manipulation" // Better touch handling on mobile
        )}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${projectData.project.name} project details`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Briefcase className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{projectData.project.name}</h3>
              {/* Expandable hint */}
              <div className={cn(
                "opacity-0 group-hover:opacity-100 transition-all duration-200",
                "text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap",
                "hidden sm:block animate-in fade-in-50"
              )}>
                {isCollapsed ? 'Click to view details' : 'Click to collapse'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="truncate">{projectData.project.client || 'No Client'}</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {projectData.status || 'active'}
              </Badge>
              {isCollapsed && (
                <>
                  <span>•</span>
                  <span className="text-xs opacity-70 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View allocation
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-xs px-2 py-1">
            {projectData.totalHours || 0}h total
          </Badge>
          {/* Plus icon for collapsed state */}
          {isCollapsed && (
            <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Plus className="h-3 w-3 text-blue-600" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔄 Toggle button clicked - current state:', isCollapsed, '-> new state:', !isCollapsed);
              onToggleCollapse();
            }}
            className="p-1.5 bg-slate-100 hover:bg-blue-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label={isCollapsed ? "Expand project details" : "Collapse project details"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-600 transition-transform duration-200",
                isCollapsed ? "rotate-0" : "rotate-180"
              )}
            />
          </button>
        </div>
      </div>
      
      {/* Content - CRITICAL: Only visible when NOT collapsed */}
      {!isCollapsed && (
        <div className="border-t border-slate-200/50 animate-in slide-in-from-top-4 duration-300">
          <div className="p-4">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg p-4 border border-slate-200/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <Eye className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900">Weekly Allocation Details</h4>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Expanded View
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Detailed breakdown of time allocation across the week
              </p>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center p-2 bg-white rounded border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="text-xs text-gray-500 font-medium">{day}</div>
                    <div className="text-sm font-semibold text-gray-900">8h</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Total weekly allocation</span>
                  <span className="font-medium text-gray-900">40h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Show when collapsed */}
      {isCollapsed && (
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-500 italic">
            Click to expand weekly allocation details
          </div>
        </div>
      )}
      
      {/* Debug info */}
      <div className="px-4 pb-2">
        <div className="text-xs bg-gray-100 p-1 rounded">
          DEBUG: isCollapsed = {String(isCollapsed)}
        </div>
      </div>
    </div>
  );
}