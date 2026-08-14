// Cloudflare Pages Function: Resource Resolver Handler
// Handles GET /api/resource/:slug on Cloudflare Pages with D1

interface Env {
  DB?: any;
  DATABASE?: any;
  d1?: any;
  streamvault_db?: any;
  TASK_LINK?: string;
  TASK_DURATION?: string;
  BOT_USERNAME?: string;
}

export async function onRequestGet(context: {
  request: Request;
  params: { slug?: string };
  env: Env;
}) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path is /api/resource/[slug]
  const rawSlug = context.params.slug || pathParts[pathParts.length - 1] || '';
  const slug = decodeURIComponent(rawSlug).trim();

  const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;

  console.log(`[CF Pages D1 Resolver] Requested slug: "${slug}"`);

  if (!db) {
    console.error(`[CF Pages D1 Resolver] D1 Database binding is missing! Ensure 'DB' is bound in Pages Settings.`);
    return Response.json(
      {
        success: false,
        error: 'Cloudflare D1 database binding (DB) is not configured in Pages Settings.',
      },
      { status: 500 }
    );
  }

  try {
    // 1. Check blogger_db table
    console.log(`[CF Pages D1 Resolver] [1/3] Querying 'blogger_db' for slug: "${slug}"...`);
    try {
      const blogger: any = await db
        .prepare('SELECT * FROM blogger_db WHERE slug = ?')
        .bind(slug)
        .first();

      if (blogger) {
        console.log(`[CF Pages D1 Resolver] -> Match found in 'blogger_db'! Title: "${blogger.title || blogger.name}" | Destination: /bl/${slug}`);
        return Response.json({
          success: true,
          type: 'blogger',
          destinationPath: `/bl/${slug}`,
          data: {
            id: blogger.id || `bl_${slug}`,
            slug: blogger.slug,
            title: blogger.title || blogger.name || 'Featured Blogger Video Stream',
            video_link: blogger.video_link || blogger.video_url || blogger.url || '',
            views: Number(blogger.views || 0),
            created_at: blogger.created_at || new Date().toISOString(),
            updated_at: blogger.updated_at || new Date().toISOString(),
          },
        });
      }
      console.log(`[CF Pages D1 Resolver] -> No record found in 'blogger_db'.`);
    } catch (err: any) {
      console.log(`[CF Pages D1 Resolver] Query to 'blogger_db' returned error (table might not exist yet):`, err?.message);
    }

    // 2. Check telegram_files table
    console.log(`[CF Pages D1 Resolver] [2/3] Querying 'telegram_files' for slug: "${slug}"...`);
    try {
      const tgFile: any = await db
        .prepare('SELECT * FROM telegram_files WHERE slug = ?')
        .bind(slug)
        .first();

      if (tgFile) {
        console.log(`[CF Pages D1 Resolver] -> Match found in 'telegram_files'! File: "${tgFile.file_name || tgFile.title}" | Destination: /tg/${slug}`);
        return Response.json({
          success: true,
          type: 'telegram',
          destinationPath: `/tg/${slug}`,
          data: {
            id: tgFile.id || `tg_${slug}`,
            slug: tgFile.slug,
            file_name: tgFile.file_name || tgFile.title || tgFile.name || 'Vault_Download_File.zip',
            file_size: tgFile.file_size || tgFile.size || 'Unknown',
            created_at: tgFile.created_at || new Date().toISOString(),
            updated_at: tgFile.updated_at || new Date().toISOString(),
          },
        });
      }
      console.log(`[CF Pages D1 Resolver] -> No record found in 'telegram_files'.`);
    } catch (err: any) {
      console.log(`[CF Pages D1 Resolver] Query to 'telegram_files' returned error:`, err?.message);
    }

    // 3. Check videos_db table
    console.log(`[CF Pages D1 Resolver] [3/3] Querying 'videos_db' for slug: "${slug}"...`);
    try {
      const video: any = await db
        .prepare('SELECT * FROM videos_db WHERE slug = ?')
        .bind(slug)
        .first();

      if (video) {
        console.log(`[CF Pages D1 Resolver] -> Match found in 'videos_db'! Title: "${video.title || video.name}" | Destination: /s/${slug}`);
        return Response.json({
          success: true,
          type: 'video',
          destinationPath: `/s/${slug}`,
          data: {
            id: video.id || `v_${slug}`,
            slug: video.slug,
            title: video.title || video.name || 'StreamVault Video Stream',
            video_link: video.video_link || video.video_url || video.url || '',
            file_size: video.file_size || video.size || '150 MB',
            views: Number(video.views || 0),
            created_at: video.created_at || new Date().toISOString(),
            updated_at: video.updated_at || new Date().toISOString(),
          },
        });
      }
      console.log(`[CF Pages D1 Resolver] -> No record found in 'videos_db'. Slug "${slug}" not found in any of the 3 tables.`);
    } catch (err: any) {
      console.log(`[CF Pages D1 Resolver] Query to 'videos_db' returned error:`, err?.message);
    }

    // Not found in any table
    console.log(`[CF Pages D1 Resolver] -> Result: 404 Resource Not Found for slug: "${slug}"`);
    return Response.json(
      {
        success: false,
        notFound: true,
        error: 'The requested resource or video file was not found in D1 database.',
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error(`[CF Pages D1 Resolver] Unexpected error:`, err?.message || err);
    return Response.json(
      {
        success: false,
        error: err?.message || 'Internal database error',
      },
      { status: 500 }
    );
  }
}
