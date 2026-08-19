import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#0B0B0C]/90 backdrop-blur-md border-b border-neutral-200 dark:border-white/[0.08] transition-colors duration-200">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group shrink-0">
          <span className="font-bold text-lg sm:text-xl tracking-tight text-[#111111] dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
            StreamVault
          </span>
          <span className="bg-[#111111] text-white dark:bg-white dark:text-[#0B0B0C] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors">
            HUB
          </span>
        </a>

        {/* Theme Toggle Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-[20px] border-0 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/[0.08] flex items-center justify-center text-[#111111] dark:text-white transition-all duration-200 cursor-pointer overflow-hidden outline-none"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="theme-toggle-btn"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDarkMode ? (
                <motion.div
                  key="dark-mode-icon"
                  initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center justify-center text-neutral-200"
                >
                  <Sun className="w-5 h-5 text-neutral-200" strokeWidth={1.75} />
                </motion.div>
              ) : (
                <motion.div
                  key="light-mode-icon"
                  initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center justify-center text-[#111111]"
                >
                  <Moon className="w-5 h-5 text-[#111111]" strokeWidth={1.75} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
};


