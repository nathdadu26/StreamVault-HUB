import { Video, TaskSettings } from "../types";

const KOYEB_SERVER_URL = import.meta.env.VITE_KOYEB_PROCESSING_SERVER_URL || "http://localhost:3000";

// Local storage keys
const STORAGE_KEY_FILES = "atoz_links_files";
const STORAGE_KEY_SETTINGS = "atoz_links_settings";

export function getStoredFiles(): Video[] {
  const stored = localStorage.getItem(STORAGE_KEY_FILES);
  return stored ? JSON.parse(stored) : [];
}

export function saveStoredFiles(files: Video[]) {
  localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
}

export function getStoredSettings(): TaskSettings {
  const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
  return stored ? JSON.parse(stored) : {
    task1Url: "",
    task2Url: "",
    downloadTaskUrl: "",
    vpnDetectionEnabled: false,
    adBlockDetectionEnabled: false,
    linkExpirationMinutes: 30,
    telegramBotToken: "",
    telegramPostInterval: 30,
    telegramPostUnit: "minutes",
    telegramChannelUrl: ""
  };
}

export function saveStoredSettings(settings: TaskSettings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

export function generateUniqueSlug(existing: Video[]): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (existing.some((f) => f.slug === slug)) return generateUniqueSlug(existing);
  return slug;
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

export async function processVideoUpload(
  file: File,
  onProgress: (progress: number, step: ProcessingStep) => void
): Promise<Video> {
  onProgress(10, "Uploading to Koyeb Server...");
  
  const existing = getStoredFiles();
  const slug = generateUniqueSlug(existing);
  const formData = new FormData();
  formData.append("video", file);
  formData.append("slug", slug);

  try {
    const res = await fetch(`${KOYEB_SERVER_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Server processing failed");
    }

    const data = await res.json() as any;
    if (!data.success || !data.video) {
      throw new Error("Invalid response from processing server");
    }

    onProgress(95, "Saving Database...");
    
    const videoObject: Video = {
      ...data.video,
      id: data.video.id || `vid_${Date.now()}`,
      slug: slug,
      views: 0,
      likes: 0,
      dislikes: 0,
      duration: data.video.duration || "00:00",
      releaseYear: new Date().getFullYear(),
      genres: ["MP4", "HD"],
      quality: "1080p",
    };

    // Persist locally
    saveStoredFiles([videoObject, ...existing]);

    // Sync to Cloudflare D1
    await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(videoObject),
    }).catch(() => {});

    onProgress(100, "Completed");
    return videoObject;

  } catch (err: any) {
    console.error("[Upload] Error:", err);
    onProgress(0, "Failed");
    throw err;
  }
}

export function updateFileThumbnail(id: string, newThumbnailUrl: string, title?: string): Video[] {
  const files = getStoredFiles();
  const updated = files.map((f) => {
    if (f.id === id) {
      return { ...f, thumbnailUrl: newThumbnailUrl, title: title || f.title };
    }
    return f;
  });
  saveStoredFiles(updated);
  
  // Sync to API
  fetch("/api/videos", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, thumbnailUrl: newThumbnailUrl, title }),
  }).catch(() => {});
  
  return updated;
}

export function deleteFile(id: string): Video[] {
  const files = getStoredFiles();
  const updated = files.filter((f) => f.id !== id);
  saveStoredFiles(updated);
  
  // Sync to API
  fetch(`/api/videos?id=${id}`, {
    method: "DELETE",
  }).catch(() => {});
  
  return updated;
}
