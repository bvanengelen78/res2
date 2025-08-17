import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PendingChange {
  hours: number;
  oldValue?: number;
  [key: string]: any; // Allow additional properties for different contexts
}

interface UseDebouncedAllocationSaveProps {
  mutationFn: (variables: any) => Promise<any>;
  onSuccess?: (data: any, variables: any) => void;
  onError?: (error: any, variables: any) => void;
  debounceMs?: number;
}

export function useDebouncedAllocationSave({
  mutationFn,
  onSuccess,
  onError,
  debounceMs = 1000
}: UseDebouncedAllocationSaveProps) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Mutation for saving changes
  const mutation = useMutation({
    mutationFn,
    onMutate: (variables) => {
      // Extract cellKey from variables - this should be provided by the caller
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      setSavingCells(prev => new Set(prev).add(cellKey));
    },
    onSuccess: (data, variables) => {
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      
      // Remove from saving and pending, add to saved
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[cellKey];
        return newChanges;
      });
      setSavedCells(prev => new Set(prev).add(cellKey));
      
      // Remove saved indicator after 2 seconds
      setTimeout(() => {
        setSavedCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellKey);
          return newSet;
        });
      }, 2000);
      
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      
      toast({
        title: "Error",
        description: "Failed to save allocation",
        variant: "destructive",
      });
      
      onError?.(error, variables);
    },
  });

  // Add or update a pending change
  const addPendingChange = useCallback((cellKey: string, change: PendingChange) => {
    setPendingChanges(prev => ({
      ...prev,
      [cellKey]: change
    }));

    // Clear any saved state for this cell
    setSavedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }, []);

  // Save a specific pending change immediately (for blur events)
  const saveImmediately = useCallback((cellKey: string, additionalData?: any) => {
    const change = pendingChanges[cellKey];
    if (change) {
      mutation.mutate({
        cellKey,
        hours: change.hours,
        ...change,
        ...additionalData
      });
    }
  }, [pendingChanges, mutation]);

  // Effect to trigger debounced saves for pending changes
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {};
    
    Object.keys(pendingChanges).forEach(cellKey => {
      // Clear any existing timeout for this cell
      if (timeouts[cellKey]) {
        clearTimeout(timeouts[cellKey]);
      }
      
      // Set a new timeout for debounced save
      timeouts[cellKey] = setTimeout(() => {
        const change = pendingChanges[cellKey];
        if (change) {
          mutation.mutate({
            cellKey,
            hours: change.hours,
            ...change
          });
        }
      }, debounceMs);
    });

    // Cleanup function
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [pendingChanges, mutation, debounceMs]);

  // Get the state for a specific cell
  const getCellState = useCallback((cellKey: string) => {
    return {
      isSaving: savingCells.has(cellKey),
      isSaved: savedCells.has(cellKey),
      hasPendingChanges: !!pendingChanges[cellKey],
      pendingValue: pendingChanges[cellKey]
    };
  }, [savingCells, savedCells, pendingChanges]);

  // Clear all pending changes (useful for cleanup)
  const clearPendingChanges = useCallback(() => {
    setPendingChanges({});
    setSavingCells(new Set());
    setSavedCells(new Set());
  }, []);

  return {
    addPendingChange,
    saveImmediately,
    getCellState,
    clearPendingChanges,
    pendingChanges,
    savingCells,
    savedCells,
    isLoading: mutation.isPending
  };
}
