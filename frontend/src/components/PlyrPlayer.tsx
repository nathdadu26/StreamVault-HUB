import React, { useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { Icons } from "@/src/components/Icons";

interface PlyrPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  mp4Qualities?: Record<string, string>;
}

export function PlyrPlayer({ src, poster, title, mp4Qualities }: PlyrPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const mp4QualitiesJson = JSON.stringify(mp4Qualities || {});

  useEffect(() => {
    // Explicitly destroy previous Plyr instance before creating a new one
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (err) {
        console.error("[PlyrPlayer] Error destroying previous Plyr instance:", err);
      }
      playerRef.current = null;
    }

    setHasError(false);
    setErrorMessage("");

    // Parse qualities dynamically
    const qualityMap: Record<number, string> = {};
    const availableSizes: number[] = [];

    let parsedQualities: Record<string, string> = {};
    if (mp4QualitiesJson) {
      try {
        parsedQualities = JSON.parse(mp4QualitiesJson);
      } catch {}
    }

    if (parsedQualities && Object.keys(parsedQualities).length > 0) {
      Object.entries(parsedQualities).forEach(([key, url]) => {
        if (!url || typeof url !== "string" || url.trim() === "") return;
        const match = key.match(/\d+/);
        const size = match ? parseInt(match[0], 10) : 1080;
        qualityMap[size] = url.trim();
        if (!availableSizes.includes(size)) {
          availableSizes.push(size);
        }
      });
      // Sort sizes descending so highest quality is first
      availableSizes.sort((a, b) => b - a);
    }

    if (availableSizes.length === 0 && src && src.trim() !== "") {
      const defaultSize = 1080;
      qualityMap[defaultSize] = src.trim();
      availableSizes.push(defaultSize);
    }

    if (availableSizes.length === 0) {
      console.warn("[PlyrPlayer] No valid video sources found.");
      setHasError(true);
      setErrorMessage("No valid video stream available from Cloudflare R2.");
      return;
    }

    // Highest available quality selected by default (e.g., 1080p > 720p > 480p > 360p > 240p)
    const defaultQuality = availableSizes[0];

    const sourcesList = availableSizes.map((size) => ({
      src: qualityMap[size],
      type: "video/mp4",
      size: size,
    }));

    if (!videoRef.current) return;

    try {
      // Initialize Plyr instance
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
        settings: availableSizes.length > 1 ? ["quality", "speed", "loop"] : ["speed", "loop"],
        quality: {
          default: defaultQuality,
          options: availableSizes,
          forced: true,
        },
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        tooltips: { controls: true, seek: true },
      });

      player.source = {
        type: "video",
        title: title || "Video Preview",
        poster: poster,
        sources: sourcesList,
      };

      playerRef.current = player;

      // Quality change handler
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

      const handleVideoError = (errEvent: any) => {
        console.error("[PlyrPlayer] Error playing video stream:", errEvent);
        setHasError(true);
        setErrorMessage("Failed to load video stream from Cloudflare R2.");
      };

      player.on("qualitychange", handleQualityChange);
      player.on("error", handleVideoError);

      if (videoRef.current) {
        videoRef.current.onerror = handleVideoError;
      }
    } catch (err: any) {
      console.error("[PlyrPlayer] Plyr initialization exception:", err);
      setHasError(true);
      setErrorMessage(err.message || "Failed to initialize video player.");
    }

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

  const mainUrl = qualityMap[availableSizes?.[0]] || src;

  if (hasError) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-slate-950 border border-rose-500/20 flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
          <Icons.AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h4 className="text-sm font-black text-rose-400 uppercase tracking-wide">Video Unavailable</h4>
          <p className="text-xs text-muted-foreground/80 font-medium leading-relaxed">
            {errorMessage || "The requested video stream could not be loaded from Cloudflare R2."}
          </p>
        </div>
        {mainUrl && (
          <a
            href={mainUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline pt-2"
          >
            <Icons.ExternalLink className="h-3.5 w-3.5" />
            Open R2 Direct Stream Link
          </a>
        )}
      </div>
    );
  }

  return (
    <div 
      className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black relative border border-white/10 font-sans"
      style={{
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
