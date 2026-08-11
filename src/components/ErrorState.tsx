import React from 'react';
import { AlertTriangle, Lock, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: '404' | '401' | 'rate_limit' | 'server_error';
  slug?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Access Restricted',
  message = 'The requested resource is protected by StreamVault HUB gateway.',
  type = '401',
  slug,
  onRetry,
}) => {
  const is401 = type === '401';
  const is404 = type === '404';

  return (
    <div className="w-full max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center flex flex-col items-center gap-4 animate-scaleUp">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
          is401
            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            : is404
            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
        }`}
      >
        {is401 ? (
          <Lock className="w-8 h-8" />
        ) : is404 ? (
          <AlertTriangle className="w-8 h-8" />
        ) : (
          <ShieldAlert className="w-8 h-8" />
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          {message}
        </p>
      </div>

      <div className="w-full flex flex-col gap-2.5 mt-2">
        {is401 && slug && (
          <a
            href={`/ad/${slug}`}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Go to Task Gateway (/ad/{slug})</span>
          </a>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Verification</span>
          </button>
        )}

        <a
          href="/"
          className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium text-xs transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to StreamVault HUB Portal</span>
        </a>
      </div>
    </div>
  );
};
