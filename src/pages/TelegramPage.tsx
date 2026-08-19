import React, { useEffect, useState } from 'react';
import { fetchTelegramFile } from '../lib/api';
import { TelegramFileItem } from '../types';
import { AdBanner } from '../components/AdBanner';
import { TelegramPageSkeleton } from '../components/SkeletonLoaders';
import { ErrorState } from '../components/ErrorState';
import { Bot, ExternalLink } from 'lucide-react';

interface TelegramPageProps {
  slug: string;
}

export const TelegramPage: React.FC<TelegramPageProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [tgFile, setTgFile] = useState<TelegramFileItem | null>(null);
  const [botUsername, setBotUsername] = useState<string>('file_server_bot');
  const [telegramUrl, setTelegramUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      const res = await fetchTelegramFile(slug);
      if (isMounted) {
        if (res.success && res.data) {
          setTgFile(res.data);
          if (res.botUsername) setBotUsername(res.botUsername);
          if (res.telegramUrl) setTelegramUrl(res.telegramUrl);
        } else {
          if (res.notFound) {
            setIsNotFound(true);
          }
          setError(res.error || 'Failed to retrieve Telegram file details.');
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="py-8 px-4 max-w-md mx-auto">
        <TelegramPageSkeleton />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Telegram File Not Found"
        message={error || 'The requested Telegram file was not found.'}
      />
    );
  }

  if (error || !tgFile) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Telegram File Not Found"
        message={error || 'Unable to retrieve Telegram file.'}
      />
    );
  }

  const generatedDeepLink = telegramUrl || `https://t.me/${botUsername}?start=${slug}`;

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* 1. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 2. TELEGRAM BOT REDIRECTION CARD */}
      <a
        href={generatedDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white dark:bg-[#141416] border border-neutral-200 hover:border-neutral-300 dark:border-white/[0.08] dark:hover:border-white/[0.16] rounded-[20px] p-6 sm:p-7 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-all duration-200 group cursor-pointer"
        id="telegram-bot-card"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-[#111111] dark:text-white text-base sm:text-lg tracking-tight mb-1 leading-snug">
                Click here to get video
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                This button will redirect you to our Telegram File Server Bot.
              </p>
            </div>
          </div>

          <div className="w-10 h-10 rounded-[14px] bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:bg-neutral-200 dark:group-hover:bg-white/[0.08] transition-all flex items-center justify-center shrink-0">
            <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
      </a>
    </div>
  );
};
