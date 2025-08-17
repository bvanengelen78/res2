import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllocationInput } from './allocation-input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info, Target } from 'lucide-react';

// Test scenarios for allocation input validation - including problematic cases
const testScenarios = [
  { name: "Zero Value", initialValue: 0, description: "Starting from zero" },
  { name: "Kees Steijsiger W5", initialValue: 1.5, description: "Problematic case: 1.5h → 2.0h increment" },
  { name: "Half Hour", initialValue: 2.5, description: "Half-hour increment" },
  { name: "Decimal Value", initialValue: 3.7, description: "Arbitrary decimal" },
  { name: "Edge Case 1.0", initialValue: 1.0, description: "Whole number to half" },
  { name: "Edge Case 0.5", initialValue: 0.5, description: "Half to whole" },
  { name: "Near Maximum", initialValue: 39, description: "Close to 40h limit" },
  { name: "Maximum Value", initialValue: 40, description: "At maximum capacity" },
  { name: "Small Decimal", initialValue: 0.3, description: "Small decimal value" },
  { name: "Large Decimal", initialValue: 15.8, description: "Large decimal value" },
  { name: "Precision Test", initialValue: 7.3, description: "7.3 → 7.8 → 8.3 precision" },
  { name: "Boundary Test", initialValue: 39.5, description: "39.5 → 40.0 boundary" }
];

export function AllocationInputTest() {
  const [testValues, setTestValues] = useState<Record<string, number>>(
    testScenarios.reduce((acc, scenario, index) => {
      acc[`test-${index}`] = scenario.initialValue;
      return acc;
    }, {} as Record<string, number>)
  );

  const [changeLog, setChangeLog] = useState<Array<{
    scenario: string;
    oldValue: number;
    newValue: number;
    timestamp: Date;
    action: string;
  }>>([]);

  const handleValueChange = (scenarioKey: string, scenarioName: string) => 
    (newValueStr: string, oldValue: number) => {
      const newValue = parseFloat(newValueStr) || 0;
      setTestValues(prev => ({ ...prev, [scenarioKey]: newValue }));
      
      // Log the change for testing validation
      setChangeLog(prev => [...prev, {
        scenario: scenarioName,
        oldValue,
        newValue,
        timestamp: new Date(),
        action: newValue > oldValue ? 'INCREMENT' : newValue < oldValue ? 'DECREMENT' : 'MANUAL'
      }].slice(-10)); // Keep last 10 changes
    };

  const validateIncrement = (oldValue: number, newValue: number): boolean => {
    const expectedIncrement = Math.round((oldValue + 0.5) * 10) / 10;
    return Math.abs(newValue - expectedIncrement) < 0.01;
  };

  const validateDecrement = (oldValue: number, newValue: number): boolean => {
    const expectedDecrement = Math.round((oldValue - 0.5) * 10) / 10;
    return Math.abs(newValue - expectedDecrement) < 0.01;
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧮 Enhanced AllocationInput Test Suite
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Testing improved chevron increment/decrement behavior and visual alignment
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Improvements Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Fixed Increment Logic
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div>• Consistent 0.5-hour increments/decrements</div>
                  <div>• Fixed 1.5h → 2.0h increment issue</div>
                  <div>• Uses inputValue for immediate feedback</div>
                  <div>• Proper rounding to 1 decimal place</div>
                  <div>• Respects min/max boundaries</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Perfect Alignment
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• Pixel-perfect chevron positioning</div>
                  <div>• No overlap with input content</div>
                  <div>• Proper inset-y-px alignment</div>
                  <div>• Visual separator between buttons</div>
                  <div>• Responsive to input field size</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  State-of-the-Art UX
                </h3>
                <div className="text-sm text-purple-700 space-y-1">
                  <div>• Gradient hover effects</div>
                  <div>• Micro-interactions (scale on click)</div>
                  <div>• Smart disabled states</div>
                  <div>• Enhanced tooltips with previews</div>
                  <div>• Smooth transitions (150ms)</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Specific Issue Test */}
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Issue Test: Kees Steijsiger W5 (1.5h → 2.0h)
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-red-700">
                  <div>Original Issue: Increment from 1.5h to 2.0h was failing</div>
                  <div>Expected: 1.5 + 0.5 = 2.0 (exactly)</div>
                </div>
                <div className="flex items-center gap-2">
                  <AllocationInput
                    value={testValues['test-1'] || 1.5}
                    onChange={handleValueChange('test-1', 'Kees Steijsiger W5')}
                    cellKey="kees-w5-test"
                    min={0}
                    max={40}
                    step={0.5}
                  />
                  <div className="text-xs text-gray-600">
                    Current: {testValues['test-1'] || 1.5}h<br/>
                    Next +0.5: {Math.min(40, Math.round(((testValues['test-1'] || 1.5) + 0.5) * 10) / 10)}h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">All Test Scenarios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testScenarios.map((scenario, index) => {
                const scenarioKey = `test-${index}`;
                const currentValue = testValues[scenarioKey];
                
                return (
                  <Card key={scenarioKey} className="p-4 bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {currentValue}h
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-gray-600">{scenario.description}</p>
                      
                      <div className="flex justify-center">
                        <AllocationInput
                          value={currentValue}
                          onChange={handleValueChange(scenarioKey, scenario.name)}
                          cellKey={scenarioKey}
                          min={0}
                          max={40}
                          step={0.5}
                          className="mx-auto"
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Initial: {scenario.initialValue}h</div>
                        <div>Current: {currentValue}h</div>
                        <div>Next +0.5: {Math.min(40, Math.round((currentValue + 0.5) * 10) / 10)}h</div>
                        <div>Next -0.5: {Math.max(0, Math.round((currentValue - 0.5) * 10) / 10)}h</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Change Log */}
          <Card className="border border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Changes Log</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {changeLog.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No changes yet. Try using the chevron buttons!</p>
                ) : (
                  changeLog.slice().reverse().map((change, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={change.action === 'INCREMENT' ? 'default' : change.action === 'DECREMENT' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {change.action}
                        </Badge>
                        <span className="font-medium">{change.scenario}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{change.oldValue}h → {change.newValue}h</span>
                        {change.action === 'INCREMENT' && validateIncrement(change.oldValue, change.newValue) && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        {change.action === 'DECREMENT' && validateDecrement(change.oldValue, change.newValue) && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🧪 Testing Instructions</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <div><strong>Hover Test:</strong> Hover over input fields to see chevron buttons appear</div>
                <div><strong>Click Test:</strong> Use chevron buttons to increment/decrement by 0.5h</div>
                <div><strong>Keyboard Test:</strong> Focus input and use Ctrl+↑/↓ or Alt+↑/↓</div>
                <div><strong>Boundary Test:</strong> Try incrementing at 40h or decrementing at 0h</div>
                <div><strong>Precision Test:</strong> Test with decimal values like 3.7h</div>
                <div><strong>Manual Input:</strong> Type values directly and use Enter/Escape</div>
                <div><strong>Validation:</strong> Check the change log for correct 0.5h increments</div>
              </div>
            </CardContent>
          </Card>

          {/* Expected Behaviors */}
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Expected Behaviors</h3>
              <div className="text-sm text-green-700 space-y-2">
                <div>• Chevron buttons always increment/decrement by exactly 0.5 hours</div>
                <div>• Values are properly rounded to 1 decimal place</div>
                <div>• Buttons are disabled at min (0h) and max (40h) boundaries</div>
                <div>• Hover reveals well-aligned chevron buttons</div>
                <div>• Keyboard shortcuts work: Ctrl/Alt + ↑/↓</div>
                <div>• Tooltips show next increment/decrement values</div>
                <div>• Visual feedback for hover, active, and disabled states</div>
                <div>• Accessibility features work with screen readers</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
