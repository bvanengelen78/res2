import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`🚨 [ERROR_BOUNDARY] Error in ${this.props.componentName || 'Dashboard Component'}:`, error, errorInfo);

    // Log specific details about the error for production debugging
    if (error.message.includes('forEach')) {
      console.error('🚨 [FOREACH_ERROR] Detected forEach error - likely trying to call forEach on non-array:', {
        componentName: this.props.componentName,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    if (error.message.includes('length')) {
      console.error('🚨 [LENGTH_ERROR] Detected length error - likely accessing length on undefined:', {
        componentName: this.props.componentName,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="dashboard-card border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Component Error: {this.props.componentName || 'Dashboard Component'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                We encountered an error while loading this dashboard component.
              </p>
              {this.state.error && (
                <details className="text-xs text-red-500">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Widget Error Fallback Component
interface WidgetErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  title?: string;
}

export function WidgetErrorFallback({ 
  error, 
  onRetry, 
  title = "Widget Error" 
}: WidgetErrorFallbackProps) {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-700">{title}</span>
      </div>
      <p className="text-xs text-red-600 mb-3">
        Failed to load widget data. Please try again.
      </p>
      {error && (
        <details className="text-xs text-red-500 mb-3">
          <summary className="cursor-pointer">Error details</summary>
          <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="h-8 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Hook for handling async errors in components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Dashboard error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
