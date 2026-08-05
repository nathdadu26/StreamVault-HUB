/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Video {
  id: string;
  slug: string;
  title: string;
  originalName: string;
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
}

export interface TaskSettings {
  task1Url: string;
  task2Url: string;
  downloadTaskUrl: string;
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
