import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from './sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown instead of the children once one of them fails to render. */
  fallback: ReactNode;
  /** Receives the error. Reports it to Sentry unless a test says otherwise. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}

/**
 * Keeps a render error from leaving a blank page. Our own instead of Sentry's,
 * whose import would put the whole SDK in the main bundle: it works the same
 * with the monitoring off, and passes the error on when it is on.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    (this.props.onError ?? reportError)(error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
