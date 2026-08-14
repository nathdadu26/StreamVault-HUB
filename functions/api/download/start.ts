// Cloudflare Pages Function: Download Handlers
// Handles POST /api/download/start on Cloudflare Pages

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
    const { slug } = body;

    if (!slug) {
      return Response.json(
        { success: false, error: 'Missing slug parameter.' },
        { status: 400 }
      );
    }

    const taskLink = context.env.TASK_LINK || 'https://example.com/sponsor-task-link';
    const taskDuration = parseInt(context.env.TASK_DURATION || '10', 10);
    const sessionToken = `dl_${crypto.randomUUID()}`;

    return Response.json({
      success: true,
      sessionToken,
      taskUrl: taskLink,
      durationSeconds: taskDuration,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Failed to start download task.' },
      { status: 500 }
    );
  }
}
