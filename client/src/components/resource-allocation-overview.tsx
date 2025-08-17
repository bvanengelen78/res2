import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResourceAllocationSummary } from "./resource-allocation-summary";
import { WeeklyAllocationDetailsModal } from "./weekly-allocation-details-modal";
import { ResourceWeeklyAllocationTable } from "./resource-weekly-allocation-table";
import { Resource, ResourceAllocation, Project } from "@shared/schema";

interface AllocationWithProject extends ResourceAllocation {
  project: Project;
  weeklyAllocations?: Record<string, number>;
}

interface ResourceAllocationOverviewProps {
  resourceId: number;
  resource: Resource;
  viewMode?: 'summary' | 'detailed'; // Default to 'summary' for the new UX
}

export function ResourceAllocationOverview({ 
  resourceId, 
  resource, 
  viewMode = 'summary' 
}: ResourceAllocationOverviewProps) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();

  // Fetch allocations for this resource
  const { data: allocations = [], isLoading } = useQuery<AllocationWithProject[]>({
    queryKey: ["/api/resources", resourceId, "allocations"],
  });

  // Handle viewing details for all projects or a specific project
  const handleViewDetails = (projectId?: number) => {
    setSelectedProjectId(projectId);
    setDetailsModalOpen(true);
  };

  // Handle closing the details modal
  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedProjectId(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If viewMode is 'detailed', show the traditional weekly grid
  if (viewMode === 'detailed') {
    return (
      <ResourceWeeklyAllocationTable
        resourceId={resourceId}
        resource={resource}
        fullscreen={false}
        readOnly={true}
      />
    );
  }

  // Default: Show the new summary view
  return (
    <>
      <ResourceAllocationSummary
        allocations={allocations}
        resource={resource}
        onViewDetails={handleViewDetails}
      />
      
      <WeeklyAllocationDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        resource={resource}
        projectId={selectedProjectId}
        title={selectedProjectId ? `Weekly Details - Project Focus` : undefined}
      />
    </>
  );
}

// Legacy wrapper for backward compatibility
export function ResourceWeeklyAllocationTableWrapper(props: {
  resourceId: number;
  resource: Resource;
  fullscreen?: boolean;
  readOnly?: boolean;
}) {
  // For fullscreen mode, show the detailed grid directly
  if (props.fullscreen) {
    return <ResourceWeeklyAllocationTable {...props} />;
  }
  
  // For normal mode, show the new summary overview
  return (
    <ResourceAllocationOverview
      resourceId={props.resourceId}
      resource={props.resource}
      viewMode="summary"
    />
  );
}
