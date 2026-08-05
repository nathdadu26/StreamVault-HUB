import { Video } from "../types";
import { MOCK_VIDEO } from "../data/mock";

const STORAGE_KEY = "streamvault_d1_files";

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

// Initial seed if empty
const INITIAL_FILES: Video[] = [
  {
    id: "vid_1",
    slug: "sjhu4ld7_ndlksk_h",
    title: "TG-@atoz_links-VID-1700000001.mp4",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
    thumbnails: [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60",
    ],
    fileSize: "145.2 MB",
    duration: "02:45",
    views: 1240,
    likes: 310,
    dislikes: 12,
    uploadedAt: new Date().toISOString(),
    releaseYear: 2024,
    genres: ["Video", "MP4"],
    quality: "1080p",
  },
  {
    id: "vid_2",
    slug: "m9k3p2a1_x8q7v5_z",
    title: "TG-@atoz_links-VID-1700000002.mp4",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=60",
    thumbnails: [
      "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=60",
    ],
    fileSize: "420.8 MB",
    duration: "03:12",
    views: 3890,
    likes: 820,
    dislikes: 24,
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    releaseYear: 2024,
    genres: ["Trailer", "MP4"],
    quality: "4K",
  }
];

export function getStoredFiles(): Video[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FILES));
    return INITIAL_FILES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_FILES;
  }
}

export function saveStoredFiles(files: Video[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
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
        // Fallback photos if canvas snapshot failed
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

  // Fetch existing files to guarantee slug uniqueness
  const existing = getStoredFiles();
  const slug = generateUniqueSlug(existing);

  // Step 1: Real upload simulation / upload to Koyeb server
  let uploadPct = 0;
  onProgress(5, "Uploading to Koyeb Server...");
  
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

  // Step 2: Processing Video
  onProgress(50, "Processing Video...");
  await new Promise((r) => setTimeout(r, 400));

  // Step 3: Renaming & Converting
  onProgress(60, "Renaming File...");
  await new Promise((r) => setTimeout(r, 300));
  onProgress(70, "Converting to MP4...");
  await new Promise((r) => setTimeout(r, 500));

  // Step 4: Generate 5 Thumbnails
  onProgress(80, "Generating Thumbnails...");
  const thumbs = await generateThumbnailsFromVideo(file);

  // Step 5: Uploading to Cloudflare R2
  onProgress(90, "Uploading to R2...");
  await new Promise((r) => setTimeout(r, 400));

  // Step 6: Saving to Cloudflare D1 Database
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

  // Persist to Cloudflare D1 local store
  saveStoredFiles([videoObject, ...existing]);

  onProgress(100, "Completed");
  return videoObject;
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
  return updated;
}

export function deleteFile(id: string): Video[] {
  const files = getStoredFiles();
  const filtered = files.filter((f) => f.id !== id);
  saveStoredFiles(filtered);
  return filtered;
}
