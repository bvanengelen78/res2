import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TestCollapsed() {
  // Test the basic collapsed functionality
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  console.log('🧪 TestCollapsed RENDER - isCollapsed:', isCollapsed);
  
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Collapsed State Test</h1>
      
      {/* Debug Panel */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <strong>DEBUG:</strong> isCollapsed = {String(isCollapsed)}
      </div>
      
      {/* Test Component */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => {
            console.log('🔄 Header clicked - current:', isCollapsed, '-> new:', !isCollapsed);
            setIsCollapsed(!isCollapsed);
          }}
        >
          <h3 className="text-lg font-semibold">Test Section</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔄 Button clicked - current:', isCollapsed, '-> new:', !isCollapsed);
              setIsCollapsed(!isCollapsed);
            }}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isCollapsed ? "rotate-0" : "rotate-180"
              )}
            />
          </button>
        </div>
        
        {/* Content - Should be hidden when isCollapsed = true */}
        {!isCollapsed && (
          <div className="p-4 pt-0 bg-blue-50 border-t">
            <p>This content should only be visible when isCollapsed = false</p>
            <p>Current state: isCollapsed = {String(isCollapsed)}</p>
          </div>
        )}
        
        {/* Show when collapsed */}
        {isCollapsed && (
          <div className="px-4 pb-4 text-sm text-gray-500">
            Content is collapsed. Click to expand.
          </div>
        )}
      </div>
      
      {/* Manual toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Toggle State (Current: {isCollapsed ? 'Collapsed' : 'Expanded'})
      </button>
    </div>
  );
}