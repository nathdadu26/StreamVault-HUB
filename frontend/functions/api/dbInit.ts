export async function ensureDatabaseSchema(DB: any) {
  if (!DB) return;

  try {
    // 1. Ensure 'videos' table
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        slug TEXT,
        title TEXT,
        videoUrl TEXT,
        thumbnailUrl TEXT,
        thumbnails TEXT,
        mp4Qualities TEXT,
        video_240 TEXT,
        video_360 TEXT,
        video_480 TEXT,
        video_720 TEXT,
        video_1080 TEXT,
        thumbnail_1 TEXT,
        thumbnail_2 TEXT,
        thumbnail_3 TEXT,
        thumbnail_4 TEXT,
        thumbnail_5 TEXT,
        fileSize TEXT,
        duration TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        uploadedAt TEXT,
        releaseYear INTEGER,
        genres TEXT,
        quality TEXT,
        telegramPosted INTEGER DEFAULT 0
      )
    `).run().catch((e: any) => console.error("[dbInit] Error creating videos table:", e));

    // Check columns for 'videos'
    const videosInfo = await DB.prepare("PRAGMA table_info(videos)").all().catch(() => ({ results: [] }));
    const existingVideoCols = new Set((videosInfo.results || []).map((c: any) => c.name));

    const requiredVideoCols: Record<string, string> = {
      slug: "TEXT",
      title: "TEXT",
      videoUrl: "TEXT",
      thumbnailUrl: "TEXT",
      thumbnails: "TEXT",
      mp4Qualities: "TEXT",
      video_240: "TEXT",
      video_360: "TEXT",
      video_480: "TEXT",
      video_720: "TEXT",
      video_1080: "TEXT",
      thumbnail_1: "TEXT",
      thumbnail_2: "TEXT",
      thumbnail_3: "TEXT",
      thumbnail_4: "TEXT",
      thumbnail_5: "TEXT",
      fileSize: "TEXT",
      duration: "TEXT",
      views: "INTEGER DEFAULT 0",
      likes: "INTEGER DEFAULT 0",
      dislikes: "INTEGER DEFAULT 0",
      uploadedAt: "TEXT",
      releaseYear: "INTEGER",
      genres: "TEXT",
      quality: "TEXT",
      telegramPosted: "INTEGER DEFAULT 0",
    };

    for (const [col, colType] of Object.entries(requiredVideoCols)) {
      if (!existingVideoCols.has(col)) {
        try {
          await DB.prepare(`ALTER TABLE videos ADD COLUMN ${col} ${colType}`).run();
          console.log(`[dbInit] Added missing column '${col}' to 'videos' table.`);
        } catch (err) {
          // Ignore if column already exists
        }
      }
    }

    // 2. Ensure 'settings' table
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        task1Url TEXT,
        task2Url TEXT,
        downloadTaskUrl TEXT,
        vpnDetectionEnabled INTEGER DEFAULT 0,
        adBlockDetectionEnabled INTEGER DEFAULT 0,
        linkExpirationMinutes INTEGER DEFAULT 30,
        telegramBotToken TEXT,
        telegramPostInterval INTEGER DEFAULT 30,
        telegramPostUnit TEXT DEFAULT 'minutes',
        telegramChannelUrl TEXT
      )
    `).run().catch((e: any) => console.error("[dbInit] Error creating settings table:", e));

    const settingsInfo = await DB.prepare("PRAGMA table_info(settings)").all().catch(() => ({ results: [] }));
    const existingSettingsCols = new Set((settingsInfo.results || []).map((c: any) => c.name));

    const requiredSettingsCols: Record<string, string> = {
      task1Url: "TEXT",
      task2Url: "TEXT",
      downloadTaskUrl: "TEXT",
      vpnDetectionEnabled: "INTEGER DEFAULT 0",
      adBlockDetectionEnabled: "INTEGER DEFAULT 0",
      linkExpirationMinutes: "INTEGER DEFAULT 30",
      telegramBotToken: "TEXT",
      telegramPostInterval: "INTEGER DEFAULT 30",
      telegramPostUnit: "TEXT DEFAULT 'minutes'",
      telegramPostQuantity: "INTEGER DEFAULT 1",
      telegramChannelUrl: "TEXT",
    };

    for (const [col, colType] of Object.entries(requiredSettingsCols)) {
      if (!existingSettingsCols.has(col)) {
        try {
          await DB.prepare(`ALTER TABLE settings ADD COLUMN ${col} ${colType}`).run();
          console.log(`[dbInit] Added missing column '${col}' to 'settings' table.`);
        } catch (err) {
          // Ignore
        }
      }
    }

    // 2b. Ensure 'telegram_channels' table
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS telegram_channels (
        id TEXT PRIMARY KEY,
        channel_id TEXT UNIQUE,
        channel_name TEXT,
        enabled INTEGER DEFAULT 1,
        total_success INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        created_at TEXT
      )
    `).run().catch((e: any) => console.error("[dbInit] Error creating telegram_channels table:", e));

    // 3. Ensure 'visitors' table
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        slug TEXT,
        ip TEXT,
        os TEXT,
        browser TEXT,
        country TEXT,
        visitedAt TEXT,
        totalLinksOpened INTEGER DEFAULT 1
      )
    `).run().catch((e: any) => console.error("[dbInit] Error creating visitors table:", e));

    const visitorsInfo = await DB.prepare("PRAGMA table_info(visitors)").all().catch(() => ({ results: [] }));
    const existingVisitorsCols = new Set((visitorsInfo.results || []).map((c: any) => c.name));

    const requiredVisitorCols: Record<string, string> = {
      slug: "TEXT",
      ip: "TEXT",
      os: "TEXT",
      browser: "TEXT",
      country: "TEXT",
      visitedAt: "TEXT",
      totalLinksOpened: "INTEGER DEFAULT 1",
    };

    for (const [col, colType] of Object.entries(requiredVisitorCols)) {
      if (!existingVisitorsCols.has(col)) {
        try {
          await DB.prepare(`ALTER TABLE visitors ADD COLUMN ${col} ${colType}`).run();
          console.log(`[dbInit] Added missing column '${col}' to 'visitors' table.`);
        } catch (err) {
          // Ignore
        }
      }
    }
  } catch (globalErr) {
    console.error("[dbInit] Failed auto schema check:", globalErr);
  }
}
