import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyCapacityHeatmap } from './weekly-capacity-heatmap';
import { Badge } from '@/components/ui/badge';

// Demo data for testing tooltips
const demoAllocations = [
  {
    id: '1',
    resourceId: 1,
    projectId: 'proj-1',
    allocatedHours: 16,
    weeklyAllocations: {
      '2024-W29': 10,
      '2024-W30': 20,
      '2024-W31': 15,
      '2024-W32': 25,
      '2024-W33': 8,
      '2024-W34': 12
    }
  },
  {
    id: '2',
    resourceId: 1,
    projectId: 'proj-2',
    allocatedHours: 12,
    weeklyAllocations: {
      '2024-W29': 8,
      '2024-W30': 15,
      '2024-W31': 10,
      '2024-W32': 20,
      '2024-W33': 5,
      '2024-W34': 8
    }
  }
];

export function TooltipDemo() {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Bulletproof Tooltip Demo - Weekly Capacity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Visual Quality Fixes</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Fixed width conflicts (removed duplicate sizing)</li>
                  <li>• Improved header spacing and alignment</li>
                  <li>• Better content layout with consistent padding</li>
                  <li>• Enhanced button sizing and positioning</li>
                  <li>• Responsive width: 320px desktop, viewport-aware mobile</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-purple-800 mb-2">📌 Pin Features</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Click week blocks to pin tooltips</li>
                  <li>• Use pin button in tooltip header</li>
                  <li>• Pinned tooltips stay open</li>
                  <li>• Close with X button or click again</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Demo Scenarios */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Scenario 1: Normal Capacity (40h/week)</h3>
              <Card className="p-4 bg-gray-50">
                <WeeklyCapacityHeatmap
                  resourceId={1}
                  weeklyCapacity={40}
                  allocations={demoAllocations}
                  onWeekClick={(weekData) => {
                    console.log('Week clicked:', weekData);
                  }}
                />
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Scenario 2: High Capacity (50h/week)</h3>
              <Card className="p-4 bg-gray-50">
                <WeeklyCapacityHeatmap
                  resourceId={2}
                  weeklyCapacity={50}
                  allocations={demoAllocations}
                  onWeekClick={(weekData) => {
                    console.log('Week clicked:', weekData);
                  }}
                />
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Scenario 3: Low Capacity (30h/week) - Overallocated</h3>
              <Card className="p-4 bg-gray-50">
                <WeeklyCapacityHeatmap
                  resourceId={3}
                  weeklyCapacity={30}
                  allocations={demoAllocations}
                  onWeekClick={(weekData) => {
                    console.log('Week clicked:', weekData);
                  }}
                />
              </Card>
            </div>
          </div>

          {/* Testing Instructions */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-3">🧪 Edge Cutoff Testing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-medium mb-2">First Week (W29):</h4>
                  <ul className="space-y-1">
                    <li>• Should show tooltip on RIGHT side</li>
                    <li>• Align: START (top of tooltip)</li>
                    <li>• Never cut off on left edge</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Last Week (W34):</h4>
                  <ul className="space-y-1">
                    <li>• Should show tooltip on LEFT side</li>
                    <li>• Align: END (bottom of tooltip)</li>
                    <li>• Never cut off on right edge</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Middle Weeks:</h4>
                  <ul className="space-y-1">
                    <li>• Should show tooltip BELOW</li>
                    <li>• Align: CENTER</li>
                    <li>• Auto-adjust if near edges</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    🎯 <strong>Positioning Test:</strong> Resize your browser window to narrow width and test the rightmost weeks -
                    tooltips should automatically switch to LEFT positioning to prevent cutoff.
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    ✨ <strong>Visual Quality Test:</strong> Check that tooltip content is properly formatted with:
                    consistent spacing, aligned text, properly sized buttons, and no layout overflow.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg border">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✅ Hover: No Flicker
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              📌 Pin: Interactive
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              🎯 Position: Auto-adjust
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              ⚡ Performance: Optimized
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
