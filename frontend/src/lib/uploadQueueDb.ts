import { ProcessingStep, Video } from "../types";
import { getStoredFiles, saveStoredFiles, generateUniqueSlug, KOYEB_SERVER_URL } from "./api";

export interface StoredUploadItem {
  id: string;
  jobId?: string;
  file?: File;
  name: string;
  sizeFormatted: string;
  progress: number;
  step: ProcessingStep;
  error?: string;
  completedVideo?: Video;
  createdAt: number;
  retryCount?: number;
}

const DB_NAME = "AtoZUploadQueueDB";
const DB_VERSION = 1;
const STORE_NAME = "upload_items";

// Open or initialize IndexedDB
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported in this browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItemToDb(item: StoredUploadItem): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("[DB Save Warning]", e);
  }
}

export async function loadAllItemsFromDb(): Promise<StoredUploadItem[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = (request.result || []) as StoredUploadItem[];
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("[DB Load Warning]", e);
    return [];
  }
}

export async function deleteItemFromDb(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("[DB Delete Warning]", e);
  }
}

export async function clearCompletedFromDb(): Promise<void> {
  try {
    const items = await loadAllItemsFromDb();
    const completedIds = items.filter((i) => i.step === "Completed").map((i) => i.id);
    for (const id of completedIds) {
      await deleteItemFromDb(id);
    }
  } catch (e) {
    console.warn("[DB Clear Warning]", e);
  }
}

export async function clearAllFromDb(): Promise<void> {
  try {
    const items = await loadAllItemsFromDb();
    for (const item of items) {
      await deleteItemFromDb(item.id);
    }
  } catch (e) {
    console.warn("[DB Clear All Warning]", e);
  }
}

// XHR upload with real 0-100% progress
export function uploadFileXHR(
  file: File,
  slug: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<{ jobId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("video", file);
    formData.append("slug", slug);

    if (signal) {
      if (signal.aborted) {
        reject(new Error("Upload cancelled"));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(99, Math.max(0, pct)));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress(100);
          resolve(data);
        } catch {
          reject(new Error("Invalid response from upload server"));
        }
      } else {
        let errMessage = "Upload server error";
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) errMessage = data.error;
        } catch {}
        reject(new Error(errMessage));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network connection error"));
    });

    xhr.addEventListener("timeout", () => {
      reject(new Error("Upload request timed out"));
    });

    xhr.open("POST", `${KOYEB_SERVER_URL}/upload`);
    xhr.send(formData);
  });
}

// Get exponential backoff delay: 5s, 10s, 20s, 30s, 60s max
export function getBackoffDelay(retryCount: number): number {
  const delays = [5000, 10000, 20000, 30000, 60000];
  return delays[Math.min(retryCount, delays.length - 1)];
}
