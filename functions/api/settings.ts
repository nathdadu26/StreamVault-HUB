interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const result = await DB.prepare("SELECT * FROM settings LIMIT 1").first();
    return Response.json(result || {});
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const settings = await context.request.json() as any;
    // Simple upsert logic for D1
    await DB.prepare("DELETE FROM settings").run();
    await DB.prepare(
      "INSERT INTO settings (task1Url, task2Url, downloadTaskUrl, vpnDetectionEnabled, adBlockDetectionEnabled, linkExpirationMinutes, telegramBotToken, telegramPostInterval, telegramPostUnit, telegramChannelUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      settings.task1Url,
      settings.task2Url,
      settings.downloadTaskUrl,
      settings.vpnDetectionEnabled ? 1 : 0,
      settings.adBlockDetectionEnabled ? 1 : 0,
      settings.linkExpirationMinutes,
      settings.telegramBotToken,
      settings.telegramPostInterval,
      settings.telegramPostUnit,
      settings.telegramChannelUrl
    ).run();
    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
