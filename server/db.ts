import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface VideoRecord {
  id: string;
  slug: string;
  title: string;
  video_link: string;
  file_size: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface TelegramFileRecord {
  id: string;
  slug: string;
  file_name: string;
  file_size: string;
  created_at: string;
  updated_at: string;
}

export interface VisitorRecord {
  id: string;
  ip: string;
  country: string;
  device: string;
  browser: string;
  user_agent: string;
  path: string;
  slug: string;
  event: string;
  created_at: string;
}

export interface GatewaySessionRecord {
  id: string;
  session_token: string;
  master_token?: string;
  slug: string;
  visitor_id: string;
  task_type: 'gateway_task_1' | 'gateway_task_2' | 'download_task';
  task_number: number;
  started_at: number; // ms timestamp
  completed_at?: number; // ms timestamp
  expires_at: number; // ms timestamp
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
}

interface DatabaseSchema {
  videos_db: VideoRecord[];
  telegram_files: TelegramFileRecord[];
  visitors: VisitorRecord[];
  gateway_sessions: GatewaySessionRecord[];
}

const DATA_FILE = path.join(process.cwd(), 'd1_storage.json');

class D1Database {
  private data: DatabaseSchema = {
    videos_db: [],
    telegram_files: [],
    visitors: [],
    gateway_sessions: [],
  };

  constructor() {
    this.load();
    this.seedDefaults();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load D1 storage file, starting fresh', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save D1 storage', err);
    }
  }

  private seedDefaults() {
    if (this.data.videos_db.length === 0) {
      const defaultVideos: VideoRecord[] = [
        {
          id: 'v_1',
          slug: 'cyberpunk-2077-trailer',
          title: 'Cyberpunk 2077: Phantom Liberty Official Cinematic Stream',
          video_link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          file_size: '485.2 MB',
          views: 1420,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'v_2',
          slug: 'nature-4k-documentary',
          title: 'Nature 4K Wildlife & Forest Exploration Showcase',
          video_link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          file_size: '820.5 MB',
          views: 3890,
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'v_3',
          slug: 'stream-demo-720p',
          title: 'StreamVault HUB High-Speed Edge Video Stream Test',
          video_link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          file_size: '150.0 MB',
          views: 942,
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      this.data.videos_db = defaultVideos;
    }

    if (this.data.telegram_files.length === 0) {
      const defaultTgFiles: TelegramFileRecord[] = [
        {
          id: 'tg_1',
          slug: 'jp681CzI',
          file_name: 'Premium_Architectural_Designs_2026_Pack.zip',
          file_size: '124.8 MB',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'tg_2',
          slug: 'secure-vault-doc',
          file_name: 'StreamVault_Edge_Developer_Documentation.pdf',
          file_size: '18.4 MB',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      this.data.telegram_files = defaultTgFiles;
    }

    this.save();
  }

  // Videos DB operations
  getVideoBySlug(slug: string): VideoRecord | undefined {
    return this.data.videos_db.find((v) => v.slug === slug);
  }

  addVideo(video: Omit<VideoRecord, 'id' | 'views' | 'created_at' | 'updated_at'>): VideoRecord {
    const existing = this.getVideoBySlug(video.slug);
    if (existing) {
      throw new Error('Video slug already exists in videos_db');
    }
    const newRecord: VideoRecord = {
      id: `v_${crypto.randomUUID()}`,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...video,
    };
    this.data.videos_db.unshift(newRecord);
    this.save();
    return newRecord;
  }

  incrementViews(slug: string): number {
    const video = this.data.videos_db.find((v) => v.slug === slug);
    if (video) {
      video.views += 1;
      video.updated_at = new Date().toISOString();
      this.save();
      return video.views;
    }
    return 0;
  }

  getAllVideos(): VideoRecord[] {
    return [...this.data.videos_db];
  }

  // Telegram files operations
  getTelegramFileBySlug(slug: string): TelegramFileRecord | undefined {
    return this.data.telegram_files.find((f) => f.slug === slug);
  }

  addTelegramFile(file: Omit<TelegramFileRecord, 'id' | 'created_at' | 'updated_at'>): TelegramFileRecord {
    const existing = this.getTelegramFileBySlug(file.slug);
    if (existing) {
      throw new Error('Telegram file slug already exists in telegram_files');
    }
    const newRecord: TelegramFileRecord = {
      id: `tg_${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...file,
    };
    this.data.telegram_files.unshift(newRecord);
    this.save();
    return newRecord;
  }

  getAllTelegramFiles(): TelegramFileRecord[] {
    return [...this.data.telegram_files];
  }

  // Visitors operations
  logVisitor(visitor: Omit<VisitorRecord, 'id' | 'created_at'>): VisitorRecord {
    const record: VisitorRecord = {
      id: `vis_${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      ...visitor,
    };
    this.data.visitors.unshift(record);
    // keep max 500 recent visitor logs
    if (this.data.visitors.length > 500) {
      this.data.visitors = this.data.visitors.slice(0, 500);
    }
    this.save();
    return record;
  }

  getRecentVisitors(limit = 100): VisitorRecord[] {
    return this.data.visitors.slice(0, limit);
  }

  // Gateway Session operations
  createSession(params: {
    slug: string;
    visitor_id: string;
    task_type: 'gateway_task_1' | 'gateway_task_2' | 'download_task';
    task_number: number;
    ttlSeconds?: number;
  }): GatewaySessionRecord {
    const now = Date.now();
    const ttl = params.ttlSeconds ? params.ttlSeconds * 1000 : 300000; // 5 min default
    const sessionToken = crypto.randomBytes(24).toString('hex');

    const session: GatewaySessionRecord = {
      id: `sess_${crypto.randomUUID()}`,
      session_token: sessionToken,
      slug: params.slug,
      visitor_id: params.visitor_id,
      task_type: params.task_type,
      task_number: params.task_number,
      started_at: now,
      expires_at: now + ttl,
      status: 'in_progress',
      created_at: new Date().toISOString(),
    };

    this.data.gateway_sessions.unshift(session);
    this.save();
    return session;
  }

  getSessionByToken(token: string): GatewaySessionRecord | undefined {
    return this.data.gateway_sessions.find((s) => s.session_token === token || s.master_token === token);
  }

  updateSession(token: string, updates: Partial<GatewaySessionRecord>): GatewaySessionRecord | undefined {
    const session = this.getSessionByToken(token);
    if (session) {
      Object.assign(session, updates);
      this.save();
      return session;
    }
    return undefined;
  }

  // Check if both Task 1 & Task 2 are completed for a given slug & visitor/session family
  isGatewayCompleted(slug: string, masterToken: string): boolean {
    const masterSession = this.data.gateway_sessions.find(
      (s) => s.slug === slug && s.master_token === masterToken && s.status === 'completed'
    );
    if (!masterSession) return false;
    if (Date.now() > masterSession.expires_at) return false;
    return true;
  }

  // Create master token upon completion of both tasks
  createMasterGatewayToken(slug: string, visitorId: string): string {
    const masterToken = `master_${crypto.randomBytes(28).toString('hex')}`;
    const now = Date.now();
    // Valid for 15 minutes
    const session: GatewaySessionRecord = {
      id: `sess_${crypto.randomUUID()}`,
      session_token: masterToken,
      master_token: masterToken,
      slug,
      visitor_id: visitorId,
      task_type: 'gateway_task_2',
      task_number: 2,
      started_at: now,
      completed_at: now,
      expires_at: now + 15 * 60 * 1000,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    this.data.gateway_sessions.unshift(session);
    this.save();
    return masterToken;
  }

  // Download session completion check
  isDownloadAuthorized(slug: string, downloadToken: string): boolean {
    const session = this.data.gateway_sessions.find(
      (s) =>
        s.slug === slug &&
        s.session_token === downloadToken &&
        s.task_type === 'download_task' &&
        s.status === 'completed'
    );
    if (!session) return false;
    if (Date.now() > session.expires_at) return false;
    return true;
  }
}

export const db = new D1Database();
