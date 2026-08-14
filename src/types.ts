export interface VideoItem {
  id: string;
  slug: string;
  title: string;
  video_link: string;
  file_size: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface BloggerItem {
  id: string;
  slug: string;
  title: string;
  video_link: string;
  views: number;
  created_at?: string;
  updated_at?: string;
}

export interface TelegramFileItem {
  id: string;
  slug: string;
  file_name: string;
  file_size: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface TaskState {
  taskNumber: 1 | 2 | 3; // 1 = Task 1, 2 = Task 2, 3 = Download Task
  status: TaskStatus;
  sessionToken?: string;
  startedAt?: number;
  countdownRemaining?: number;
  errorMessage?: string;
}

export interface GatewaySessionResponse {
  success: boolean;
  sessionToken?: string;
  taskUrl?: string;
  durationSeconds?: number;
  error?: string;
}

export interface TaskVerifyResponse {
  success: boolean;
  completed?: boolean;
  nextTaskUnlocked?: boolean;
  gatewayToken?: string;
  redirectUrl?: string;
  error?: string;
  elapsedSeconds?: number;
  requiredSeconds?: number;
}

export interface ResourceInfoResponse {
  success: boolean;
  type?: 'video' | 'blogger' | 'telegram';
  destinationPath?: string;
  data?: VideoItem | BloggerItem | TelegramFileItem;
  error?: string;
  notFound?: boolean;
  requiresGateway?: boolean;
  botUsername?: string;
}

export interface VisitorLog {
  id: string;
  ip: string;
  country: string;
  device: string;
  browser: string;
  user_agent: string;
  path: string;
  slug?: string;
  event: string;
  created_at: string;
}

export interface AdminStats {
  totalVideos: number;
  totalTelegramFiles: number;
  totalSessions: number;
  totalVisitors: number;
  visitors: VisitorLog[];
}
