import { ProcessingStep, Video } from "../types";
import { getStoredFiles, saveStoredFiles, generateUniqueSlug, KOYEB_SERVER_URL, cleanVideoTitle } from "./api";
import {
  StoredUploadItem,
  generateUUID,
  generateFileFingerprint,
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

  private logStage(uploadId: string, stage: string, details?: string) {
    const detailStr = details ? ` (${details})` : "";
    console.log(`[Upload Workflow | ${uploadId}] ${stage}${detailStr}`);
  }

  public async addFiles(fileList: FileList | File[]): Promise<void> {
    const validFiles = Array.from(fileList).filter(
      (f) => f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|mkv|avi|webm)$/i)
    );
    if (validFiles.length === 0) return;

    const itemsToStart: StoredUploadItem[] = [];

    for (const file of validFiles) {
      const fp = generateFileFingerprint(file);

      // Requirement 5: Duplicate Protection
      // Check if matching upload already exists
      const existing = this.queue.find(
        (item) => item.fingerprint === fp || (item.name === file.name && item.file?.size === file.size)
      );

      if (existing) {
        console.log(`[Upload Workflow | ${existing.uploadId || existing.id}] Duplicate detected for "${file.name}". Resuming existing item.`);
        if (!existing.file) {
          this.updateItem(existing.id, { file });
        }
        if (existing.step !== "Completed") {
          itemsToStart.push(existing);
        }
        continue;
      }

      const uploadId = generateUUID();
      const newItem: StoredUploadItem = {
        id: uploadId,
        uploadId,
        fingerprint: fp,
        file,
        name: file.name,
        sizeFormatted: (file.size / (1024 * 1024)).toFixed(1) + " MB",
        progress: 0,
        step: "Uploading to Bunny Stream",
        createdAt: Date.now(),
        retryCount: 0,
      };

      await saveItemToDb(newItem);
      this.queue.push(newItem);
      itemsToStart.push(newItem);
      this.logStage(uploadId, "Upload Started", file.name);
    }

    this.notify();

    for (const item of itemsToStart) {
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

  private async verifyBunnyVideo(bunnyVideoId: string, signal?: AbortSignal): Promise<{ exists: boolean; status?: number }> {
    try {
      const res = await fetch(`${KOYEB_SERVER_URL}/upload/verify-bunny/${bunnyVideoId}`, { signal });
      if (!res.ok) return { exists: false };
      const data = (await res.json()) as any;
      return {
        exists: data.exists ?? false,
        status: data.status,
      };
    } catch {
      return { exists: false };
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

      const uploadId = item.uploadId || item.id;

      try {
        // Step 1: Bunny Stream Verification & Resume Check
        if (item.bunnyVideoId) {
          const verification = await this.verifyBunnyVideo(item.bunnyVideoId, signal);
          if (verification.exists) {
            this.logStage(uploadId, "Upload Confirmed by Bunny", `GUID: ${item.bunnyVideoId}`);
          }
        }

        // Step 2: Upload / Start job if no jobId yet
        if (!item.jobId) {
          if (!item.file && !item.bunnyVideoId) {
            this.updateItem(id, {
              step: "Failed",
              error: "File data not available and no Bunny Video ID saved to resume",
            });
            return;
          }

          this.logStage(uploadId, "Upload Started");
          this.updateItem(id, {
            step: "Uploading to Bunny Stream",
            error: undefined,
          });

          const existing = getStoredFiles();
          const slug = generateUniqueSlug(existing);

          let uploadRes: { jobId: string; bunnyVideoId?: string; bunnyUploaded?: boolean; completed?: boolean; result?: any };

          if (item.file) {
            uploadRes = await uploadFileXHR(
              item.file,
              slug,
              uploadId,
              item.fingerprint,
              item.bunnyVideoId,
              (percent) => {
                this.updateItem(id, {
                  progress: percent,
                  step: "Uploading to Bunny Stream",
                });
              },
              signal
            );
          } else {
            const statusRes = await fetch(`${KOYEB_SERVER_URL}/upload/status/${item.id}`, { signal });
            if (!statusRes.ok) throw new Error("Unable to restore job without file binary");
            uploadRes = await statusRes.json();
          }

          if (signal.aborted) return;

          const assignedBunnyVid = uploadRes.bunnyVideoId || item.bunnyVideoId;
          if (assignedBunnyVid) {
            this.logStage(uploadId, "Upload Confirmed by Bunny", `GUID: ${assignedBunnyVid}`);
          }

          this.updateItem(id, {
            jobId: uploadRes.jobId || item.id,
            bunnyVideoId: assignedBunnyVid,
            progress: 100,
            step: "Waiting for Bunny Stream Transcoding",
          });

          if (uploadRes.completed && uploadRes.result) {
            this.logStage(uploadId, "Completed");
            this.updateItem(id, {
              step: "Completed",
              progress: 100,
              completedVideo: uploadRes.result,
              error: undefined,
            });
            if (this.onFilesChangedCallback) this.onFilesChangedCallback();
            return;
          }
        }

        // Step 3: Poll / Retry backend processing until completed
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
        this.logStage(uploadId, "Completed");
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
        console.warn(`[UploadWorker ${uploadId}] Error encountered. Retrying in ${delay / 1000}s (Attempt ${retryCount}):`, err?.message || err);

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
    const loggedStages = new Set<string>();

    const item = this.queue.find((i) => i.id === id);
    const uploadId = item?.uploadId || id;

    while (!jobCompleted && !signal.aborted) {
      let job: any = null;
      try {
        const statusRes = await fetch(`${KOYEB_SERVER_URL}/upload/status/${jobId}`, { signal });
        if (!statusRes.ok) throw new Error("Server status request failed");
        job = await statusRes.json();
      } catch (err: any) {
        if (signal.aborted) throw new Error("Upload cancelled");
        throw err; // Trigger exponential backoff retry in worker loop
      }

      if (job.bunnyVideoId && (!item?.bunnyVideoId || item.bunnyVideoId !== job.bunnyVideoId)) {
        this.updateItem(id, { bunnyVideoId: job.bunnyVideoId });
      }

      // Log stages according to Requirement 9
      const stage = job.stage || "";
      if (stage && !loggedStages.has(stage)) {
        loggedStages.add(stage);
        if (stage === "Waiting for Bunny Stream Transcoding") {
          this.logStage(uploadId, "Transcoding Started");
        } else if (stage === "Downloading ZIP Package") {
          if (!loggedStages.has("Transcoding Completed")) {
            loggedStages.add("Transcoding Completed");
            this.logStage(uploadId, "Transcoding Completed");
          }
          this.logStage(uploadId, "ZIP Downloaded");
        } else if (stage === "Extracting Files") {
          this.logStage(uploadId, "Files Extracted");
        } else if (stage === "Uploading Files to Cloudflare R2") {
          this.logStage(uploadId, "R2 Upload Complete");
        } else if (stage === "Saving Metadata to Cloudflare D1") {
          this.logStage(uploadId, "D1 Saved");
        }
      }

      // If processing failed in backend pipeline, auto-retry processing endpoint
      if (job.processingFailed || (job.error && job.bunnyUploaded)) {
        console.log(`[UploadWorker ${uploadId}] Processing failed on backend. Triggering retry endpoint...`);
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

    // Filter out preview_hq from mp4Qualities
    const rawQualities = videoData.mp4Qualities || videoData.mp4_qualities || {};
    let parsedQualities: Record<string, string> = {};
    if (typeof rawQualities === "string") {
      try {
        parsedQualities = JSON.parse(rawQualities);
      } catch {}
    } else if (typeof rawQualities === "object") {
      parsedQualities = rawQualities;
    }

    const cleanQualities: Record<string, string> = {};
    for (const [q, url] of Object.entries(parsedQualities)) {
      if (!url || typeof url !== "string" || !url.trim()) continue;
      const lowerQ = q.toLowerCase();
      const lowerUrl = url.toLowerCase();
      if (lowerQ.includes("preview") || lowerUrl.includes("preview_hq")) {
        console.log(`[UploadManager] Filtering out preview_hq file: key="${q}", url="${url}"`);
        continue;
      }
      cleanQualities[q] = url.trim();
    }

    const rawTitle = videoData.title || fileName;
    const finalTitle = cleanVideoTitle(rawTitle);

    let finalVideoUrl = videoData.videoUrl || "";
    if (finalVideoUrl.toLowerCase().includes("preview_hq")) {
      finalVideoUrl = cleanQualities["1080p"] || cleanQualities["720p"] || cleanQualities["480p"] || cleanQualities["360p"] || cleanQualities["240p"] || "";
    }

    const videoObject: Video = {
      ...videoData,
      id: videoData.id || `vid_${Date.now()}`,
      slug: slug,
      title: finalTitle,
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
      videoUrl: finalVideoUrl,
      mp4Qualities: cleanQualities,
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
