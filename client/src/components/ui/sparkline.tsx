import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * Sparkline component for displaying mini trend charts
 * Derived from shadcn/ui chart patterns and Recharts LineChart
 */
export const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  className = "h-8 w-16", 
  strokeColor = "var(--primary)",
  strokeWidth = 2 
}) => {
  // Convert array of numbers to chart data format
  const chartData = data.map((value, index) => ({
    index,
    value
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
