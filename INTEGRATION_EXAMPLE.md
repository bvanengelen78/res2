# KpiCard Component Integration Example

## Overview

The new `KpiCard` component complements the existing enhanced KPI cards by providing a different visual style that matches the "Subscriptions +2,350" design mockup. Both components can be used together in the dashboard architecture.

## Component Comparison

### Existing Enhanced KPI Cards (`KPICards`)
- **Style**: Horizontal layout with icon, value, and small sparkline
- **Use Case**: Core dashboard metrics (Active Projects, Available Resources, etc.)
- **Features**: Tooltips, trend arrows, period comparisons
- **Layout**: 4-column grid on desktop

### New KPI Card (`KpiCard`)
- **Style**: Vertical layout with large value and prominent sparkline
- **Use Case**: Featured metrics, detailed analytics, management dashboards
- **Features**: Large formatted numbers, prominent trend visualization
- **Layout**: Flexible, can be used in various grid configurations

## Integration Examples

### 1. Mixed Dashboard Layout

```tsx
import { KPICards } from '@/components/kpi-cards';
import KpiCard from '@/components/ui/kpi-card';

function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Core KPIs - Existing enhanced cards */}
      <div className="mb-8">
        <KPICards 
          kpis={kpis} 
          trendData={kpis?.trendData}
          isLoading={kpisLoading}
        />
      </div>

      {/* Featured Metrics - New KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Monthly Subscriptions"
          value={2350}
          deltaPercent={180.1}
          data={subscriptionTrendData}
        />
        <KpiCard
          title="Revenue Growth"
          value={125000}
          deltaPercent={24.5}
          data={revenueTrendData}
        />
        <KpiCard
          title="Customer Acquisition"
          value={450}
          deltaPercent={-12.3}
          data={acquisitionTrendData}
        />
      </div>
    </div>
  );
}
```

### 2. Management Dashboard Integration

```tsx
import KpiCard from '@/components/ui/kpi-card';

function ManagementDashboard() {
  return (
    <div className="space-y-8">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Revenue"
          value={1250000}
          deltaPercent={15.7}
          data={revenueData}
        />
        <KpiCard
          title="Active Customers"
          value={8450}
          deltaPercent={8.2}
          data={customerData}
        />
        <KpiCard
          title="Monthly Recurring Revenue"
          value={85000}
          deltaPercent={22.1}
          data={mrrData}
        />
        <KpiCard
          title="Churn Rate"
          value={-125}
          deltaPercent={-5.3}
          data={churnData}
        />
      </div>
    </div>
  );
}
```

### 3. Responsive Layout Example

```tsx
function ResponsiveDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Subscriptions"
          value={2350}
          deltaPercent={180.1}
          data={[3,5,9,14,25,12,8,13,19,21,18,9,15,22,28,31,29,25,20,18]}
        />
        
        {/* Custom height for special metrics */}
        <KpiCard
          title="Key Performance Indicator"
          value={95000}
          deltaPercent={45.2}
          data={performanceData}
          height={280} // Taller card for emphasis
        />
        
        <KpiCard
          title="Conversion Rate"
          value={0}
          deltaPercent={0}
          data={conversionData}
        />
      </div>
    </div>
  );
}
```

## Data Integration Patterns

### 1. API Data Transformation

```tsx
// Transform API response to KpiCard format
function transformApiData(apiResponse: any) {
  return {
    title: apiResponse.metric_name,
    value: apiResponse.current_value,
    deltaPercent: apiResponse.percentage_change,
    data: apiResponse.trend_data || []
  };
}

// Usage in component
const { data: metricsData } = useQuery({
  queryKey: ['featured-metrics'],
  queryFn: async () => {
    const response = await fetch('/api/featured-metrics');
    const data = await response.json();
    return data.map(transformApiData);
  }
});
```

### 2. Real-time Data Updates

```tsx
function LiveMetricsDashboard() {
  const [liveData, setLiveData] = useState(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/live-metrics');
      const newData = await response.json();
      setLiveData(newData);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {liveData.map((metric, index) => (
        <KpiCard
          key={metric.id}
          title={metric.title}
          value={metric.value}
          deltaPercent={metric.deltaPercent}
          data={metric.data}
        />
      ))}
    </div>
  );
}
```

## Styling Customization

### 1. Theme Integration

```tsx
// Custom themed KPI card
function ThemedKpiCard(props: KpiCardProps) {
  return (
    <div className="dark:bg-slate-800">
      <KpiCard {...props} />
    </div>
  );
}
```

### 2. Custom Heights for Different Sections

```tsx
function VariableHeightDashboard() {
  return (
    <div className="space-y-8">
      {/* Compact metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Quick Metric 1" value={100} deltaPercent={5} data={data1} height={180} />
        <KpiCard title="Quick Metric 2" value={200} deltaPercent={-3} data={data2} height={180} />
        <KpiCard title="Quick Metric 3" value={300} deltaPercent={12} data={data3} height={180} />
        <KpiCard title="Quick Metric 4" value={400} deltaPercent={8} data={data4} height={180} />
      </div>

      {/* Featured metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard title="Featured Metric 1" value={5000} deltaPercent={25} data={featuredData1} height={260} />
        <KpiCard title="Featured Metric 2" value={7500} deltaPercent={-15} data={featuredData2} height={260} />
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Data Validation
- Always validate data arrays have sufficient points (minimum 2-3 for meaningful sparklines)
- Handle edge cases like empty arrays or null values
- Ensure deltaPercent is a valid number

### 2. Performance Optimization
- Use React.memo for KpiCard if data doesn't change frequently
- Implement proper loading states
- Consider virtualization for large numbers of cards

### 3. Accessibility
- Ensure proper ARIA labels are maintained
- Test with screen readers
- Provide alternative text for sparkline data

### 4. Responsive Design
- Test on various screen sizes
- Consider different grid layouts for mobile vs desktop
- Ensure text remains readable at all sizes

## Testing the Component

```tsx
// Test file example
import { render, screen } from '@testing-library/react';
import KpiCard from '@/components/ui/kpi-card';

describe('KpiCard', () => {
  const mockData = [1, 2, 3, 4, 5];

  it('formats positive values correctly', () => {
    render(
      <KpiCard
        title="Test Metric"
        value={2350}
        deltaPercent={180.1}
        data={mockData}
      />
    );
    
    expect(screen.getByText('+2,350')).toBeInTheDocument();
    expect(screen.getByText('+180.1% from last month')).toBeInTheDocument();
  });

  it('formats negative values correctly', () => {
    render(
      <KpiCard
        title="Test Metric"
        value={-1250}
        deltaPercent={-12.3}
        data={mockData}
      />
    );
    
    expect(screen.getByText('−1,250')).toBeInTheDocument();
    expect(screen.getByText('−12.3% from last month')).toBeInTheDocument();
  });
});
```

This integration approach allows you to use both KPI card styles strategically throughout your dashboard, with the existing enhanced cards for core metrics and the new KpiCard for featured or detailed analytics.
