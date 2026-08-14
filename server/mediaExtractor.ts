/**
 * Extracts direct media/video stream URL from a Blogger embed or page URL.
 * Handles:
 * 1. Direct video files (.mp4, .webm, .m3u8, .mpd, etc.)
 * 2. Blogger/Blogspot video iframe player embeds
 * 3. Google Drive / UserContent video embeds
 * 4. HTML page inspection for <video src="...">, <source src="...">, og:video, or media JSON configs
 */
export async function extractBloggerMediaUrl(bloggerUrl: string): Promise<string | null> {
  if (!bloggerUrl || typeof bloggerUrl !== 'string') return null;
  const trimmed = bloggerUrl.trim();

  // If it is already a direct media file URL
  if (/\.(mp4|m4v|webm|ogv|mov|mkv|m3u8|mpd)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  // Handle Google Drive / Google Docs / Video preview embeds (e.g. drive.google.com/file/d/ID/preview)
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Handle Blogger native video iframe player:
  // e.g., www.blogger.com/video.g?token=... or video.google.com embeds
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

    // If fetch directly returned video or audio/binary
    if (contentType.startsWith('video/') || contentType.startsWith('application/octet-stream')) {
      return response.url || trimmed;
    }

    const html = await response.text();

    // 1. Look for <source src="..." or <video src="..."
    const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i) ||
      html.match(/<source[^>]+src=["']([^"']+)["']/i);
    if (videoSrcMatch && videoSrcMatch[1]) {
      return resolveUrl(videoSrcMatch[1], trimmed);
    }

    // 2. Look for og:video / og:video:url / og:video:secure_url
    const ogVideoMatch = html.match(/<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url|:url)?["']/i);
    if (ogVideoMatch && ogVideoMatch[1]) {
      const ogUrl = ogVideoMatch[1];
      if (/\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(ogUrl)) {
        return resolveUrl(ogUrl, trimmed);
      }
    }

    // 3. Look for Blogger video stream configuration or JSON stream links (e.g., "play_url", "video_url", "contentUrl")
    const jsonStreamMatch = html.match(/["'](?:play_url|video_url|contentUrl|stream_url)["']\s*:\s*["']([^"']+)["']/i) ||
      html.match(/"url"\s*:\s*"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/i) ||
      html.match(/(https?:\/\/[^"'\s<>]+\.(?:mp4|webm|m3u8)(?:\?[^"'\s<>]*)?)/i);

    if (jsonStreamMatch && jsonStreamMatch[1]) {
      const cleanUrl = jsonStreamMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
      return resolveUrl(cleanUrl, trimmed);
    }

    // 4. Look for iframe embed inside the blogger page (e.g., youtube, streamtape, blogger video player)
    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
      const iframeSrc = resolveUrl(iframeMatch[1], trimmed);
      if (iframeSrc !== trimmed) {
        // Recursive extract for 1 level
        const nestedMedia = await extractBloggerMediaUrl(iframeSrc);
        if (nestedMedia) return nestedMedia;
      }
    }
  } catch (err: any) {
    console.error(`[Media Extraction] Error extracting media from ${trimmed}:`, err?.message || err);
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
