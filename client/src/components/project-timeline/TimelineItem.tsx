/**
 * Timeline Item Component
 * Individual timeline item visualization
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TimelineItem, TimelineSettings } from './types';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface TimelineItemProps {
  item: TimelineItem;
  position: { x: number; width: number };
  rowHeight: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  settings: TimelineSettings;
}

export const TimelineItemComponent: React.FC<TimelineItemProps> = ({
  item,
  position,
  rowHeight,
  isSelected,
  isHovered,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  settings
}) => {
  // Get item type styling
  const getItemStyling = () => {
    const baseClasses = "absolute rounded-md border-2 transition-all duration-200 cursor-pointer";
    
    switch (item.type) {
      case 'milestone':
        return {
          className: cn(
            baseClasses,
            "bg-green-100 border-green-300 hover:bg-green-200",
            isSelected && "ring-2 ring-green-500 ring-offset-1",
            isHovered && "shadow-lg transform scale-105"
          ),
          icon: Target,
          color: "text-green-700"
        };
      
      case 'task':
        return {
          className: cn(
            baseClasses,
            "bg-blue-100 border-blue-300 hover:bg-blue-200",
            isSelected && "ring-2 ring-blue-500 ring-offset-1",
            isHovered && "shadow-lg transform scale-105"
          ),
          icon: CheckCircle,
          color: "text-blue-700"
        };
      
      case 'resource-allocation':
        return {
          className: cn(
            baseClasses,
            "bg-orange-100 border-orange-300 hover:bg-orange-200",
            isSelected && "ring-2 ring-orange-500 ring-offset-1",
            isHovered && "shadow-lg transform scale-105"
          ),
          icon: User,
          color: "text-orange-700"
        };
      
      case 'deadline':
        return {
          className: cn(
            baseClasses,
            "bg-red-100 border-red-300 hover:bg-red-200",
            isSelected && "ring-2 ring-red-500 ring-offset-1",
            isHovered && "shadow-lg transform scale-105"
          ),
          icon: AlertTriangle,
          color: "text-red-700"
        };
      
      default:
        return {
          className: cn(
            baseClasses,
            "bg-gray-100 border-gray-300 hover:bg-gray-200",
            isSelected && "ring-2 ring-gray-500 ring-offset-1",
            isHovered && "shadow-lg transform scale-105"
          ),
          icon: Calendar,
          color: "text-gray-700"
        };
    }
  };

  // Get status styling
  const getStatusStyling = () => {
    switch (item.status) {
      case 'completed':
        return "bg-green-500";
      case 'in-progress':
        return "bg-blue-500";
      case 'overdue':
        return "bg-red-500";
      case 'at-risk':
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  // Get priority styling
  const getPriorityBorder = () => {
    switch (item.priority) {
      case 'critical':
        return "border-l-4 border-l-red-600";
      case 'high':
        return "border-l-4 border-l-orange-500";
      case 'medium':
        return "border-l-4 border-l-yellow-500";
      case 'low':
        return "border-l-4 border-l-green-500";
      default:
        return "";
    }
  };

  const styling = getItemStyling();
  const Icon = styling.icon;
  
  // Calculate item dimensions
  const itemHeight = rowHeight - 16; // 8px margin top and bottom
  const itemTop = 8;
  
  // Show minimal view for very small items
  const isMinimal = position.width < 80;
  const isVerySmall = position.width < 40;

  return (
    <div
      className={cn(styling.className, getPriorityBorder())}
      style={{
        left: position.x,
        width: position.width,
        top: itemTop,
        height: itemHeight,
        minWidth: isVerySmall ? '20px' : '40px'
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={`${item.title} (${format(item.startDate, 'MMM d')} - ${format(item.endDate, 'MMM d')})`}
    >
      {/* Progress Bar Background */}
      {settings.showProgress && item.progress > 0 && (
        <div className="absolute inset-0 rounded-md overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", getStatusStyling())}
            style={{ width: `${item.progress}%`, opacity: 0.3 }}
          />
        </div>
      )}

      {/* Item Content */}
      <div className="relative h-full flex items-center px-2 gap-2">
        {/* Icon */}
        {!isVerySmall && (
          <Icon className={cn("h-4 w-4 flex-shrink-0", styling.color)} />
        )}
        
        {/* Content */}
        {!isMinimal ? (
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className={cn("text-sm font-medium truncate", styling.color)}>
              {item.title}
            </div>
            
            {/* Subtitle/Progress */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {settings.showProgress && (
                <span>{item.progress}%</span>
              )}
              {item.assignee && (
                <span className="truncate">{item.assignee.name}</span>
              )}
            </div>
          </div>
        ) : (
          <div className={cn("text-xs font-medium truncate flex-1", styling.color)}>
            {isVerySmall ? item.title.substring(0, 3) + '...' : item.title}
          </div>
        )}

        {/* Status Badge */}
        {!isMinimal && item.status !== 'not-started' && (
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusStyling())} />
        )}
      </div>

      {/* Dependencies Indicator */}
      {settings.showDependencies && item.dependencies && item.dependencies.length > 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">{item.dependencies.length}</span>
        </div>
      )}

      {/* Priority Indicator */}
      {item.priority === 'critical' && (
        <div className="absolute -top-1 -left-1">
          <Zap className="h-3 w-3 text-red-600 fill-current" />
        </div>
      )}

      {/* Resize Handles (for drag & drop) */}
      {isSelected && settings.enableDragDrop && !isMinimal && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity" />
        </>
      )}
    </div>
  );
};

export default TimelineItemComponent;
