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

    // Initialize Plyr player
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
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-black shadow-xl border border-slate-800 relative group">
      <video
        ref={videoRef}
        className="plyr-react plyr w-full aspect-video"
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
