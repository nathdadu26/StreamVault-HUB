import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AdTaskGatewayPage } from './pages/AdTaskGatewayPage';
import { PlayerPage } from './pages/PlayerPage';
import { BloggerPage } from './pages/BloggerPage';
import { DownloadPage } from './pages/DownloadPage';
import { TelegramPage } from './pages/TelegramPage';
import { HomePage } from './pages/HomePage';

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      // First visit: respect system theme if available, otherwise default to night
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return false;
      }
    }
    return true; // Night theme by default
  });

  // Synchronize dark class on documentElement and persist to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Synchronize route pathname
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Theme toggle handler
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Route parsing
  const parts = pathname.split('/').filter(Boolean);
  const routeType = parts[0]; // 'ad', 's', 'bl', 'dl', 'tg', or empty
  const slug = parts[1] || '';

  const renderContent = () => {
    if (routeType === 'ad' && slug) {
      return <AdTaskGatewayPage slug={slug} />;
    }

    if (routeType === 's' && slug) {
      return <PlayerPage slug={slug} />;
    }

    if (routeType === 'bl' && slug) {
      return <BloggerPage slug={slug} />;
    }

    if (routeType === 'dl' && slug) {
      return <DownloadPage slug={slug} />;
    }

    if (routeType === 'tg' && slug) {
      return <TelegramPage slug={slug} />;
    }

    // Default portal homepage
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#0B0B0C] text-[#111111] dark:text-[#EDEDED] font-['Inter',sans-serif] selection:bg-neutral-200 dark:selection:bg-white/20 selection:text-black dark:selection:text-white antialiased transition-colors duration-200">
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderContent()}
      </main>

      <Footer />
    </div>
  );
}
