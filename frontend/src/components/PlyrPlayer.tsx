import React, { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
}

export function PlyrPlayer({ src, poster }: PlyrPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Plyr instance with requested controls & settings
    const player = new Plyr(videoRef.current, {
      autoplay: false,
      ratio: "16:9",
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: ["quality", "speed", "loop"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      tooltips: { controls: true, seek: true },
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div 
      className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black relative border border-white/10 font-sans"
      style={{
        // Match emerald theme from dashboard
        ["--plyr-color-main" as string]: "#10b981",
        ["--plyr-video-control-color" as string]: "#ffffff",
        ["--plyr-control-radius" as string]: "8px",
      }}
    >
      <video
        ref={videoRef}
        playsInline
        poster={poster}
        className="w-full h-full object-contain"
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
