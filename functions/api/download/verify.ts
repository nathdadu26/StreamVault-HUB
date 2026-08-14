// Cloudflare Pages Function: Download Verification & File Serving

export async function onRequestPost(context: {
  request: Request;
}) {
  try {
    const body: any = await context.request.json();
    const { sessionToken, slug } = body;

    if (!sessionToken || !slug) {
      return Response.json(
        { success: false, error: 'Missing download verification token.' },
        { status: 400 }
      );
    }

    const downloadDirectUrl = `/api/download/file/${encodeURIComponent(slug)}?key=${encodeURIComponent(sessionToken)}`;

    return Response.json({
      success: true,
      completed: true,
      downloadUrl: downloadDirectUrl,
      fileName: `${slug}_source_archive.mp4`,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: 'Download verification failed.' },
      { status: 500 }
    );
  }
}
