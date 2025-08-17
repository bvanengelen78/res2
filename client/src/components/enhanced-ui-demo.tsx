import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EnhancedResourceCardV2 } from './enhanced-resource-card-v2';
import { RefreshCw, Play, Pause } from 'lucide-react';
import type { Resource } from '@shared/schema';

// Demo data
const demoResource: Resource = {
  id: '1',
  name: 'Nina Rohs',
  email: 'nina.rohs@swisssense.nl',
  role: 'Change Manager',
  department: 'IT Architecture & Delivery',
  weeklyCapacity: '40',
  skills: 'Change Management,Project Management,Business Analysis,Stakeholder Engagement',
  isActive: true,
  profileImage: '',
  createdAt: new Date(),
  updatedAt: new Date()
};

const demoAllocations = [
  {
    id: '1',
    resourceId: '1',
    projectId: 'proj-1',
    allocatedHours: 16,
    weeklyAllocations: {
      'W29': 10,
      'W30': 0,
      'W31': 0,
      'W32': 0,
      'W33': 0,
      'W34': 0
    }
  }
];

export function EnhancedUIDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [showLiveIndicator, setShowLiveIndicator] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [capacityValue, setCapacityValue] = useState(40);

  // Simulate auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      setLastSyncTime(new Date());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  // Simulate capacity changes
  const simulateCapacityChange = () => {
    const newCapacity = Math.floor(Math.random() * 20) + 30; // 30-50 hours
    setCapacityValue(newCapacity);
    
    // Update the demo resource
    demoResource.weeklyCapacity = newCapacity.toString();
    setLastSyncTime(new Date());
  };

  // Simulate loading state
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastSyncTime(new Date());
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Enhanced Resource Card v2 - UI/UX Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                checked={showLiveIndicator}
                onCheckedChange={setShowLiveIndicator}
              />
              <label className="text-sm font-medium">Live Refresh Indicator</label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={isAutoRefresh}
                onCheckedChange={setIsAutoRefresh}
              />
              <label className="text-sm font-medium">Auto Refresh</label>
              {isAutoRefresh ? (
                <Play className="h-4 w-4 text-green-600" />
              ) : (
                <Pause className="h-4 w-4 text-gray-400" />
              )}
            </div>

            <Button
              onClick={simulateLoading}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Simulate Loading
            </Button>

            <Button
              onClick={simulateCapacityChange}
              variant="outline"
              size="sm"
            >
              Change Capacity
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-800 mb-2">✨ Loading Skeletons</h3>
                <p className="text-sm text-green-700">
                  Shimmer effects and pulsing placeholders during data loading
                </p>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-2">🎯 Microanimations</h3>
                <p className="text-sm text-blue-700">
                  Smooth transitions, hover effects, and animated number counters
                </p>
              </CardContent>
            </Card>

            <Card className="border border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-purple-800 mb-2">📡 Page-Level Sync</h3>
                <p className="text-sm text-purple-700">
                  Live sync toggle in page header (not shown on individual cards)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Demo Cards */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Grid View Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EnhancedResourceCardV2
                resource={demoResource}
                onEdit={() => console.log('Edit clicked')}
                variant="grid"
                allocations={demoAllocations}
                isLoading={isLoading}
              />
              
              {/* Second card for comparison */}
              <EnhancedResourceCardV2
                resource={{
                  ...demoResource,
                  id: '2',
                  name: 'Etienne Heye',
                  role: 'Supply Chain Developer',
                  skills: 'Logistics,Supply Chain,Data Analysis',
                  weeklyCapacity: '40'
                }}
                onEdit={() => console.log('Edit clicked')}
                variant="grid"
                allocations={[]} // No projects assigned
                isLoading={isLoading}
              />
            </div>

            <h3 className="text-lg font-semibold">List View Demo</h3>
            <div className="space-y-3">
              <EnhancedResourceCardV2
                resource={demoResource}
                onEdit={() => console.log('Edit clicked')}
                variant="list"
                allocations={demoAllocations}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Status Info */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white">
                Last Updated: {lastSyncTime.toLocaleTimeString()}
              </Badge>
              <Badge variant="outline" className="bg-white">
                Current Capacity: {capacityValue}h/week
              </Badge>
              <Badge variant="outline" className="bg-white text-purple-700">
                Live props passed but not displayed on cards
              </Badge>
            </div>
            {isAutoRefresh && (
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
                Auto-refreshing every 5s
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
