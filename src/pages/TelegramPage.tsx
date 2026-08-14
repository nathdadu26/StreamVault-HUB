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
  const queryParams = new URLSearchParams(window.location.search);
  const gatewayToken = queryParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tgFile, setTgFile] = useState<TelegramFileItem | null>(null);
  const [botUsername, setBotUsername] = useState<string>('file_server_bot');
  const [telegramUrl, setTelegramUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [requiresGateway, setRequiresGateway] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setRequiresGateway(false);
      setIsNotFound(false);

      if (!gatewayToken) {
        setRequiresGateway(true);
        setError('Unauthorized access. Gateway token is missing or expired.');
        setLoading(false);
        return;
      }

      const res = await fetchTelegramFile(slug, gatewayToken);
      if (isMounted) {
        if (res.success && res.data) {
          setTgFile(res.data);
          if (res.botUsername) setBotUsername(res.botUsername);
          if (res.telegramUrl) setTelegramUrl(res.telegramUrl);
        } else {
          if (res.notFound) {
            setIsNotFound(true);
          } else if (res.requiresGateway) {
            setRequiresGateway(true);
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
  }, [slug, gatewayToken]);

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

  if (requiresGateway || error || !tgFile) {
    return (
      <ErrorState
        type="401"
        slug={slug}
        title="Unauthorized Telegram Gateway"
        message={error || 'Direct access is forbidden. You must complete the task gateway first.'}
      />
    );
  }

  const generatedDeepLink = telegramUrl || `https://t.me/${botUsername}?start=${slug}`;

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4 animate-fadeIn">
      {/* 1. ADVERTISEMENT BANNER */}
      <AdBanner />

      {/* 2. TELEGRAM BOT REDIRECTION CARD */}
      <a
        href={generatedDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs hover:border-blue-300 transition-colors group cursor-pointer"
        id="telegram-bot-card"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white text-base mb-0.5 leading-snug">
                Click here to get video
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                This button will redirect you to our Telegram File Server Bot.
              </p>
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors">
            <ExternalLink className="w-5 h-5" />
          </div>
        </div>
      </a>
    </div>
  );
};
