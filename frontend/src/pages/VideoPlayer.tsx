import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Video } from "../types";

export default function VideoPlayer() {
  const { slug } = useParams();
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (slug) {
      fetch(`/api/videos?slug=${encodeURIComponent(slug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: any) => {
          if (data && data.slug) setVideo(data);
        })
        .catch(() => {});
    }
  }, [slug]);

  if (!video) return <div className="py-20 text-center">Loading video...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <video src={video.videoUrl} controls className="w-full h-full" poster={video.thumbnailUrl} />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{video.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{video.quality}</span>
          <span>•</span>
          <span>{video.fileSize}</span>
          <span>•</span>
          <span>{new Date(video.uploadedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Link to={`/download/${video.slug}`} className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Download Video
        </Link>
      </div>
    </div>
  );
}
