import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Users, Calendar, Briefcase, FileText, CheckCircle, Info } from "lucide-react";
import { Resource } from "@shared/schema";

interface ResourceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  onConfirm: () => void;
  isDeleting: boolean;
  relatedData?: {
    activeAllocations: number;
    timeEntries: number;
    projectsAsDirector: number;
    projectsAsChangeLead: number;
    projectsAsBusinessLead: number;
    timeOffEntries: number;
    weeklySubmissions: number;
    userAccounts: number;
    canDelete?: boolean;
    warnings?: string[];
    suggestions?: string[];
  };
}

export function ResourceDeleteDialog({
  open,
  onOpenChange,
  resource,
  onConfirm,
  isDeleting,
  relatedData
}: ResourceDeleteDialogProps) {
  if (!resource) return null;

  const hasRelationships = relatedData && (
    relatedData.activeAllocations > 0 ||
    relatedData.projectsAsDirector > 0 ||
    relatedData.projectsAsChangeLead > 0 ||
    relatedData.projectsAsBusinessLead > 0 ||
    relatedData.userAccounts > 0
  );

  const totalProjects = (relatedData?.projectsAsDirector || 0) +
                       (relatedData?.projectsAsChangeLead || 0) +
                       (relatedData?.projectsAsBusinessLead || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Delete Resource</DialogTitle>
              <DialogDescription>
                {hasRelationships
                  ? "This resource has active relationships. Review the details below before proceeding."
                  : "Are you sure you want to delete this resource? This action cannot be undone."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resource Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <span className="font-semibold text-gray-700">
                    {resource.name ? resource.name.split(' ').map(n => n[0]).join('') : '??'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{resource.name}</p>
                  <p className="text-sm text-gray-600">{resource.role}</p>
                  <p className="text-sm text-gray-500">{resource.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Message */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Data Preservation Notice
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Existing assignments will be preserved in historical records. This resource will be marked as deleted but related data will remain for reporting purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {relatedData?.warnings && relatedData.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-amber-800">Impact Assessment</p>
                    <ul className="space-y-1">
                      {relatedData.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="w-1 h-1 bg-amber-600 rounded-full mt-2 flex-shrink-0"></span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {relatedData?.suggestions && relatedData.suggestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-blue-800">Recommendations</p>
                    <ul className="space-y-1">
                      {relatedData.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Data Summary */}
          {relatedData && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Related Data Summary:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{relatedData.activeAllocations || 0} active allocations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="h-4 w-4" />
                  <span>{totalProjects} project leadership roles</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{relatedData.timeEntries || 0} time entries</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{relatedData.userAccounts || 0} user accounts</span>
                </div>
              </div>
            </div>
          )}

          {/* Department and Roles */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Current Assignments:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{resource.department}</Badge>
              {resource.roles && resource.roles.map(role => (
                <Badge key={role} variant="secondary">{role}</Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Yes, Delete Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}