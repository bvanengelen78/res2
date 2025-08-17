import React from 'react';
import KpiCard from './kpi-card';

/**
 * Demo component to showcase the KpiCard component with various data scenarios
 * This can be used for testing and validation purposes
 */
export const KpiCardDemo: React.FC = () => {
  // Sample data for different scenarios
  const subscriptionsData = [3, 5, 9, 14, 25, 12, 8, 13, 19, 21, 18, 9, 15, 22, 28, 31, 29, 25, 20, 18];
  const revenueData = [45, 52, 48, 61, 58, 67, 72, 69, 75, 82, 78, 85, 91, 88, 94, 97, 92, 89, 95, 98];
  const usersData = [120, 115, 125, 130, 128, 135, 140, 138, 142, 145, 148, 144, 150, 155, 152, 158, 162, 160, 165, 168];
  const conversionData = [2.1, 2.3, 2.0, 2.5, 2.8, 2.6, 3.1, 2.9, 3.4, 3.2, 3.6, 3.8, 3.5, 4.0, 4.2, 3.9, 4.1, 4.3, 4.0, 3.8];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">KPI Card Component Demo</h1>
        
        {/* Grid layout matching dashboard patterns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Positive growth scenario - matches mockup */}
          <KpiCard
            title="Subscriptions"
            value={2350}
            deltaPercent={180.1}
            data={subscriptionsData}
          />

          {/* Large positive value */}
          <KpiCard
            title="Revenue"
            value={125000}
            deltaPercent={24.5}
            data={revenueData}
          />

          {/* Negative change scenario */}
          <KpiCard
            title="Active Users"
            value={-1250}
            deltaPercent={-12.3}
            data={usersData}
          />

          {/* Small decimal values */}
          <KpiCard
            title="Conversion Rate"
            value={0}
            deltaPercent={0}
            data={conversionData}
          />
        </div>

        {/* Edge cases row */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edge Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Very large number */}
          <KpiCard
            title="Total Impressions"
            value={1234567}
            deltaPercent={456.7}
            data={subscriptionsData}
          />

          {/* Negative value with negative change */}
          <KpiCard
            title="Net Loss"
            value={-50000}
            deltaPercent={-89.2}
            data={revenueData.map(x => -x)}
          />

          {/* Zero values */}
          <KpiCard
            title="New Feature Usage"
            value={0}
            deltaPercent={0}
            data={new Array(20).fill(0)}
          />
        </div>

        {/* Usage example */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Usage Example</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`<KpiCard
  title="Subscriptions"
  value={2350}
  deltaPercent={180.1}
  data={[3,5,9,14,25,12,8,13,19,21,18,9,15,22,28,31,29,25,20,18]}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default KpiCardDemo;
