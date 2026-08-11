import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AdTaskGatewayPage } from './pages/AdTaskGatewayPage';
import { PlayerPage } from './pages/PlayerPage';
import { DownloadPage } from './pages/DownloadPage';
import { TelegramPage } from './pages/TelegramPage';
import { HomePage } from './pages/HomePage';

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
    }
    return false; // Light theme by default
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
  const routeType = parts[0]; // 'ad', 's', 'dl', 'tg', or empty
  const slug = parts[1] || '';

  const renderContent = () => {
    if (routeType === 'ad' && slug) {
      return <AdTaskGatewayPage slug={slug} />;
    }

    if (routeType === 's' && slug) {
      return <PlayerPage slug={slug} />;
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 w-full">{renderContent()}</main>

      <Footer />
    </div>
  );
}
