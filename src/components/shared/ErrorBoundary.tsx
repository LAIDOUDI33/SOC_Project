/**
 * Global Error Boundary Component
 * National SOC Platform - Error Handling
 * 
 * PRODUCTION-READY: Catches all unhandled React errors gracefully
 * 
 * Features:
 * - Catches rendering errors in component tree
 * - Displays user-friendly error message
 * - Provides recovery options (retry, go home)
 * - Logs errors to error tracking service
 * - Shows error details in development mode
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info for display
    this.setState({ error, errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('GlobalErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
    
    // In production, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = async () => {
    if (this.state.error) {
      const errorText = [
        `Error: ${this.state.error.message}`,
        `Stack: ${this.state.error.stack}`,
        `Component Stack: ${this.state.errorInfo?.componentStack}`,
        `URL: ${window.location.href}`,
        `Timestamp: ${new Date().toISOString()}`,
        `User Agent: ${navigator.userAgent}`,
      ].join('\n\n');
      
      try {
        await navigator.clipboard.writeText(errorText);
        alert('Error details copied to clipboard!');
      } catch {
        console.error('Failed to copy error to clipboard');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onCopyError={this.handleCopyError}
      />;
    }

    return this.props.children;
  }
}

// Default error fallback component
function ErrorFallback({ 
  error, 
  errorInfo, 
  onRetry, 
  onGoHome,
  onCopyError 
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onGoHome: () => void;
  onCopyError: () => void;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-red-500/20 shadow-2xl shadow-red-500/10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <CardTitle className="text-xl text-white">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            An unexpected error occurred while rendering this page.
            {isDevelopment && ' Check the details below for debugging.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="font-mono text-sm text-red-300 break-all">
                {error.message}
              </p>
              {isDevelopment && error.stack && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
                    Stack Trace (click to expand)
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          {/* Component Stack (Development only) */}
          {isDevelopment && errorInfo?.componentStack && (
            <details className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
                Component Stack (click to expand)
              </summary>
              <pre className="mt-2 p-3 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              onClick={onRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={onGoHome}
              variant="outline" 
              className="flex-1 border-slate-600 hover:bg-slate-800 text-slate-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
            
            {isDevelopment && (
              <Button 
                onClick={onCopyError}
                variant="outline" 
                className="border-slate-600 hover:bg-slate-800 text-slate-200"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Error
              </Button>
            )}
          </div>
          
          {/* Help Text */}
          <p className="text-xs text-slate-500 text-center pt-2">
            If this problem persists, please contact the SOC team or{' '}
            <button 
              onClick={onCopyError}
              className="underline hover:text-slate-300"
            >
              copy the error details
            </button>
            {' '}for support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Log error to external service (placeholder for production integration)
async function logErrorToService(error: Error, errorInfo: ErrorInfo): Promise<void> {
  const errorData = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    environment: process.env.NODE_ENV || 'unknown',
  };
  
  // In production, send to:
  // - Sentry (https://sentry.io)
  // - Datadog RUM (https://www.datadoghq.com)
  // - Rollbar (https://rollbar.com)
  // - Custom error logging API
  
  if (process.env.NODE_ENV === 'production') {
    try {
      // Example: Send to custom endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail - don't let error reporting break the app
      });
    } catch {
      // Ignore errors in error reporting
    }
  } else {
    // Development: just log to console
    console.group('🐛 React Error Caught');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }
}

// Higher-Order Component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P & { onError?: (error: Error, info: ErrorInfo) => void }> {
  const WithBoundaryComponent: React.FC<P & { onError?: (error: Error, info: ErrorInfo) => void }> = (props) => (
    <GlobalErrorBoundary fallback={fallback} onError={props.onError}>
      <WrappedComponent {...(props as P)} />
    </GlobalErrorBoundary>
  );
  
  WithBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithBoundaryComponent;
}

// Hook-style error boundary wrapper (for functional components)
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  
  if (error) {
    throw error; // This will be caught by the nearest error boundary
  }
  
  return { setError };
}

export default GlobalErrorBoundary;
