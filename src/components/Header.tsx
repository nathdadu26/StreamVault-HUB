import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo - Positioned on the LEFT */}
        <a href="/" className="flex items-center gap-1.5 group shrink-0">
          <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white">
            StreamVault
          </span>
          <span className="bg-blue-600 text-white text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider ml-0.5">
            HUB
          </span>
        </a>

        {/* Header Actions - Positioned on the RIGHT with Animated Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-amber-400 shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer relative overflow-hidden"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="theme-toggle-btn"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDarkMode ? (
                <motion.div
                  key="dark-mode-icon"
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex items-center justify-center"
                >
                  <i className="fi fi-tr-brightness text-amber-400 text-lg flex items-center justify-center"></i>
                </motion.div>
              ) : (
                <motion.div
                  key="light-mode-icon"
                  initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex items-center justify-center"
                >
                  <i className="fi fi-tc-moon text-slate-800 text-lg flex items-center justify-center"></i>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
};

