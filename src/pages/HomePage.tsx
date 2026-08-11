import React from 'react';
import { AdBanner } from '../components/AdBanner';

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 space-y-5 animate-fadeIn">
      {/* Optional Ad Banner for monetization parity */}
      <AdBanner />

      {/* Invalid Link Error Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xs flex flex-col items-center gap-4 transition-colors duration-200" id="invalid-link-card">
        {/* Inline SVG Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>

        {/* Error Text */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Invalid Link
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            The link you are looking for is invalid or incomplete. Please check your URL and try again.
          </p>
        </div>
      </div>
    </div>
  );
};

