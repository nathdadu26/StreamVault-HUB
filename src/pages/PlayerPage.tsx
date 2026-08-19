import React, { useEffect, useState } from 'react';
import { fetchPlayerStream } from '../lib/api';
import { VideoItem } from '../types';
import { PlyrPlayer } from '../components/PlyrPlayer';
import { AdBanner } from '../components/AdBanner';
import { PlayerSkeleton } from '../components/SkeletonLoaders';
import { ErrorState } from '../components/ErrorState';
import { Download, Eye, FileText, Play } from 'lucide-react';

interface PlayerPageProps {
  slug: string;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ slug }) => {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      const res = await fetchPlayerStream(slug);
      if (isMounted) {
        if (res.success && res.data) {
          setVideo(res.data);
        } else {
          if (res.notFound) {
            setIsNotFound(true);
          }
          setError(res.error || 'Failed to access video stream.');
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
        <PlayerSkeleton />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Video Not Found"
        message={error || 'The requested video file was not found.'}
      />
    );
  }

  if (error || !video) {
    return (
      <ErrorState
        type="404"
        slug={slug}
        title="Video Not Found"
        message={error || 'Unable to load video stream.'}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* Plyr Video Player Container */}
      <div className="w-full rounded-[20px] overflow-hidden shadow-xl shadow-black/30 border border-neutral-200 dark:border-white/[0.08] bg-black">
        <PlyrPlayer src={video.video_link} title={video.title} />
      </div>

      {/* Title & Download Info Card */}
      <div className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-white/[0.08] rounded-[20px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-colors duration-200">
        <div className="flex items-center gap-3.5 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-[14px] bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200 dark:border-white/[0.08] text-[#111111] dark:text-white flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-current text-[#111111] dark:text-white" strokeWidth={0} />
          </div>

          <div className="min-w-0">
            <h1 className="font-bold text-[#111111] dark:text-white text-base sm:text-lg leading-snug truncate tracking-tight">
              {video.title}
            </h1>

            <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                {video.file_size}
              </span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                {video.views} Views
              </span>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <a
          href={`/dl/${slug}`}
          className="h-11 px-5 rounded-[20px] bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111] dark:bg-white dark:border-transparent dark:text-black dark:hover:bg-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer shrink-0"
          id="download-video-btn"
        >
          <Download className="w-4 h-4 text-[#111111] dark:text-black" strokeWidth={2} />
          <span>Download</span>
        </a>
      </div>

      {/* Advertisement Banner */}
      <AdBanner />
    </div>
  );
};
