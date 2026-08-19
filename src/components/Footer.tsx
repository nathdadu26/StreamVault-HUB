import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-8 border-t border-neutral-200 dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0B0B0C] transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-8 h-8 rounded-[20px] bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-[#22C55E]">
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <p className="text-xs text-neutral-500 font-medium tracking-wide">
          © 2026 StreamVault HUB. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

