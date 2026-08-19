import React, { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

export const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ src, poster, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    try {
      // Initialize Plyr player safely without external CDN sprite fetches
      playerRef.current = new Plyr(videoRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'captions',
          'settings',
          'pip',
          'airplay',
          'fullscreen',
        ],
        ratio: '16:9',
        tooltips: { controls: true, seek: true },
        loadSprite: false,
      });
    } catch (err) {
      console.warn('[PlyrPlayer] Initialization fallback:', err);
    }

    return () => {
      try {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch (err) {
        // Ignore unmount teardown error
      }
    };
  }, [src]);

  return (
    <div className="w-full rounded-[20px] overflow-hidden bg-[#0E0E10] shadow-lg shadow-black/40 border border-white/[0.08] relative group">
      <video
        ref={videoRef}
        className="plyr-react plyr w-full aspect-video rounded-[20px]"
        playsInline
        controls
        poster={poster}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support HTML5 video streaming.
      </video>
    </div>
  );
};
