// Cloudflare Pages Function: Download Verification & File Serving with D1

interface Env {
  DB?: any;
  DATABASE?: any;
  d1?: any;
  streamvault_db?: any;
  TASK_DURATION?: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}) {
  try {
    const body: any = await context.request.json();
    const { sessionToken, slug } = body;

    if (!sessionToken || !slug) {
      return Response.json(
        { success: false, error: 'Missing download verification token.' },
        { status: 400 }
      );
    }

    const taskDuration = parseInt(context.env.TASK_DURATION || '10', 10);
    const serverNow = Date.now();
    const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;

    if (db) {
      let session: any = null;
      try {
        session = await db
          .prepare('SELECT * FROM gateway_sessions WHERE session_token = ?')
          .bind(sessionToken)
          .first();
      } catch (err: any) {
        console.error(`[Download Verify] D1 query error:`, err?.message || err);
      }

      if (session) {
        const startedAt = Number(session.started_at);
        const elapsedMs = serverNow - startedAt;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const requiredSeconds = taskDuration;

        if (elapsedSeconds < requiredSeconds) {
          try {
            await db.prepare("UPDATE gateway_sessions SET status = 'failed' WHERE session_token = ?").bind(sessionToken).run();
          } catch (_) {}

          return Response.json({
            success: false,
            completed: false,
            error: `Task failed! You returned in ${elapsedSeconds} seconds. You must remain on the destination page for at least ${requiredSeconds} seconds.`,
            elapsedSeconds,
            requiredSeconds,
          });
        }

        try {
          await db.prepare("UPDATE gateway_sessions SET status = 'completed' WHERE session_token = ?").bind(sessionToken).run();
        } catch (_) {}
      }
    }

    // 1. Check videos_db in D1
    if (db) {
      try {
        const video: any = await db.prepare('SELECT * FROM videos_db WHERE slug = ?').bind(slug).first();
        if (video) {
          return Response.json({
            success: true,
            completed: true,
            downloadUrl: video.video_link,
            fileName: `${(video.title || video.name || slug).replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
          });
        }
      } catch (err: any) {
        console.error('[Download Verify] Error checking videos_db:', err?.message || err);
      }

      // 2. Check blogger_db in D1
      try {
        const blogger: any = await db.prepare('SELECT * FROM blogger_db WHERE slug = ?').bind(slug).first();
        if (blogger) {
          const bloggerLink = blogger.video_link || blogger.video_url || blogger.url;
          const directMediaUrl = await extractMediaFromBlogger(bloggerLink);

          if (!directMediaUrl) {
            return Response.json(
              {
                success: false,
                completed: false,
                error: 'Unable to extract direct video stream from this Blogger source. The video host does not provide a downloadable media source stream.',
              },
              { status: 422 }
            );
          }

          return Response.json({
            success: true,
            completed: true,
            downloadUrl: directMediaUrl,
            fileName: `${(blogger.title || blogger.name || slug).replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
          });
        }
      } catch (err: any) {
        console.error('[Download Verify] Error checking blogger_db:', err?.message || err);
      }
    }

    return Response.json(
      { success: false, error: 'Download source video not found.' },
      { status: 404 }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Download verification failed.' },
      { status: 500 }
    );
  }
}

async function extractMediaFromBlogger(bloggerUrl: string): Promise<string | null> {
  if (!bloggerUrl || typeof bloggerUrl !== 'string') return null;
  const trimmed = bloggerUrl.trim();

  // If already a direct media file
  if (/\.(mp4|m4v|webm|ogv|mov|mkv|m3u8|mpd)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  // Google Drive preview / file embed
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  try {
    const response = await fetch(trimmed, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,video/*;q=0.8,*/*;q=0.7',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('video/') || contentType.startsWith('application/octet-stream')) {
      return response.url || trimmed;
    }

    const html = await response.text();

    const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i) ||
      html.match(/<source[^>]+src=["']([^"']+)["']/i);
    if (videoSrcMatch && videoSrcMatch[1]) {
      return resolveUrl(videoSrcMatch[1], trimmed);
    }

    const ogVideoMatch = html.match(/<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url|:url)?["']/i);
    if (ogVideoMatch && ogVideoMatch[1]) {
      const ogUrl = ogVideoMatch[1];
      if (/\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(ogUrl)) {
        return resolveUrl(ogUrl, trimmed);
      }
    }

    const jsonStreamMatch = html.match(/["'](?:play_url|video_url|contentUrl|stream_url)["']\s*:\s*["']([^"']+)["']/i) ||
      html.match(/"url"\s*:\s*"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/i) ||
      html.match(/(https?:\/\/[^"'\s<>]+\.(?:mp4|webm|m3u8)(?:\?[^"'\s<>]*)?)/i);

    if (jsonStreamMatch && jsonStreamMatch[1]) {
      const cleanUrl = jsonStreamMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
      return resolveUrl(cleanUrl, trimmed);
    }

    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      const iframeSrc = resolveUrl(iframeMatch[1], trimmed);
      if (iframeSrc !== trimmed) {
        const nestedMedia = await extractMediaFromBlogger(iframeSrc);
        if (nestedMedia) return nestedMedia;
      }
    }
  } catch (err: any) {
    console.error(`[Media Extraction] Error:`, err?.message || err);
  }

  return null;
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}
