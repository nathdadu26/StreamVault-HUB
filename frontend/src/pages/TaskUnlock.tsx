import { useParams, Link } from "react-router-dom";

export default function TaskUnlock() {
  const { slug } = useParams();

  return (
    <div className="max-w-md mx-auto py-12 space-y-8 text-center">
      <h1 className="text-3xl font-bold">Complete Tasks to Unlock</h1>
      <p className="text-muted-foreground">Please complete the following tasks to get your download link for video: {slug}</p>
      
      <div className="space-y-4">
        <div className="p-6 border rounded-xl bg-card">
          <h3 className="font-semibold mb-2">Step 1: Open Link</h3>
          <a href="#" target="_blank" className="text-primary hover:underline">Click here to start</a>
        </div>
      </div>

      <Link to={`/download/${slug}`} className="block w-full py-3 bg-muted rounded-md text-sm font-medium hover:bg-muted/80 transition-colors">
        Check Progress
      </Link>
    </div>
  );
}
