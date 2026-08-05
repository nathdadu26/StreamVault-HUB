export interface Video {
  id: string;
  slug: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  thumbnails: string[];
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

export interface TaskSettings {
  task1Url: string;
  task2Url: string;
  downloadTaskUrl: string;
  vpnDetectionEnabled: boolean;
  adBlockDetectionEnabled: boolean;
  linkExpirationMinutes: number;
  telegramBotToken: string;
  telegramPostInterval: number;
  telegramPostUnit: "minutes" | "hours" | "days";
  telegramChannelUrl: string;
}
