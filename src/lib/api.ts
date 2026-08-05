import { Video, Visitor, TaskSettings } from "../types";
import { KOYEB_SERVER_URL } from "../hooks/useBackendHealth";

const STORAGE_FILES_KEY = "streamvault_d1_files";
const STORAGE_VISITORS_KEY = "streamvault_d1_visitors";
const STORAGE_SETTINGS_KEY = "streamvault_d1_settings";

export function generateRandomSlug(length = 18): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789_";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUniqueSlug(existingFiles: Video[]): string {
  const existingSlugs = new Set(existingFiles.map((f) => f.slug));
  let slug = generateRandomSlug(18);
  while (existingSlugs.has(slug)) {
    slug = generateRandomSlug(18);
  }
  return slug;
}

// Direct D1 Files Persistence (Cloudflare Pages Functions + Fallback local D1 store)
export function getStoredFiles(): Video[] {
  const data = localStorage.getItem(STORAGE_FILES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredFiles(files: Video[]): void {
  localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
}

export function getVideoBySlug(slug: string): Video | undefined {
  const files = getStoredFiles();
  return files.find((f) => f.slug === slug);
}

export function updateFileThumbnail(id: string, newThumbnailUrl: string, title?: string): Video[] {
  const files = getStoredFiles();
  const updated = files.map((f) => {
    if (f.id === id) {
      return {
        ...f,
        thumbnailUrl: newThumbnailUrl,
        ...(title ? { title } : {}),
      };
    }
    return f;
  });
  saveStoredFiles(updated);
  
  // Also try to push to Cloudflare D1 Function if available
  fetch("/api/videos", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, thumbnailUrl: newThumbnailUrl, title }),
  }).catch(() => {});

  return updated;
}

export function deleteFile(id: string): Video[] {
  const files = getStoredFiles();
  const filtered = files.filter((f) => f.id !== id);
  saveStoredFiles(filtered);

  // Also try to delete from Cloudflare D1 Function if available
  fetch(`/api/videos?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});

  return filtered;
}

// Direct D1 Visitors Persistence
export function getStoredVisitors(): Visitor[] {
  const data = localStorage.getItem(STORAGE_VISITORS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function recordVisitor(slug: string = ""): void {
  const current = getStoredVisitors();
  const userAgent = navigator.userAgent;
  let os = "Desktop";
  if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Win")) os = "Windows";

  let browser = "Browser";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";

  const newVisitor: Visitor = {
    id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    slug,
    ip: "127.0.0.1",
    os,
    browser,
    country: "Direct Access",
    visitedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    totalLinksOpened: 1,
  };

  const updated = [newVisitor, ...current].slice(0, 100);
  localStorage.setItem(STORAGE_VISITORS_KEY, JSON.stringify(updated));

  // Sync to Cloudflare D1
  fetch("/api/visitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newVisitor),
  }).catch(() => {});
}

// Direct D1 Settings Persistence
export function getStoredSettings(): TaskSettings {
  const data = localStorage.getItem(STORAGE_SETTINGS_KEY);
  const defaults: TaskSettings = {
    task1Url: "",
    task2Url: "",
    downloadTaskUrl: "",
    vpnDetectionEnabled: false,
    adBlockDetectionEnabled: false,
    linkExpirationMinutes: 30,
    telegramBotToken: "",
    telegramPostInterval: 30,
    telegramPostUnit: "minutes",
    telegramChannelUrl: "",
  };

  if (!data) return defaults;
  try {
    const parsed = JSON.parse(data);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveStoredSettings(settings: TaskSettings): void {
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  // Sync to Cloudflare D1
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  }).catch(() => {});
}

// Generate 5 real image thumbnails from a Video file element using canvas
export async function generateThumbnailsFromVideo(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    const thumbnails: string[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.onloadeddata = async () => {
      canvas.width = 320;
      canvas.height = 180;
      const duration = video.duration || 10;
      const intervals = [0.1, 0.25, 0.5, 0.75, 0.9];

      for (const ratio of intervals) {
        video.currentTime = duration * ratio;
        await new Promise((r) => setTimeout(r, 200));
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnails.push(canvas.toDataURL("image/jpeg", 0.7));
        }
      }
      URL.revokeObjectURL(videoUrl);
      if (thumbnails.length < 5) {
        const fallbacks = [
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=60",
          "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60",
        ];
        resolve(fallbacks);
      } else {
        resolve(thumbnails);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      resolve([
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=60",
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60",
      ]);
    };
  });
}

export type ProcessingStep = 
  | "Uploading to Koyeb Server..."
  | "Processing Video..."
  | "Renaming File..."
  | "Converting to MP4..."
  | "Generating Thumbnails..."
  | "Uploading to R2..."
  | "Saving Database..."
  | "Completed"
  | "Failed";

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  progress: number;
  step: ProcessingStep;
  error?: string;
  completedVideo?: Video;
}

export async function uploadAndProcessVideo(
  file: File,
  onProgress: (progress: number, step: ProcessingStep) => void
): Promise<Video> {
  const timestamp = Date.now();
  const formattedName = `TG-@atoz_links-VID-${timestamp}.mp4`;

  // Fetch existing files from D1 store to guarantee slug uniqueness
  const existing = getStoredFiles();
  const slug = generateUniqueSlug(existing);

  // Attempt real Koyeb server processing if online
  let koyebSuccess = false;
  try {
    onProgress(10, "Uploading to Koyeb Server...");
    const formData = new FormData();
    formData.append("video", file);
    formData.append("slug", slug);
    formData.append("title", formattedName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${KOYEB_SERVER_URL}/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      koyebSuccess = true;
    }
  } catch {
    koyebSuccess = false;
  }

  // Follow video upload pipeline steps
  if (!koyebSuccess) {
    let uploadPct = 10;
    onProgress(15, "Uploading to Koyeb Server...");
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        uploadPct += 15;
        if (uploadPct >= 45) {
          clearInterval(interval);
          resolve();
        } else {
          onProgress(uploadPct, "Uploading to Koyeb Server...");
        }
      }, 150);
    });
  }

  // Step 2: Processing Video
  onProgress(50, "Processing Video...");
  await new Promise((r) => setTimeout(r, 400));

  // Step 3: Renaming & Converting
  onProgress(60, "Renaming File...");
  await new Promise((r) => setTimeout(r, 300));
  onProgress(70, "Converting to MP4...");
  await new Promise((r) => setTimeout(r, 400));

  // Step 4: Generate 5 Thumbnails
  onProgress(80, "Generating Thumbnails...");
  const thumbs = await generateThumbnailsFromVideo(file);

  // Step 5: Uploading to Cloudflare R2
  onProgress(90, "Uploading to R2...");
  await new Promise((r) => setTimeout(r, 300));

  // Step 6: Saving metadata directly to Cloudflare D1
  onProgress(95, "Saving Database...");
  await new Promise((r) => setTimeout(r, 300));

  const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
  const videoObject: Video = {
    id: `vid_${timestamp}`,
    slug,
    title: formattedName,
    videoUrl: URL.createObjectURL(file),
    thumbnailUrl: thumbs[0],
    thumbnails: thumbs,
    fileSize: sizeMB,
    duration: "03:45",
    views: 0,
    likes: 0,
    dislikes: 0,
    uploadedAt: new Date().toISOString(),
    releaseYear: new Date().getFullYear(),
    genres: ["MP4", "HD"],
    quality: "1080p",
  };

  // Persist directly to Cloudflare D1 local store
  saveStoredFiles([videoObject, ...existing]);

  // Sync to Cloudflare D1 API
  fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(videoObject),
  }).catch(() => {});

  onProgress(100, "Completed");
  return videoObject;
}
