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

    const downloadDirectUrl = `/api/download/file/${encodeURIComponent(slug)}?key=${encodeURIComponent(sessionToken)}`;

    return Response.json({
      success: true,
      completed: true,
      downloadUrl: downloadDirectUrl,
      fileName: `${slug}_source_archive.mp4`,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Download verification failed.' },
      { status: 500 }
    );
  }
}
