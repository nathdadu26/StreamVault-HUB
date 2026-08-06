import { ensureDatabaseSchema } from "./dbInit";

interface Env {
  DB: D1Database;
  R2?: any;
  BUCKET?: any;
  MY_BUCKET?: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  await ensureDatabaseSchema(DB);
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug");
  const pending = url.searchParams.get("pending");

  try {
    if (slug) {
      console.log(`[D1 Query] Requested slug: "${slug}"`);
      const result = await DB.prepare("SELECT * FROM videos WHERE slug = ? LIMIT 1").bind(slug).first();
      console.log(`[D1 Query] SQL query result for "${slug}":`, result ? "Record found" : "Record not found");
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
  await ensureDatabaseSchema(DB);
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
  await ensureDatabaseSchema(DB);
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
  console.log("[API Delete] Received DELETE request at /api/videos");

  try {
    console.log("[API Delete Step 1/4] Ensuring database schema and tables exist...");
    await ensureDatabaseSchema(DB);
    console.log("[API Delete Step 1/4 Complete] Database schema checked.");

    const url = new URL(context.request.url);
    let id = url.searchParams.get("id");
    let slug = url.searchParams.get("slug");

    if (!id && !slug) {
      try {
        const body = await context.request.json() as any;
        if (body) {
          id = body.id || id;
          slug = body.slug || slug;
        }
      } catch {}
    }

    if (!id && !slug) {
      console.error("[API Delete Error] Missing both 'id' and 'slug' parameters");
      return new Response(JSON.stringify({ success: false, error: "Missing video id or slug parameter" }), { status: 400 });
    }

    console.log(`[API Delete Step 2/4] Resolving video record for ID: "${id || 'N/A'}", Slug: "${slug || 'N/A'}"...`);
    let videoRecord: any = null;
    if (id) {
      videoRecord = await DB.prepare("SELECT * FROM videos WHERE id = ? LIMIT 1").bind(id).first();
    }
    if (!videoRecord && slug) {
      videoRecord = await DB.prepare("SELECT * FROM videos WHERE slug = ? LIMIT 1").bind(slug).first();
    }

    const targetSlug = videoRecord?.slug || slug;
    const targetId = videoRecord?.id || id;

    console.log(`[API Delete Step 2/4 Complete] Target resolved -> ID: "${targetId || 'N/A'}", Slug: "${targetSlug || 'N/A'}"`);

    // Delete related files from R2 slug folder if R2 binding exists
    const bucket = context.env.R2 || context.env.BUCKET || context.env.MY_BUCKET;
    let deletedR2Count = 0;

    if (bucket && targetSlug) {
      console.log(`[API Delete Step 3/4] Checking Cloudflare R2 bucket for slug folder: "${targetSlug}/"...`);
      try {
        const prefix = `${targetSlug}/`;
        const list = await bucket.list({ prefix });
        if (list && list.objects && list.objects.length > 0) {
          console.log(`[API Delete Step 3/4] Found ${list.objects.length} R2 object(s) in '${prefix}' folder. Deleting...`);
          for (const obj of list.objects) {
            console.log(`[R2 Delete] Removing key: ${obj.key}`);
            await bucket.delete(obj.key);
            deletedR2Count++;
          }
          console.log(`[API Delete Step 3/4 Complete] Successfully deleted ${deletedR2Count} object(s) from R2.`);
        } else {
          console.log(`[API Delete Step 3/4] No objects found in R2 folder '${prefix}'.`);
        }
      } catch (r2Err: any) {
        console.error("[API Delete Step 3/4 Error] R2 deletion failed:", r2Err);
        throw new Error(`R2 asset deletion failed: ${r2Err.message || r2Err}`);
      }
    } else {
      console.log(`[API Delete Step 3/4] R2 bucket binding unavailable or no slug found, skipping R2 file deletion.`);
    }

    // Permanently delete from Cloudflare D1
    console.log(`[API Delete Step 4/4] Permanently deleting record from Cloudflare D1 (ID: "${targetId}", Slug: "${targetSlug}")...`);
    if (targetId && targetSlug) {
      await DB.prepare("DELETE FROM videos WHERE id = ? OR slug = ?").bind(targetId, targetSlug).run();
    } else if (targetId) {
      await DB.prepare("DELETE FROM videos WHERE id = ?").bind(targetId).run();
    } else if (targetSlug) {
      await DB.prepare("DELETE FROM videos WHERE slug = ?").bind(targetSlug).run();
    }
    console.log(`[API Delete Step 4/4 Complete] Record permanently removed from Cloudflare D1.`);

    return Response.json({
      success: true,
      message: "Video and all associated R2 assets permanently deleted.",
      deletedId: targetId,
      deletedSlug: targetSlug,
      deletedR2Count
    });
  } catch (err: any) {
    console.error("[API Delete Error] Failed to complete delete request:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Failed to delete video" }), { status: 500 });
  }
};

