import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Environmental Variables
const TASK_LINK = process.env.TASK_LINK || 'https://example.com/sponsor-task-link';
const TASK_DURATION = parseInt(process.env.TASK_DURATION || '10', 10);
const BOT_USERNAME = (process.env.BOT_USERNAME || 'file_server_bot').replace(/^@/, '');

// Device & Visitor Utilities
function parseUserAgent(uaStr?: string) {
  const ua = uaStr || '';
  let device = 'Desktop';
  if (/Android/i.test(ua)) device = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) device = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'macOS';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Linux/i.test(ua)) device = 'Linux';

  let browser = 'Unknown';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return { device, browser };
}

function getVisitorInfo(req: Request) {
  const ip =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    '127.0.0.1';

  const country = (req.headers['cf-ipcountry'] as string) || 'US';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { device, browser } = parseUserAgent(userAgent);

  return { ip, country, device, browser, user_agent: userAgent };
}

// Security & Rate Limiting memory map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['cf-connecting-ip'] as string) || req.ip || '127.0.0.1';
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 min window
    return next();
  }

  limit.count += 1;
  if (limit.count > 120) { // 120 requests per minute
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please slow down your requests.',
    });
  }

  next();
}

app.use(rateLimiter);

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. GET /api/resource/:slug - Check slug in blogger_db, telegram_files, videos_db
app.get('/api/resource/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const visitorInfo = getVisitorInfo(req);

    // 1. Check in blogger_db
    const blogger = db.getBloggerBySlug(slug);
    if (blogger) {
      db.logVisitor({
        ...visitorInfo,
        path: `/ad/${slug}`,
        slug,
        event: 'gateway_view_blogger',
      });

      return res.json({
        success: true,
        type: 'blogger',
        destinationPath: `/bl/${slug}`,
        data: {
          id: blogger.id,
          slug: blogger.slug,
          title: blogger.title,
          views: blogger.views,
          created_at: blogger.created_at,
          updated_at: blogger.updated_at,
        },
      });
    }

    // 2. Check in telegram_files
    const tgFile = db.getTelegramFileBySlug(slug);
    if (tgFile) {
      db.logVisitor({
        ...visitorInfo,
        path: `/ad/${slug}`,
        slug,
        event: 'gateway_view_telegram',
      });

      return res.json({
        success: true,
        type: 'telegram',
        destinationPath: `/tg/${slug}`,
        data: {
          id: tgFile.id,
          slug: tgFile.slug,
          file_name: tgFile.file_name,
          file_size: tgFile.file_size,
          created_at: tgFile.created_at,
          updated_at: tgFile.updated_at,
        },
      });
    }

    // 3. Check in videos_db
    const video = db.getVideoBySlug(slug);
    if (video) {
      db.logVisitor({
        ...visitorInfo,
        path: `/ad/${slug}`,
        slug,
        event: 'gateway_view_video',
      });

      return res.json({
        success: true,
        type: 'video',
        destinationPath: `/s/${slug}`,
        data: {
          id: video.id,
          slug: video.slug,
          title: video.title,
          file_size: video.file_size,
          views: video.views,
          created_at: video.created_at,
          updated_at: video.updated_at,
        },
      });
    }

    // Not found in any of the three tables
    db.logVisitor({
      ...visitorInfo,
      path: `/ad/${slug}`,
      slug,
      event: 'resource_404',
    });

    return res.status(404).json({
      success: false,
      notFound: true,
      error: 'The requested resource or video file was not found.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 2. POST /api/gateway/task/start - Start Task 1 or Task 2
app.post('/api/gateway/task/start', (req: Request, res: Response) => {
  try {
    const { slug, taskNumber } = req.body;
    if (!slug || (taskNumber !== 1 && taskNumber !== 2)) {
      return res.status(400).json({ success: false, error: 'Invalid task request parameters.' });
    }

    const blogger = db.getBloggerBySlug(slug);
    const tgFile = db.getTelegramFileBySlug(slug);
    const video = db.getVideoBySlug(slug);
    if (!blogger && !tgFile && !video) {
      return res.status(404).json({ success: false, error: 'Resource not found for this gateway.' });
    }

    const visitorInfo = getVisitorInfo(req);
    const visRecord = db.logVisitor({
      ...visitorInfo,
      path: `/ad/${slug}`,
      slug,
      event: `task_${taskNumber}_start`,
    });

    const taskType = taskNumber === 1 ? 'gateway_task_1' : 'gateway_task_2';
    const taskUrl = TASK_LINK;

    const session = db.createSession({
      slug,
      visitor_id: visRecord.id,
      task_type: taskType,
      task_number: taskNumber,
      ttlSeconds: 600, // 10 minutes session
    });

    return res.json({
      success: true,
      sessionToken: session.session_token,
      taskUrl,
      durationSeconds: TASK_DURATION,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to initiate task session.' });
  }
});

// 3. POST /api/gateway/task/verify - Verify Task server-side
app.post('/api/gateway/task/verify', (req: Request, res: Response) => {
  try {
    const { sessionToken, slug, taskNumber } = req.body;
    if (!sessionToken || !slug || (taskNumber !== 1 && taskNumber !== 2)) {
      return res.status(400).json({ success: false, error: 'Missing session verification arguments.' });
    }

    const session = db.getSessionByToken(sessionToken);
    if (!session || session.slug !== slug || session.task_number !== taskNumber) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired task session. Please click "Try Again" to restart.',
      });
    }

    if (Date.now() > session.expires_at) {
      db.updateSession(sessionToken, { status: 'failed' });
      return res.status(400).json({
        success: false,
        error: 'Task session expired. Please restart the task.',
      });
    }

    const elapsedMs = Date.now() - session.started_at;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const requiredSeconds = TASK_DURATION;

    const visitorInfo = getVisitorInfo(req);

    if (elapsedSeconds < requiredSeconds) {
      db.updateSession(sessionToken, { status: 'failed' });
      db.logVisitor({
        ...visitorInfo,
        path: `/ad/${slug}`,
        slug,
        event: `task_${taskNumber}_failed_early`,
      });

      return res.json({
        success: false,
        completed: false,
        error: `Task failed! You returned in ${elapsedSeconds} seconds. You must remain on the destination page for at least ${requiredSeconds} seconds.`,
        elapsedSeconds,
        requiredSeconds,
      });
    }

    // Task successful!
    db.updateSession(sessionToken, {
      status: 'completed',
      completed_at: Date.now(),
    });

    db.logVisitor({
      ...visitorInfo,
      path: `/ad/${slug}`,
      slug,
      event: `task_${taskNumber}_success`,
    });

    if (taskNumber === 1) {
      return res.json({
        success: true,
        completed: true,
        nextTaskUnlocked: true,
        message: 'Task 1 completed successfully! Task 2 is now unlocked.',
      });
    }

    // Destination redirect based on DB lookup
    const blogger = db.getBloggerBySlug(slug);
    const tgFile = db.getTelegramFileBySlug(slug);
    const video = db.getVideoBySlug(slug);

    let redirectUrl = '';
    if (blogger) {
      redirectUrl = `/bl/${slug}`;
    } else if (tgFile) {
      redirectUrl = `/tg/${slug}`;
    } else if (video) {
      redirectUrl = `/s/${slug}`;
    } else {
      return res.status(404).json({
        success: false,
        error: 'The requested resource slug was not found in blogger_db, telegram_files, or videos_db.',
      });
    }

    return res.json({
      success: true,
      completed: true,
      redirectUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Task verification error.' });
  }
});

// 4. GET /api/player/:slug - Video Player Details
app.get('/api/player/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const visitorInfo = getVisitorInfo(req);

    const video = db.getVideoBySlug(slug);
    if (!video) {
      return res.status(404).json({ success: false, notFound: true, error: 'Video file not found.' });
    }

    // Increment views counter safely server-side
    const newViews = db.incrementViews(slug);

    db.logVisitor({
      ...visitorInfo,
      path: `/s/${slug}`,
      slug,
      event: 'authorized_player_view',
    });

    return res.json({
      success: true,
      data: {
        ...video,
        views: newViews,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve video player stream.' });
  }
});

// 4b. GET /api/blogger/:slug - Blogger Video Details
app.get('/api/blogger/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const visitorInfo = getVisitorInfo(req);

    const video = db.getBloggerBySlug(slug);
    if (!video) {
      return res.status(404).json({ success: false, notFound: true, error: 'Blogger video not found.' });
    }

    // Increment views counter safely server-side
    const newViews = db.incrementBloggerViews(slug);

    db.logVisitor({
      ...visitorInfo,
      path: `/bl/${slug}`,
      slug,
      event: 'authorized_blogger_view',
    });

    return res.json({
      success: true,
      data: {
        ...video,
        views: newViews,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve Blogger video stream.' });
  }
});

// 5. POST /api/download/start - Start Download Task
app.post('/api/download/start', (req: Request, res: Response) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Missing slug parameter.' });
    }

    const video = db.getVideoBySlug(slug) || db.getBloggerBySlug(slug);
    if (!video) {
      return res.status(404).json({ success: false, notFound: true, error: 'Download source video not found.' });
    }

    const visitorInfo = getVisitorInfo(req);
    const visRecord = db.logVisitor({
      ...visitorInfo,
      path: `/dl/${slug}`,
      slug,
      event: 'download_task_start',
    });

    const session = db.createSession({
      slug,
      visitor_id: visRecord.id,
      task_type: 'download_task',
      task_number: 3,
      ttlSeconds: 600,
    });

    return res.json({
      success: true,
      sessionToken: session.session_token,
      taskUrl: TASK_LINK,
      durationSeconds: TASK_DURATION,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to start download task.' });
  }
});

// 6. POST /api/download/verify - Verify Download Task
app.post('/api/download/verify', (req: Request, res: Response) => {
  try {
    const { sessionToken, slug } = req.body;
    if (!sessionToken || !slug) {
      return res.status(400).json({ success: false, error: 'Missing download verification token.' });
    }

    const session = db.getSessionByToken(sessionToken);
    if (!session || session.slug !== slug || session.task_type !== 'download_task') {
      return res.status(400).json({ success: false, error: 'Invalid download task session.' });
    }

    const elapsedSeconds = Math.floor((Date.now() - session.started_at) / 1000);
    const requiredSeconds = TASK_DURATION;

    const visitorInfo = getVisitorInfo(req);

    if (elapsedSeconds < requiredSeconds) {
      db.updateSession(sessionToken, { status: 'failed' });
      db.logVisitor({
        ...visitorInfo,
        path: `/dl/${slug}`,
        slug,
        event: 'download_task_failed',
      });

      return res.json({
        success: false,
        completed: false,
        error: `Download task failed! Elapsed time was ${elapsedSeconds}s. Please remain on the sponsor page for at least ${requiredSeconds} seconds.`,
      });
    }

    db.updateSession(sessionToken, { status: 'completed', completed_at: Date.now() });

    const video = db.getVideoBySlug(slug) || db.getBloggerBySlug(slug);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Download source video not found.' });
    }

    db.logVisitor({
      ...visitorInfo,
      path: `/dl/${slug}`,
      slug,
      event: 'download_unlocked',
    });

    return res.json({
      success: true,
      completed: true,
      downloadUrl: video.video_link,
      fileName: video.title,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Download task verification failed.' });
  }
});

// 7. GET /api/telegram/:slug - Telegram File Details
app.get('/api/telegram/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const visitorInfo = getVisitorInfo(req);

    const tgFile = db.getTelegramFileBySlug(slug);
    if (!tgFile) {
      return res.status(404).json({ success: false, notFound: true, error: 'Telegram file not found.' });
    }

    const telegramDeepLink = `https://t.me/${BOT_USERNAME}?start=${slug}`;

    db.logVisitor({
      ...visitorInfo,
      path: `/tg/${slug}`,
      slug,
      event: 'telegram_file_access',
    });

    return res.json({
      success: true,
      data: tgFile,
      botUsername: BOT_USERNAME,
      telegramUrl: telegramDeepLink,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to process Telegram file request.' });
  }
});

// 8. GET /api/config - Public Gateway Configuration
app.get('/api/config', (req: Request, res: Response) => {
  return res.json({
    success: true,
    taskDuration: TASK_DURATION,
    botUsername: BOT_USERNAME,
    bannerAdCode: process.env.BANNER_AD_CODE || process.env.VITE_BANNER_AD_CODE || '',
  });
});

// 9. Public Items Endpoint for Homepage Portal
app.get('/api/items', (req: Request, res: Response) => {
  try {
    const videos = db.getAllVideos();
    const bloggerVideos = db.getAllBloggerVideos();
    const telegramFiles = db.getAllTelegramFiles();
    return res.json({
      success: true,
      videos,
      bloggerVideos,
      telegramFiles,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve items.' });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE (Dev & Prod)
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StreamVault HUB Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
