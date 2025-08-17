import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface PendingChange {
  resourceId?: number;
  projectId?: number;
  weekKey: string;
  hours: number;
  oldValue?: number;
}

export interface ExplicitSaveState {
  pendingChanges: Record<string, PendingChange>;
  savingCells: Set<string>;
  savedCells: Set<string>;
  failedCells: Set<string>;
  hasUnsavedChanges: boolean;
  pendingCount: number;
}

interface UseExplicitAllocationSaveProps {
  mutationFn: (variables: any) => Promise<any>;
  onSuccess?: (data: any, variables: any) => void;
  onError?: (error: any, variables: any) => void;
  onAllSaved?: () => void;
}

export function useExplicitAllocationSave({
  mutationFn,
  onSuccess,
  onError,
  onAllSaved
}: UseExplicitAllocationSaveProps) {
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  const [failedCells, setFailedCells] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Computed state
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;
  const pendingCount = Object.keys(pendingChanges).length;

  // Mutation for saving changes
  const mutation = useMutation({
    mutationFn,
    onMutate: (variables) => {
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      setSavingCells(prev => new Set(prev).add(cellKey));
      setFailedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    },
    onSuccess: (data, variables) => {
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      
      // Remove from saving and pending, add to saved
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      // Don't clear pending changes here - they'll be cleared after all saves complete
      // This maintains optimistic updates and prevents visual flickering
      setSavedCells(prev => new Set(prev).add(cellKey));
      
      // Remove saved indicator after 3 seconds
      setTimeout(() => {
        setSavedCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(cellKey);
          return newSet;
        });
      }, 3000);
      
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      const cellKey = variables.cellKey || `${variables.resourceId || variables.projectId}-${variables.weekKey}`;
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      setFailedCells(prev => new Set(prev).add(cellKey));
      
      onError?.(error, variables);
    },
  });

  // Add or update a pending change
  const addPendingChange = useCallback((cellKey: string, change: PendingChange) => {
    setPendingChanges(prev => ({
      ...prev,
      [cellKey]: change
    }));

    // Clear any saved/failed state for this cell
    setSavedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
    setFailedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });
  }, []);

  // Save all pending changes
  const saveAllChanges = useCallback(async () => {
    const changesToSave = { ...pendingChanges };
    console.log(`[EXPLICIT_SAVE] Starting saveAllChanges with ${Object.keys(changesToSave).length} changes:`, changesToSave);

    if (Object.keys(changesToSave).length === 0) {
      console.log(`[EXPLICIT_SAVE] No changes to save, returning early`);
      return;
    }

    // Serialize save operations to prevent race conditions
    // Instead of running all saves concurrently, run them sequentially
    console.log(`[EXPLICIT_SAVE] Running saves sequentially to prevent race conditions...`);

    try {
      for (const [cellKey, change] of Object.entries(changesToSave)) {
        console.log(`[EXPLICIT_SAVE] Processing change for ${cellKey}:`, change);
        // Don't pass cellKey to the mutation - it's only used internally
        const { oldValue, ...mutationParams } = change;
        console.log(`[EXPLICIT_SAVE] Mutation params for ${cellKey}:`, mutationParams);
        console.log(`[EXPLICIT_SAVE] About to call mutation.mutateAsync with:`, mutationParams);

        try {
          const result = await mutation.mutateAsync(mutationParams);
          console.log(`[EXPLICIT_SAVE] Mutation completed for ${cellKey}:`, result);
        } catch (error) {
          console.error(`[EXPLICIT_SAVE] Mutation failed for ${cellKey}:`, error);
          throw error;
        }
      }

      // Call onAllSaved (which includes cache invalidation) before clearing pending changes
      // This ensures UI shows pending values until cache is refreshed
      if (onAllSaved) {
        await onAllSaved();
      }

      // Clear pending changes only after cache invalidation is complete
      setPendingChanges({});

      // Remove toast notification - users should rely on Save button feedback
    } catch (error) {
      toast({
        title: "Error",
        description: "Some changes failed to save. Please try again.",
        variant: "destructive",
      });
    }
  }, [pendingChanges, mutation, toast, onAllSaved]);

  // Save specific changes
  const saveSpecificChanges = useCallback(async (cellKeys: string[]) => {
    const changesToSave = cellKeys.reduce((acc, cellKey) => {
      if (pendingChanges[cellKey]) {
        acc[cellKey] = pendingChanges[cellKey];
      }
      return acc;
    }, {} as Record<string, PendingChange>);

    const savePromises = Object.entries(changesToSave).map(([cellKey, change]) => {
      return mutation.mutateAsync({
        cellKey,
        ...change
      });
    });

    try {
      await Promise.all(savePromises);
      // Remove success toast - users should rely on Save button feedback
    } catch (error) {
      toast({
        title: "Error",
        description: "Some changes failed to save. Please try again.",
        variant: "destructive",
      });
    }
  }, [pendingChanges, mutation, toast]);

  // Discard all pending changes
  const discardAllChanges = useCallback(() => {
    setPendingChanges({});
    setSavedCells(new Set());
    setFailedCells(new Set());
    // Remove discard toast - users can see changes are gone from the UI
  }, []);

  // Discard specific changes
  const discardSpecificChanges = useCallback((cellKeys: string[]) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      cellKeys.forEach(cellKey => {
        delete newChanges[cellKey];
      });
      return newChanges;
    });

    setSavedCells(prev => {
      const newSet = new Set(prev);
      cellKeys.forEach(cellKey => newSet.delete(cellKey));
      return newSet;
    });

    setFailedCells(prev => {
      const newSet = new Set(prev);
      cellKeys.forEach(cellKey => newSet.delete(cellKey));
      return newSet;
    });

    // Remove discard toast - users can see changes are gone from the UI
  }, []);

  // Retry failed saves
  const retryFailedSaves = useCallback(async () => {
    const failedCellKeys = Array.from(failedCells);
    const changesToRetry = failedCellKeys.reduce((acc, cellKey) => {
      if (pendingChanges[cellKey]) {
        acc[cellKey] = pendingChanges[cellKey];
      }
      return acc;
    }, {} as Record<string, PendingChange>);

    if (Object.keys(changesToRetry).length === 0) return;

    await saveSpecificChanges(failedCellKeys);
  }, [failedCells, pendingChanges, saveSpecificChanges]);

  const state: ExplicitSaveState = {
    pendingChanges,
    savingCells,
    savedCells,
    failedCells,
    hasUnsavedChanges,
    pendingCount
  };

  return {
    state,
    actions: {
      addPendingChange,
      saveAllChanges,
      saveSpecificChanges,
      discardAllChanges,
      discardSpecificChanges,
      retryFailedSaves
    }
  };
}
