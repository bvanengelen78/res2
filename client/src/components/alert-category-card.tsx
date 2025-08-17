import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  UserX,
  TrendingDown,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertCategory } from "@shared/schema";

interface AlertCategoryCardProps {
  category: AlertCategory;
  onViewAll: (category: AlertCategory) => void;
  className?: string;
}

const getAlertIcon = (type: AlertCategory['type']) => {
  switch (type) {
    case 'critical':
      return <AlertCircle className="h-5 w-5" />;
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'info':
      return <TrendingDown className="h-5 w-5" />;
    case 'unassigned':
      return <UserX className="h-5 w-5" />;
    case 'conflicts':
      return <AlertTriangle className="h-5 w-5" />;
    case 'untapped':
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getAlertStyles = (type: AlertCategory['type']) => {
  switch (type) {
    case 'critical':
      return {
        card: "border-red-200 bg-red-50/30 hover:bg-red-50/50",
        icon: "text-red-600 bg-red-100",
        badge: "bg-red-100 text-red-700 border-red-300",
        button: "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
      };
    case 'error':
      return {
        card: "border-orange-200 bg-orange-50/30 hover:bg-orange-50/50",
        icon: "text-orange-600 bg-orange-100",
        badge: "bg-orange-100 text-orange-700 border-orange-300",
        button: "border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
      };
    case 'warning':
      return {
        card: "border-yellow-200 bg-yellow-50/30 hover:bg-yellow-50/50",
        icon: "text-yellow-600 bg-yellow-100",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
        button: "border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-300"
      };
    case 'info':
      return {
        card: "border-blue-200 bg-blue-50/30 hover:bg-blue-50/50",
        icon: "text-blue-600 bg-blue-100",
        badge: "bg-blue-100 text-blue-700 border-blue-300",
        button: "border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
      };
    case 'unassigned':
      return {
        card: "border-gray-200 bg-gray-50/30 hover:bg-gray-50/50",
        icon: "text-gray-600 bg-gray-100",
        badge: "bg-gray-100 text-gray-700 border-gray-300",
        button: "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
      };
    case 'conflicts':
      return {
        card: "border-red-200 bg-red-50/30 hover:bg-red-50/50",
        icon: "text-red-600 bg-red-100",
        badge: "bg-red-100 text-red-700 border-red-300",
        button: "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
      };
    case 'untapped':
      return {
        card: "border-green-200 bg-green-50/30 hover:bg-green-50/50",
        icon: "text-green-600 bg-green-100",
        badge: "bg-green-100 text-green-700 border-green-300",
        button: "border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
      };
    default:
      return {
        card: "border-gray-200 bg-gray-50/30 hover:bg-gray-50/50",
        icon: "text-gray-600 bg-gray-100",
        badge: "bg-gray-100 text-gray-700 border-gray-300",
        button: "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
      };
  }
};

const getResourcePreview = (resources: AlertCategory['resources'], maxShow: number = 2) => {
  if (resources.length === 0) return "No resources";
  
  const preview = resources.slice(0, maxShow).map(r => r.name).join(", ");
  const remaining = resources.length - maxShow;
  
  if (remaining > 0) {
    return `${preview} +${remaining} more`;
  }
  
  return preview;
};

export function AlertCategoryCard({ category, onViewAll, className }: AlertCategoryCardProps) {
  const styles = getAlertStyles(category.type);
  const isZeroState = category.count === 0;

  // Show conflicts category even when zero for consistency
  if (category.count === 0 && category.type !== 'conflicts') {
    return null; // Don't render empty categories except conflicts
  }

  return (
    <Card
      className={cn(
        "bg-white rounded-xl shadow-sm transition-all duration-200",
        !isZeroState && "hover:shadow-md hover:-translate-y-0.5",
        isZeroState && "opacity-60",
        styles.card,
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon */}
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0",
              styles.icon
            )}>
              {getAlertIcon(category.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 text-sm">
                  {category.title}
                </h3>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs font-medium", styles.badge)}
                >
                  {category.count}
                </Badge>
              </div>
              
              <p className="text-xs text-slate-500 mb-2">
                {category.description}
              </p>

              {/* Resource Preview */}
              <p className="text-xs text-slate-400 truncate">
                {getResourcePreview(category.resources)}
              </p>
            </div>
          </div>
          
          {/* Action Button */}
          <Button
            size="sm"
            variant="outline"
            disabled={isZeroState}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
              !isZeroState && "hover:scale-105 hover:shadow-sm",
              "flex items-center gap-1 flex-shrink-0 ml-2",
              styles.button
            )}
            onClick={() => onViewAll(category)}
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
