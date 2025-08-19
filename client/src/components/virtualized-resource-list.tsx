import { useMemo, useState, useEffect, useRef } from 'react';
import { EnhancedResourceCardV2 } from './enhanced-resource-card-v2';
import { ResourceTableView } from './resource-table-view';
import { cn } from '@/lib/utils';
import type { Resource } from '@shared/schema';

interface VirtualizedResourceListProps {
  resources: Resource[];
  onEdit: (resource: Resource) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  viewMode: 'grid' | 'list' | 'table';
  allocations?: Record<string, any[]>;
  className?: string;
  itemHeight?: number;
  containerHeight?: number;
  isLoading?: boolean;
}

const ITEM_HEIGHTS = {
  grid: 320,
  list: 120,
  table: 60,
};

const BUFFER_SIZE = 5; // Number of items to render outside visible area

export function VirtualizedResourceList({
  resources,
  onEdit,
  onSelectionChange,
  viewMode,
  allocations = {},
  className,
  itemHeight,
  containerHeight = 600,
  isLoading = false,
}: VirtualizedResourceListProps) {
  // Defensive programming: ensure resources is always an array
  const safeResources = resources || [];
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: containerHeight });
  const containerRef = useRef<HTMLDivElement>(null);

  const actualItemHeight = itemHeight || ITEM_HEIGHTS[viewMode];

  // Calculate visible range
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const visibleHeight = containerSize.height;
    const itemsPerRow = viewMode === 'grid' ? Math.floor(containerSize.width / 350) || 1 : 1;
    const totalRows = Math.ceil(safeResources.length / itemsPerRow);

    const startRow = Math.floor(scrollTop / actualItemHeight);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + visibleHeight) / actualItemHeight)
    );

    const bufferedStartRow = Math.max(0, startRow - BUFFER_SIZE);
    const bufferedEndRow = Math.min(totalRows - 1, endRow + BUFFER_SIZE);

    return {
      startIndex: bufferedStartRow * itemsPerRow,
      endIndex: Math.min(safeResources.length - 1, (bufferedEndRow + 1) * itemsPerRow - 1),
      totalHeight: totalRows * actualItemHeight,
    };
  }, [scrollTop, containerSize, safeResources.length, actualItemHeight, viewMode]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return safeResources.slice(startIndex, endIndex + 1);
  }, [safeResources, startIndex, endIndex]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // For small datasets, don't virtualize
  if (safeResources.length <= 50) {
    return (
      <div className={className}>
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {safeResources.map((resource) => (
              <EnhancedResourceCardV2
                key={resource.id}
                resource={resource}
                onEdit={onEdit}
                variant="grid"
                showActions={true}
                allocations={allocations[resource.id] || []}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-3">
            {safeResources.map((resource) => (
              <EnhancedResourceCardV2
                key={resource.id}
                resource={resource}
                onEdit={onEdit}
                variant="list"
                showActions={true}
                allocations={allocations[resource.id] || []}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}

        {viewMode === 'table' && (
          <ResourceTableView
            resources={safeResources}
            onEdit={onEdit}
            onSelectionChange={onSelectionChange}
            allocations={allocations}
          />
        )}
      </div>
    );
  }

  // For large datasets, use virtualization
  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: Math.floor(startIndex / (viewMode === 'grid' ? Math.floor(containerSize.width / 350) || 1 : 1)) * actualItemHeight,
            width: '100%',
          }}
        >
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleItems.map((resource, index) => (
                <EnhancedResourceCardV2
                  key={`${resource.id}-${startIndex + index}`}
                  resource={resource}
                  onEdit={onEdit}
                  variant="grid"
                  showActions={true}
                  allocations={allocations[resource.id] || []}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {visibleItems.map((resource, index) => (
                <EnhancedResourceCardV2
                  key={`${resource.id}-${startIndex + index}`}
                  resource={resource}
                  onEdit={onEdit}
                  variant="list"
                  showActions={true}
                  allocations={allocations[resource.id] || []}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <ResourceTableView
              resources={visibleItems}
              onEdit={onEdit}
              onSelectionChange={onSelectionChange}
              allocations={allocations}
            />
          )}
        </div>
      </div>

      {/* Loading indicator for large datasets */}
      {safeResources.length > 100 && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-600 shadow-sm">
          Showing {visibleItems.length} of {safeResources.length} resources
        </div>
      )}
    </div>
  );
}
