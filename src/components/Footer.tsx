import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-6 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          © 2026 StreamVault HUB. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
