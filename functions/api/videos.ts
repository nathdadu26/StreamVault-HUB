/**
 * Cloudflare Pages Function for D1 Video Management
 * Route: /api/videos
 */

export async function onRequestGet(context: any) {
  const { env, request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const id = url.searchParams.get("id");

  try {
    if (slug) {
      const video = await env.DB.prepare(
        "SELECT * FROM videos WHERE slug = ?"
      ).bind(slug).first();
      if (!video) return new Response("Not Found", { status: 404 });
      return Response.json(video);
    }

    if (id) {
      const video = await env.DB.prepare(
        "SELECT * FROM videos WHERE id = ?"
      ).bind(id).first();
      if (!video) return new Response("Not Found", { status: 404 });
      return Response.json(video);
    }

    const videos = await env.DB.prepare("SELECT * FROM videos ORDER BY created_at DESC").all();
    return Response.json(videos.results || []);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  try {
    const body: any = await request.json();
    await env.DB.prepare(
      `INSERT INTO videos 
      (id, slug, title, video_url, thumbnail_url, thumbnails, file_size, duration, views, likes, dislikes, uploaded_at, release_year, genres, quality) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.id,
      body.slug,
      body.title,
      body.videoUrl,
      body.thumbnailUrl,
      JSON.stringify(body.thumbnails || []),
      body.fileSize || "0 MB",
      body.duration || "00:00",
      body.views || 0,
      body.likes || 0,
      body.dislikes || 0,
      body.uploadedAt || new Date().toISOString(),
      body.releaseYear || new Date().getFullYear(),
      JSON.stringify(body.genres || []),
      body.quality || "1080p"
    ).run();

    return Response.json({ success: true, id: body.id }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPut(context: any) {
  const { env, request } = context;
  try {
    const body: any = await request.json();
    if (!body.id) return Response.json({ error: "Missing video ID" }, { status: 400 });

    await env.DB.prepare(
      "UPDATE videos SET title = ?, thumbnail_url = ? WHERE id = ?"
    ).bind(body.title, body.thumbnailUrl, body.id).run();

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context: any) {
  const { env, request } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return Response.json({ error: "Missing ID" }, { status: 400 });

  try {
    await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
