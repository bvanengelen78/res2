import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyCapacityHeatmap } from './weekly-capacity-heatmap';

// Test data that matches the expected format
const testAllocations = [
  {
    id: '1',
    resourceId: 'test-resource',
    projectId: 'proj-1',
    allocatedHours: 20,
    weeklyAllocations: {
      '2024-W29': 12,
      '2024-W30': 8,
      '2024-W31': 15,
      '2024-W32': 10,
      '2024-W33': 18,
      '2024-W34': 5
    }
  },
  {
    id: '2',
    resourceId: 'test-resource',
    projectId: 'proj-2',
    allocatedHours: 15,
    weeklyAllocations: {
      '2024-W29': 8,
      '2024-W30': 12,
      '2024-W31': 5,
      '2024-W32': 15,
      '2024-W33': 7,
      '2024-W34': 10
    }
  }
];

export function ResourceTooltipTest() {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Resource Tooltip Test - Optimized Sizing
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Testing compact tooltip design: 224px desktop (was 320px), 256px mobile
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Test Scenario 1: Normal Resource with Allocations */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test 1: Resource with Allocations</h3>
            <Card className="p-4 bg-gray-50">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">Boyan Kamphaus (Test)</h4>
                <p className="text-sm text-gray-600">Product Owner • 40h/week capacity</p>
              </div>
              <WeeklyCapacityHeatmap
                resourceId="test-resource"
                weeklyCapacity={40}
                allocations={testAllocations}
                onWeekClick={(weekData) => {
                  console.log('Week clicked:', weekData);
                }}
              />
            </Card>
          </div>

          {/* Test Scenario 2: Resource with No Allocations */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test 2: Resource with No Allocations</h3>
            <Card className="p-4 bg-gray-50">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">Empty Resource (Test)</h4>
                <p className="text-sm text-gray-600">Developer • 40h/week capacity</p>
              </div>
              <WeeklyCapacityHeatmap
                resourceId="empty-resource"
                weeklyCapacity={40}
                allocations={[]}
                onWeekClick={(weekData) => {
                  console.log('Week clicked:', weekData);
                }}
              />
            </Card>
          </div>

          {/* Test Scenario 3: High Capacity Resource */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Test 3: High Capacity Resource</h3>
            <Card className="p-4 bg-gray-50">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">Senior Lead (Test)</h4>
                <p className="text-sm text-gray-600">Tech Lead • 50h/week capacity</p>
              </div>
              <WeeklyCapacityHeatmap
                resourceId="high-capacity-resource"
                weeklyCapacity={50}
                allocations={testAllocations}
                onWeekClick={(weekData) => {
                  console.log('Week clicked:', weekData);
                }}
              />
            </Card>
          </div>

          {/* Sizing Improvements */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📏 Tooltip Sizing Optimizations</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <div><strong>Desktop:</strong> 224px width (was 320px) - 30% reduction</div>
                <div><strong>Mobile:</strong> 256px width with viewport awareness</div>
                <div><strong>Content:</strong> Compact spacing, smaller text, tighter layout</div>
                <div><strong>Proportion:</strong> Better balance with small week blocks</div>
                <div><strong>Performance:</strong> Faster rendering with smaller DOM footprint</div>
              </div>
              <div className="mt-3 p-2 bg-white rounded border">
                <div className="text-xs text-blue-600">
                  <strong>Before:</strong> 320px × ~140px (oversized)<br/>
                  <strong>After:</strong> 224px × ~110px (proportional)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Format Information */}
          <Card className="border border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📋 Expected Data Format</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <div><strong>Resource:</strong> Must have weeklyCapacity property</div>
                <div><strong>Allocations:</strong> Array of allocation objects</div>
                <div><strong>Each Allocation:</strong> Must have weeklyAllocations object</div>
                <div><strong>Week Keys:</strong> Format "YYYY-WXX" (e.g., "2024-W29")</div>
                <div><strong>Hours:</strong> Numeric values for each week</div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-gray-800 font-medium">View Sample Data Structure</summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
{JSON.stringify(testAllocations[0], null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Sizing Test Instructions</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Size Proportion:</strong> Tooltip should feel balanced, not oversized</li>
                <li>• <strong>Content Fit:</strong> All text should be readable without wasted space</li>
                <li>• <strong>Mobile Test:</strong> Resize browser to test mobile sizing</li>
                <li>• <strong>Edge Cases:</strong> Test rightmost weeks for positioning</li>
                <li>• <strong>Comparison:</strong> Compare with old 320px tooltips if available</li>
              </ul>
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
