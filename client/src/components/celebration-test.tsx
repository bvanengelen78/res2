import React, { useState } from 'react';
import { SubmitWeekCelebration } from './submit-week-celebration';

export function CelebrationTest() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [testCount, setTestCount] = useState(0);

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTestCount(prev => prev + 1);
  };

  const handleComplete = () => {
    setShowCelebration(false);
    console.log('🎉 Celebration completed successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Celebration Test</h1>
        <p className="text-gray-600 mb-6">
          Test the SubmitWeekCelebration component to verify:
        </p>
        <ul className="text-left text-sm text-gray-700 mb-6 space-y-2">
          <li>✅ Text is perfectly centered</li>
          <li>✅ Auto-dismissal works after 3 seconds</li>
          <li>✅ Smooth animations</li>
        </ul>
        
        <button
          onClick={triggerCelebration}
          disabled={showCelebration}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {showCelebration ? 'Celebrating...' : 'Trigger Celebration'}
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          Test #{testCount} - Watch for auto-dismissal after 3 seconds
        </p>
      </div>

      <SubmitWeekCelebration
        isVisible={showCelebration}
        onComplete={handleComplete}
      />
    </div>
  );
}
