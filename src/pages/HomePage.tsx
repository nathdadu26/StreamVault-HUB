import React from 'react';
import { AdBanner } from '../components/AdBanner';

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Monetization Ad Banner */}
      <AdBanner />

      {/* Invalid Link Card */}
      <div
        className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-8 text-center shadow-sm dark:shadow-lg dark:shadow-black/20 flex flex-col items-center gap-5 transition-colors duration-200"
        id="invalid-link-card"
      >
        <div className="w-14 h-14 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
          <i className="fi fi-tc-broken-chain-link-wrong text-2xl flex items-center justify-center"></i>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-[#111111] dark:text-white tracking-tight">
            Invalid Link
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
            The link you are looking for is invalid or incomplete. Please check your URL and try again.
          </p>
        </div>
      </div>
    </div>
  );
};


