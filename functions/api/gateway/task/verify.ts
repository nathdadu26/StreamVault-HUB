// Cloudflare Pages Function: Gateway Task Verification Handler
// Handles POST /api/gateway/task/verify on Cloudflare Pages with D1

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
    const { sessionToken, slug, taskNumber } = body;

    if (!sessionToken || !slug || (taskNumber !== 1 && taskNumber !== 2)) {
      return Response.json(
        { success: false, error: 'Missing session verification arguments.' },
        { status: 400 }
      );
    }

    if (taskNumber === 1) {
      return Response.json({
        success: true,
        completed: true,
        nextTaskUnlocked: true,
        message: 'Task 1 completed successfully! Task 2 is now unlocked.',
      });
    }

    // Task 2 completed -> Determine destination route from D1 tables
    const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;
    let redirectUrl = `/bl/${slug}`; // safe fallback

    if (db) {
      try {
        const blogger = await db.prepare('SELECT slug FROM blogger_db WHERE slug = ?').bind(slug).first();
        if (blogger) {
          redirectUrl = `/bl/${slug}`;
        } else {
          const tgFile = await db.prepare('SELECT slug FROM telegram_files WHERE slug = ?').bind(slug).first();
          if (tgFile) {
            redirectUrl = `/tg/${slug}`;
          } else {
            const video = await db.prepare('SELECT slug FROM videos_db WHERE slug = ?').bind(slug).first();
            if (video) {
              redirectUrl = `/s/${slug}`;
            }
          }
        }
      } catch (err) {
        console.error('D1 check error in task verify:', err);
      }
    }

    return Response.json({
      success: true,
      completed: true,
      redirectUrl,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Task verification error.' },
      { status: 500 }
    );
  }
}
