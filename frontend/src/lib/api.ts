import { Video, Visitor, TaskSettings } from "../types";
import { KOYEB_SERVER_URL } from "../hooks/useBackendHealth";

export { KOYEB_SERVER_URL };

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

export function extractSlugFromUrl(rawSlugOrPath?: string): string {
  let str = rawSlugOrPath || "";
  if (!str && typeof window !== "undefined") {
    str = window.location.pathname;
  }
  if (!str) return "";

  // Strip query strings and hashes
  str = str.split("?")[0].split("#")[0].trim();

  // Extract last path component e.g. /ad/ribmlz8mpnxagz00pc -> ribmlz8mpnxagz00pc
  const parts = str.split("/").filter(Boolean);
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    const reservedRoutes = ["ad", "s", "dl", "admin", "api", ""];
    if (reservedRoutes.includes(last.toLowerCase())) {
      return "";
    }
    return last;
  }
  return "";
}

export function formatVideoRecord(data: any): Video {
  let thumbnails: string[] = [];
  if (Array.isArray(data.thumbnails)) {
    thumbnails = data.thumbnails;
  } else if (typeof data.thumbnails === "string") {
    try {
      const parsed = JSON.parse(data.thumbnails);
      if (Array.isArray(parsed)) thumbnails = parsed;
    } catch {
      thumbnails = [];
    }
  }

  const thumbCols = [data.thumbnail_1, data.thumbnail_2, data.thumbnail_3, data.thumbnail_4, data.thumbnail_5];
  for (const t of thumbCols) {
    if (t && typeof t === "string" && !thumbnails.includes(t)) {
      thumbnails.push(t);
    }
  }

  const thumbnailUrl = data.thumbnailUrl || thumbnails[0] || data.thumbnail_1 || "";

  let mp4Qualities: Record<string, string> = {};
  if (data.mp4Qualities && typeof data.mp4Qualities === "object") {
    mp4Qualities = { ...data.mp4Qualities };
  } else if (typeof data.mp4Qualities === "string") {
    try {
      const parsed = JSON.parse(data.mp4Qualities);
      if (typeof parsed === "object" && parsed !== null) {
        mp4Qualities = parsed;
      }
    } catch {}
  }

  if (data.video_1080) mp4Qualities["1080p"] = data.video_1080;
  if (data.video_720) mp4Qualities["720p"] = data.video_720;
  if (data.video_480) mp4Qualities["480p"] = data.video_480;
  if (data.video_360) mp4Qualities["360p"] = data.video_360;
  if (data.video_240) mp4Qualities["240p"] = data.video_240;

  let videoUrl = data.videoUrl || "";
  if (!videoUrl) {
    const preferred = ["1080p", "720p", "480p", "360p", "240p", "280p", "mp4"];
    for (const q of preferred) {
      if (mp4Qualities[q]) {
        videoUrl = mp4Qualities[q];
        break;
      }
    }
  }

  let genres: string[] = ["MP4", "HD"];
  if (Array.isArray(data.genres)) {
    genres = data.genres;
  } else if (typeof data.genres === "string") {
    try {
      const parsed = JSON.parse(data.genres);
      if (Array.isArray(parsed)) genres = parsed;
    } catch {}
  }

  return {
    id: String(data.id || ""),
    slug: String(data.slug || ""),
    title: String(data.title || "Untitled Video"),
    videoUrl,
    thumbnailUrl,
    thumbnails,
    fileSize: String(data.fileSize || "0 MB"),
    duration: String(data.duration || "00:00"),
    views: typeof data.views === "number" ? data.views : Number(data.views) || 0,
    likes: typeof data.likes === "number" ? data.likes : Number(data.likes) || 0,
    dislikes: typeof data.dislikes === "number" ? data.dislikes : Number(data.dislikes) || 0,
    uploadedAt: String(data.uploadedAt || new Date().toISOString()),
    releaseYear: typeof data.releaseYear === "number" ? data.releaseYear : Number(data.releaseYear) || new Date().getFullYear(),
    genres,
    quality: String(data.quality || "1080p"),
    mp4Qualities,
  };
}

export async function getVideoBySlug(rawSlug: string): Promise<Video | null> {
  const cleanSlug = extractSlugFromUrl(rawSlug);
  console.log(`[Requested slug]: "${cleanSlug}" (raw input: "${rawSlug}")`);

  if (!cleanSlug) {
    console.log(`[Record not found]: empty or invalid slug`);
    return null;
  }

  try {
    const res = await fetch(`/api/videos?slug=${encodeURIComponent(cleanSlug)}`);
    console.log(`[SQL query result] HTTP status: ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json() as any;
      if (data && data.slug) {
        console.log(`[Record found] in D1 for slug "${cleanSlug}":`, data);
        const formatted = formatVideoRecord(data);
        return formatted;
      } else {
        console.log(`[Record not found] in D1 for slug "${cleanSlug}"`);
      }
    } else if (res.ok) {
      // Try parsing JSON safely if content-type header wasn't set or differs
      const text = await res.text();
      if (text && text.trim().startsWith("{")) {
        const data = JSON.parse(text);
        if (data && data.slug) {
          console.log(`[Record found] in D1 for slug "${cleanSlug}":`, data);
          return formatVideoRecord(data);
        }
      }
      console.log(`[SQL query result] Non-JSON response for slug "${cleanSlug}"`);
    } else {
      console.log(`[SQL query result] Failed status ${res.status} for slug "${cleanSlug}"`);
    }
  } catch (err) {
    console.error(`[SQL query error] for slug "${cleanSlug}":`, err);
  }

  // Fallback to local storage
  const localFiles = getStoredFiles();
  const localMatch = localFiles.find((f) => f.slug === cleanSlug);
  if (localMatch) {
    console.log(`[Record found in Local Storage] for slug "${cleanSlug}":`, localMatch);
    return localMatch;
  }

  console.log(`[Record not found] anywhere for slug "${cleanSlug}"`);
  return null;
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
// REMOVED: Frontend must never process videos. Logic moved to Koyeb Backend.

export type ProcessingStep = 
  | "Uploading to Bunny Stream"
  | "Waiting for Bunny Stream Transcoding"
  | "Downloading ZIP Package"
  | "Extracting Files"
  | "Uploading Files to Cloudflare R2"
  | "Saving Metadata to Cloudflare D1"
  | "Completed"
  | "Failed"
  | "Processing Failed";

export interface UploadQueueItem {
  id: string;
  jobId?: string;
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
  onProgress: (progress: number, step: ProcessingStep, jobId?: string) => void
): Promise<Video> {
  onProgress(5, "Uploading to Bunny Stream");
  
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
      const errorData = await res.json().catch(() => ({})) as any;
      throw new Error(errorData.error || "Server processing failed");
    }

    const { jobId } = await res.json() as { jobId: string };
    onProgress(10, "Uploading to Bunny Stream", jobId);

    return pollJobStatus(jobId, file, slug, onProgress);
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    onProgress(0, "Failed");
    throw err;
  }
}

export async function retryProcessingVideo(
  jobId: string,
  file: File,
  onProgress: (progress: number, step: ProcessingStep, jobId?: string) => void
): Promise<Video> {
  try {
    const res = await fetch(`${KOYEB_SERVER_URL}/upload/retry/${jobId}`, {
      method: "POST",
    });

    if (!res.ok) {
      return uploadAndProcessVideo(file, onProgress);
    }

    const existing = getStoredFiles();
    const slug = generateUniqueSlug(existing);
    return pollJobStatus(jobId, file, slug, onProgress);
  } catch (err: any) {
    console.error("[Retry] Error:", err);
    throw err;
  }
}

async function pollJobStatus(
  jobId: string,
  file: File,
  slug: string,
  onProgress: (progress: number, step: ProcessingStep, jobId?: string) => void
): Promise<Video> {
  let jobCompleted = false;
  let videoData: any = null;

  while (!jobCompleted) {
    const statusRes = await fetch(`${KOYEB_SERVER_URL}/upload/status/${jobId}`);
    if (!statusRes.ok) throw new Error("Failed to fetch job status");
    
    const job = await statusRes.json() as any;

    if (job.processingFailed || (job.error && job.bunnyUploaded)) {
      const failedMsg = job.error || `Processing Failed: ${job.failedStep || "Failed processing step"}`;
      onProgress(job.progress || 50, "Processing Failed", jobId);
      throw new Error(failedMsg);
    }

    if (job.error) {
      onProgress(0, "Failed", jobId);
      throw new Error(job.error);
    }

    if (job.stage) {
      onProgress(job.progress || 50, job.stage as ProcessingStep, jobId);
    }

    if (job.completed) {
      jobCompleted = true;
      videoData = job.result;
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!videoData) {
    throw new Error("Job completed but no video data returned");
  }

  onProgress(95, "Saving Metadata to Cloudflare D1", jobId);
  
  const existing = getStoredFiles();
  const videoObject: Video = {
    ...videoData,
    id: videoData.id || `vid_${Date.now()}`,
    slug: videoData.slug || slug,
    title: videoData.title || file.name,
    fileSize: videoData.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    views: 0,
    likes: 0,
    dislikes: 0,
    duration: videoData.duration || "00:00",
    releaseYear: new Date().getFullYear(),
    genres: ["MP4", "HD"],
    quality: videoData.quality || "1080p",
    thumbnailUrl: videoData.thumbnailUrl,
    thumbnails: videoData.thumbnails || (videoData.thumbnailUrl ? [videoData.thumbnailUrl] : []),
    videoUrl: videoData.videoUrl,
    mp4Qualities: videoData.mp4Qualities || videoData.mp4_qualities,
    uploadedAt: videoData.uploadedAt || videoData.created_at || new Date().toISOString(),
  };

  saveStoredFiles([videoObject, ...existing]);

  await fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(videoObject),
  }).catch(() => {});

  onProgress(100, "Completed", jobId);
  return videoObject;
}
