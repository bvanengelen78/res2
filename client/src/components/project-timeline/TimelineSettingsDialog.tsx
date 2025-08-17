/**
 * Timeline Settings Dialog Component
 * Configuration options for timeline display
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Calendar, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Route,
  Move,
  Grid,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineSettings } from './types';

interface TimelineSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TimelineSettings;
  onSettingsChange?: (settings: TimelineSettings) => void;
}

export const TimelineSettingsDialog: React.FC<TimelineSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}) => {
  const [localSettings, setLocalSettings] = useState<TimelineSettings>(settings);

  const handleSettingChange = (key: keyof TimelineSettings, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSettingsChange?.(localSettings);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultSettings: TimelineSettings = {
      showWeekends: true,
      showResourceConflicts: true,
      showDependencies: true,
      showProgress: true,
      showCriticalPath: false,
      autoScroll: false,
      snapToGrid: true,
      enableDragDrop: true
    };
    setLocalSettings(defaultSettings);
  };

  const settingGroups = [
    {
      title: 'Display Options',
      icon: Eye,
      settings: [
        {
          key: 'showWeekends' as keyof TimelineSettings,
          label: 'Show Weekends',
          description: 'Display weekend days in the timeline grid',
          icon: Calendar
        },
        {
          key: 'showProgress' as keyof TimelineSettings,
          label: 'Show Progress',
          description: 'Display progress bars on timeline items',
          icon: TrendingUp
        },
        {
          key: 'showCriticalPath' as keyof TimelineSettings,
          label: 'Show Critical Path',
          description: 'Highlight the critical path through the project',
          icon: Route
        }
      ]
    },
    {
      title: 'Resource Management',
      icon: Users,
      settings: [
        {
          key: 'showResourceConflicts' as keyof TimelineSettings,
          label: 'Show Resource Conflicts',
          description: 'Highlight resource allocation conflicts',
          icon: AlertTriangle
        },
        {
          key: 'showDependencies' as keyof TimelineSettings,
          label: 'Show Dependencies',
          description: 'Display task dependencies and relationships',
          icon: Route
        }
      ]
    },
    {
      title: 'Interaction',
      icon: Move,
      settings: [
        {
          key: 'enableDragDrop' as keyof TimelineSettings,
          label: 'Enable Drag & Drop',
          description: 'Allow dragging timeline items to adjust dates',
          icon: Move
        },
        {
          key: 'snapToGrid' as keyof TimelineSettings,
          label: 'Snap to Grid',
          description: 'Snap items to timeline grid when moving',
          icon: Grid
        },
        {
          key: 'autoScroll' as keyof TimelineSettings,
          label: 'Auto Scroll',
          description: 'Automatically scroll to follow current date',
          icon: Zap
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Timeline Settings
          </DialogTitle>
          <DialogDescription>
            Customize how your timeline is displayed and how you interact with it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[500px] overflow-y-auto">
          {settingGroups.map((group, groupIndex) => {
            const GroupIcon = group.icon;
            
            return (
              <div key={group.title} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center gap-2">
                  <GroupIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">{group.title}</h3>
                </div>

                {/* Settings in Group */}
                <div className="space-y-4 pl-7">
                  {group.settings.map((setting) => {
                    const SettingIcon = setting.icon;
                    const isEnabled = localSettings[setting.key];
                    
                    return (
                      <div key={setting.key} className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <SettingIcon className={cn(
                            "h-4 w-4 mt-1 flex-shrink-0",
                            isEnabled ? "text-blue-600" : "text-gray-400"
                          )} />
                          <div className="space-y-1">
                            <Label 
                              htmlFor={setting.key}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {setting.label}
                            </Label>
                            <p className="text-sm text-gray-500">
                              {setting.description}
                            </p>
                          </div>
                        </div>
                        
                        <Switch
                          id={setting.key}
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Separator between groups */}
                {groupIndex < settingGroups.length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            );
          })}

          {/* Settings Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Current Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(localSettings).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    value ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span className={cn(
                    value ? "text-blue-700" : "text-blue-600"
                  )}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Settings className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineSettingsDialog;
