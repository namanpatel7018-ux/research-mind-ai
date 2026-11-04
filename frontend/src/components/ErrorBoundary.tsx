import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#07090E] p-6 text-white font-sans">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0E1322]/90 p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Something unexpected occurred</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The interface encountered a runtime issue. Your session data is intact.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-rose-300/90 text-left overflow-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 px-4 py-2.5 text-xs font-semibold transition cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Go to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
