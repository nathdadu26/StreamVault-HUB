import {
  ResourceInfoResponse,
  GatewaySessionResponse,
  TaskVerifyResponse,
  VideoItem,
  BloggerItem,
  TelegramFileItem,
} from '../types';

export async function fetchResourceInfo(slug: string): Promise<ResourceInfoResponse> {
  try {
    const res = await fetch(`/api/resource/${encodeURIComponent(slug)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: 'Network error reaching gateway server.' };
  }
}

export async function startGatewayTask(
  slug: string,
  taskNumber: 1 | 2
): Promise<GatewaySessionResponse> {
  try {
    const res = await fetch('/api/gateway/task/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, taskNumber }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to initiate task session.' };
  }
}

export async function verifyGatewayTask(
  sessionToken: string,
  slug: string,
  taskNumber: 1 | 2
): Promise<TaskVerifyResponse> {
  try {
    const res = await fetch('/api/gateway/task/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, slug, taskNumber }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to verify task completion.' };
  }
}

export async function fetchPlayerStream(
  slug: string
): Promise<{ success: boolean; data?: VideoItem; notFound?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/player/${encodeURIComponent(slug)}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to load video player stream.' };
  }
}

export async function fetchBloggerStream(
  slug: string
): Promise<{ success: boolean; data?: BloggerItem; notFound?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/blogger/${encodeURIComponent(slug)}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to load Blogger video stream.' };
  }
}

export async function startDownloadTask(
  slug: string
): Promise<GatewaySessionResponse> {
  try {
    const res = await fetch('/api/download/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to start download task.' };
  }
}

export async function verifyDownloadTask(
  sessionToken: string,
  slug: string
): Promise<{ success: boolean; completed?: boolean; downloadUrl?: string; fileName?: string; error?: string }> {
  try {
    const res = await fetch('/api/download/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, slug }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to verify download task.' };
  }
}

export async function fetchTelegramFile(
  slug: string
): Promise<{ success: boolean; data?: TelegramFileItem; botUsername?: string; telegramUrl?: string; notFound?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/telegram/${encodeURIComponent(slug)}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to retrieve Telegram file details.' };
  }
}

export async function fetchPublicItems(): Promise<{ success: boolean; videos?: VideoItem[]; telegramFiles?: TelegramFileItem[]; error?: string }> {
  try {
    const res = await fetch('/api/items');
    return await res.json();
  } catch (err: any) {
    return { success: false, error: 'Failed to fetch items.' };
  }
}

export async function fetchGatewayConfig(): Promise<{ success: boolean; taskDuration?: number; botUsername?: string; bannerAdCode?: string }> {
  try {
    const res = await fetch('/api/config');
    return await res.json();
  } catch (err: any) {
    return { success: false };
  }
}
