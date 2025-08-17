import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach } from 'vitest';
import ManagementDashboard from '../management-dashboard';

// Mock Recharts components to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}));

describe('ManagementDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders the dashboard title', async () => {
    renderWithQueryClient(<ManagementDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Management Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Resource planning and utilization overview')).toBeInTheDocument();
    });
  });

  it('renders all KPI cards', async () => {
    renderWithQueryClient(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Under-utilised (<80%)')).toBeInTheDocument();
      expect(screen.getByText('Over-utilised (>100%)')).toBeInTheDocument();
      expect(screen.getByText('Avg Utilisation Rate')).toBeInTheDocument();
    });
  });

  it('renders all deep-dive widgets', async () => {
    renderWithQueryClient(<ManagementDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Capacity vs Demand (6 weeks)')).toBeInTheDocument();
      expect(screen.getByText('Utilization Trend (YTD)')).toBeInTheDocument();
      expect(screen.getByText('Overtime Cost (YTD)')).toBeInTheDocument();
      expect(screen.getByText('Skills Gap Snapshot')).toBeInTheDocument();
      expect(screen.getByText('At-Risk Projects')).toBeInTheDocument();
    });
  });

  it('renders time range buttons', async () => {
    renderWithQueryClient(<ManagementDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('6 Months')).toBeInTheDocument();
      expect(screen.getByText('YTD')).toBeInTheDocument();
    });
  });

  it('applies the blue theme class', async () => {
    const { container } = renderWithQueryClient(<ManagementDashboard />);
    
    await waitFor(() => {
      const dashboardElement = container.querySelector('.dashboard-blue-theme');
      expect(dashboardElement).toBeInTheDocument();
    });
  });

  it('renders charts components', async () => {
    renderWithQueryClient(<ManagementDashboard />);

    await waitFor(() => {
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(8); // 4 sparklines + 4 deep-dive charts
      expect(screen.getAllByTestId('bar-chart')).toHaveLength(2); // Two bar charts
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('renders sparklines in KPI cards', async () => {
    renderWithQueryClient(<ManagementDashboard />);

    await waitFor(() => {
      // Should have 4 sparklines (one for each KPI card)
      expect(screen.getAllByTestId('line-chart')).toHaveLength(5); // 4 sparklines + 1 overtime chart
    });
  });

  it('renders View more links in KPI cards', async () => {
    renderWithQueryClient(<ManagementDashboard />);

    await waitFor(() => {
      const viewMoreLinks = screen.getAllByText('View more');
      expect(viewMoreLinks).toHaveLength(4); // One for each KPI card
    });
  });

  it('renders greeting header', async () => {
    renderWithQueryClient(<ManagementDashboard />);

    await waitFor(() => {
      // Check for greeting text pattern (Good morning/afternoon/evening)
      expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
      expect(screen.getByText(/👋/)).toBeInTheDocument();
    });
  });
});
