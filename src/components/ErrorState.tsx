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
    <div className="w-full max-w-md mx-auto my-8 p-8 rounded-[20px] bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] shadow-sm dark:shadow-xl dark:shadow-black/30 text-center flex flex-col items-center gap-5 animate-fadeIn transition-colors duration-200">
      <div
        className={`w-14 h-14 rounded-[20px] flex items-center justify-center border ${
          is401
            ? 'bg-neutral-100 border-neutral-200 text-[#111111] dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white'
            : is404
            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
            : 'bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-neutral-300'
        }`}
      >
        {is401 ? (
          <Lock className="w-6 h-6" strokeWidth={1.75} />
        ) : is404 ? (
          <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
        ) : (
          <ShieldAlert className="w-6 h-6" strokeWidth={1.75} />
        )}
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-[#111111] dark:text-white tracking-tight">{title}</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
          {message}
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 mt-2">
        {is401 && slug && (
          <a
            href={`/ad/${slug}`}
            className="w-full h-11 px-5 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Lock className="w-4 h-4 text-[#111111] dark:text-black" strokeWidth={2} />
            <span>Go to Task Gateway (/ad/{slug})</span>
          </a>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full h-11 px-5 rounded-[20px] bg-white border border-neutral-200 text-[#111111] hover:bg-neutral-50 dark:bg-transparent dark:border-white/[0.12] dark:text-neutral-200 dark:hover:bg-white/[0.05] dark:hover:text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
            <span>Retry Verification</span>
          </button>
        )}

        <a
          href="/"
          className="w-full h-11 px-5 rounded-[20px] bg-transparent border border-neutral-200 dark:border-white/[0.08] text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200 font-medium text-xs transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Return to StreamVault HUB Portal</span>
        </a>
      </div>
    </div>
  );
};

