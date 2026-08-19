import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFFFF] dark:bg-[#0B0B0C] text-[#111111] dark:text-[#EDEDED]">
          <div className="max-w-md w-full bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-8 text-center shadow-sm dark:shadow-xl dark:shadow-black/40 space-y-5">
            <div className="w-14 h-14 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#111111] dark:text-white tracking-tight">Something went wrong</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {this.state.error?.message || 'An unexpected runtime error occurred.'}
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full h-11 px-5 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
              <span>Return to Portal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
