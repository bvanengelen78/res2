import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtilizationBar, UtilizationData } from './utilization-bar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info, Target, Clock, Users } from 'lucide-react';

// Test data for different utilization scenarios
const testScenarios: { name: string; data: UtilizationData; description: string }[] = [
  {
    name: "Healthy Utilization",
    description: "Normal capacity usage - 65% utilized",
    data: {
      utilizationPercent: 65,
      totalAllocatedHours: 20.8,
      effectiveCapacity: 32,
      baseCapacity: 40,
      nonProjectHours: 8,
      currentProjectHours: 12.5,
      otherProjectsHours: 8.3,
      resourceName: "John Doe",
      weekLabel: "Week 29"
    }
  },
  {
    name: "Near Capacity",
    description: "High utilization - 87% utilized",
    data: {
      utilizationPercent: 87,
      totalAllocatedHours: 27.8,
      effectiveCapacity: 32,
      baseCapacity: 40,
      nonProjectHours: 8,
      currentProjectHours: 16,
      otherProjectsHours: 11.8,
      resourceName: "Jane Smith",
      weekLabel: "Week 30"
    }
  },
  {
    name: "Overallocated",
    description: "Over capacity - 115% utilized",
    data: {
      utilizationPercent: 115,
      totalAllocatedHours: 36.8,
      effectiveCapacity: 32,
      baseCapacity: 40,
      nonProjectHours: 8,
      currentProjectHours: 20,
      otherProjectsHours: 16.8,
      resourceName: "Alex Johnson",
      weekLabel: "Week 31"
    }
  },
  {
    name: "No Allocations",
    description: "Empty state - 0% utilized",
    data: {
      utilizationPercent: 0,
      totalAllocatedHours: 0,
      effectiveCapacity: 32,
      baseCapacity: 40,
      nonProjectHours: 8,
      currentProjectHours: 0,
      otherProjectsHours: 0,
      resourceName: "Sarah Wilson",
      weekLabel: "Week 32"
    }
  }
];

export function UtilizationBarTest() {
  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Enhanced UtilizationBar Test Suite
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Testing enhanced tooltip functionality with z-index fixes, portal rendering, and pinnable features
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Improvements Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Enhanced Features Applied
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div>• Z-index fixes with z-[99999] for maximum visibility</div>
                  <div>• Portal rendering to escape container overflow</div>
                  <div>• Click-to-pin tooltip functionality</div>
                  <div>• Click-outside-to-close behavior</div>
                  <div>• Keyboard support (Escape, Enter/Space)</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Design Enhancements
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• ResourceFlow design patterns (rounded-2xl)</div>
                  <div>• Purple styling for pinned state</div>
                  <div>• Enhanced accessibility with ARIA labels</div>
                  <div>• Hover effects and visual feedback</div>
                  <div>• Consistent spacing and typography</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Scenarios</h3>
            
            {/* Scenario 1: Normal Container */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-4">Test 1: Normal Container (No Overflow Issues)</h4>
              <div className="space-y-4">
                {testScenarios.map((scenario, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{scenario.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {scenario.data.utilizationPercent.toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">{scenario.description}</span>
                    </div>
                    <UtilizationBar
                      data={scenario.data}
                      uniqueId={`normal-${index}`}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Scenario 2: Container with Overflow Hidden */}
            <Card className="p-4 bg-yellow-50 border border-yellow-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Test 2: Container with Overflow Hidden (Portal Test)
              </h4>
              <div className="overflow-hidden max-h-24 border-2 border-yellow-300 rounded-lg p-3">
                <div className="space-y-3">
                  {testScenarios.slice(0, 2).map((scenario, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{scenario.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {scenario.data.utilizationPercent.toFixed(0)}%
                        </Badge>
                      </div>
                      <UtilizationBar
                        data={scenario.data}
                        uniqueId={`overflow-${index}`}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
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
              <div className="relative z-50 bg-purple-100 border-2 border-purple-300 rounded-lg p-3">
                <div className="space-y-3">
                  {testScenarios.slice(1, 3).map((scenario, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{scenario.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {scenario.data.utilizationPercent.toFixed(0)}%
                        </Badge>
                      </div>
                      <UtilizationBar
                        data={scenario.data}
                        uniqueId={`highz-${index}`}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
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
                <div><strong>Hover Test:</strong> Hover over utilization bars to see enhanced tooltips</div>
                <div><strong>Pin Test:</strong> Click on bars to pin tooltips with purple styling</div>
                <div><strong>Single Pin Test:</strong> Pin multiple tooltips - only one should stay pinned</div>
                <div><strong>Click Outside Test:</strong> Click outside pinned tooltip to close it</div>
                <div><strong>Keyboard Test:</strong> Use Tab to focus, Enter/Space to pin, Escape to close</div>
                <div><strong>Z-Index Test:</strong> Verify tooltips appear above all containers</div>
                <div><strong>Overflow Test:</strong> Check tooltips in overflow:hidden containers</div>
                <div><strong>Hover Enhancement:</strong> Notice bars grow slightly on hover for better UX</div>
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
                <div>• Only one tooltip can be pinned at a time across all bars</div>
                <div>• Click outside or press Escape closes pinned tooltips</div>
                <div>• Bars have subtle hover effects (height increase, shadow)</div>
                <div>• Accessible keyboard navigation with focus indicators</div>
                <div>• Detailed capacity breakdown with project allocation info</div>
                <div>• Color-coded status messages (red for overallocation, amber for near capacity)</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
