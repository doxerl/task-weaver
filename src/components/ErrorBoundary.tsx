import React, { Component, PropsWithChildren } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Props
 */
interface ErrorBoundaryProps extends PropsWithChildren {
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom title for error display */
  title?: string;
  /** Custom description for error display */
  description?: string;
}

/**
 * Generic Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary title="Hesaplama Hatası">
 *   <ProjectionTable />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{this.props.title || 'Bir Hata Oluştu'}</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              {this.props.description ||
                'Bileşen yüklenirken beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya tekrar deneyin.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Hata Detayları (Development)
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tekrar Dene
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReload}
              >
                Sayfayı Yenile
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Simulation-specific Error Boundary
 * Pre-configured for financial simulation components
 */
export class SimulationErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    title: 'Hesaplama Hatası',
    description: 'Finansal hesaplama sırasında bir hata oluştu. Verileriniz korunmuştur.',
  };
}

/**
 * PDF Export Error Boundary
 * Pre-configured for PDF export components
 */
export class PdfExportErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    title: 'PDF Oluşturma Hatası',
    description: 'PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
  };
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
