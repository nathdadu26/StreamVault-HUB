interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get("url");
  const expires = url.searchParams.get("expires");
  const token = url.searchParams.get("token");
  const title = url.searchParams.get("title") || "video";
  const quality = url.searchParams.get("quality") || "";

  if (!targetUrl || !expires) {
    return new Response("Missing parameters", { status: 400 });
  }

  const expiresTime = parseInt(expires, 10);
  if (isNaN(expiresTime) || Date.now() > expiresTime) {
    return new Response("Signed download link has expired.", { status: 410 });
  }

  const secret = "atoz_r2_secret_key_2026";
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${targetUrl}:${expires}`);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    if (token) {
      const match = token.match(/.{1,2}/g);
      if (match) {
        const signatureUint8 = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
        const isValid = await crypto.subtle.verify("HMAC", cryptoKey, signatureUint8, messageData);
        if (!isValid) {
          return new Response("Invalid token signature", { status: 403 });
        }
      } else {
        return new Response("Invalid token format", { status: 403 });
      }
    }
  } catch (err) {
    console.error("[Download API] Verification error:", err);
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      return Response.redirect(targetUrl, 302);
    }

    const headers = new Headers(res.headers);
    const cleanTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
    const filename = `${cleanTitle}${quality ? `_${quality}` : ""}.mp4`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (e) {
    return Response.redirect(targetUrl, 302);
  }
};
