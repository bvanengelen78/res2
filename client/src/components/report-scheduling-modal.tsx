import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, Mail, Plus, X, AlertCircle, Save } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReportSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTemplate?: {
    title: string;
    type: string;
    description: string;
  };
  onScheduleCreated?: () => void;
}

interface ScheduleConfig {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  timezone: string;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  enabled: boolean;
  emailRecipients: string[];
  includeAttachment: boolean;
  customSubject?: string;
}

const frequencyOptions = [
  { value: 'daily', label: 'Daily', description: 'Generate report every day' },
  { value: 'weekly', label: 'Weekly', description: 'Generate report every week' },
  { value: 'monthly', label: 'Monthly', description: 'Generate report every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Generate report every quarter' }
];

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' }
];

export function ReportSchedulingModal({ open, onOpenChange, reportTemplate, onScheduleCreated }: ReportSchedulingModalProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    name: reportTemplate ? `${reportTemplate.title} - Scheduled` : '',
    frequency: 'weekly',
    time: '09:00',
    timezone: 'UTC',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    enabled: true,
    emailRecipients: [],
    includeAttachment: true,
    customSubject: ''
  });
  const [newRecipient, setNewRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addRecipient = () => {
    if (newRecipient && !config.emailRecipients.includes(newRecipient)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(newRecipient)) {
        setConfig(prev => ({
          ...prev,
          emailRecipients: [...prev.emailRecipients, newRecipient]
        }));
        setNewRecipient('');
      } else {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      }
    }
  };

  const removeRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email)
    }));
  };

  const getScheduleDescription = () => {
    const { frequency, time, dayOfWeek, dayOfMonth, timezone } = config;
    
    switch (frequency) {
      case 'daily':
        return `Every day at ${time} (${timezone})`;
      case 'weekly':
        const dayName = daysOfWeek.find(d => d.value === dayOfWeek)?.label || 'Monday';
        return `Every ${dayName} at ${time} (${timezone})`;
      case 'monthly':
        return `Every month on day ${dayOfMonth} at ${time} (${timezone})`;
      case 'quarterly':
        return `Every quarter on day ${dayOfMonth} at ${time} (${timezone})`;
      default:
        return '';
    }
  };

  const handleSave = async () => {
    if (!config.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this scheduled report.",
        variant: "destructive",
      });
      return;
    }

    if (config.emailRecipients.length === 0) {
      toast({
        title: "Recipients Required",
        description: "Please add at least one email recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/api/reports/schedule', {
        method: 'POST',
        body: JSON.stringify({
          ...config,
          reportTemplate: reportTemplate?.type || 'custom'
        }),
      });

      toast({
        title: "Schedule Created",
        description: `Report schedule "${config.name}" has been created successfully.`,
      });

      onScheduleCreated?.();
      onOpenChange(false);
      
      // Reset form
      setConfig({
        name: '',
        frequency: 'weekly',
        time: '09:00',
        timezone: 'UTC',
        dayOfWeek: 1,
        dayOfMonth: 1,
        enabled: true,
        emailRecipients: [],
        includeAttachment: true,
        customSubject: ''
      });
      
    } catch (error) {
      console.error('Failed to create schedule:', error);
      toast({
        title: "Schedule Failed",
        description: "Failed to create report schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Schedule Report</span>
          </DialogTitle>
          <DialogDescription>
            Configure automatic report generation and delivery schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Template Info */}
          {reportTemplate && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-1">{reportTemplate.title}</h3>
              <p className="text-sm text-blue-700">{reportTemplate.description}</p>
            </div>
          )}

          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter a name for this schedule"
            />
          </div>

          {/* Frequency Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Frequency</Label>
            <Select 
              value={config.frequency} 
              onValueChange={(value: any) => setConfig(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Day Selection for Weekly */}
            {config.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select 
                  value={config.dayOfWeek?.toString()} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day Selection for Monthly/Quarterly */}
            {(config.frequency === 'monthly' || config.frequency === 'quarterly') && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth}
                  onChange={(e) => setConfig(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) || 1 }))}
                />
              </div>
            )}

            {/* Time and Timezone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select 
                  value={config.timezone} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Preview */}
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Schedule:</span>
                <span className="text-sm text-gray-700">{getScheduleDescription()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Recipients */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Email Recipients</Label>
            
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                className="flex-1"
              />
              <Button onClick={addRecipient} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {config.emailRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.emailRecipients.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: !!checked }))}
                />
                <Label htmlFor="enabled" className="text-sm">Enable this schedule</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-attachment"
                  checked={config.includeAttachment}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeAttachment: !!checked }))}
                />
                <Label htmlFor="include-attachment" className="text-sm">Include report as email attachment</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-subject">Custom Email Subject (Optional)</Label>
              <Input
                id="custom-subject"
                value={config.customSubject}
                onChange={(e) => setConfig(prev => ({ ...prev, customSubject: e.target.value }))}
                placeholder="Leave empty to use default subject"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !config.name.trim() || config.emailRecipients.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Schedule
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
