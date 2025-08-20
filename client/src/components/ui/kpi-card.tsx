import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
  title: string;           // Display label (e.g., "Subscriptions")
  value: number;           // Raw numeric value (component handles formatting)
  deltaPercent: number;    // Percentage change (e.g., 180.1 for +180.1%)
  data: number[];          // Array of 20-40 numbers for sparkline
  height?: number;         // Optional height override (default: 220px)
  comparisonText?: string; // Period comparison text (e.g., "from last week", "from last month")
  isPercentage?: boolean;  // Whether to display value as percentage (e.g., "85.5%")
}

/**
 * Reusable KPI Card component that matches the "Subscriptions +2,350" design mockup.
 * Features a clean layout with title, formatted value, delta percentage, and sparkline chart.
 * 
 * @param title - Display label for the KPI
 * @param value - Raw numeric value (automatically formatted with commas and +/- signs)
 * @param deltaPercent - Percentage change (positive/negative)
 * @param data - Array of numbers for the sparkline visualization
 * @param height - Optional height override (default: 220px)
 */
const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  deltaPercent,
  data,
  height = 220,
  comparisonText = 'from last month',
  isPercentage = false
}) => {
  /**
   * Formats a number with thousands separators and appropriate +/- sign
   * @param num - The number to format
   * @returns Formatted string (e.g., "+2,350", "−1,250", "0", "85.5%")
   */
  const formatValue = (num: number): string => {
    if (isPercentage) {
      return `${num}%`;
    }

    const absValue = Math.abs(num);
    const formattedNumber = absValue.toLocaleString('en-US');

    if (num > 0) {
      return `+${formattedNumber}`;
    } else if (num < 0) {
      return `−${formattedNumber}`;
    } else {
      return formattedNumber;
    }
  };

  /**
   * Formats the delta percentage with appropriate sign and period-aware comparison text
   * @param percent - The percentage change
   * @returns Formatted string (e.g., "+180.1% from last week")
   */
  const formatDelta = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '−';
    const absPercent = Math.abs(percent);
    return `${sign}${absPercent.toFixed(1)}% ${comparisonText}`;
  };

  /**
   * Transforms the data array into the format expected by Recharts
   * @param dataArray - Array of numbers
   * @returns Array of objects with index and value properties
   */
  const chartData = (data || []).map((value, index) => ({
    index,
    value
  }));

  return (
    <div 
      className="bg-white rounded-xl shadow-sm p-6 flex flex-col"
      style={{ height: `${height}px` }}
      role="article"
      aria-labelledby={`kpi-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Top section - Title */}
      <div className="mb-2">
        <h3 
          id={`kpi-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-xs font-medium text-slate-500"
        >
          {title}
        </h3>
      </div>

      {/* Middle section - Value */}
      <div className="mb-1">
        <div 
          className="text-4xl font-bold text-slate-900"
          aria-label={`Current value: ${formatValue(value)}`}
        >
          {formatValue(value)}
        </div>
      </div>

      {/* Delta section - Change indicator */}
      <div className="mb-4">
        <div 
          className="text-sm font-normal text-slate-500"
          aria-label={`Change: ${formatDelta(deltaPercent)}`}
        >
          {formatDelta(deltaPercent)}
        </div>
      </div>

      {/* Sparkline section - Bottom 40% of card */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`gradient-${title.toLowerCase().replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2}
              fill={`url(#gradient-${title.toLowerCase().replace(/\s+/g, '-')})`}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KpiCard;
