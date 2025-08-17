import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyCapacityHeatmap } from './weekly-capacity-heatmap';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Test data for tooltip validation
const testAllocations = [
  {
    id: '1',
    resourceId: 'test-resource',
    projectId: 'proj-1',
    allocatedHours: 25,
    weeklyAllocations: {
      '2024-W29': 15,
      '2024-W30': 10,
      '2024-W31': 20,
      '2024-W32': 8,
      '2024-W33': 22,
      '2024-W34': 12
    }
  },
  {
    id: '2',
    resourceId: 'test-resource',
    projectId: 'proj-2',
    allocatedHours: 18,
    weeklyAllocations: {
      '2024-W29': 8,
      '2024-W30': 15,
      '2024-W31': 12,
      '2024-W32': 20,
      '2024-W33': 10,
      '2024-W34': 18
    }
  }
];

export function TooltipImprovementsTest() {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Enhanced Tooltip Functionality Test
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Testing improved z-index layering, portal rendering, and enhanced pinnable tooltip functionality
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Improvements Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Z-Index & Positioning Fixes
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div>• Increased z-index to z-[99999] for maximum visibility</div>
                  <div>• Added portal rendering to escape container overflow</div>
                  <div>• Enhanced collision detection and positioning</div>
                  <div>• Improved responsive positioning logic</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Enhanced Pinnable Features
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• Click-outside-to-close functionality</div>
                  <div>• Keyboard support (Escape to close, Enter/Space to pin)</div>
                  <div>• Visual indicators for pinned state</div>
                  <div>• Only one tooltip pinned at a time</div>
                  <div>• Enhanced accessibility with ARIA labels</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Scenarios</h3>
            
            {/* Scenario 1: Normal Container */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Test 1: Normal Container (No Overflow Issues)</h4>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Resource: John Doe • 32h/week effective capacity</p>
              </div>
              <WeeklyCapacityHeatmap
                resourceId={1}
                weeklyCapacity={40}
                allocations={testAllocations}
                onWeekClick={(weekData) => {
                  console.log('Week clicked:', weekData);
                }}
              />
            </Card>

            {/* Scenario 2: Container with Overflow Hidden */}
            <Card className="p-4 bg-yellow-50 border border-yellow-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Test 2: Container with Overflow Hidden (Portal Test)
              </h4>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Resource: Jane Smith • 32h/week effective capacity</p>
              </div>
              <div className="overflow-hidden max-h-32 border-2 border-yellow-300 rounded-lg p-2">
                <WeeklyCapacityHeatmap
                  resourceId={2}
                  weeklyCapacity={40}
                  allocations={testAllocations}
                  onWeekClick={(weekData) => {
                    console.log('Week clicked in overflow container:', weekData);
                  }}
                />
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                ⚠️ This container has overflow:hidden. Tooltips should still be visible due to portal rendering.
              </p>
            </Card>

            {/* Scenario 3: High Z-Index Container */}
            <Card className="p-4 bg-purple-50 border border-purple-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-purple-600" />
                Test 3: High Z-Index Container (Stacking Context Test)
              </h4>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Resource: Alex Johnson • 32h/week effective capacity</p>
              </div>
              <div className="relative z-50 bg-purple-100 border-2 border-purple-300 rounded-lg p-2">
                <WeeklyCapacityHeatmap
                  resourceId={3}
                  weeklyCapacity={40}
                  allocations={testAllocations}
                  onWeekClick={(weekData) => {
                    console.log('Week clicked in high z-index container:', weekData);
                  }}
                />
              </div>
              <p className="text-xs text-purple-700 mt-2">
                ℹ️ This container has z-index: 50. Tooltips should appear above it with z-[99999].
              </p>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="border border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">🧪 Testing Instructions</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <div><strong>Hover Test:</strong> Hover over week blocks to see tooltips appear</div>
                <div><strong>Pin Test:</strong> Click on week blocks to pin tooltips</div>
                <div><strong>Single Pin Test:</strong> Pin multiple tooltips - only one should stay pinned</div>
                <div><strong>Click Outside Test:</strong> Click outside pinned tooltip to close it</div>
                <div><strong>Keyboard Test:</strong> Use Tab to focus, Enter/Space to pin, Escape to close</div>
                <div><strong>Z-Index Test:</strong> Verify tooltips appear above all containers</div>
                <div><strong>Overflow Test:</strong> Check tooltips in overflow:hidden containers</div>
              </div>
            </CardContent>
          </Card>

          {/* Expected Behaviors */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-2">✅ Expected Behaviors</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <div>• Tooltips always visible above all other elements</div>
                <div>• Pinned tooltips show purple header and pin indicator</div>
                <div>• Only one tooltip can be pinned at a time</div>
                <div>• Click outside or press Escape closes pinned tooltips</div>
                <div>• Smooth transitions and visual feedback</div>
                <div>• Accessible keyboard navigation</div>
                <div>• Responsive positioning based on viewport</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
