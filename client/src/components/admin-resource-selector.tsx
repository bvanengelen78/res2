import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  UserCheck, 
  Shield, 
  AlertTriangle,
  Info,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
// Authentication removed - public access
import type { Resource } from '@shared/schema';

interface AdminResourceSelectorProps {
  selectedResourceId: number | null;
  onResourceChange: (resourceId: number) => void;
  className?: string;
}

export function AdminResourceSelector({
  selectedResourceId,
  onResourceChange,
  className
}: AdminResourceSelectorProps) {
  // Authentication removed - public access
  const user = { id: 'demo-user', name: 'Demo User' }
  const hasPermission = () => true
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if user has admin permissions
  const isAdmin = hasPermission('system_admin') || hasPermission('resource_management');
  
  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  // Fetch all resources for admin selection
  const { data: allResources = [], isLoading, error } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    queryFn: () => apiRequest('/api/resources'),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Get selected resource details
  const selectedResource = allResources.find(r => r.id === selectedResourceId);
  const isLoggingForSelf = selectedResourceId === user?.resourceId;

  // Filter active resources only (using isActive property from the API)
  const activeResources = allResources.filter(resource => resource.isActive && !resource.isDeleted);

  // Debug logging in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AdminResourceSelector] Debug info:', {
        isAdmin,
        userPermissions: user?.permissions,
        hasSystemAdmin: hasPermission('system_admin'),
        hasResourceManagement: hasPermission('resource_management'),
        queryEnabled: isAdmin,
        isLoading,
        error: error?.message,
        allResourcesCount: allResources.length,
        activeResourcesCount: activeResources.length,
        allResources: allResources.map(r => ({ id: r.id, name: r.name, isActive: r.isActive, isDeleted: r.isDeleted })),
      });
    }
  }, [isAdmin, isLoading, error, allResources.length, activeResources.length, user?.permissions]);

  const handleResourceChange = (value: string) => {
    const resourceId = parseInt(value);
    onResourceChange(resourceId);
  };

  return (
    <Card className={cn("border-2 border-blue-200 bg-blue-50", className)} data-testid="admin-resource-selector">
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="admin-selector-header"
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Controls
          </CardTitle>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-blue-600" />
          </motion.div>
        </div>
        
        {/* Current selection indicator */}
        <div className="flex items-center gap-2 mt-2">
          {isLoggingForSelf ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
              <UserCheck className="w-3 h-3 mr-1" />
              Logging for yourself
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
              <Users className="w-3 h-3 mr-1" />
              Logging for: {selectedResource?.name || 'Unknown'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 space-y-4">
              {/* Resource Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Resource to Log Time For:
                </label>
                <Select
                  value={selectedResourceId?.toString() || ''}
                  onValueChange={handleResourceChange}
                  disabled={isLoading}
                  data-testid="resource-selector"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isLoading
                          ? "Loading resources..."
                          : error
                            ? "Error loading resources"
                            : "Select a resource..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Loading resources...
                        </div>
                      </SelectItem>
                    ) : error ? (
                      <SelectItem value="error" disabled>
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          Failed to load resources
                        </div>
                      </SelectItem>
                    ) : activeResources.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Info className="w-4 h-4" />
                          No active resources found
                        </div>
                      </SelectItem>
                    ) : (
                      activeResources.map((resource) => (
                        <SelectItem
                          key={resource.id}
                          value={resource.id.toString()}
                          data-testid={`resource-option-${resource.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{resource.name}</span>
                            {resource.id === user?.resourceId && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Warning when logging for others */}
              {!isLoggingForSelf && selectedResource && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                  data-testid="admin-warning"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-1">
                        Admin Mode Active
                      </p>
                      <p className="text-amber-700">
                        You are logging time on behalf of <strong>{selectedResource.name}</strong>. 
                        All actions will be recorded in the audit trail.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResourceChange(user?.resourceId || 0)}
                  className="text-xs"
                  data-testid="switch-to-self-btn"
                >
                  <UserCheck className="w-3 h-3 mr-1" />
                  Switch to Self
                </Button>
                
                {!isLoading && !error && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 px-2">
                    <Info className="w-3 h-3" />
                    {activeResources.length} active resources
                    {process.env.NODE_ENV === 'development' && (
                      <span className="ml-2 text-blue-600">
                        (Total: {allResources.length})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Admin permissions info */}
              <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded border border-blue-200">
                <div className="font-medium mb-1">Admin Permissions:</div>
                <div className="space-y-1">
                  {hasPermission('system_admin') && (
                    <div>• System Administrator - Full access</div>
                  )}
                  {hasPermission('resource_management') && (
                    <div>• Resource Management - Can manage team time logging</div>
                  )}
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Hook for managing admin resource selection state
export function useAdminResourceSelection(userResourceId?: number) {
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(userResourceId || null);
  // Authentication removed - public access
  const hasPermission = () => true
  const queryClient = useQueryClient();

  const isAdmin = hasPermission('system_admin') || hasPermission('resource_management');
  const isLoggingForSelf = selectedResourceId === userResourceId;

  const handleResourceChange = (resourceId: number) => {
    const previousResourceId = selectedResourceId;

    console.log('[useAdminResourceSelection] Resource change:', {
      from: previousResourceId,
      to: resourceId,
      isAdmin,
      userResourceId
    });

    setSelectedResourceId(resourceId);

    // Invalidate queries for the previous resource to ensure fresh data
    if (previousResourceId && previousResourceId !== resourceId) {
      queryClient.invalidateQueries({
        queryKey: ['/api/resources', previousResourceId]
      });
    }

    // Also invalidate queries for the new resource to ensure fresh data
    queryClient.invalidateQueries({
      queryKey: ['/api/resources', resourceId]
    });
  };

  // Reset to self when component mounts or user changes
  React.useEffect(() => {
    if (userResourceId && !selectedResourceId) {
      setSelectedResourceId(userResourceId);
    }
  }, [userResourceId, selectedResourceId]);

  return {
    selectedResourceId,
    isAdmin,
    isLoggingForSelf,
    handleResourceChange,
    setSelectedResourceId,
  };
}
