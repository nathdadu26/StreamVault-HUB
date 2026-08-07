/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProcessingStep = 
  | "queued" 
  | "uploading" 
  | "extracting" 
  | "analyzing" 
  | "completed" 
  | "failed" 
  | "Uploading to Bunny Stream" 
  | "Waiting for Bunny Stream Transcoding" 
  | "Completed" 
  | "Failed";

export interface Video {
  id: string;
  slug: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  thumbnails: string[]; // R2 links for all extracted thumbs
  fileSize: string;
  duration: string;
  views: number;
  likes: number;
  dislikes: number;
  uploadedAt: string;
  releaseYear: number;
  genres: string[];
  quality: string;
  mp4Qualities?: Record<string, string>;
}

export interface TelegramChannel {
  id: string;
  channelId: string;
  channelName: string;
  enabled: boolean;
  totalSuccess: number;
  totalFailed: number;
  createdAt?: string;
}

export interface TaskSettings {
  task1Url: string;
  task2Url: string;
  downloadTaskUrl: string;
  vpnDetectionEnabled: boolean;
  adBlockDetectionEnabled: boolean;
  linkExpirationMinutes: number;
  telegramBotToken: string;
  telegramPostInterval: number;
  telegramPostUnit: "minutes" | "hours";
  telegramPostQuantity: number;
  telegramChannelUrl: string;
}

export interface Visitor {
  id: string;
  slug: string;
  ip: string;
  os: string;
  browser: string;
  country: string;
  visitedAt: string;
  totalLinksOpened: number;
}

export interface DeviceStats {
  device: string;
  count: number;
}

export interface BrowserStats {
  browser: string;
  count: number;
}

export interface AnalyticsSummary {
  totalFiles: number;
  totalViews: number;
  monthlyViews: { month: string; views: number }[];
}
