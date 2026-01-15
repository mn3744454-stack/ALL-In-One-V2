import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * DEV-only error boundary that catches I18nProvider context errors
 * caused by HMR module cache inconsistency and forces a page reload
 * to recover gracefully instead of showing a blank screen.
 * 
 * In production, this component is a no-op passthrough.
 */
class I18nRecoveryBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State | null {
    // Only handle I18nProvider-specific errors
    if (error.message?.includes('I18nProvider')) {
      return { hasError: true };
    }
    // Re-throw other errors to be handled by parent boundaries
    return null;
  }

  componentDidCatch(error: Error): void {
    // Only reload for I18nProvider errors in development
    if (import.meta.env.DEV && error.message?.includes('I18nProvider')) {
      console.warn('[I18nRecoveryBoundary] Detected stale I18n context from HMR. Reloading...');
      // Small delay to allow console message to be visible
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }

  render(): ReactNode {
    // In production or if no error, just render children
    if (this.state.hasError && import.meta.env.DEV) {
      // Show brief loading state before reload
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Recovering from HMR...</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default I18nRecoveryBoundary;
