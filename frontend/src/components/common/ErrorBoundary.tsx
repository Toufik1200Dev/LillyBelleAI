import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 max-w-md w-full text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">Une erreur s’est produite</h2>
            <p className="text-sm text-gray-400 mb-6">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
