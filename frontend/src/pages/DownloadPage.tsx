import { useParams } from "react-router-dom";

export default function DownloadPage() {
  const { slug } = useParams();

  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-6">
      <h1 className="text-3xl font-bold">Download Ready</h1>
      <p className="text-muted-foreground">Your download link for {slug} is generated.</p>
      
      <button className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
        Download Now (Direct Link)
      </button>
    </div>
  );
}
