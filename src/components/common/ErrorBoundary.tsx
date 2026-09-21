import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error to console or error reporting service securely
    console.error('Uncaught React ErrorBoundary exception:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleNavigateHome = (): void => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#0A0A0A',
              border: '1px solid #333333',
              borderRadius: '2px',
              padding: '2rem',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                padding: '4px 8px',
                borderRadius: '2px',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              System Exception
            </div>

            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                margin: '0 0 0.75rem 0',
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
              }}
            >
              Application Render Failure
            </h1>

            <p
              style={{
                fontSize: '0.875rem',
                color: '#C8C8C8',
                lineHeight: 1.5,
                margin: '0 0 1.5rem 0',
              }}
            >
              An unhandled UI exception occurred in the application pipeline. You can attempt to recover execution or return to home.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #222222',
                  borderRadius: '2px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    fontFamily: 'var(--font-mono, monospace)',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.name}: {this.state.error.message}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  backgroundColor: '#CCFF00',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Retry Execution
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#111111',
                  color: '#FFFFFF',
                  border: '1px solid #333333',
                  borderRadius: '2px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Reload Window
              </button>
              <button
                type="button"
                onClick={this.handleNavigateHome}
                style={{
                  backgroundColor: 'transparent',
                  color: '#909090',
                  border: '1px solid #222222',
                  borderRadius: '2px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
