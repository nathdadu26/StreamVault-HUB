interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const { results } = await DB.prepare("SELECT * FROM visitors ORDER BY visitedAt DESC LIMIT 100").all();
    return Response.json(results);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const visitor = await context.request.json() as any;
    await DB.prepare(
      "INSERT INTO visitors (id, slug, ip, os, browser, country, visitedAt, totalLinksOpened) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      visitor.id,
      visitor.slug,
      visitor.ip,
      visitor.os,
      visitor.browser,
      visitor.country,
      visitor.visitedAt,
      visitor.totalLinksOpened
    ).run();
    return Response.json({ success: true });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
