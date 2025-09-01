/**
 * Centralized Error Handling Service for User Management System
 * Provides consistent error logging, reporting, and user feedback
 */

import React from 'react'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface ErrorReport {
  id: string
  timestamp: string
  error: {
    name: string
    message: string
    stack?: string
  }
  context: ErrorContext
  userAgent: string
  url: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorHandlerService {
  private errorQueue: ErrorReport[] = []
  private maxQueueSize = 100

  /**
   * Log an error with context information
   */
  logError(error: Error, context: ErrorContext = {}, severity: ErrorReport['severity'] = 'medium'): string {
    const errorId = this.generateErrorId()
    
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      severity
    }

    // Add to queue
    this.errorQueue.push(errorReport)
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // Console logging with structured format
    console.error(`[ERROR_HANDLER] ${severity.toUpperCase()}:`, {
      id: errorId,
      component: context.component,
      action: context.action,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    })

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorReport).catch(console.error)
    }

    return errorId
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error, context: ErrorContext = {}): string {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Network connection error. Please check your internet connection and try again.'
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'Authentication error. Please log in again.'
    }

    // Permission errors
    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return 'You do not have permission to perform this action.'
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'Please check your input and try again.'
    }

    // User management specific errors
    if (context.component === 'UserManagement') {
      if (error.message.includes('already exists')) {
        return 'A user with this email already exists.'
      }
      if (error.message.includes('not found')) {
        return 'User not found. They may have been deleted.'
      }
      if (error.message.includes('role')) {
        return 'Error managing user roles. Please try again.'
      }
    }

    // Role management specific errors
    if (context.component === 'RoleManagement') {
      if (error.message.includes('assigned users')) {
        return 'Cannot delete role with assigned users. Remove users first.'
      }
      if (error.message.includes('permission')) {
        return 'Error managing role permissions. Please try again.'
      }
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  }

  /**
   * Get error recovery suggestions
   */
  getRecoverySuggestions(error: Error, context: ErrorContext = {}): string[] {
    const suggestions: string[] = []

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Refresh the page')
      suggestions.push('Try again in a few moments')
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      suggestions.push('Log out and log back in')
      suggestions.push('Clear your browser cache')
      suggestions.push('Contact your administrator')
    }

    // User management errors
    if (context.component === 'UserManagement') {
      suggestions.push('Refresh the user list')
      suggestions.push('Check user permissions')
      suggestions.push('Verify the user data is correct')
    }

    // Role management errors
    if (context.component === 'RoleManagement') {
      suggestions.push('Refresh the role list')
      suggestions.push('Check role assignments')
      suggestions.push('Verify permission settings')
    }

    // Generic suggestions
    if (suggestions.length === 0) {
      suggestions.push('Refresh the page')
      suggestions.push('Try again')
      suggestions.push('Contact support if the problem persists')
    }

    return suggestions
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errorQueue.slice(-limit)
  }

  /**
   * Clear error queue
   */
  clearErrors(): void {
    this.errorQueue = []
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Send error to external logging service
   */
  private async sendToLoggingService(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real application, you would send this to your logging service
      // For now, we'll just store it locally
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]')
      existingErrors.push(errorReport)
      
      // Keep only last 50 errors in localStorage
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50)
      }
      
      localStorage.setItem('error_reports', JSON.stringify(existingErrors))
    } catch (error) {
      console.error('Failed to store error report:', error)
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService()

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: Error, context: ErrorContext = {}) => {
    return errorHandler.logError(error, context)
  }

  const getUserMessage = (error: Error, context: ErrorContext = {}) => {
    return errorHandler.getUserFriendlyMessage(error, context)
  }

  const getRecoveryOptions = (error: Error, context: ErrorContext = {}) => {
    return errorHandler.getRecoverySuggestions(error, context)
  }

  return {
    handleError,
    getUserMessage,
    getRecoveryOptions,
    getRecentErrors: () => errorHandler.getRecentErrors(),
    clearErrors: () => errorHandler.clearErrors()
  }
}

/**
 * Simple Error Boundary Component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Something went wrong</h3>
          <p className="text-red-600 text-sm">
            {this.props.componentName ? `Error in ${this.props.componentName}` : 'An error occurred'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component for error boundary
 */
export function withErrorHandler<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function WrappedComponent(props: T) {
    const { handleError } = useErrorHandler()

    const handleComponentError = (error: Error, errorInfo: React.ErrorInfo) => {
      handleError(error, {
        component: componentName,
        action: 'render',
        metadata: { errorInfo }
      })
    }

    return (
      <ErrorBoundary onError={handleComponentError} componentName={componentName}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
