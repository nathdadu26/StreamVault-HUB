import React, { useEffect, useRef, useState } from 'react';
import { fetchGatewayConfig } from '../lib/api';
import { Image as ImageIcon } from 'lucide-react';

interface AdBannerProps {
  className?: string;
  sizeLabel?: string;
}

// Module-level cache so we resolve BANNER_AD_CODE once across all instances
let cachedAdCode: string | null = null;
let isFetchingConfig = false;
const listeners: Array<(code: string) => void> = [];

function getEnvAdCode(): string {
  if (cachedAdCode !== null) return cachedAdCode;

  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envCode =
    (metaEnv && (metaEnv.BANNER_AD_CODE || metaEnv.VITE_BANNER_AD_CODE)) ||
    (typeof process !== 'undefined' && process.env && (process.env.BANNER_AD_CODE || process.env.VITE_BANNER_AD_CODE)) ||
    (typeof window !== 'undefined' && (window as any).__BANNER_AD_CODE__) ||
    '';

  if (envCode) {
    cachedAdCode = envCode;
    return envCode;
  }
  return '';
}

export const AdBanner: React.FC<AdBannerProps> = ({
  className = '',
  sizeLabel = '300 x 250',
}) => {
  const [adCode, setAdCode] = useState<string>(getEnvAdCode);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adCode) {
      if (cachedAdCode !== null) {
        setAdCode(cachedAdCode);
        return;
      }

      const handleCode = (code: string) => setAdCode(code);
      listeners.push(handleCode);

      if (!isFetchingConfig) {
        isFetchingConfig = true;
        fetchGatewayConfig()
          .then((res) => {
            const code = res.success && res.bannerAdCode ? res.bannerAdCode : '';
            cachedAdCode = code;
            listeners.forEach((l) => l(code));
            listeners.length = 0;
            isFetchingConfig = false;
          })
          .catch(() => {
            cachedAdCode = '';
            listeners.forEach((l) => l(''));
            listeners.length = 0;
            isFetchingConfig = false;
          });
      }

      return () => {
        const idx = listeners.indexOf(handleCode);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }
  }, [adCode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !adCode) return;

    container.innerHTML = '';

    try {
      // createContextualFragment parses HTML string into nodes and executes <script> tags
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(adCode);
      container.appendChild(fragment);

      // Re-execute any script tags inside fragment for complete browser compatibility
      const scripts = Array.from(container.querySelectorAll('script')) as HTMLScriptElement[];
      scripts.forEach((oldScript) => {
        try {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.onerror = () => {
            // Silently absorb external ad script network/CORS failures
          };
          if (oldScript.innerHTML) {
            newScript.innerHTML = oldScript.innerHTML;
          }
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        } catch (scriptErr) {
          // Ignore individual script insertion failure
        }
      });
    } catch (err) {
      try {
        container.innerHTML = adCode;
      } catch (_) {}
    }
  }, [adCode]);

  if (adCode) {
    return (
      <div
        className={`w-full rounded-[20px] border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-4 flex flex-col items-center justify-center text-center overflow-hidden min-h-[250px] shadow-sm dark:shadow-lg dark:shadow-black/20 ${className}`}
        id="ad-banner-component"
      >
        <div ref={containerRef} className="w-full flex items-center justify-center overflow-hidden" />
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-[20px] border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#141416] p-8 flex flex-col items-center justify-center text-center select-none shadow-sm dark:shadow-lg dark:shadow-black/20 transition-all duration-200 ${className}`}
      id="ad-banner-component"
    >
      <div className="w-12 h-12 rounded-[16px] bg-neutral-100 dark:bg-[#1A1A1E] border border-neutral-200 dark:border-white/[0.06] flex items-center justify-center text-neutral-600 dark:text-neutral-400 mb-3">
        <ImageIcon className="w-6 h-6" strokeWidth={1.5} />
      </div>

      <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400 mb-1">
        ADVERTISEMENT
      </span>

      <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
        {sizeLabel}
      </span>
    </div>
  );
};


