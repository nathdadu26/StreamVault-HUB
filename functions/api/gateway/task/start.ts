// Cloudflare Pages Function: Gateway Task Start Handler
// Handles POST /api/gateway/task/start on Cloudflare Pages with D1

interface Env {
  DB?: any;
  DATABASE?: any;
  d1?: any;
  streamvault_db?: any;
  TASK_LINK?: string;
  TASK_DURATION?: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}) {
  try {
    const body: any = await context.request.json();
    const { slug, taskNumber } = body;

    if (!slug || (taskNumber !== 1 && taskNumber !== 2)) {
      return Response.json(
        { success: false, error: 'Invalid task request parameters.' },
        { status: 400 }
      );
    }

    const taskLink = context.env.TASK_LINK || 'https://example.com/sponsor-task-link';
    const taskDuration = parseInt(context.env.TASK_DURATION || '10', 10);
    const serverNow = Date.now();
    const expiresAt = serverNow + 600000; // 10 minutes TTL

    const sessionToken = `sess_${crypto.randomUUID()}`;

    const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;
    if (db) {
      try {
        // Ensure gateway_sessions table exists in D1
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS gateway_sessions (
            id TEXT PRIMARY KEY,
            session_token TEXT UNIQUE,
            slug TEXT,
            visitor_id TEXT,
            task_type TEXT,
            task_number INTEGER,
            started_at INTEGER,
            expires_at INTEGER,
            status TEXT,
            created_at TEXT
          )
        `).run();

        // Record start timestamp strictly on the server
        await db.prepare(`
          INSERT INTO gateway_sessions (id, session_token, slug, visitor_id, task_type, task_number, started_at, expires_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          `sess_${crypto.randomUUID()}`,
          sessionToken,
          slug,
          'cf_visitor',
          taskNumber === 1 ? 'gateway_task_1' : 'gateway_task_2',
          taskNumber,
          serverNow,
          expiresAt,
          'in_progress',
          new Date(serverNow).toISOString()
        ).run();

        console.log(`[Task Start] Recorded session in D1: token=${sessionToken}, slug=${slug}, task=${taskNumber}, started_at=${serverNow}, duration=${taskDuration}s`);
      } catch (dbErr: any) {
        console.error(`[Task Start] Failed to write session to D1:`, dbErr?.message || dbErr);
      }
    }

    return Response.json({
      success: true,
      sessionToken,
      taskUrl: taskLink,
      durationSeconds: taskDuration,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Failed to initiate task session.' },
      { status: 500 }
    );
  }
}
