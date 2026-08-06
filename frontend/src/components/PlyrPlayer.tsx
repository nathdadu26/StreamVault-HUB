import React, { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  mp4Qualities?: Record<string, string>;
}

export function PlyrPlayer({ src, poster, title, mp4Qualities }: PlyrPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  const mp4QualitiesJson = JSON.stringify(mp4Qualities || {});

  useEffect(() => {
    if (!videoRef.current) return;

    // Parse qualities dynamically from mp4Qualities or fallback to src
    const qualityMap: Record<number, string> = {};
    const availableSizes: number[] = [];

    const parsedQualities: Record<string, string> = mp4QualitiesJson
      ? JSON.parse(mp4QualitiesJson)
      : {};

    if (Object.keys(parsedQualities).length > 0) {
      Object.entries(parsedQualities).forEach(([key, url]) => {
        if (!url) return;
        const match = key.match(/\d+/);
        const size = match ? parseInt(match[0], 10) : 1080;
        qualityMap[size] = url;
        if (!availableSizes.includes(size)) {
          availableSizes.push(size);
        }
      });
      availableSizes.sort((a, b) => b - a);
    }

    if (availableSizes.length === 0 && src) {
      const defaultSize = 1080;
      qualityMap[defaultSize] = src;
      availableSizes.push(defaultSize);
    }

    const defaultQuality = availableSizes[0] || 1080;

    const sourcesList = availableSizes.map((size) => ({
      src: qualityMap[size],
      type: "video/mp4",
      size: size,
    }));

    // Initialize Plyr instance without volume slider (mute button only)
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
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: availableSizes.length > 1 ? ["quality", "speed", "loop"] : ["speed", "loop"],
      quality: {
        default: defaultQuality,
        options: availableSizes,
        forced: true,
      },
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      tooltips: { controls: true, seek: true },
    });

    if (sourcesList.length > 0) {
      player.source = {
        type: "video",
        title: title || "Video",
        poster: poster,
        sources: sourcesList,
      };
    }

    playerRef.current = player;

    // Quality change handler preserving currentTime and playing state
    const handleQualityChange = (event: any) => {
      const newQuality = event.detail.quality;
      const newSrc = qualityMap[newQuality];
      if (!newSrc || !player.media) return;

      const media = player.media as HTMLMediaElement;
      const currentTime = media.currentTime || player.currentTime || 0;
      const isPlaying = !media.paused;

      const restoreState = () => {
        try {
          if (currentTime > 0) {
            media.currentTime = currentTime;
          }
          if (isPlaying) {
            media.play().catch(() => {});
          }
        } catch {
          // ignore seek errors
        }
      };

      media.addEventListener("loadedmetadata", restoreState, { once: true });
      media.addEventListener("canplay", restoreState, { once: true });
    };

    player.on("qualitychange", handleQualityChange);

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
  }, [src, poster, title, mp4QualitiesJson]);

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
