/**
 * Cloudflare Pages Function for D1 Visitors Analytics
 * Route: /api/visitors
 */

export async function onRequestGet(context: any) {
  const { env } = context;
  try {
    const visitors = await env.DB.prepare(
      "SELECT * FROM visitors ORDER BY visited_at DESC LIMIT 50"
    ).all();
    return Response.json(visitors.results || []);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  try {
    const body: any = await request.json();
    await env.DB.prepare(
      "INSERT INTO visitors (id, slug, ip, os, browser, country, visited_at, total_links_opened) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      body.id || `v_${Date.now()}`,
      body.slug || "",
      body.ip || "127.0.0.1",
      body.os || "Unknown OS",
      body.browser || "Unknown Browser",
      body.country || "Direct Access",
      body.visitedAt || new Date().toISOString(),
      body.totalLinksOpened || 1
    ).run();

    return Response.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
