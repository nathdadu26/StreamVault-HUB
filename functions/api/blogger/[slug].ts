// Cloudflare Pages Function: Blogger Video Stream Handler
// Handles GET /api/blogger/:slug on Cloudflare Pages with D1

interface Env {
  DB?: any;
  DATABASE?: any;
  d1?: any;
  streamvault_db?: any;
}

export async function onRequestGet(context: {
  request: Request;
  params: { slug?: string };
  env: Env;
  waitUntil: (promise: Promise<any>) => void;
}) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const rawSlug = context.params.slug || pathParts[pathParts.length - 1] || '';
  const slug = decodeURIComponent(rawSlug).trim();

  const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;

  if (!db) {
    return Response.json(
      { success: false, error: 'Database binding not configured.' },
      { status: 500 }
    );
  }

  try {
    const item: any = await db
      .prepare('SELECT * FROM blogger_db WHERE slug = ?')
      .bind(slug)
      .first();

    if (!item) {
      return Response.json(
        { success: false, notFound: true, error: 'Blogger video not found in D1.' },
        { status: 404 }
      );
    }

    // Increment views counter
    if (context.waitUntil) {
      context.waitUntil(
        db.prepare('UPDATE blogger_db SET views = COALESCE(views, 0) + 1 WHERE slug = ?').bind(slug).run().catch(() => {})
      );
    }

    return Response.json({
      success: true,
      data: {
        id: item.id || `bl_${slug}`,
        slug: item.slug,
        title: item.title || item.name || 'Featured Blogger Video Stream',
        video_link: item.video_link || item.video_url || item.url || '',
        views: Number(item.views || 0) + 1,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err?.message || 'Database error' },
      { status: 500 }
    );
  }
}
