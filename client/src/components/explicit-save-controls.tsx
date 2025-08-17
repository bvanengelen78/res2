import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Save,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { ExplicitSaveState } from "@/hooks/use-explicit-allocation-save";

// Navigation Guard Dialog Component
interface NavigationGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
  navigationAction: 'save' | 'discard' | 'cancel' | null;
  onSaveAndContinue: () => Promise<void>;
  onDiscardAndContinue: () => void;
  onCancel: () => void;
}

export function NavigationGuardDialog({
  open,
  onOpenChange,
  pendingCount,
  navigationAction,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel
}: NavigationGuardDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      await onSaveAndContinue();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have {pendingCount} unsaved changes. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onDiscardAndContinue}
            disabled={isSaving}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Discard Changes
          </Button>
          <AlertDialogAction
            onClick={handleSaveAndContinue}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Clock className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ExplicitSaveControlsProps {
  state: ExplicitSaveState;
  onSaveAll: () => Promise<void>;
  onDiscardAll: () => void;
  onRetryFailed?: () => Promise<void>;
  formatChange?: (cellKey: string, change: any) => {
    resourceName?: string;
    projectName?: string;
    weekLabel?: string;
    oldValue: number;
    newValue: number;
  };
  className?: string;
  position?: 'top' | 'bottom' | 'floating';
  showDetails?: boolean;
}

export function ExplicitSaveControls({
  state,
  onSaveAll,
  onDiscardAll,
  onRetryFailed,
  formatChange,
  className = "",
  position = 'floating',
  showDetails = true
}: ExplicitSaveControlsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'save' | 'discard' | null>(null);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { pendingChanges, savingCells, savedCells, failedCells, hasUnsavedChanges, pendingCount } = state;
  const savingCount = savingCells.size;
  const failedCount = failedCells.size;

  // Don't show if no pending changes
  if (!hasUnsavedChanges) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'sticky top-0 z-50 mb-4';
      case 'bottom':
        return 'sticky bottom-0 z-50 mt-4';
      case 'floating':
      default:
        return 'fixed bottom-4 right-4 z-50 max-w-md';
    }
  };

  const handleSaveAll = async () => {
    console.log(`[SAVE_CONTROLS] handleSaveAll clicked! confirmAction=${confirmAction}, pendingCount=${pendingCount}`);

    if (confirmAction === 'save') {
      // User confirmed in dialog, proceed with save
      console.log(`[SAVE_CONTROLS] Confirmed save, proceeding...`);
      setIsSaving(true);
      try {
        console.log(`[SAVE_CONTROLS] Calling onSaveAll...`);
        await onSaveAll();
        console.log(`[SAVE_CONTROLS] onSaveAll completed successfully`);
      } catch (error) {
        console.error(`[SAVE_CONTROLS] onSaveAll failed:`, error);
      } finally {
        setIsSaving(false);
        setShowConfirmDialog(false);
        setConfirmAction(null);
      }
    } else {
      // First click - check if confirmation is needed
      if (pendingCount > 5) {
        // Show confirmation dialog for large number of changes
        console.log(`[SAVE_CONTROLS] Large batch (${pendingCount} changes), showing confirmation dialog`);
        setConfirmAction('save');
        setShowConfirmDialog(true);
      } else {
        // Direct save for small number of changes
        console.log(`[SAVE_CONTROLS] Small batch (${pendingCount} changes), saving directly`);
        setIsSaving(true);
        try {
          console.log(`[SAVE_CONTROLS] Calling onSaveAll directly...`);
          await onSaveAll();
          console.log(`[SAVE_CONTROLS] Direct onSaveAll completed successfully`);
        } catch (error) {
          console.error(`[SAVE_CONTROLS] Direct onSaveAll failed:`, error);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleDiscardAll = () => {
    if (confirmAction === 'discard') {
      onDiscardAll();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    } else {
      setConfirmAction('discard');
      setShowConfirmDialog(true);
    }
  };

  const handleRetryFailed = async () => {
    if (onRetryFailed && failedCount > 0) {
      setIsSaving(true);
      try {
        await onRetryFailed();
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Format changes for display
  const formattedChanges = formatChange ? 
    Object.entries(pendingChanges).map(([cellKey, change]) => ({
      cellKey,
      ...formatChange(cellKey, change)
    })) : [];

  return (
    <>
      <Card className={`${getPositionClasses()} shadow-lg border-blue-200 bg-blue-50/95 backdrop-blur-sm ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className="flex items-center gap-2">
              {savingCount > 0 ? (
                <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
              ) : failedCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              )}
              
              {/* Change Count */}
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  {pendingCount} unsaved
                </Badge>
                {savingCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {savingCount} saving
                  </Badge>
                )}
                {failedCount > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    {failedCount} failed
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {failedCount > 0 && onRetryFailed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryFailed}
                      disabled={isSaving}
                      className="h-8 px-3 bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retry failed saves</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={handleSaveAll}
                    disabled={savingCount > 0 || isSaving}
                    className={cn(
                      "h-8 px-3 text-white transition-all duration-300",
                      // Enhanced styles when there are pending changes
                      pendingCount > 0 && !isSaving ? [
                        "bg-blue-600 hover:bg-blue-700",
                        "animate-pulse",
                        "shadow-lg shadow-blue-200/50",
                        "ring-2 ring-blue-200/30",
                        "scale-105"
                      ] : [
                        "bg-blue-600 hover:bg-blue-700"
                      ]
                    )}
                  >
                    {isSaving ? (
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Save className={cn(
                        "h-3 w-3 mr-1 transition-all duration-300",
                        pendingCount > 0 && !isSaving && "animate-pulse"
                      )} />
                    )}
                    Save All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save all pending changes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDiscardAll}
                    disabled={savingCount > 0 || isSaving}
                    className="h-8 px-3 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Discard
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard all changes</TooltipContent>
              </Tooltip>

              {showDetails && formattedChanges.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedDetails(!expandedDetails)}
                  className="h-8 w-8 p-0"
                >
                  {expandedDetails ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {expandedDetails && showDetails && formattedChanges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs font-medium text-blue-800 mb-2">Pending Changes:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {formattedChanges.slice(0, 10).map((change, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-white/50 rounded px-2 py-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {change.resourceName || change.projectName}
                      </div>
                      <div className="text-gray-600 truncate">
                        {change.weekLabel}: {change.oldValue}h → {change.newValue}h
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {savingCells.has(change.cellKey) && (
                        <Clock className="h-3 w-3 text-yellow-600 animate-pulse" />
                      )}
                      {savedCells.has(change.cellKey) && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {failedCells.has(change.cellKey) && (
                        <AlertCircle className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
                {formattedChanges.length > 10 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... and {formattedChanges.length - 10} more changes
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'save' ? 'Save Changes' : 'Discard Changes'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'save' 
                ? `Are you sure you want to save ${pendingCount} pending changes? This action cannot be undone.`
                : `Are you sure you want to discard ${pendingCount} unsaved changes? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === 'save' ? handleSaveAll : handleDiscardAll}
              className={confirmAction === 'save' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmAction === 'save' ? 'Save All' : 'Discard All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
