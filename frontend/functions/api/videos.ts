interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug");
  const pending = url.searchParams.get("pending");
  const markPosted = url.searchParams.get("markPosted");

  try {
    if (slug) {
      const result = await DB.prepare("SELECT * FROM videos WHERE slug = ? LIMIT 1").bind(slug).first();
      return Response.json(result || {});
    }
    if (pending === "true") {
      const { results } = await DB.prepare("SELECT * FROM videos WHERE telegramPosted = 0 ORDER BY uploadedAt ASC").all();
      return Response.json(results);
    }
    const { results } = await DB.prepare("SELECT * FROM videos ORDER BY uploadedAt DESC").all();
    return Response.json(results);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const video = await context.request.json() as any;
    await DB.prepare(
      "INSERT INTO videos (id, slug, title, videoUrl, thumbnailUrl, thumbnails, fileSize, duration, views, likes, dislikes, uploadedAt, releaseYear, genres, quality, telegramPosted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"
    ).bind(
      video.id,
      video.slug,
      video.title,
      video.videoUrl,
      video.thumbnailUrl,
      JSON.stringify(video.thumbnails),
      video.fileSize,
      video.duration,
      video.views || 0,
      video.likes || 0,
      video.dislikes || 0,
      video.uploadedAt,
      video.releaseYear,
      JSON.stringify(video.genres),
      video.quality
    ).run();
    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const { id, thumbnailUrl, title, telegramPosted } = await context.request.json() as any;
    if (telegramPosted !== undefined) {
      await DB.prepare("UPDATE videos SET telegramPosted = ? WHERE id = ?").bind(telegramPosted ? 1 : 0, id).run();
    } else if (title) {
      await DB.prepare("UPDATE videos SET thumbnailUrl = ?, title = ? WHERE id = ?").bind(thumbnailUrl, title, id).run();
    } else {
      await DB.prepare("UPDATE videos SET thumbnailUrl = ? WHERE id = ?").bind(thumbnailUrl, id).run();
    }
    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  try {
    await DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
