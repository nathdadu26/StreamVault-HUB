-- D1 Database Schema for AtoZ Links

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    title TEXT,
    videoUrl TEXT,
    thumbnailUrl TEXT,
    thumbnails TEXT, -- JSON array
    fileSize TEXT,
    duration TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    uploadedAt TEXT,
    releaseYear INTEGER,
    genres TEXT, -- JSON array
    quality TEXT,
    telegramPosted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    slug TEXT,
    ip TEXT,
    os TEXT,
    browser TEXT,
    country TEXT,
    visitedAt TEXT,
    totalLinksOpened INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
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
);
