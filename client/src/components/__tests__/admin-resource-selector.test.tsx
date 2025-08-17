import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminResourceSelector } from '../admin-resource-selector';
import { useAuth } from '@/context/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';

// Mock the hooks
jest.mock('@/context/AuthContext');
jest.mock('@/hooks/useRBAC');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRBAC = useRBAC as jest.MockedFunction<typeof useRBAC>;

// Mock data
const mockResources = [
  { id: 1, name: 'John Doe', status: 'active' },
  { id: 2, name: 'Jane Smith', status: 'active' },
  { id: 3, name: 'Bob Johnson', status: 'active' },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AdminResourceSelector', () => {
  const mockOnResourceChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { resourceId: 1, name: 'John Doe' },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    // Mock fetch for resources
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResources),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not render for non-admin users', () => {
    mockUseRBAC.mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(false),
      hasAnyPermission: jest.fn().mockReturnValue(false),
      hasAllPermissions: jest.fn().mockReturnValue(false),
      hasRole: jest.fn().mockReturnValue(false),
      hasAnyRole: jest.fn().mockReturnValue(false),
      canAccessMenuItem: jest.fn().mockReturnValue(false),
      getAccessibleMenuItems: jest.fn().mockReturnValue([]),
      isAdmin: jest.fn().mockReturnValue(false),
      isSystemAdmin: jest.fn().mockReturnValue(false),
      canManageRoles: jest.fn().mockReturnValue(false),
    });

    render(
      <AdminResourceSelector
        selectedResourceId={1}
        onResourceChange={mockOnResourceChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('admin-resource-selector')).not.toBeInTheDocument();
  });

  it('should render for admin users', () => {
    mockUseRBAC.mockReturnValue({
      hasPermission: jest.fn((permission) =>
        permission === 'system_admin' || permission === 'resource_management'
      ),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      canAccessMenuItem: jest.fn().mockReturnValue(true),
      getAccessibleMenuItems: jest.fn().mockReturnValue([]),
      isAdmin: jest.fn().mockReturnValue(true),
      isSystemAdmin: jest.fn().mockReturnValue(true),
      canManageRoles: jest.fn().mockReturnValue(true),
    });

    render(
      <AdminResourceSelector
        selectedResourceId={1}
        onResourceChange={mockOnResourceChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('admin-resource-selector')).toBeInTheDocument();
    expect(screen.getByText('Admin Controls')).toBeInTheDocument();
  });

  it('should show "Logging for yourself" badge when user selects their own resource', () => {
    mockUseRBAC.mockReturnValue({
      hasPermission: jest.fn((permission) =>
        permission === 'system_admin' || permission === 'resource_management'
      ),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      canAccessMenuItem: jest.fn().mockReturnValue(true),
      getAccessibleMenuItems: jest.fn().mockReturnValue([]),
      isAdmin: jest.fn().mockReturnValue(true),
      isSystemAdmin: jest.fn().mockReturnValue(true),
      canManageRoles: jest.fn().mockReturnValue(true),
    });

    render(
      <AdminResourceSelector
        selectedResourceId={1} // Same as user's resourceId
        onResourceChange={mockOnResourceChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Logging for yourself')).toBeInTheDocument();
  });

  it('should expand and show resource selector when header is clicked', async () => {
    mockUseRBAC.mockReturnValue({
      hasPermission: jest.fn((permission) =>
        permission === 'system_admin' || permission === 'resource_management'
      ),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      canAccessMenuItem: jest.fn().mockReturnValue(true),
      getAccessibleMenuItems: jest.fn().mockReturnValue([]),
      isAdmin: jest.fn().mockReturnValue(true),
      isSystemAdmin: jest.fn().mockReturnValue(true),
      canManageRoles: jest.fn().mockReturnValue(true),
    });

    render(
      <AdminResourceSelector
        selectedResourceId={1}
        onResourceChange={mockOnResourceChange}
      />,
      { wrapper: createWrapper() }
    );

    const header = screen.getByTestId('admin-selector-header');
    fireEvent.click(header);

    await waitFor(() => {
      expect(screen.getByText('Select Resource to Log Time For:')).toBeInTheDocument();
    });
  });

  it('should call onResourceChange when "Switch to Self" button is clicked', async () => {
    mockUseRBAC.mockReturnValue({
      hasPermission: jest.fn((permission) =>
        permission === 'system_admin' || permission === 'resource_management'
      ),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      canAccessMenuItem: jest.fn().mockReturnValue(true),
      getAccessibleMenuItems: jest.fn().mockReturnValue([]),
      isAdmin: jest.fn().mockReturnValue(true),
      isSystemAdmin: jest.fn().mockReturnValue(true),
      canManageRoles: jest.fn().mockReturnValue(true),
    });

    render(
      <AdminResourceSelector
        selectedResourceId={2} // Different from user's resourceId
        onResourceChange={mockOnResourceChange}
      />,
      { wrapper: createWrapper() }
    );

    // Expand the selector
    const header = screen.getByTestId('admin-selector-header');
    fireEvent.click(header);

    await waitFor(() => {
      const switchButton = screen.getByTestId('switch-to-self-btn');
      fireEvent.click(switchButton);
    });

    expect(mockOnResourceChange).toHaveBeenCalledWith(1); // User's resourceId
  });
});
