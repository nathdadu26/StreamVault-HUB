/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Video, Visitor, AnalyticsSummary, TaskSettings } from "../types";

export const MOCK_VIDEO: Video = {
  id: "1",
  slug: "sjhu4ld7_ndlksk_h",
  title: "Watch Backrooms (2022)",
  videoUrl: "https://example.com/video.mp4",
  thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
  thumbnails: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80",
  ],
  fileSize: "1.2 GB",
  duration: "1h 50m",
  views: 24700,
  likes: 1200,
  dislikes: 85,
  uploadedAt: "2023-03-22T10:30:00Z",
  releaseYear: 2022,
  genres: ["Sci-Fi", "Horror", "Mystery"],
  quality: "1080p",
};

export const DEFAULT_SETTINGS: TaskSettings = {
  task1Url: "https://example.com/task1",
  task2Url: "https://example.com/task2",
  downloadTaskUrl: "https://example.com/download-task",
  vpnDetectionEnabled: false,
  adBlockDetectionEnabled: false,
  linkExpirationMinutes: 30,
  telegramBotToken: "",
  telegramPostInterval: 30,
  telegramPostUnit: "minutes",
};

export const MOCK_VISITORS: Visitor[] = [
  { id: "1", slug: "backrooms", ip: "192.168.1.1", os: "Windows 11", browser: "Chrome 122", country: "USA", visitedAt: "2024-03-20 10:30", totalLinksOpened: 45 },
  { id: "2", slug: "spiderman", ip: "172.16.0.45", os: "macOS Sonoma", browser: "Safari 17", country: "Canada", visitedAt: "2024-03-20 11:15", totalLinksOpened: 12 },
  { id: "3", slug: "backrooms", ip: "10.0.0.99", os: "Android 14", browser: "Chrome Mobile", country: "India", visitedAt: "2024-03-20 12:00", totalLinksOpened: 89 },
];

export const MOCK_TASKS = [
  {
    id: "task-1",
    title: "Task 1",
    description: "Visit the site and stay for at least 10 seconds.",
    type: "click",
    url: "https://example.com/task1",
    waitTimeSeconds: 10,
    order: 1,
  },
  {
    id: "task-2",
    title: "Task 2",
    description: "Visit the site and stay for at least 10 seconds.",
    type: "click",
    url: "https://example.com/task2",
    waitTimeSeconds: 10,
    order: 2,
  }
];

export const MOCK_ANALYTICS: AnalyticsSummary = {
  totalFiles: 156,
  totalViews: 845200,
  monthlyViews: [
    { month: "Jan", views: 45000 },
    { month: "Feb", views: 52000 },
    { month: "Mar", views: 48000 },
    { month: "Apr", views: 61000 },
    { month: "May", views: 55000 },
    { month: "Jun", views: 67000 },
  ],
};
