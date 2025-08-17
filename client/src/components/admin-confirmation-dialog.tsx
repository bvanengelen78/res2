import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, AlertTriangle, Clock } from 'lucide-react';

interface AdminConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  action: 'submit' | 'unsubmit';
  resourceName: string;
  totalHours: number;
  weekDisplay: string;
  isLoading?: boolean;
}

export function AdminConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  action,
  resourceName,
  totalHours,
  weekDisplay,
  isLoading = false
}: AdminConfirmationDialogProps) {
  const isSubmit = action === 'submit';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md" data-testid="admin-confirmation-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Admin Action Required
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Action description */}
              <div className="text-sm text-gray-600">
                {isSubmit ? (
                  <>
                    You are about to <strong>submit</strong> time entries on behalf of another user.
                  </>
                ) : (
                  <>
                    You are about to <strong>reopen</strong> a submitted week for another user.
                  </>
                )}
              </div>

              {/* Resource info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Resource Details</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {resourceName}</div>
                  <div><strong>Week:</strong> {weekDisplay}</div>
                  {isSubmit && <div><strong>Total Hours:</strong> {totalHours.toFixed(2)}h</div>}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-800 mb-1">Important Notice</div>
                    <div className="text-amber-700">
                      {isSubmit ? (
                        <>
                          This action will lock the week for editing and mark it as submitted. 
                          The user will receive a notification about this admin action.
                        </>
                      ) : (
                        <>
                          This action will reopen the week for editing and notify the user. 
                          They will be able to modify their time entries again.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit trail notice */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                <Clock className="w-3 h-3 inline mr-1" />
                This admin action will be recorded in the audit trail for compliance purposes.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} data-testid="admin-cancel-btn">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"}
            data-testid="admin-confirm-btn"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isSubmit ? 'Submitting...' : 'Reopening...'}
              </div>
            ) : (
              <>
                {isSubmit ? 'Submit Week' : 'Reopen Week'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for managing admin confirmation dialogs
export function useAdminConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<{
    action: 'submit' | 'unsubmit';
    resourceName: string;
    totalHours: number;
    weekDisplay: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirmation = (params: {
    action: 'submit' | 'unsubmit';
    resourceName: string;
    totalHours: number;
    weekDisplay: string;
    onConfirm: () => void;
  }) => {
    setPendingAction(params);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction.onConfirm();
      setIsOpen(false);
      setPendingAction(null);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  return {
    isOpen,
    pendingAction,
    showConfirmation,
    handleConfirm,
    handleCancel,
  };
}
