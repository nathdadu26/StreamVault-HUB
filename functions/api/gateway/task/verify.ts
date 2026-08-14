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
        { success: false, completed: false, error: 'Missing session verification arguments.' },
        { status: 400 }
      );
    }

    const taskDuration = parseInt(context.env.TASK_DURATION || '10', 10);
    const serverNow = Date.now();
    const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;

    if (!db) {
      return Response.json(
        { success: false, completed: false, error: 'Database connection unavailable.' },
        { status: 500 }
      );
    }

    // 1. Fetch the server-recorded session from D1
    let session: any = null;
    try {
      session = await db
        .prepare('SELECT * FROM gateway_sessions WHERE session_token = ?')
        .bind(sessionToken)
        .first();
    } catch (err: any) {
      console.error(`[Task Verify] Error querying session from D1:`, err?.message || err);
    }

    if (!session || session.slug !== slug || Number(session.task_number) !== Number(taskNumber)) {
      return Response.json(
        {
          success: false,
          completed: false,
          error: 'Invalid or expired task session. Please click "Try Again" to restart.',
        },
        { status: 400 }
      );
    }

    // 2. Check if the session has expired (10 minutes TTL)
    if (session.expires_at && serverNow > Number(session.expires_at)) {
      try {
        await db.prepare("UPDATE gateway_sessions SET status = 'failed' WHERE session_token = ?").bind(sessionToken).run();
      } catch (_) {}

      return Response.json(
        {
          success: false,
          completed: false,
          error: 'Task session expired. Please restart the task.',
        },
        { status: 400 }
      );
    }

    // 3. Strict Server-Side Elapsed Time Enforcement
    const startedAt = Number(session.started_at);
    const elapsedMs = serverNow - startedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const requiredSeconds = taskDuration;

    console.log(`[Task Verify] Server verification: token=${sessionToken}, elapsed=${elapsedSeconds}s, required=${requiredSeconds}s`);

    if (elapsedSeconds < requiredSeconds) {
      // Mark session as failed in D1 to prevent replay
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

    // 4. Mark task as completed in D1
    try {
      await db.prepare("UPDATE gateway_sessions SET status = 'completed' WHERE session_token = ?").bind(sessionToken).run();
    } catch (_) {}

    // Task 1 Completion
    if (taskNumber === 1) {
      return Response.json({
        success: true,
        completed: true,
        nextTaskUnlocked: true,
        message: 'Task 1 completed successfully! Task 2 is now unlocked.',
      });
    }

    // Task 2 Completion -> Query destination table in D1
    let redirectUrl = `/bl/${slug}`; // safe fallback

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
    } catch (err: any) {
      console.error('[Task Verify] Error checking destination table in D1:', err?.message || err);
    }

    return Response.json({
      success: true,
      completed: true,
      redirectUrl,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, completed: false, error: 'Task verification error.' },
      { status: 500 }
    );
  }
}
