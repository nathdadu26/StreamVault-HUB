/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function onRequestGet(context: any) {
  const { env, request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  try {
    if (slug) {
      const video = await env.DB.prepare(
        "SELECT * FROM videos WHERE slug = ?"
      ).bind(slug).first();
      
      if (!video) return new Response("Not Found", { status: 404 });
      return Response.json(video);
    }

    const videos = await env.DB.prepare("SELECT * FROM videos ORDER BY created_at DESC").all();
    return Response.json(videos.results);
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  const body: any = await request.json();

  try {
    await env.DB.prepare(
      "INSERT INTO videos (slug, title, original_name, video_link, thumbnail, file_size, duration) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      body.slug,
      body.title,
      body.original_name,
      body.video_link,
      body.thumbnail,
      body.file_size,
      body.duration
    ).run();

    return new Response("Created", { status: 201 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
