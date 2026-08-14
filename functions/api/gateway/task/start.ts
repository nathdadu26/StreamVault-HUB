// Cloudflare Pages Function: Gateway Task Start Handler
// Handles POST /api/gateway/task/start on Cloudflare Pages

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

    const sessionToken = `sess_${crypto.randomUUID()}`;

    const db = context.env.DB || context.env.DATABASE || context.env.d1 || context.env.streamvault_db;
    if (db) {
      try {
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
          Date.now(),
          Date.now() + 600000,
          'in_progress',
          new Date().toISOString()
        ).run();
      } catch (dbErr) {
        // Continue even if session table is not created yet
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
