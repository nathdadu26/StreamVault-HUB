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
      console.log(`[D1 Query] Requested slug: "${slug}"`);
      const result = await DB.prepare("SELECT * FROM videos WHERE slug = ? LIMIT 1").bind(slug).first();
      console.log(`[D1 Query] SQL query result for "${slug}":`, result ? "Record found" : "Record not found");
      if (result) {
        console.log(`[D1 Query] Record found:`, JSON.stringify(result));
      } else {
        console.log(`[D1 Query] Record not found for slug: "${slug}"`);
      }
      return Response.json(result || null);
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

    let mp4QualitiesStr = "";
    if (typeof video.mp4Qualities === "string") {
      mp4QualitiesStr = video.mp4Qualities;
    } else if (video.mp4Qualities) {
      mp4QualitiesStr = JSON.stringify(video.mp4Qualities);
    } else {
      mp4QualitiesStr = JSON.stringify({});
    }

    const video_240 = video.video_240 || (video.mp4Qualities ? video.mp4Qualities["240p"] || video.mp4Qualities["280p"] : null) || null;
    const video_360 = video.video_360 || (video.mp4Qualities ? video.mp4Qualities["360p"] : null) || null;
    const video_480 = video.video_480 || (video.mp4Qualities ? video.mp4Qualities["480p"] : null) || null;
    const video_720 = video.video_720 || (video.mp4Qualities ? video.mp4Qualities["720p"] : null) || null;
    const video_1080 = video.video_1080 || (video.mp4Qualities ? video.mp4Qualities["1080p"] : null) || null;

    const thumbnail_1 = video.thumbnail_1 || null;
    const thumbnail_2 = video.thumbnail_2 || null;
    const thumbnail_3 = video.thumbnail_3 || null;
    const thumbnail_4 = video.thumbnail_4 || null;
    const thumbnail_5 = video.thumbnail_5 || null;

    await DB.prepare(
      `INSERT INTO videos (
        id, slug, title, videoUrl, thumbnailUrl, thumbnails, mp4Qualities,
        video_240, video_360, video_480, video_720, video_1080,
        thumbnail_1, thumbnail_2, thumbnail_3, thumbnail_4, thumbnail_5,
        fileSize, duration, views, likes, dislikes, uploadedAt, releaseYear, genres, quality, telegramPosted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      video.id,
      video.slug,
      video.title,
      video.videoUrl,
      video.thumbnailUrl,
      JSON.stringify(video.thumbnails || []),
      mp4QualitiesStr,
      video_240,
      video_360,
      video_480,
      video_720,
      video_1080,
      thumbnail_1,
      thumbnail_2,
      thumbnail_3,
      thumbnail_4,
      thumbnail_5,
      video.fileSize,
      video.duration,
      video.views || 0,
      video.likes || 0,
      video.dislikes || 0,
      video.uploadedAt,
      video.releaseYear,
      JSON.stringify(video.genres || ["MP4", "HD"]),
      video.quality || "1080p"
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
