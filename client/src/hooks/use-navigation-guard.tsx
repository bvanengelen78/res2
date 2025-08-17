import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";

interface NavigationGuardOptions {
  hasUnsavedChanges: boolean;
  onSaveAndContinue: () => Promise<void>;
  onDiscardAndContinue: () => void;
  message?: string;
}

interface NavigationGuardState {
  showConfirmDialog: boolean;
  pendingNavigation: (() => void) | null;
  navigationAction: 'save' | 'discard' | 'cancel' | null;
}

export function useNavigationGuard({
  hasUnsavedChanges,
  onSaveAndContinue,
  onDiscardAndContinue,
  message = "You have unsaved changes. What would you like to do?"
}: NavigationGuardOptions) {
  const [location, setLocation] = useLocation();
  const [guardState, setGuardState] = useState<NavigationGuardState>({
    showConfirmDialog: false,
    pendingNavigation: null,
    navigationAction: null
  });

  // Handle browser navigation (back/forward, refresh, close tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        
        setGuardState({
          showConfirmDialog: true,
          pendingNavigation: () => {
            // Allow the navigation to proceed
            window.history.back();
          },
          navigationAction: null
        });
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, message]);

  // Intercept programmatic navigation
  const guardedSetLocation = useCallback((newLocation: string) => {
    if (hasUnsavedChanges && newLocation !== location) {
      setGuardState({
        showConfirmDialog: true,
        pendingNavigation: () => setLocation(newLocation),
        navigationAction: null
      });
    } else {
      setLocation(newLocation);
    }
  }, [hasUnsavedChanges, location, setLocation]);

  // Handle confirmation dialog actions
  const handleSaveAndContinue = useCallback(async () => {
    setGuardState(prev => ({ ...prev, navigationAction: 'save' }));
    
    try {
      await onSaveAndContinue();
      
      // Execute pending navigation after successful save
      if (guardState.pendingNavigation) {
        guardState.pendingNavigation();
      }
      
      setGuardState({
        showConfirmDialog: false,
        pendingNavigation: null,
        navigationAction: null
      });
    } catch (error) {
      // Keep dialog open if save fails
      setGuardState(prev => ({ ...prev, navigationAction: null }));
    }
  }, [onSaveAndContinue, guardState.pendingNavigation]);

  const handleDiscardAndContinue = useCallback(() => {
    setGuardState(prev => ({ ...prev, navigationAction: 'discard' }));
    
    onDiscardAndContinue();
    
    // Execute pending navigation
    if (guardState.pendingNavigation) {
      guardState.pendingNavigation();
    }
    
    setGuardState({
      showConfirmDialog: false,
      pendingNavigation: null,
      navigationAction: null
    });
  }, [onDiscardAndContinue, guardState.pendingNavigation]);

  const handleCancel = useCallback(() => {
    setGuardState({
      showConfirmDialog: false,
      pendingNavigation: null,
      navigationAction: null
    });
  }, []);

  // Force navigation without guard (for emergency cases)
  const forceNavigate = useCallback((newLocation: string) => {
    setLocation(newLocation);
  }, [setLocation]);

  return {
    // State
    showConfirmDialog: guardState.showConfirmDialog,
    navigationAction: guardState.navigationAction,
    
    // Actions
    guardedSetLocation,
    forceNavigate,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancel,
    
    // Dialog props
    confirmDialogProps: {
      open: guardState.showConfirmDialog,
      onOpenChange: (open: boolean) => {
        if (!open) handleCancel();
      }
    }
  };
}
