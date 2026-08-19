import React, { useEffect, useState } from 'react';
import { fetchBloggerStream } from '../lib/api';
import { BloggerItem } from '../types';
import { AdBanner } from '../components/AdBanner';
import { PlayerSkeleton } from '../components/SkeletonLoaders';
import { ErrorState } from '../components/ErrorState';
import { Eye, Play } from 'lucide-react';

interface BloggerPageProps {
  slug: string;
}

export const BloggerPage: React.FC<BloggerPageProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<BloggerItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      const res = await fetchBloggerStream(slug);
      if (isMounted) {
        if (res.success && res.data) {
          setVideo(res.data);
        } else {
          if (res.notFound) {
            setIsNotFound(true);
          }
          setError(res.error || 'Failed to access Blogger video stream.');
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
      <div className="pt-1 pb-8 px-4 max-w-md mx-auto">
        <PlayerSkeleton />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Blogger Video Not Found"
        message={error || 'The requested Blogger video file was not found.'}
      />
    );
  }

  if (error || !video) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Blogger Video Not Found"
        message={error || 'Unable to load this Blogger stream.'}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-0 pb-6 sm:pb-8 space-y-5 animate-fadeIn">
      {/* Blogger Video Player Iframe Container (Direct Iframe) */}
      <div className="w-full aspect-video rounded-[20px] overflow-hidden shadow-xl shadow-black/30 border border-neutral-200 dark:border-white/[0.08] bg-black">
        <iframe
          src={video.video_link}
          title={video.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Title & Status Info Card */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-5 sm:p-6 flex flex-col gap-4 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 fill-current text-[#111111] dark:text-white shrink-0" strokeWidth={0} />
            <h1 className="font-bold text-[#111111] dark:text-white text-base sm:text-lg leading-snug truncate tracking-tight">
              {video.title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              {video.views} Views
            </span>
          </div>
        </div>

        {/* Full-width Download Unavailable Notice */}
        <div
          className="w-full py-3.5 px-4 rounded-[14px] bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 text-center font-medium text-sm text-[#111111] dark:text-white transition-colors duration-200"
          id="download-unavailable-notice"
        >
          Download not available for this video.
        </div>
      </div>

      {/* Advertisement Banner */}
      <AdBanner />
    </div>
  );
};
