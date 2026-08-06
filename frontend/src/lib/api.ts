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
    const reservedRoutes = ["ad", "s", "dl", "d", "admin", "admin_dashboard", "api", ""];
    if (reservedRoutes.includes(last.toLowerCase())) {
      return "";
    }
    return last;
  }
  return "";
}

export function parseDateString(str?: string): number {
  if (!str) return NaN;
  let formatted = str.trim();
  if (formatted.includes(" ") && !formatted.includes("T")) {
    formatted = formatted.replace(" ", "T") + "Z";
  } else if (!formatted.endsWith("Z") && !formatted.includes("+") && !formatted.includes("-", 10)) {
    formatted = formatted + "Z";
  }
  const t = new Date(formatted).getTime();
  if (!isNaN(t)) return t;
  return new Date(str).getTime();
}

export function checkLinkExpiration(
  video: Video | null,
  linkExpirationMinutes: number
): { isExpired: boolean; elapsedMinutes: number; statusLog: string } {
  if (!video) {
    const statusLog = `[Expiration Check] Status: SKIPPED (Record not found in D1)`;
    console.log(statusLog);
    return { isExpired: false, elapsedMinutes: 0, statusLog };
  }

  if (!linkExpirationMinutes || linkExpirationMinutes <= 0) {
    const statusLog = `[Expiration Check] Status: NOT EXPIRED (Expiration limit disabled or set to 0)`;
    console.log(statusLog);
    return { isExpired: false, elapsedMinutes: 0, statusLog };
  }

  const visitors = getStoredVisitors();
  const currentVisitor = visitors.find((v) => v.slug === video.slug);

  let referenceTime = currentVisitor ? parseDateString(currentVisitor.visitedAt) : NaN;
  if (isNaN(referenceTime)) {
    referenceTime = parseDateString(video.uploadedAt);
  }

  if (isNaN(referenceTime)) {
    referenceTime = Date.now();
  }

  const now = Date.now();
  const diffMinutes = Math.max(0, (now - referenceTime) / (1000 * 60));

  if (diffMinutes > linkExpirationMinutes) {
    const statusLog = `[Expiration Check] Status: EXPIRED (Elapsed: ${diffMinutes.toFixed(1)}m > Limit: ${linkExpirationMinutes}m)`;
    console.log(statusLog);
    return { isExpired: true, elapsedMinutes: diffMinutes, statusLog };
  }

  const statusLog = `[Expiration Check] Status: NOT EXPIRED (Elapsed: ${diffMinutes.toFixed(1)}m <= Limit: ${linkExpirationMinutes}m)`;
  console.log(statusLog);
  return { isExpired: false, elapsedMinutes: diffMinutes, statusLog };
}

export interface VideoQualityOption {
  quality: string;
  url: string;
}

export function cleanVideoTitle(rawTitle: string): string {
  if (!rawTitle) return "Untitled Video";

  let clean = rawTitle.trim();

  // 1. Remove file extensions (.mp4, .mkv, .mov, .avi, .webm, .zip)
  clean = clean.replace(/\.(mp4|mkv|mov|avi|webm|zip)$/i, "");

  // 2. Remove preview_hq or preview terms
  clean = clean.replace(/[-_]?(preview_hq|preview)[-_]?/gi, "");

  // 3. Remove quality suffixes like _240p, _360p, _480p, _720p, _1080p, -240p, play_240p, etc.
  clean = clean.replace(/[-_]?(play|quality)?[-_]?(240p|360p|480p|720p|1080p|2160p|4k)[-_]?/gi, "");

  // 4. Clean leading/trailing spaces, underscores, or dashes
  clean = clean.replace(/^[-_\s]+|[-_\s]+$/g, "").trim();

  return clean || rawTitle;
}

export function getAvailableQualities(video: Video | null): VideoQualityOption[] {
  if (!video) return [];

  const standardOrder = ["240p", "360p", "480p", "720p", "1080p"];
  const found: VideoQualityOption[] = [];

  let map: Record<string, string> = {};
  if (typeof video.mp4Qualities === "string") {
    try {
      map = JSON.parse(video.mp4Qualities);
    } catch {}
  } else if (video.mp4Qualities && typeof video.mp4Qualities === "object") {
    map = video.mp4Qualities as Record<string, string>;
  }

  for (const q of standardOrder) {
    const url = map[q];
    if (url && typeof url === "string" && url.trim() !== "") {
      const lowerUrl = url.toLowerCase();
      // Ignore preview_hq or preview files completely
      if (lowerUrl.includes("preview_hq") || q.toLowerCase().includes("preview")) {
        continue;
      }
      found.push({ quality: q, url: url.trim() });
    }
  }

  if (found.length === 0 && video.videoUrl && typeof video.videoUrl === "string" && video.videoUrl.trim() !== "") {
    const lowerVideoUrl = video.videoUrl.toLowerCase();
    if (!lowerVideoUrl.includes("preview_hq")) {
      const rawQuality = video.quality ? video.quality.toLowerCase() : "";
      const matchedQuality = standardOrder.find((q) => q === rawQuality) || "1080p";
      found.push({ quality: matchedQuality, url: video.videoUrl.trim() });
    }
  }

  return found;
}

export async function generateSignedR2Url(
  rawUrl: string,
  title: string,
  quality: string,
  expirationMinutes: number
): Promise<string> {
  const validMinutes = expirationMinutes > 0 ? expirationMinutes : 10;
  const expiresAt = Date.now() + validMinutes * 60 * 1000;
  const secret = "atoz_r2_secret_key_2026";

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${rawUrl}:${expiresAt}`);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const token = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const downloadEndpoint = `${window.location.origin}/api/download`;
    const params = new URLSearchParams({
      url: rawUrl,
      title,
      quality,
      expires: String(expiresAt),
      token,
    });

    return `${downloadEndpoint}?${params.toString()}`;
  } catch (err) {
    console.error("[generateSignedR2Url] HMAC signing failed:", err);
    return rawUrl;
  }
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

  const thumbnailUrl = data.thumbnailUrl || data.thumbnail_url || thumbnails[0] || data.thumbnail_1 || "";

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

  let videoUrl = data.videoUrl || data.video_url || "";
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
    fileSize: String(data.fileSize || data.file_size || "0 MB"),
    duration: String(data.duration || "00:00"),
    views: typeof data.views === "number" ? data.views : Number(data.views) || 0,
    likes: typeof data.likes === "number" ? data.likes : Number(data.likes) || 0,
    dislikes: typeof data.dislikes === "number" ? data.dislikes : Number(data.dislikes) || 0,
    uploadedAt: String(data.uploadedAt || data.uploaded_at || new Date().toISOString()),
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
    console.log(`[D1 Lookup]: Record not found (empty or invalid slug)`);
    return null;
  }

  try {
    const res = await fetch(`/api/videos?slug=${encodeURIComponent(cleanSlug)}`);
    console.log(`[SQL query result] HTTP status: ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json() as any;
      if (data && data.slug) {
        console.log(`[SQL query result]: Record found in D1 for slug "${cleanSlug}"`, data);
        const formatted = formatVideoRecord(data);
        return formatted;
      } else {
        console.log(`[SQL query result]: Record not found in D1 for slug "${cleanSlug}"`);
      }
    } else if (res.ok) {
      const text = await res.text();
      if (text && text.trim().startsWith("{")) {
        const data = JSON.parse(text);
        if (data && data.slug) {
          console.log(`[SQL query result]: Record found in D1 for slug "${cleanSlug}"`, data);
          return formatVideoRecord(data);
        }
      }
      console.log(`[SQL query result]: Non-JSON response for slug "${cleanSlug}"`);
    } else {
      console.log(`[SQL query result]: Failed status ${res.status} for slug "${cleanSlug}"`);
    }
  } catch (err) {
    console.error(`[SQL query error] for slug "${cleanSlug}":`, err);
  }

  // Fallback to local storage
  const localFiles = getStoredFiles();
  const localMatch = localFiles.find((f) => f.slug === cleanSlug);
  if (localMatch) {
    console.log(`[SQL query result]: Record found in Local Storage for slug "${cleanSlug}"`, localMatch);
    return localMatch;
  }

  console.log(`[SQL query result]: Record not found anywhere for slug "${cleanSlug}"`);
  return null;
}

export async function updateFileThumbnail(id: string, newThumbnailUrl: string, title?: string): Promise<Video[]> {
  const files = getStoredFiles();
  const updated = files.map((f) => {
    if (f && f.id === id) {
      return {
        ...f,
        thumbnailUrl: newThumbnailUrl || f.thumbnailUrl || "",
        title: title !== undefined ? title : (f.title || ""),
      };
    }
    return f;
  });
  saveStoredFiles(updated);
  
  // Push to Cloudflare D1 Function API
  try {
    await fetch("/api/videos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, thumbnailUrl: newThumbnailUrl, title }),
    });
  } catch (err) {
    console.error("[updateFileThumbnail] Failed to sync with Cloudflare D1 API:", err);
  }

  return updated;
}

export async function deleteFile(id: string, slug?: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Delete Action] Step 1: Updating local storage state for ID: "${id}", Slug: "${slug || 'N/A'}"...`);
  const files = getStoredFiles();
  const filtered = files.filter((f) => f.id !== id && (slug ? f.slug !== slug : true));
  saveStoredFiles(filtered);
  console.log(`[Delete Action] Step 1 Complete: Local storage updated. Items remaining: ${filtered.length}`);

  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (slug) params.set("slug", slug);

  const requestUrl = `/api/videos?${params.toString()}`;
  console.log(`[Delete Action] Step 2: Calling Backend API: DELETE ${requestUrl}`);

  try {
    const res = await fetch(requestUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ id, slug }),
    });

    console.log(`[Delete Action] Step 3: API Response HTTP status: ${res.status} ${res.statusText}`);

    const resData = await res.json().catch(() => ({}));

    if (!res.ok || resData.success === false) {
      const errMsg = resData.error || `Server error (HTTP ${res.status})`;
      console.error(`[Delete Action] Step 3 Error: Backend deletion failed with message: "${errMsg}"`);
      return { success: false, error: errMsg };
    }

    console.log(`[Delete Action] Step 4 Complete: Cloudflare D1 record & R2 assets deleted successfully. Response:`, resData);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err.message || "Network error while connecting to Cloudflare Functions API";
    console.error(`[Delete Action] Exception caught during API request:`, err);
    return { success: false, error: errorMsg };
  }
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
    visitedAt: new Date().toISOString(),
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
    telegramPostQuantity: 1,
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

// Telegram Channels Persistence & D1 API
const STORAGE_CHANNELS_KEY = "streamvault_telegram_channels";

export function getStoredChannels(): import("../types").TelegramChannel[] {
  const data = localStorage.getItem(STORAGE_CHANNELS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredChannels(channels: import("../types").TelegramChannel[]): void {
  localStorage.setItem(STORAGE_CHANNELS_KEY, JSON.stringify(channels));
}

export async function fetchTelegramChannels(): Promise<import("../types").TelegramChannel[]> {
  try {
    const res = await fetch("/api/telegram");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveStoredChannels(data);
        return data;
      }
    }
  } catch (e) {
    console.error("[fetchTelegramChannels] Error:", e);
  }
  return getStoredChannels();
}

export async function saveTelegramChannel(channel: { id?: string; channelId: string; channelName: string; enabled?: boolean; totalSuccess?: number; totalFailed?: number }): Promise<import("../types").TelegramChannel[]> {
  const existing = getStoredChannels();
  const index = existing.findIndex((c) => c.channelId === channel.channelId || (channel.id && c.id === channel.id));
  let updated: import("../types").TelegramChannel[];

  if (index >= 0) {
    updated = [...existing];
    updated[index] = {
      ...updated[index],
      channelId: channel.channelId,
      channelName: channel.channelName,
      enabled: channel.enabled !== undefined ? channel.enabled : updated[index].enabled,
    };
  } else {
    const newChan: import("../types").TelegramChannel = {
      id: channel.id || `chan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      channelId: channel.channelId,
      channelName: channel.channelName,
      enabled: channel.enabled !== undefined ? channel.enabled : true,
      totalSuccess: channel.totalSuccess || 0,
      totalFailed: channel.totalFailed || 0,
      createdAt: new Date().toISOString(),
    };
    updated = [newChan, ...existing];
  }

  saveStoredChannels(updated);

  try {
    await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(channel),
    });
  } catch (e) {
    console.error("[saveTelegramChannel] D1 sync error:", e);
  }

  return updated;
}

export async function deleteTelegramChannel(idOrChannelId: string): Promise<import("../types").TelegramChannel[]> {
  const existing = getStoredChannels();
  const updated = existing.filter((c) => c.id !== idOrChannelId && c.channelId !== idOrChannelId);
  saveStoredChannels(updated);

  try {
    await fetch(`/api/telegram?id=${encodeURIComponent(idOrChannelId)}`, {
      method: "DELETE",
    });
  } catch (e) {
    console.error("[deleteTelegramChannel] D1 sync error:", e);
  }

  return updated;
}

export async function toggleTelegramChannel(idOrChannelId: string): Promise<import("../types").TelegramChannel[]> {
  const existing = getStoredChannels();
  const updated = existing.map((c) => {
    if (c.id === idOrChannelId || c.channelId === idOrChannelId) {
      return { ...c, enabled: !c.enabled };
    }
    return c;
  });
  saveStoredChannels(updated);

  const target = updated.find((c) => c.id === idOrChannelId || c.channelId === idOrChannelId);
  if (target) {
    try {
      await fetch("/api/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, channelId: target.channelId, enabled: target.enabled }),
      });
    } catch (e) {
      console.error("[toggleTelegramChannel] D1 sync error:", e);
    }
  }

  return updated;
}

export async function recordTelegramPostResult(idOrChannelId: string, success: boolean): Promise<import("../types").TelegramChannel[]> {
  const existing = getStoredChannels();
  const updated = existing.map((c) => {
    if (c.id === idOrChannelId || c.channelId === idOrChannelId) {
      return {
        ...c,
        totalSuccess: success ? c.totalSuccess + 1 : c.totalSuccess,
        totalFailed: !success ? c.totalFailed + 1 : c.totalFailed,
      };
    }
    return c;
  });
  saveStoredChannels(updated);

  try {
    await fetch("/api/telegram", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: idOrChannelId,
        channelId: idOrChannelId,
        incrementSuccess: success,
        incrementFailed: !success,
      }),
    });
  } catch (e) {
    console.error("[recordTelegramPostResult] D1 sync error:", e);
  }

  return updated;
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
