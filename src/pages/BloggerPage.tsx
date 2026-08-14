import React, { useEffect, useState } from 'react';
import { fetchBloggerStream } from '../lib/api';
import { BloggerItem } from '../types';
import { AdBanner } from '../components/AdBanner';
import { PlayerSkeleton } from '../components/SkeletonLoaders';
import { ErrorState } from '../components/ErrorState';
import { Download, Eye, Play } from 'lucide-react';

interface BloggerPageProps {
  slug: string;
}

export const BloggerPage: React.FC<BloggerPageProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<BloggerItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresGateway, setRequiresGateway] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  // Extract token from query param
  const queryParams = new URLSearchParams(window.location.search);
  const gatewayToken = queryParams.get('token') || '';

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

      const res = await fetchBloggerStream(slug, gatewayToken);
      if (isMounted) {
        if (res.success && res.data) {
          setVideo(res.data);
        } else {
          if (res.notFound) {
            setIsNotFound(true);
          } else if (res.requiresGateway) {
            setRequiresGateway(true);
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
  }, [slug, gatewayToken]);

  if (loading) {
    return (
      <div className="py-8 px-4 max-w-md mx-auto">
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

  if (requiresGateway || error || !video) {
    return (
      <ErrorState
        type="401"
        slug={slug}
        title="Unauthorized Video Access"
        message={error || 'Direct access is strictly forbidden. You must complete the task gateway first.'}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4 animate-fadeIn">
      {/* Blogger Video Player Iframe Container (Replacing Plyr with Direct Iframe) */}
      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xs border border-slate-200/80 dark:border-slate-800 bg-black">
        <iframe
          src={video.video_link}
          title={video.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Title & Download Info Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-purple-600 dark:fill-purple-400" />
          </div>

          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate">
              {video.title}
            </h1>

            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {video.views} Views
              </span>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <a
          href={`/dl/${slug}?token=${gatewayToken}`}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
          id="download-video-btn"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </a>
      </div>

      {/* Advertisement Banner */}
      <AdBanner />
    </div>
  );
};
