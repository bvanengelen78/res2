import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { UserWithRoles, PermissionType, RoleType } from '@shared/schema';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthUser {
  id: number;
  email: string;
  resourceId?: number;
  roles: Array<{ role: string }>;
  permissions: PermissionType[];
  resource?: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterCredentials {
  email: string;
  password: string;
  resourceId?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: PermissionType) => boolean;
  hasAnyPermission: (permissions: PermissionType[]) => boolean;
  hasRole: (role: RoleType) => boolean;
  hasAnyRole: (roles: RoleType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const response = await apiRequest('/api/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          setUser(response.user);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);

    try {
      // Retry configuration for handling temporary server issues
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[AUTH] Login attempt ${attempt}/${maxRetries}`, {
            email: credentials.email,
            rememberMe: credentials.rememberMe
          });

          // Use enterprise authentication endpoint with database integration
          const response = await apiRequest('/api/login-enterprise-simple', {
            method: 'POST',
            body: JSON.stringify(credentials),
          });

          const { user, tokens } = response;

          // Validate response structure
          if (!user || !tokens || !tokens.accessToken || !tokens.refreshToken) {
            throw new Error('Invalid login response: missing user or tokens');
          }

          // Store tokens
          localStorage.setItem(TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

          setUser(user);

          console.log('[AUTH] Login successful', {
            userId: user.id,
            email: user.email,
            roles: user.roles?.map(r => r.role),
            attempt
          });

          return; // Success - exit retry loop

        } catch (error) {
          console.error(`[AUTH] Login attempt ${attempt} failed:`, {
            error: error.message,
            attempt,
            maxRetries
          });

          // If this is the last attempt, throw the error
          if (attempt === maxRetries) {
            console.error('[AUTH] All login attempts failed', error);
            throw error;
          }

          // Wait before retrying (only for server errors, not auth errors)
          if (error.message.includes('500') || error.message.includes('Internal server error')) {
            console.log(`[AUTH] Retrying login in ${retryDelay}ms due to server error...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          } else {
            // For auth errors (401, 400), don't retry
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    } finally {
      // Always set loading to false, regardless of success or failure
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      const { user, tokens } = response;
      
      // Store tokens
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      
      setUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await apiRequest('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await apiRequest('/api/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      
      const { tokens } = response;
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (error) {
      // Refresh failed, redirect to login
      logout();
      throw error;
    }
  };

  const hasPermission = (permission: PermissionType): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasRole = (role: RoleType): boolean => {
    return user?.roles?.some(r => r.role === role) ?? false;
  };

  const hasAnyRole = (roles: RoleType[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    hasPermission,
    hasAnyPermission,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Setup axios interceptor for automatic token attachment
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (token && init) {
      init.headers = {
        ...init.headers,
        'Authorization': `Bearer ${token}`,
      };
    } else if (token) {
      init = {
        ...init,
        headers: {
          ...init?.headers,
          'Authorization': `Bearer ${token}`,
        },
      };
    }
    
    const response = await originalFetch(input, init);
    
    // Handle token refresh on 401
    if (response.status === 401 && token) {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const refreshResponse = await originalFetch('/api/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const { tokens } = await refreshResponse.json();
            localStorage.setItem(TOKEN_KEY, tokens.accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
            
            // Retry original request with new token
            const retryInit = {
              ...init,
              headers: {
                ...init?.headers,
                'Authorization': `Bearer ${tokens.accessToken}`,
              },
            };
            
            return originalFetch(input, retryInit);
          }
        }
      } catch (error) {
        // Refresh failed, clear tokens
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
      }
    }
    
    return response;
  };
}