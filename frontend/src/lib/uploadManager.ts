import { ProcessingStep, Video } from "../types";
import { getStoredFiles, saveStoredFiles, generateUniqueSlug, KOYEB_SERVER_URL } from "./api";
import {
  StoredUploadItem,
  saveItemToDb,
  loadAllItemsFromDb,
  deleteItemFromDb,
  clearCompletedFromDb,
  clearAllFromDb,
  uploadFileXHR,
  getBackoffDelay,
} from "./uploadQueueDb";

type Listener = (queue: StoredUploadItem[]) => void;

class UploadManagerClass {
  private queue: StoredUploadItem[] = [];
  private listeners: Set<Listener> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private runningWorkers: Set<string> = new Set();
  private onFilesChangedCallback?: () => void;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  public setOnFilesChangedCallback(cb: () => void) {
    this.onFilesChangedCallback = cb;
  }

  private async init() {
    try {
      const stored = await loadAllItemsFromDb();
      this.queue = stored;
      this.notify();
      // Auto resume all unfinished items upon page load
      this.resumeUnfinished();
    } catch (err) {
      console.warn("[UploadManager Init Error]", err);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getQueue());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getQueue(): StoredUploadItem[] {
    return [...this.queue];
  }

  private notify() {
    const currentQueue = this.getQueue();
    this.listeners.forEach((l) => l(currentQueue));
  }

  private updateItem(id: string, update: Partial<StoredUploadItem>) {
    const index = this.queue.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...update };
      saveItemToDb(this.queue[index]);
      this.notify();
    }
  }

  public async addFiles(fileList: FileList | File[]): Promise<void> {
    const validFiles = Array.from(fileList).filter(
      (f) => f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)
    );
    if (validFiles.length === 0) return;

    const newItems: StoredUploadItem[] = validFiles.map((file) => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      file,
      name: file.name,
      sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      progress: 0,
      step: "Uploading to Bunny Stream",
      createdAt: Date.now(),
      retryCount: 0,
    }));

    for (const item of newItems) {
      await saveItemToDb(item);
      this.queue.push(item);
    }

    this.notify();

    for (const item of newItems) {
      this.startWorker(item.id);
    }
  }

  private resumeUnfinished() {
    for (const item of this.queue) {
      if (item.step !== "Completed") {
        this.startWorker(item.id);
      }
    }
  }

  private async startWorker(id: string) {
    if (this.runningWorkers.has(id)) return;
    this.runningWorkers.add(id);

    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    try {
      await this.runWorkerLoop(id, abortController.signal);
    } catch (e: any) {
      if (e?.message === "Upload cancelled") {
        console.log(`[UploadManager] Worker ${id} cancelled`);
      } else {
        console.error(`[UploadManager] Worker ${id} stopped`, e);
      }
    } finally {
      this.runningWorkers.delete(id);
      this.abortControllers.delete(id);
    }
  }

  private async runWorkerLoop(id: string, signal: AbortSignal): Promise<void> {
    let retryCount = 0;

    while (!signal.aborted) {
      const item = this.queue.find((i) => i.id === id);
      if (!item || item.step === "Completed") {
        return;
      }

      try {
        // Step 1: Uploading to Bunny Stream if no jobId yet
        if (!item.jobId) {
          if (!item.file) {
            this.updateItem(id, {
              step: "Failed",
              error: "File data not available to resume upload",
            });
            return;
          }

          this.updateItem(id, {
            step: "Uploading to Bunny Stream",
            error: undefined,
          });

          const existing = getStoredFiles();
          const slug = generateUniqueSlug(existing);

          const { jobId } = await uploadFileXHR(
            item.file,
            slug,
            (percent) => {
              this.updateItem(id, {
                progress: percent,
                step: "Uploading to Bunny Stream",
              });
            },
            signal
          );

          if (signal.aborted) return;

          this.updateItem(id, {
            jobId,
            progress: 100,
            step: "Waiting for Bunny Stream Transcoding",
          });
        }

        // Step 2: Poll / Retry backend processing until completed
        const currentItem = this.queue.find((i) => i.id === id);
        if (!currentItem || !currentItem.jobId) continue;

        const resultVideo = await this.pollOrRetryJob(
          id,
          currentItem.jobId,
          currentItem.file,
          currentItem.name,
          signal
        );

        if (signal.aborted) return;

        // Completed!
        this.updateItem(id, {
          step: "Completed",
          progress: 100,
          completedVideo: resultVideo,
          error: undefined,
        });

        if (this.onFilesChangedCallback) {
          this.onFilesChangedCallback();
        }

        return;
      } catch (err: any) {
        if (signal.aborted || err?.message === "Upload cancelled") {
          return;
        }

        retryCount++;
        const delay = getBackoffDelay(retryCount);
        console.warn(`[UploadWorker ${id}] Error encountered. Retrying in ${delay / 1000}s (Attempt ${retryCount}):`, err?.message || err);

        this.updateItem(id, {
          retryCount,
          error: `Temporary error: ${err?.message || "Reconnecting"}. Retrying...`,
        });

        // Wait backoff delay before retrying
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, delay);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timeout);
              resolve(null);
            },
            { once: true }
          );
        });
      }
    }
  }

  private async pollOrRetryJob(
    id: string,
    jobId: string,
    file: File | undefined,
    fileName: string,
    signal: AbortSignal
  ): Promise<Video> {
    let jobCompleted = false;
    let videoData: any = null;

    while (!jobCompleted && !signal.aborted) {
      // 1. Fetch status
      let job: any = null;
      try {
        const statusRes = await fetch(`${KOYEB_SERVER_URL}/upload/status/${jobId}`, { signal });
        if (!statusRes.ok) throw new Error("Server status request failed");
        job = await statusRes.json();
      } catch (err: any) {
        if (signal.aborted) throw new Error("Upload cancelled");
        throw err; // Trigger exponential backoff retry in worker loop
      }

      // If processing failed in backend pipeline, auto-retry processing endpoint
      if (job.processingFailed || (job.error && job.bunnyUploaded)) {
        console.log(`[UploadWorker ${id}] Processing failed on backend. Triggering retry endpoint...`);
        try {
          await fetch(`${KOYEB_SERVER_URL}/upload/retry/${jobId}`, {
            method: "POST",
            signal,
          });
        } catch {}
        throw new Error(`Processing retry requested: ${job.failedStep || "Transcoding"}`);
      }

      if (job.error) {
        throw new Error(job.error);
      }

      if (job.stage) {
        this.updateItem(id, {
          step: job.stage as ProcessingStep,
          error: undefined,
        });
      }

      if (job.completed) {
        jobCompleted = true;
        videoData = job.result;
      } else {
        // Wait 2s between poll requests
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 2000);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timeout);
              resolve(null);
            },
            { once: true }
          );
        });
      }
    }

    if (!videoData) {
      throw new Error("Job completed but video metadata was missing");
    }

    const fileSizeFormatted = file
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : videoData.fileSize || "100 MB";

    const existing = getStoredFiles();
    const slug = videoData.slug || generateUniqueSlug(existing);

    const videoObject: Video = {
      ...videoData,
      id: videoData.id || `vid_${Date.now()}`,
      slug: slug,
      title: videoData.title || fileName,
      fileSize: videoData.fileSize || fileSizeFormatted,
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

    return videoObject;
  }

  public async cancelUpload(id: string): Promise<void> {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }
    this.runningWorkers.delete(id);

    this.queue = this.queue.filter((i) => i.id !== id);
    await deleteItemFromDb(id);
    this.notify();
  }

  public async cancelAllUploads(): Promise<void> {
    for (const [id, controller] of this.abortControllers.entries()) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.runningWorkers.clear();

    this.queue = [];
    await clearAllFromDb();
    this.notify();
  }

  public async clearFinishedUploads(): Promise<void> {
    this.queue = this.queue.filter((i) => i.step !== "Completed");
    await clearCompletedFromDb();
    this.notify();
  }
}

export const uploadManager = new UploadManagerClass();
