/**
 * Cloudflare Pages Function for System Settings in D1
 * Route: /api/settings
 */

export async function onRequestGet(context: any) {
  const { env } = context;
  try {
    const settingsRow = await env.DB.prepare(
      "SELECT * FROM settings WHERE id = 'global'"
    ).first();

    if (!settingsRow) {
      return Response.json({
        task1Url: "",
        task2Url: "",
        downloadTaskUrl: "",
      });
    }

    return Response.json({
      task1Url: settingsRow.task1_url || "",
      task2Url: settingsRow.task2_url || "",
      downloadTaskUrl: settingsRow.download_task_url || "",
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  try {
    const body: any = await request.json();
    await env.DB.prepare(
      `INSERT INTO settings (id, task1_url, task2_url, download_task_url) 
       VALUES ('global', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         task1_url = excluded.task1_url,
         task2_url = excluded.task2_url,
         download_task_url = excluded.download_task_url`
    ).bind(
      body.task1Url || "",
      body.task2Url || "",
      body.downloadTaskUrl || ""
    ).run();

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
