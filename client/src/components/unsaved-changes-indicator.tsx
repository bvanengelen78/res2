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
import { Save, X, AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface UnsavedChange {
  cellKey: string;
  resourceName?: string;
  projectName?: string;
  weekLabel?: string;
  oldValue: number;
  newValue: number;
}

interface UnsavedChangesIndicatorProps {
  pendingChanges: Record<string, any>;
  savingCells: Set<string>;
  onSaveAll: () => void;
  onDiscardAll: () => void;
  onSaveSpecific?: (cellKeys: string[]) => void;
  onDiscardSpecific?: (cellKeys: string[]) => void;
  formatChange?: (cellKey: string, change: any) => UnsavedChange;
  className?: string;
  position?: 'top' | 'bottom' | 'floating';
  showDetails?: boolean;
}

export function UnsavedChangesIndicator({
  pendingChanges,
  savingCells,
  onSaveAll,
  onDiscardAll,
  onSaveSpecific,
  onDiscardSpecific,
  formatChange,
  className = "",
  position = 'floating',
  showDetails = true
}: UnsavedChangesIndicatorProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'save' | 'discard' | null>(null);
  const [expandedDetails, setExpandedDetails] = useState(false);

  const pendingCount = Object.keys(pendingChanges).length;
  const savingCount = savingCells.size;

  // Don't show if no pending changes
  if (pendingCount === 0) {
    return null;
  }

  const handleConfirmAction = () => {
    if (confirmAction === 'save') {
      onSaveAll();
    } else if (confirmAction === 'discard') {
      onDiscardAll();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleSaveAll = () => {
    if (pendingCount > 5) {
      setConfirmAction('save');
      setShowConfirmDialog(true);
    } else {
      onSaveAll();
    }
  };

  const handleDiscardAll = () => {
    setConfirmAction('discard');
    setShowConfirmDialog(true);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'sticky top-0 z-20';
      case 'bottom':
        return 'sticky bottom-0 z-20';
      case 'floating':
      default:
        return 'fixed bottom-4 right-4 z-50';
    }
  };

  const formattedChanges = formatChange 
    ? Object.keys(pendingChanges).map(cellKey => formatChange(cellKey, pendingChanges[cellKey]))
    : [];

  return (
    <>
      <Card className={`${getPositionClasses()} shadow-lg border-orange-200 bg-orange-50/95 backdrop-blur-sm ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className="flex items-center gap-2">
              {savingCount > 0 ? (
                <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
              
              {/* Change Count */}
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  {pendingCount} unsaved
                </Badge>
                {savingCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {savingCount} saving
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {showDetails && pendingCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedDetails(!expandedDetails)}
                  className="h-7 px-2 text-xs"
                >
                  {expandedDetails ? 'Hide' : 'Show'} Details
                </Button>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAll}
                    disabled={savingCount > 0}
                    className={cn(
                      "h-7 px-3 text-green-700 border-green-300 transition-all duration-300",
                      // Enhanced styles when there are pending changes
                      pendingCount > 0 && savingCount === 0 ? [
                        "bg-green-50 hover:bg-green-100",
                        "animate-pulse",
                        "shadow-lg shadow-green-200/50",
                        "ring-2 ring-green-200/30",
                        "scale-105"
                      ] : [
                        "bg-green-50 hover:bg-green-100"
                      ]
                    )}
                  >
                    <Save className={cn(
                      "h-3 w-3 mr-1 transition-all duration-300",
                      pendingCount > 0 && savingCount === 0 && "animate-pulse"
                    )} />
                    Save All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save all {pendingCount} pending changes</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardAll}
                    disabled={savingCount > 0}
                    className="h-7 px-3 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Discard
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Discard all pending changes</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedDetails && showDetails && formattedChanges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="text-xs font-medium text-orange-800 mb-2">Pending Changes:</div>
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
                    {onSaveSpecific && onDiscardSpecific && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSaveSpecific([change.cellKey])}
                          className="h-5 w-5 p-0"
                        >
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDiscardSpecific([change.cellKey])}
                          className="h-5 w-5 p-0"
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    )}
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

          {/* Quick tip */}
          {!expandedDetails && (
            <div className="mt-2 text-xs text-orange-700">
              Press Ctrl+S to save all changes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'save' ? 'Save All Changes?' : 'Discard All Changes?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'save' 
                ? `You are about to save ${pendingCount} pending changes. This action cannot be undone.`
                : `You are about to discard ${pendingCount} pending changes. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={confirmAction === 'save' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmAction === 'save' ? 'Save All' : 'Discard All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
