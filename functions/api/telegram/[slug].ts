// Cloudflare Pages Function: Telegram File Details Handler
// Handles GET /api/telegram/:slug on Cloudflare Pages with D1

interface Env {
  DB?: any;
  DATABASE?: any;
  d1?: any;
  streamvault_db?: any;
  BOT_USERNAME?: string;
}

export async function onRequestGet(context: {
  request: Request;
  params: { slug?: string };
  env: Env;
}) {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const rawSlug = context.params.slug || pathParts[pathParts.length - 1] || '';
  const slug = decodeURIComponent(rawSlug).trim();

  const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;
  const botUsername = (context.env.BOT_USERNAME || 'file_server_bot').replace(/^@/, '');

  if (!db) {
    return Response.json(
      { success: false, error: 'Database binding not configured.' },
      { status: 500 }
    );
  }

  try {
    const item: any = await db
      .prepare('SELECT * FROM telegram_files WHERE slug = ?')
      .bind(slug)
      .first();

    if (!item) {
      return Response.json(
        { success: false, notFound: true, error: 'Telegram file not found in D1.' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      botUsername,
      telegramUrl: `https://t.me/${botUsername}?start=${slug}`,
      data: {
        id: item.id || `tg_${slug}`,
        slug: item.slug,
        file_name: item.file_name || item.title || item.name || 'Telegram_File.zip',
        file_size: item.file_size || item.size || 'Unknown',
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
