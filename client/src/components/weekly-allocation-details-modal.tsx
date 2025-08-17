import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Download } from "lucide-react";
import { ResourceWeeklyAllocationTable } from "./resource-weekly-allocation-table";
import { Resource } from "@shared/schema";

interface WeeklyAllocationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource;
  projectId?: number; // If specified, focus on specific project
  title?: string;
}

export function WeeklyAllocationDetailsModal({
  open,
  onOpenChange,
  resource,
  projectId,
  title
}: WeeklyAllocationDetailsModalProps) {
  
  const modalTitle = title || (
    projectId 
      ? `Weekly Allocation Details - Project Focus`
      : `Weekly Allocation Details - ${resource.name}`
  );

  const modalDescription = projectId
    ? "Detailed week-by-week allocation breakdown for the selected project"
    : "Complete week-by-week allocation breakdown across all active projects";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Maximize2 className="h-5 w-5" />
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {modalDescription}
              </DialogDescription>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {projectId && (
                <Badge variant="outline" className="bg-white hidden sm:inline-flex">
                  Project Focus Mode
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hidden sm:flex"
                onClick={() => {
                  // TODO: Implement export functionality
                  console.log('Export weekly breakdown');
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </div>
          </div>
          
          {/* Resource Info Bar */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Resource:</span>
              <span className="font-medium">{resource.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Department:</span>
              <span className="font-medium">{resource.department}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Weekly Capacity:</span>
              <span className="font-medium">{resource.weeklyCapacity}h</span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full">
            <ResourceWeeklyAllocationTable
              resourceId={resource.id!}
              resource={resource}
              fullscreen={true}
              readOnly={false} // Allow editing in the detailed view
              projectFilter={projectId} // Pass project filter if specified
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Use the navigation controls above to browse through different weeks and make adjustments as needed.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Optional: Create a slide-over panel version for alternative UX
export function WeeklyAllocationSlideOver({
  open,
  onOpenChange,
  resource,
  projectId,
  title
}: WeeklyAllocationDetailsModalProps) {
  
  const slideTitle = title || `Weekly Details - ${resource.name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full h-full p-0 gap-0 fixed right-0 top-0 translate-x-0 translate-y-0 rounded-l-lg rounded-r-none">
        {/* Slide-over Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div>
            <DialogTitle className="text-lg font-semibold">{slideTitle}</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Week-by-week allocation breakdown
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Slide-over Content */}
        <div className="flex-1 overflow-hidden p-6">
          <ResourceWeeklyAllocationTable
            resourceId={resource.id!}
            resource={resource}
            fullscreen={false}
            readOnly={false}
            projectFilter={projectId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
