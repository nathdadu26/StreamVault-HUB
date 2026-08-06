import { ensureDatabaseSchema } from "./dbInit";

interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  await ensureDatabaseSchema(DB);

  try {
    const { results } = await DB.prepare(
      "SELECT id, channel_id as channelId, channel_name as channelName, enabled, total_success as totalSuccess, total_failed as totalFailed, created_at as createdAt FROM telegram_channels ORDER BY rowid DESC"
    ).all();

    const formatted = (results || []).map((row: any) => ({
      id: row.id,
      channelId: row.channelId,
      channelName: row.channelName,
      enabled: Boolean(row.enabled),
      totalSuccess: Number(row.totalSuccess || 0),
      totalFailed: Number(row.totalFailed || 0),
      createdAt: row.createdAt || new Date().toISOString(),
    }));

    return Response.json(formatted);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  await ensureDatabaseSchema(DB);

  try {
    const url = new URL(context.request.url);
    
    // Check if this is a webhook invocation or channel creation
    const body = await context.request.json() as any;

    // Handle Telegram Webhook payload
    if (body && (body.update_id !== undefined || url.pathname.endsWith("/webhook"))) {
      const msg = body.message || body.channel_post || body.edited_message;
      let forwardChat = msg?.forward_from_chat || msg?.forward_origin?.chat || msg?.chat;
      
      if (!forwardChat && msg?.forward_origin?.type === "chat") {
        forwardChat = msg.forward_origin.chat;
      }

      if (forwardChat) {
        const rawChannelId = String(forwardChat.id || "");
        const rawChannelName = forwardChat.title || forwardChat.username || `Channel ${rawChannelId}`;

        if (rawChannelId) {
          // Check if exists
          const existing = await DB.prepare(
            "SELECT id FROM telegram_channels WHERE channel_id = ?"
          ).bind(rawChannelId).first();

          if (!existing) {
            const newId = `chan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await DB.prepare(
              "INSERT INTO telegram_channels (id, channel_id, channel_name, enabled, total_success, total_failed, created_at) VALUES (?, ?, ?, 1, 0, 0, ?)"
            ).bind(newId, rawChannelId, rawChannelName, new Date().toISOString()).run();
          }
        }
      }

      return Response.json({ ok: true });
    }

    // Direct channel save/add from API
    const channelId = String(body.channelId || body.channel_id || "");
    const channelName = String(body.channelName || body.channel_name || `Channel ${channelId}`);
    const id = body.id || `chan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const enabled = body.enabled === false || body.enabled === 0 ? 0 : 1;

    if (!channelId) {
      return new Response(JSON.stringify({ error: "channelId is required" }), { status: 400 });
    }

    // Check duplicate
    const existing = await DB.prepare(
      "SELECT id FROM telegram_channels WHERE channel_id = ? OR id = ?"
    ).bind(channelId, id).first();

    if (existing) {
      await DB.prepare(
        "UPDATE telegram_channels SET channel_name = ?, enabled = ? WHERE channel_id = ? OR id = ?"
      ).bind(channelName, enabled, channelId, id).run();
    } else {
      await DB.prepare(
        "INSERT INTO telegram_channels (id, channel_id, channel_name, enabled, total_success, total_failed, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)"
      ).bind(id, channelId, channelName, enabled, new Date().toISOString()).run();
    }

    return Response.json({ success: true, id, channelId, channelName });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  await ensureDatabaseSchema(DB);

  try {
    const body = await context.request.json() as any;
    const target = String(body.id || body.channelId || "");

    if (!target) {
      return new Response(JSON.stringify({ error: "id or channelId is required" }), { status: 400 });
    }

    if (body.enabled !== undefined) {
      const enabledVal = body.enabled ? 1 : 0;
      await DB.prepare(
        "UPDATE telegram_channels SET enabled = ? WHERE id = ? OR channel_id = ?"
      ).bind(enabledVal, target, target).run();
    }

    if (body.incrementSuccess) {
      await DB.prepare(
        "UPDATE telegram_channels SET total_success = total_success + 1 WHERE id = ? OR channel_id = ?"
      ).bind(target, target).run();
    }

    if (body.incrementFailed) {
      await DB.prepare(
        "UPDATE telegram_channels SET total_failed = total_failed + 1 WHERE id = ? OR channel_id = ?"
      ).bind(target, target).run();
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  await ensureDatabaseSchema(DB);

  try {
    const url = new URL(context.request.url);
    const target = url.searchParams.get("id") || url.searchParams.get("channelId");

    if (!target) {
      return new Response(JSON.stringify({ error: "id parameter is required" }), { status: 400 });
    }

    await DB.prepare(
      "DELETE FROM telegram_channels WHERE id = ? OR channel_id = ?"
    ).bind(target, target).run();

    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
