import React, { useEffect, useRef, useState } from 'react';
import { fetchGatewayConfig } from '../lib/api';

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
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });


    } catch (err) {
      container.innerHTML = adCode;
    }
  }, [adCode]);

  if (adCode) {
    return (
      <div
        className={`w-full rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/70 bg-purple-50/40 dark:bg-purple-950/20 p-4 flex flex-col items-center justify-center text-center overflow-hidden min-h-[250px] ${className}`}
        id="ad-banner-component"
      >
        <div ref={containerRef} className="w-full flex items-center justify-center overflow-hidden" />
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/70 bg-purple-50/40 dark:bg-purple-950/20 p-8 flex flex-col items-center justify-center text-center select-none ${className}`}
      id="ad-banner-component"
    >
      {/* Inline SVG Image Icon in Purple */}
      <div className="text-indigo-600 dark:text-indigo-400 mb-2">
        <svg
          className="w-10 h-10 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      <span className="text-xs font-bold tracking-wide uppercase text-indigo-600 dark:text-indigo-400 mb-1">
        ADVERTISEMENT
      </span>

      <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
        {sizeLabel}
      </span>
    </div>
  );
};

