/**
 * Timeline Export Dialog Component
 * Export functionality for timeline data
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Download, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Code,
  Calendar as CalendarIcon,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineExportOptions } from './types';
import { format } from 'date-fns';

interface TimelineExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (options: TimelineExportOptions) => void;
  projectId: string;
}

export const TimelineExportDialog: React.FC<TimelineExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  projectId
}) => {
  const [exportOptions, setExportOptions] = useState<TimelineExportOptions>({
    format: 'pdf',
    includeResources: true,
    includeMilestones: true,
    includeTasks: true,
    includeDependencies: true
  });

  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF Document',
      description: 'High-quality document for presentations',
      icon: FileText,
      color: 'text-red-600'
    },
    {
      value: 'png',
      label: 'PNG Image',
      description: 'High-resolution image for reports',
      icon: Image,
      color: 'text-blue-600'
    },
    {
      value: 'csv',
      label: 'CSV Spreadsheet',
      description: 'Data export for analysis',
      icon: FileSpreadsheet,
      color: 'text-green-600'
    },
    {
      value: 'json',
      label: 'JSON Data',
      description: 'Raw data for developers',
      icon: Code,
      color: 'text-purple-600'
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const finalOptions: TimelineExportOptions = {
        ...exportOptions,
        dateRange: dateRange.start && dateRange.end ? {
          start: dateRange.start,
          end: dateRange.end
        } : undefined
      };
      
      await onExport?.(finalOptions);
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updateExportOption = (key: keyof TimelineExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Export Timeline
          </DialogTitle>
          <DialogDescription>
            Export your project timeline in various formats for sharing and analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={exportOptions.format}
              onValueChange={(value) => updateExportOption('format', value)}
              className="grid grid-cols-2 gap-3"
            >
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1"
                    >
                      <Icon className={cn("h-5 w-5", option.color)} />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Date Range (Optional)</Label>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.start ? format(dateRange.start, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-500">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !dateRange.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.end ? format(dateRange.end, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-gray-500">
              Leave empty to export the entire timeline
            </p>
          </div>

          {/* Content Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Include Content</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeResources"
                  checked={exportOptions.includeResources}
                  onCheckedChange={(checked) => updateExportOption('includeResources', checked)}
                />
                <Label htmlFor="includeResources" className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                  Resource Allocations
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMilestones"
                  checked={exportOptions.includeMilestones}
                  onCheckedChange={(checked) => updateExportOption('includeMilestones', checked)}
                />
                <Label htmlFor="includeMilestones" className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  Milestones
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTasks"
                  checked={exportOptions.includeTasks}
                  onCheckedChange={(checked) => updateExportOption('includeTasks', checked)}
                />
                <Label htmlFor="includeTasks" className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  Tasks
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDependencies"
                  checked={exportOptions.includeDependencies}
                  onCheckedChange={(checked) => updateExportOption('includeDependencies', checked)}
                />
                <Label htmlFor="includeDependencies" className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                  Dependencies
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Export Preview</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your timeline will be exported as a {formatOptions.find(f => f.value === exportOptions.format)?.label.toLowerCase()} 
                  {dateRange.start && dateRange.end 
                    ? ` for the period from ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d, yyyy')}`
                    : ' for the entire project timeline'
                  }.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Timeline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineExportDialog;
